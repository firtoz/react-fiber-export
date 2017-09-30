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

if (process.env.NODE_ENV !== 'production') {
  var warning = require('fbjs/lib/warning');
}

const valueStack = [];

if (process.env.NODE_ENV !== 'production') {
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
    if (process.env.NODE_ENV !== 'production') {
      warning(false, 'Unexpected pop.');
    }
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    if (fiber !== fiberStack[index]) {
      warning(false, 'Unexpected Fiber popped.');
    }
  }

  cursor.current = valueStack[index];

  valueStack[index] = null;

  if (process.env.NODE_ENV !== 'production') {
    fiberStack[index] = null;
  }

  index--;
};

exports.push = function (cursor, value, fiber) {
  index++;

  valueStack[index] = cursor.current;

  if (process.env.NODE_ENV !== 'production') {
    fiberStack[index] = fiber;
  }

  cursor.current = value;
};

exports.reset = function () {
  while (index > -1) {
    valueStack[index] = null;

    if (process.env.NODE_ENV !== 'production') {
      fiberStack[index] = null;
    }

    index--;
  }
};