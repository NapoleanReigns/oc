'use strict';

const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const requireTemplate = require('../../utils/require-template');

module.exports = function() {
  return function(options, callback) {
    const componentPath = options.componentPath;
    const minify = options.minify === true;
    const publishPath = path.join(componentPath, '_package');

    fs.emptyDirSync(publishPath);

    const componentPackagePath = path.join(componentPath, 'package.json');
    const ocPackagePath = path.join(__dirname, '../../../package.json');

    if (!fs.existsSync(componentPackagePath)) {
      return callback(new Error('component does not contain package.json'));
    } else if (!fs.existsSync(ocPackagePath)) {
      return callback(new Error('error resolving oc internal dependencies'));
    }

    const componentPackage = fs.readJsonSync(componentPackagePath);
    const ocPackage = fs.readJsonSync(ocPackagePath);

    if (!validator.validateComponentName(componentPackage.name)) {
      return callback(new Error('name not valid'));
    }

    const type = componentPackage.oc.template.type;
    const compileOptions = {
      publishPath,
      componentPath,
      componentPackage,
      minify
      // TODO: verbose,
      // TODO: logger,
      // TODO: watch,
    };

    try {
      const ocTemplate = requireTemplate(type, { compiler: true });
      ocTemplate.compile(compileOptions, (err, info) => {
        if (err) {
          return callback(err);
        }
        return callback(null, info);
      });
    } catch (err) {
      return callback(err);
    }
  };
};
