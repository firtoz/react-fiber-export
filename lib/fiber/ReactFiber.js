/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule ReactFiber
 * 
 */

'use strict';

var {
  IndeterminateComponent,
  ClassComponent,
  HostRoot,
  HostComponent,
  HostText,
  HostPortal,
  CoroutineComponent,
  YieldComponent,
  Fragment
} = require('ReactTypeOfWork');

var { NoWork } = require('./ReactPriorityLevel');

var { NoContext } = require('./ReactTypeOfInternalContext');

var { NoEffect } = require('./ReactTypeOfSideEffect');

var invariant = require('fbjs/lib/invariant');

if (__DEV__) {
  var getComponentName = require('getComponentName');
  var hasBadMapPolyfill = false;
  try {
    const nonExtensibleObject = Object.preventExtensions({});
    /* eslint-disable no-new */
    new Map([[nonExtensibleObject, null]]);
    new Set([nonExtensibleObject]);
    /* eslint-enable no-new */
  } catch (e) {
    // TODO: Consider warning about bad polyfills
    hasBadMapPolyfill = true;
  }
}

// A Fiber is work on a Component that needs to be done or was done. There can
// be more than one per component.


if (__DEV__) {
  var debugCounter = 1;
}

function FiberNode(tag, key, internalContextTag) {
  // Instance
  this.tag = tag;
  this.key = key;
  this.type = null;
  this.stateNode = null;

  // Fiber
  this.return = null;
  this.child = null;
  this.sibling = null;
  this.index = 0;

  this.ref = null;

  this.pendingProps = null;
  this.memoizedProps = null;
  this.updateQueue = null;
  this.memoizedState = null;

  this.internalContextTag = internalContextTag;

  // Effects
  this.effectTag = NoEffect;
  this.nextEffect = null;

  this.firstEffect = null;
  this.lastEffect = null;

  this.pendingWorkPriority = NoWork;

  this.alternate = null;

  if (__DEV__) {
    this._debugID = debugCounter++;
    this._debugSource = null;
    this._debugOwner = null;
    this._debugIsCurrentlyTiming = false;
    if (!hasBadMapPolyfill && typeof Object.preventExtensions === 'function') {
      Object.preventExtensions(this);
    }
  }
}

// This is a constructor function, rather than a POJO constructor, still
// please ensure we do the following:
// 1) Nobody should add any instance methods on this. Instance methods can be
//    more difficult to predict when they get optimized and they are almost
//    never inlined properly in static compilers.
// 2) Nobody should rely on `instanceof Fiber` for type testing. We should
//    always know when it is a fiber.
// 3) We might want to experiment with using numeric keys since they are easier
//    to optimize in a non-JIT environment.
// 4) We can easily go from a constructor to a createFiber object literal if that
//    is faster.
// 5) It should be easy to port this to a C struct and keep a C implementation
//    compatible.
var createFiber = function (tag, key, internalContextTag) {
  // $FlowFixMe: the shapes are exact here but Flow doesn't like constructors
  return new FiberNode(tag, key, internalContextTag);
};

function shouldConstruct(Component) {
  return !!(Component.prototype && Component.prototype.isReactComponent);
}

// This is used to create an alternate fiber to do work on.
exports.createWorkInProgress = function (current, renderPriority) {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    // We use a double buffering pooling technique because we know that we'll
    // only ever need at most two versions of a tree. We pool the "other" unused
    // node that we're free to reuse. This is lazily created to avoid allocating
    // extra objects for things that are never updated. It also allow us to
    // reclaim the extra memory if needed.
    workInProgress = createFiber(current.tag, current.key, current.internalContextTag);
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;

    if (__DEV__) {
      // DEV-only fields
      workInProgress._debugID = current._debugID;
      workInProgress._debugSource = current._debugSource;
      workInProgress._debugOwner = current._debugOwner;
    }

    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    // We already have an alternate.
    // Reset the effect tag.
    workInProgress.effectTag = NoEffect;

    // The effect list is no longer valid.
    workInProgress.nextEffect = null;
    workInProgress.firstEffect = null;
    workInProgress.lastEffect = null;
  }

  workInProgress.pendingWorkPriority = renderPriority;

  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;

  // pendingProps is set by the parent during reconciliation.
  // TODO: Pass this as an argument.

  // These will be overridden during the parent's reconciliation
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;

  return workInProgress;
};

exports.createHostRootFiber = function () {
  const fiber = createFiber(HostRoot, null, NoContext);
  return fiber;
};

exports.createFiberFromElement = function (element, internalContextTag, priorityLevel) {
  let owner = null;
  if (__DEV__) {
    owner = element._owner;
  }

  const fiber = createFiberFromElementType(element.type, element.key, internalContextTag, owner);
  fiber.pendingProps = element.props;
  fiber.pendingWorkPriority = priorityLevel;

  if (__DEV__) {
    fiber._debugSource = element._source;
    fiber._debugOwner = element._owner;
  }

  return fiber;
};

exports.createFiberFromFragment = function (elements, internalContextTag, priorityLevel) {
  // TODO: Consider supporting keyed fragments. Technically, we accidentally
  // support that in the existing React.
  const fiber = createFiber(Fragment, null, internalContextTag);
  fiber.pendingProps = elements;
  fiber.pendingWorkPriority = priorityLevel;
  return fiber;
};

exports.createFiberFromText = function (content, internalContextTag, priorityLevel) {
  const fiber = createFiber(HostText, null, internalContextTag);
  fiber.pendingProps = content;
  fiber.pendingWorkPriority = priorityLevel;
  return fiber;
};

function createFiberFromElementType(type, key, internalContextTag, debugOwner) {
  let fiber;
  if (typeof type === 'function') {
    fiber = shouldConstruct(type) ? createFiber(ClassComponent, key, internalContextTag) : createFiber(IndeterminateComponent, key, internalContextTag);
    fiber.type = type;
  } else if (typeof type === 'string') {
    fiber = createFiber(HostComponent, key, internalContextTag);
    fiber.type = type;
  } else if (typeof type === 'object' && type !== null && typeof type.tag === 'number') {
    // Currently assumed to be a continuation and therefore is a fiber already.
    // TODO: The yield system is currently broken for updates in some cases.
    // The reified yield stores a fiber, but we don't know which fiber that is;
    // the current or a workInProgress? When the continuation gets rendered here
    // we don't know if we can reuse that fiber or if we need to clone it.
    // There is probably a clever way to restructure this.
    fiber = type;
  } else {
    let info = '';
    if (__DEV__) {
      if (type === undefined || typeof type === 'object' && type !== null && Object.keys(type).length === 0) {
        info += ' You likely forgot to export your component from the file ' + "it's defined in.";
      }
      const ownerName = debugOwner ? getComponentName(debugOwner) : null;
      if (ownerName) {
        info += '\n\nCheck the render method of `' + ownerName + '`.';
      }
    }
    invariant(false, 'Element type is invalid: expected a string (for built-in components) ' + 'or a class/function (for composite components) but got: %s.%s', type == null ? type : typeof type, info);
  }
  return fiber;
}

exports.createFiberFromElementType = createFiberFromElementType;

exports.createFiberFromHostInstanceForDeletion = function () {
  const fiber = createFiber(HostComponent, null, NoContext);
  fiber.type = 'DELETED';
  return fiber;
};

exports.createFiberFromCoroutine = function (coroutine, internalContextTag, priorityLevel) {
  const fiber = createFiber(CoroutineComponent, coroutine.key, internalContextTag);
  fiber.type = coroutine.handler;
  fiber.pendingProps = coroutine;
  fiber.pendingWorkPriority = priorityLevel;
  return fiber;
};

exports.createFiberFromYield = function (yieldNode, internalContextTag, priorityLevel) {
  const fiber = createFiber(YieldComponent, null, internalContextTag);
  return fiber;
};

exports.createFiberFromPortal = function (portal, internalContextTag, priorityLevel) {
  const fiber = createFiber(HostPortal, portal.key, internalContextTag);
  fiber.pendingProps = portal.children || [];
  fiber.pendingWorkPriority = priorityLevel;
  fiber.stateNode = {
    containerInfo: portal.containerInfo,
    implementation: portal.implementation
  };
  return fiber;
};

exports.largerPriority = function (p1, p2) {
  return p1 !== NoWork && (p2 === NoWork || p2 > p1) ? p1 : p2;
};