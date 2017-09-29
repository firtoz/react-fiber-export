/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule ReactFiberReconciler
 * 
 */

'use strict';

var ReactFeatureFlags = require('../utils/ReactFeatureFlags');

var { addTopLevelUpdate } = require('./ReactFiberUpdateQueue');

var {
  findCurrentUnmaskedContext,
  isContextProvider,
  processChildContext
} = require('./ReactFiberContext');
var { createFiberRoot } = require('./ReactFiberRoot');
var ReactFiberScheduler = require('./ReactFiberScheduler');
var { HostComponent } = require('../../../shared/ReactTypeOfWork');

if (__DEV__) {
  var warning = require('fbjs/lib/warning');
  var ReactFiberInstrumentation = require('./ReactFiberInstrumentation');
  var ReactDebugCurrentFiber = require('./ReactDebugCurrentFiber');
  var getComponentName = require('../../../shared/utils/getComponentName');
}

var {
  findCurrentHostFiber,
  findCurrentHostFiberWithNoPortals
} = require('./ReactFiberTreeReflection');

var getContextForSubtree = require('../shared/getContextForSubtree');

getContextForSubtree._injectFiber(function (fiber) {
  const parentContext = findCurrentUnmaskedContext(fiber);
  return isContextProvider(fiber) ? processChildContext(fiber, parentContext) : parentContext;
});

module.exports = function (config) {
  var { getPublicInstance } = config;

  var {
    scheduleUpdate,
    getPriorityContext,
    batchedUpdates,
    unbatchedUpdates,
    flushSync,
    deferredUpdates
  } = ReactFiberScheduler(config);

  function scheduleTopLevelUpdate(current, element, callback) {
    if (__DEV__) {
      if (ReactDebugCurrentFiber.phase === 'render' && ReactDebugCurrentFiber.current !== null) {
        warning(false, 'Render methods should be a pure function of props and state; ' + 'triggering nested component updates from render is not allowed. ' + 'If necessary, trigger nested updates in componentDidUpdate.\n\n' + 'Check the render method of %s.', getComponentName(ReactDebugCurrentFiber.current) || 'Unknown');
      }
    }

    // Check if the top-level element is an async wrapper component. If so, treat
    // updates to the root as async. This is a bit weird but lets us avoid a separate
    // `renderAsync` API.
    const forceAsync = ReactFeatureFlags.enableAsyncSubtreeAPI && element != null && element.type != null && element.type.prototype != null && element.type.prototype.unstable_isAsyncReactComponent === true;
    const priorityLevel = getPriorityContext(current, forceAsync);
    const nextState = { element };
    callback = callback === undefined ? null : callback;
    if (__DEV__) {
      warning(callback === null || typeof callback === 'function', 'render(...): Expected the last optional `callback` argument to be a ' + 'function. Instead received: %s.', callback);
    }
    addTopLevelUpdate(current, nextState, callback, priorityLevel);
    scheduleUpdate(current, priorityLevel);
  }

  return {
    createContainer(containerInfo) {
      return createFiberRoot(containerInfo);
    },

    updateContainer(element, container, parentComponent, callback) {
      // TODO: If this is a nested container, this won't be the root.
      const current = container.current;

      if (__DEV__) {
        if (ReactFiberInstrumentation.debugTool) {
          if (current.alternate === null) {
            ReactFiberInstrumentation.debugTool.onMountContainer(container);
          } else if (element === null) {
            ReactFiberInstrumentation.debugTool.onUnmountContainer(container);
          } else {
            ReactFiberInstrumentation.debugTool.onUpdateContainer(container);
          }
        }
      }

      const context = getContextForSubtree(parentComponent);
      if (container.context === null) {
        container.context = context;
      } else {
        container.pendingContext = context;
      }

      scheduleTopLevelUpdate(current, element, callback);
    },

    batchedUpdates,

    unbatchedUpdates,

    deferredUpdates,

    flushSync,

    getPublicRootInstance(container) {
      const containerFiber = container.current;
      if (!containerFiber.child) {
        return null;
      }
      switch (containerFiber.child.tag) {
        case HostComponent:
          return getPublicInstance(containerFiber.child.stateNode);
        default:
          return containerFiber.child.stateNode;
      }
    },

    findHostInstance(fiber) {
      const hostFiber = findCurrentHostFiber(fiber);
      if (hostFiber === null) {
        return null;
      }
      return hostFiber.stateNode;
    },

    findHostInstanceWithNoPortals(fiber) {
      const hostFiber = findCurrentHostFiberWithNoPortals(fiber);
      if (hostFiber === null) {
        return null;
      }
      return hostFiber.stateNode;
    }
  };
};