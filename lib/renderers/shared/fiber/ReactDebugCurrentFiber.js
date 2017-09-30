/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule ReactDebugCurrentFiber
 * 
 */

'use strict';

var { ReactDebugCurrentFrame } = require('../ReactGlobalSharedState');

if (process.env.NODE_ENV !== 'production') {
  var getComponentName = require('../../../shared/utils/getComponentName');
  var {
    getStackAddendumByWorkInProgressFiber
  } = require('../../../shared/ReactFiberComponentTreeHook');
}

function getCurrentFiberOwnerName() {
  if (process.env.NODE_ENV !== 'production') {
    const fiber = ReactDebugCurrentFiber.current;
    if (fiber === null) {
      return null;
    }
    if (fiber._debugOwner != null) {
      return getComponentName(fiber._debugOwner);
    }
  }
  return null;
}

function getCurrentFiberStackAddendum() {
  if (process.env.NODE_ENV !== 'production') {
    const fiber = ReactDebugCurrentFiber.current;
    if (fiber === null) {
      return null;
    }
    // Safe because if current fiber exists, we are reconciling,
    // and it is guaranteed to be the work-in-progress version.
    return getStackAddendumByWorkInProgressFiber(fiber);
  }
  return null;
}

function resetCurrentFiber() {
  ReactDebugCurrentFrame.getCurrentStack = null;
  ReactDebugCurrentFiber.current = null;
  ReactDebugCurrentFiber.phase = null;
}

function setCurrentFiber(fiber) {
  ReactDebugCurrentFrame.getCurrentStack = getCurrentFiberStackAddendum;
  ReactDebugCurrentFiber.current = fiber;
  ReactDebugCurrentFiber.phase = null;
}

function setCurrentPhase(phase) {
  ReactDebugCurrentFiber.phase = phase;
}

var ReactDebugCurrentFiber = {
  current: null,
  phase: null,
  resetCurrentFiber,
  setCurrentFiber,
  setCurrentPhase,
  getCurrentFiberOwnerName,
  getCurrentFiberStackAddendum
};

module.exports = ReactDebugCurrentFiber;