'use strict';

const _ = require('underscore');

module.exports.parse = function(code){

  const matchedDataExports = code.match(/module.exports.data\s?=\s?function\(\w+,/gi);

  const contexts = _.map(matchedDataExports, function(match){
    return match.slice(match.indexOf('(') + 1, -1);
  });

  if(_.isEmpty(contexts)){
    return [];
  }

  const context = contexts[0],
    search = new RegExp(context+'\\.plugins\\.\\w+', 'gi'),
    repl = new RegExp(context+'\\.plugins\\.', 'gi');

  return _.map(code.match(search), function(match){
    return match.replace(repl, '');
  });
};