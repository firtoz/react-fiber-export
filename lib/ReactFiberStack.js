/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule ReactFiberStack
 * 
 */

'use strict';

if (__DEV__) {
  var warning = require('fbjs/lib/warning');
}

const valueStack = [];

if (__DEV__) {
  var fiberStack = [];
}

let index = -1;

exports.createCursor = function (defaultValue) {
  return {
    current: defaultValue
  };
};

exports.isEmpty = function () {
  return index === -1;
};

exports.pop = function (cursor, fiber) {
  if (index < 0) {
    if (__DEV__) {
      warning(false, 'Unexpected pop.');
    }
    return;
  }

  if (__DEV__) {
    if (fiber !== fiberStack[index]) {
      warning(false, 'Unexpected Fiber popped.');
    }
  }

  cursor.current = valueStack[index];

  valueStack[index] = null;

  if (__DEV__) {
    fiberStack[index] = null;
  }

  index--;
};

exports.push = function (cursor, value, fiber) {
  index++;

  valueStack[index] = cursor.current;

  if (__DEV__) {
    fiberStack[index] = fiber;
  }

  cursor.current = value;
};

exports.reset = function () {
  while (index > -1) {
    valueStack[index] = null;

    if (__DEV__) {
      fiberStack[index] = null;
    }

    index--;
  }
};