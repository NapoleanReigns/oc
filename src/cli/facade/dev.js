'use strict';

const async = require('async');
const colors = require('colors/safe');
const format = require('stringformat');
const path = require('path');
const _ = require('underscore');

const getComponentsDependencies = require('../domain/get-components-deps');
const getMissingDeps = require('../domain/get-missing-deps');
const getMockedPlugins = require('../domain/get-mocked-plugins');
const npmInstaller = require('../domain/npm-installer');
const oc = require('../../index');
const strings = require('../../resources/index');
const watch = require('../domain/watch');
const wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies){
  const local = dependencies.local,
    logger = dependencies.logger;

  const log = {
    err: function(msg){ return logger.log(colors.red(msg)); },
    ok: function(msg){ return logger.log(colors.green(msg)); },
    warn: function(msg, noNewLine){ return logger[noNewLine ? 'logNoNewLine' : 'log'](colors.yellow(msg)); }
  };

  return function(opts, callback){

    const componentsDir = opts.dirPath,
      port = opts.port || 3000,
      baseUrl = opts.baseUrl || format('http://localhost:{0}/', port),
      errors = strings.errors.cli,
      fallbackRegistryUrl = opts.fallbackRegistryUrl,
      hotReloading = _.isUndefined(opts.hotReloading) ? true : opts.hotReloading;
    let packaging = false;

    callback = wrapCliCallback(callback);

    const installMissingDeps = function(missing, cb){
      if(_.isEmpty(missing)){ return cb(); }

      log.warn(format(strings.messages.cli.INSTALLING_DEPS, missing.join(', ')));
      npmInstaller(missing, function(err){
        if(err){
          log.err(err.toString());
          throw err;
        }
        cb();
      });
    };

    const watchForChanges = function(components, cb){
      watch(components, componentsDir, function(err, changedFile){
        if(err){
          log.err(format(strings.errors.generic, err));
        } else {
          log.warn(format(strings.messages.cli.CHANGES_DETECTED, changedFile));
          if(!hotReloading){
            log.warn(strings.messages.cli.HOT_RELOADING_DISABLED);
          } else {
            cb(components);
          }
        }
      });
    };

    const packageComponents = function(componentsDirs, cb){
      cb = _.isFunction(cb) ? cb : _.noop;

      let i = 0;

      if(!packaging){
        packaging = true;
        log.warn(strings.messages.cli.PACKAGING_COMPONENTS, true);

        async.eachSeries(componentsDirs, function(dir, cb){

          const packageOptions = {
            componentPath: dir,
            minify: false,
            verbose: opts.verbose
          };

          local.package(packageOptions, function(err){
            if(!err){ i++; }
            cb(err);
          });
        }, function(error){
          if(error){
            const errorDescription = ((error instanceof SyntaxError) || !!error.message) ? error.message : error;
            log.err(format(strings.errors.cli.PACKAGING_FAIL, componentsDirs[i], errorDescription));
            log.warn(strings.messages.cli.RETRYING_10_SECONDS);
            setTimeout(function(){
              packaging = false;
              packageComponents(componentsDirs);
            }, 10000);
          } else {
            packaging = false;
            log.ok('OK');
            cb();
          }
        });
      }
    };

    const loadDependencies = function(components, cb){
      log.warn(strings.messages.cli.CHECKING_DEPENDENCIES, true);
      
      const dependencies = getComponentsDependencies(components),
        missing = getMissingDeps(dependencies.withVersions, components);

      if(_.isEmpty(missing)){
        log.ok('OK');
        return cb(dependencies);
      }

      log.err('FAIL');
      installMissingDeps(missing, function(){
        loadDependencies(components, cb);
      });
    };

    const registerPlugins = function(registry){
      const mockedPlugins = getMockedPlugins(logger, componentsDir);

      mockedPlugins.forEach(function(p){
        registry.register(p);
      });

      registry.on('request', function(data){
        if(data.errorCode === 'PLUGIN_MISSING_FROM_REGISTRY'){
          log.err(format(strings.errors.cli.PLUGIN_MISSING_FROM_REGISTRY, data.errorDetails, colors.blue(strings.commands.cli.MOCK_PLUGIN)));
        } else if(data.errorCode === 'PLUGIN_MISSING_FROM_COMPONENT'){
          log.err(format(strings.errors.cli.PLUGIN_MISSING_FROM_COMPONENT, data.errorDetails));
        }
      });
    };

    log.warn(strings.messages.cli.SCANNING_COMPONENTS, true);
    local.getComponentsByDir(componentsDir, function(err, components){

      if(_.isEmpty(components)){
        err = format(errors.DEV_FAIL, errors.COMPONENTS_NOT_FOUND);
        callback(err);
        return log.err(err);        
      }

      log.ok('OK');
      _.forEach(components, function(component){
        logger.log(colors.green('├── ') + component);
      });

      loadDependencies(components, function(dependencies){
        packageComponents(components, function(){
          
          const registry = new oc.Registry({
            local: true,
            hotReloading: hotReloading,
            fallbackRegistryUrl: fallbackRegistryUrl,
            discovery: true,
            verbosity: 1,
            path: path.resolve(componentsDir),
            port: port,
            baseUrl: baseUrl,
            env: { name: 'local' },
            dependencies: dependencies.modules,
            templates: dependencies.templates
          });

          registerPlugins(registry);

          log.warn(format(strings.messages.cli.REGISTRY_STARTING, baseUrl));
          registry.start(function(err){

            if(err){
              if(err.code === 'EADDRINUSE'){
                err = format(strings.errors.cli.PORT_IS_BUSY, port);
              }
              callback(err);
              return log.err(err);
            }

            watchForChanges(components, packageComponents);
            callback(null, registry);
          });
        });
      });
    });
  };
};
