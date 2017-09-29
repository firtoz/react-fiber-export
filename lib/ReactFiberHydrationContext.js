/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @providesModule ReactFiberHydrationContext
 * 
 */

'use strict';

var invariant = require('fbjs/lib/invariant');

const { HostComponent, HostText, HostRoot } = require('ReactTypeOfWork');
const { Deletion, Placement } = require('ReactTypeOfSideEffect');

const { createFiberFromHostInstanceForDeletion } = require('ReactFiber');

module.exports = function (config) {
  const {
    shouldSetTextContent,
    canHydrateInstance,
    canHydrateTextInstance,
    getNextHydratableSibling,
    getFirstHydratableChild,
    hydrateInstance,
    hydrateTextInstance,
    didNotHydrateInstance,
    didNotFindHydratableInstance,
    didNotFindHydratableTextInstance
  } = config;

  // If this doesn't have hydration mode.
  if (!(canHydrateInstance && canHydrateTextInstance && getNextHydratableSibling && getFirstHydratableChild && hydrateInstance && hydrateTextInstance && didNotHydrateInstance && didNotFindHydratableInstance && didNotFindHydratableTextInstance)) {
    return {
      enterHydrationState() {
        return false;
      },
      resetHydrationState() {},
      tryToClaimNextHydratableInstance() {},
      prepareToHydrateHostInstance() {
        invariant(false, 'Expected prepareToHydrateHostInstance() to never be called. ' + 'This error is likely caused by a bug in React. Please file an issue.');
      },
      prepareToHydrateHostTextInstance() {
        invariant(false, 'Expected prepareToHydrateHostTextInstance() to never be called. ' + 'This error is likely caused by a bug in React. Please file an issue.');
      },
      popHydrationState(fiber) {
        return false;
      }
    };
  }

  // The deepest Fiber on the stack involved in a hydration context.
  // This may have been an insertion or a hydration.
  let hydrationParentFiber = null;
  let nextHydratableInstance = null;
  let isHydrating = false;

  function enterHydrationState(fiber) {
    const parentInstance = fiber.stateNode.containerInfo;
    nextHydratableInstance = getFirstHydratableChild(parentInstance);
    hydrationParentFiber = fiber;
    isHydrating = true;
    return true;
  }

  function deleteHydratableInstance(returnFiber, instance) {
    if (__DEV__) {
      switch (returnFiber.tag) {
        case HostRoot:
          didNotHydrateInstance(returnFiber.stateNode.containerInfo, instance);
          break;
        case HostComponent:
          didNotHydrateInstance(returnFiber.stateNode, instance);
          break;
      }
    }

    const childToDelete = createFiberFromHostInstanceForDeletion();
    childToDelete.stateNode = instance;
    childToDelete.return = returnFiber;
    childToDelete.effectTag = Deletion;

    // This might seem like it belongs on progressedFirstDeletion. However,
    // these children are not part of the reconciliation list of children.
    // Even if we abort and rereconcile the children, that will try to hydrate
    // again and the nodes are still in the host tree so these will be
    // recreated.
    if (returnFiber.lastEffect !== null) {
      returnFiber.lastEffect.nextEffect = childToDelete;
      returnFiber.lastEffect = childToDelete;
    } else {
      returnFiber.firstEffect = returnFiber.lastEffect = childToDelete;
    }
  }

  function insertNonHydratedInstance(returnFiber, fiber) {
    fiber.effectTag |= Placement;
    if (__DEV__) {
      var parentInstance;
      switch (returnFiber.tag) {
        // TODO: Currently we don't warn for insertions into the root because
        // we always insert into the root in the non-hydrating case. We just
        // delete the existing content. Reenable this once we have a better
        // strategy for determining if we're hydrating or not.
        // case HostRoot:
        //   parentInstance = returnFiber.stateNode.containerInfo;
        //   break;
        case HostComponent:
          parentInstance = returnFiber.stateNode;
          break;
        default:
          return;
      }
      switch (fiber.tag) {
        case HostComponent:
          const type = fiber.type;
          const props = fiber.pendingProps;
          didNotFindHydratableInstance(parentInstance, type, props);
          break;
        case HostText:
          const text = fiber.pendingProps;
          didNotFindHydratableTextInstance(parentInstance, text);
          break;
      }
    }
  }

  function canHydrate(fiber, nextInstance) {
    switch (fiber.tag) {
      case HostComponent:
        {
          const type = fiber.type;
          const props = fiber.pendingProps;
          return canHydrateInstance(nextInstance, type, props);
        }
      case HostText:
        {
          const text = fiber.pendingProps;
          return canHydrateTextInstance(nextInstance, text);
        }
      default:
        return false;
    }
  }

  function tryToClaimNextHydratableInstance(fiber) {
    if (!isHydrating) {
      return;
    }
    let nextInstance = nextHydratableInstance;
    if (!nextInstance) {
      // Nothing to hydrate. Make it an insertion.
      insertNonHydratedInstance(hydrationParentFiber, fiber);
      isHydrating = false;
      hydrationParentFiber = fiber;
      return;
    }
    if (!canHydrate(fiber, nextInstance)) {
      // If we can't hydrate this instance let's try the next one.
      // We use this as a heuristic. It's based on intuition and not data so it
      // might be flawed or unnecessary.
      nextInstance = getNextHydratableSibling(nextInstance);
      if (!nextInstance || !canHydrate(fiber, nextInstance)) {
        // Nothing to hydrate. Make it an insertion.
        insertNonHydratedInstance(hydrationParentFiber, fiber);
        isHydrating = false;
        hydrationParentFiber = fiber;
        return;
      }
      // We matched the next one, we'll now assume that the first one was
      // superfluous and we'll delete it. Since we can't eagerly delete it
      // we'll have to schedule a deletion. To do that, this node needs a dummy
      // fiber associated with it.
      deleteHydratableInstance(hydrationParentFiber, nextHydratableInstance);
    }
    fiber.stateNode = nextInstance;
    hydrationParentFiber = fiber;
    nextHydratableInstance = getFirstHydratableChild(nextInstance);
  }

  function prepareToHydrateHostInstance(fiber, rootContainerInstance, hostContext) {
    const instance = fiber.stateNode;
    const updatePayload = hydrateInstance(instance, fiber.type, fiber.memoizedProps, rootContainerInstance, hostContext, fiber);
    // TODO: Type this specific to this type of component.
    fiber.updateQueue = updatePayload;
    // If the update payload indicates that there is a change or if there
    // is a new ref we mark this as an update.
    if (updatePayload !== null) {
      return true;
    }
    return false;
  }

  function prepareToHydrateHostTextInstance(fiber) {
    const textInstance = fiber.stateNode;
    const shouldUpdate = hydrateTextInstance(textInstance, fiber.memoizedProps, fiber);
    return shouldUpdate;
  }

  function popToNextHostParent(fiber) {
    let parent = fiber.return;
    while (parent !== null && parent.tag !== HostComponent && parent.tag !== HostRoot) {
      parent = parent.return;
    }
    hydrationParentFiber = parent;
  }

  function popHydrationState(fiber) {
    if (fiber !== hydrationParentFiber) {
      // We're deeper than the current hydration context, inside an inserted
      // tree.
      return false;
    }
    if (!isHydrating) {
      // If we're not currently hydrating but we're in a hydration context, then
      // we were an insertion and now need to pop up reenter hydration of our
      // siblings.
      popToNextHostParent(fiber);
      isHydrating = true;
      return false;
    }

    const type = fiber.type;

    // If we have any remaining hydratable nodes, we need to delete them now.
    // We only do this deeper than head and body since they tend to have random
    // other nodes in them. We also ignore components with pure text content in
    // side of them.
    // TODO: Better heuristic.
    if (fiber.tag !== HostComponent || type !== 'head' && type !== 'body' && !shouldSetTextContent(type, fiber.memoizedProps)) {
      let nextInstance = nextHydratableInstance;
      while (nextInstance) {
        deleteHydratableInstance(fiber, nextInstance);
        nextInstance = getNextHydratableSibling(nextInstance);
      }
    }

    popToNextHostParent(fiber);
    nextHydratableInstance = hydrationParentFiber ? getNextHydratableSibling(fiber.stateNode) : null;
    return true;
  }

  function resetHydrationState() {
    hydrationParentFiber = null;
    nextHydratableInstance = null;
    isHydrating = false;
  }

  return {
    enterHydrationState,
    resetHydrationState,
    tryToClaimNextHydratableInstance,
    prepareToHydrateHostInstance,
    prepareToHydrateHostTextInstance,
    popHydrationState
  };
};