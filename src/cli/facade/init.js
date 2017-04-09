'use strict';

const colors = require('colors/safe');
const format = require('stringformat');
const _ = require('underscore');

const strings = require('../../resources/index');
const wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies){

  const local = dependencies.local,
    logger = dependencies.logger;

  return function(opts, callback){

    const componentName = opts.componentName,
      templateType = _.isUndefined(opts.templateType) ? 'handlebars' : opts.templateType,
      errors = strings.errors.cli;

    callback = wrapCliCallback(callback);

    local.init(componentName, templateType, function(err){
      if(err){
        if(err === 'name not valid'){
          err = errors.NAME_NOT_VALID;
        }

        if(err === 'template type not valid'){
          err = errors.TEMPLATE_TYPE_NOT_VALID;
        }

        logger.log(colors.red(format(errors.INIT_FAIL, err)));
      } else {
        logger.log(colors.green(format(strings.messages.cli.COMPONENT_INITED, componentName)));
      }

      callback(err, componentName);
    });
  };
};