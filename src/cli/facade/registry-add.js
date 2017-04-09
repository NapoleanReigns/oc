'use strict';

const colors = require('colors/safe');

const strings = require('../../resources/index');
const wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies){

  const registry = dependencies.registry,
    logger = dependencies.logger;

  const log = {
    err: function(msg){ return logger.log(colors.red(msg)); },
    ok: function(msg){ return logger.log(colors.green(msg)); },
    warn: function(msg){ return logger.log(colors.yellow(msg)); }
  };

  return function(opts, callback){

    callback = wrapCliCallback(callback);

    registry.add(opts.registryUrl, function(err){
      if(err){
        log.err(err);
        return callback(err);
      }

      log.ok(strings.messages.cli.REGISTRY_ADDED);
      callback(null, 'ok');
    });
  };
};