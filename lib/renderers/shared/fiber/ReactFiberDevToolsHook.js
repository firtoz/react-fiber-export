/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule ReactFiberDevToolsHook
 * 
 */

'use strict';

if (process.env.NODE_ENV !== 'production') {
  var warning = require('fbjs/lib/warning');
}

let onCommitFiberRoot = null;
let onCommitFiberUnmount = null;
let hasLoggedError = false;

function catchErrors(fn) {
  return function (arg) {
    try {
      return fn(arg);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production' && !hasLoggedError) {
        hasLoggedError = true;
        warning(false, 'React DevTools encountered an error: %s', err);
      }
    }
  };
}

function injectInternals(internals) {
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined') {
    // No DevTools
    return false;
  }
  const hook = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!hook.supportsFiber) {
    if (process.env.NODE_ENV !== 'production') {
      warning(false, 'The installed version of React DevTools is too old and will not work with the current version of React. Please update React DevTools. https://fb.me/react-devtools');
    }
    // DevTools exists, even though it doesn't support Fiber.
    return true;
  }
  try {
    const rendererID = hook.inject(internals);
    // We have successfully injected, so now it is safe to set up hooks.
    onCommitFiberRoot = catchErrors(root => hook.onCommitFiberRoot(rendererID, root));
    onCommitFiberUnmount = catchErrors(fiber => hook.onCommitFiberUnmount(rendererID, fiber));
  } catch (err) {
    // Catch all errors because it is unsafe to throw during initialization.
    if (process.env.NODE_ENV !== 'production') {
      warning(false, 'React DevTools encountered an error: %s.', err);
    }
  }
  // DevTools exists
  return true;
}

function onCommitRoot(root) {
  if (typeof onCommitFiberRoot === 'function') {
    onCommitFiberRoot(root);
  }
}

function onCommitUnmount(fiber) {
  if (typeof onCommitFiberUnmount === 'function') {
    onCommitFiberUnmount(fiber);
  }
}

exports.injectInternals = injectInternals;
exports.onCommitRoot = onCommitRoot;
exports.onCommitUnmount = onCommitUnmount;