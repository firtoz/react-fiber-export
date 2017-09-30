/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule ReactFiberHostContext
 * 
 */

'use strict';

const { createCursor, pop, push } = require('./ReactFiberStack');

const invariant = require('fbjs/lib/invariant');

const NO_CONTEXT = {};

module.exports = function (config) {
  const { getChildHostContext, getRootHostContext } = config;

  let contextStackCursor = createCursor(NO_CONTEXT);
  let contextFiberStackCursor = createCursor(NO_CONTEXT);
  let rootInstanceStackCursor = createCursor(NO_CONTEXT);

  function requiredContext(c) {
    invariant(c !== NO_CONTEXT, 'Expected host context to exist. This error is likely caused by a bug in React. Please file an issue.');
    return c;
  }

  function getRootHostContainer() {
    const rootInstance = requiredContext(rootInstanceStackCursor.current);
    return rootInstance;
  }

  function pushHostContainer(fiber, nextRootInstance) {
    // Push current root instance onto the stack;
    // This allows us to reset root when portals are popped.
    push(rootInstanceStackCursor, nextRootInstance, fiber);

    const nextRootContext = getRootHostContext(nextRootInstance);

    // Track the context and the Fiber that provided it.
    // This enables us to pop only Fibers that provide unique contexts.
    push(contextFiberStackCursor, fiber, fiber);
    push(contextStackCursor, nextRootContext, fiber);
  }

  function popHostContainer(fiber) {
    pop(contextStackCursor, fiber);
    pop(contextFiberStackCursor, fiber);
    pop(rootInstanceStackCursor, fiber);
  }

  function getHostContext() {
    const context = requiredContext(contextStackCursor.current);
    return context;
  }

  function pushHostContext(fiber) {
    const rootInstance = requiredContext(rootInstanceStackCursor.current);
    const context = requiredContext(contextStackCursor.current);
    const nextContext = getChildHostContext(context, fiber.type, rootInstance);

    // Don't push this Fiber's context unless it's unique.
    if (context === nextContext) {
      return;
    }

    // Track the context and the Fiber that provided it.
    // This enables us to pop only Fibers that provide unique contexts.
    push(contextFiberStackCursor, fiber, fiber);
    push(contextStackCursor, nextContext, fiber);
  }

  function popHostContext(fiber) {
    // Do not pop unless this Fiber provided the current context.
    // pushHostContext() only pushes Fibers that provide unique contexts.
    if (contextFiberStackCursor.current !== fiber) {
      return;
    }

    pop(contextStackCursor, fiber);
    pop(contextFiberStackCursor, fiber);
  }

  function resetHostContainer() {
    contextStackCursor.current = NO_CONTEXT;
    rootInstanceStackCursor.current = NO_CONTEXT;
  }

  return {
    getHostContext,
    getRootHostContainer,
    popHostContainer,
    popHostContext,
    pushHostContainer,
    pushHostContext,
    resetHostContainer
  };
};