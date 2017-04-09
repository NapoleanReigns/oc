'use strict';

const colors = require('colors/safe');
const format = require('stringformat');

const strings = require('../../resources/index');
const wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies){

  const local = dependencies.local,
    logger = dependencies.logger;

  return function(opts, callback){

    callback = wrapCliCallback(callback);

    local.mock(opts, function(err, res){
      logger.log(colors.green(format(strings.messages.cli.MOCKED_PLUGIN, opts.targetName, opts.targetValue)));
      callback(err, res);
    });
  };
};