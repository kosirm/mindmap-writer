/**
 * Keyboard Navigation Composable
 *
 * Handles arrow key navigation between nodes in the mindmap.
 * Navigation logic respects the spatial layout (left/right sides).
 */

import type { Ref } from 'vue';
import type { Node } from '@vue-flow/core';

export function useKeyboardNavigation(
  nodes: Ref<Node[]>
) {
  /**
   * Determine if a node is on the left side of the mindmap
   * - For root nodes: check if X position < 0 (left of canvas center)
   * - For child nodes: check if X position < parent's X position
   */
  function isNodeOnLeftSide(node: Node): boolean {
    const parentId = node.data.parentId;
    
    if (!parentId) {
      // Root node: check position relative to canvas center (0, 0)
      return node.position.x < 0;
    }
    
    // Child node: check position relative to parent
    const parent = nodes.value.find(n => n.id === parentId);
    if (!parent) return false;
    
    return node.position.x < parent.position.x;
  }

  /**
   * Get the depth/generation level of a node (0 = root, 1 = child of root, etc.)
   */
  function getNodeDepth(node: Node): number {
    let depth = 0;
    let currentNode = node;

    while (currentNode.data.parentId) {
      depth++;
      const parent = nodes.value.find(n => n.id === currentNode.data.parentId);
      if (!parent) break;
      currentNode = parent;
    }

    return depth;
  }

  /**
   * Get all nodes at the same generation level (same depth in hierarchy)
   */
  function getNodesAtSameGeneration(node: Node): Node[] {
    const depth = getNodeDepth(node);
    const sameGeneration = nodes.value.filter(n => getNodeDepth(n) === depth);

    // Sort by Y position (top to bottom) - this respects visual order regardless of orientation
    return sameGeneration.sort((a, b) => a.position.y - b.position.y);
  }

  /**
   * Get all siblings of a node (nodes with same parent, sorted by visual Y position)
   */
  function getSiblings(node: Node): Node[] {
    const parentId = node.data.parentId || null;
    const siblings = nodes.value.filter(n => (n.data.parentId || null) === parentId);

    // Sort by Y position (top to bottom) - this respects visual order regardless of orientation
    return siblings.sort((a, b) => a.position.y - b.position.y);
  }

  /**
   * Get nodes at same generation on the same side as the current node (sorted by visual Y position)
   */
  function getNodesAtSameGenerationOnSameSide(node: Node): Node[] {
    const isLeft = isNodeOnLeftSide(node);
    const allSameGeneration = getNodesAtSameGeneration(node);

    return allSameGeneration.filter(n => isNodeOnLeftSide(n) === isLeft);
  }

  /**
   * Get nodes at same generation on the opposite side (sorted by visual Y position)
   */
  function getNodesAtSameGenerationOnOppositeSide(node: Node): Node[] {
    const isLeft = isNodeOnLeftSide(node);
    const allSameGeneration = getNodesAtSameGeneration(node);

    return allSameGeneration.filter(n => isNodeOnLeftSide(n) !== isLeft);
  }

  /**
   * Get parent node
   */
  function getParent(node: Node): Node | null {
    if (!node.data.parentId) return null;
    return nodes.value.find(n => n.id === node.data.parentId) || null;
  }

  /**
   * Get first child node (first by visual Y position)
   */
  function getFirstChild(node: Node): Node | null {
    const children = nodes.value.filter(n => n.data.parentId === node.id);
    if (children.length === 0) return null;

    // Sort by Y position (top to bottom) and return first
    children.sort((a, b) => a.position.y - b.position.y);
    return children[0] || null;
  }

  /**
   * Get children on the left side of a node (sorted by visual Y position)
   */
  function getLeftChildren(node: Node): Node[] {
    const children = nodes.value.filter(n => n.data.parentId === node.id);
    const leftChildren = children.filter(child => isNodeOnLeftSide(child));

    // Sort by Y position (top to bottom)
    return leftChildren.sort((a, b) => a.position.y - b.position.y);
  }

  /**
   * Get children on the right side of a node (sorted by visual Y position)
   */
  function getRightChildren(node: Node): Node[] {
    const children = nodes.value.filter(n => n.data.parentId === node.id);
    const rightChildren = children.filter(child => !isNodeOnLeftSide(child));

    // Sort by Y position (top to bottom)
    return rightChildren.sort((a, b) => a.position.y - b.position.y);
  }

  /**
   * Get the child on the left side that is horizontally closest to the parent
   */
  function getClosestLeftChild(node: Node): Node | null {
    const leftChildren = getLeftChildren(node);
    if (leftChildren.length === 0) return null;

    // Find child with smallest Y distance from parent
    return leftChildren.reduce((closest, child) => {
      const closestDistance = Math.abs(closest.position.y - node.position.y);
      const childDistance = Math.abs(child.position.y - node.position.y);
      return childDistance < closestDistance ? child : closest;
    });
  }

  /**
   * Get the child on the right side that is horizontally closest to the parent
   */
  function getClosestRightChild(node: Node): Node | null {
    const rightChildren = getRightChildren(node);
    if (rightChildren.length === 0) return null;

    // Find child with smallest Y distance from parent
    return rightChildren.reduce((closest, child) => {
      const closestDistance = Math.abs(closest.position.y - node.position.y);
      const childDistance = Math.abs(child.position.y - node.position.y);
      return childDistance < closestDistance ? child : closest;
    });
  }

  /**
   * Get all root nodes (sorted by visual Y position)
   */
  function getRootNodes(): Node[] {
    const roots = nodes.value.filter(n => !n.data.parentId);
    return roots.sort((a, b) => a.position.y - b.position.y);
  }

  /**
   * Get root nodes on the left side (sorted by visual Y position)
   */
  function getLeftRootNodes(): Node[] {
    return getRootNodes().filter(n => isNodeOnLeftSide(n));
  }

  /**
   * Get root nodes on the right side (sorted by visual Y position)
   */
  function getRightRootNodes(): Node[] {
    return getRootNodes().filter(n => !isNodeOnLeftSide(n));
  }

  /**
   * Navigate left (hierarchy navigation)
   * - Left side: go deeper (to first child)
   * - Right side: go back (to parent)
   * - Root node: go to horizontally closest left child
   */
  function navigateLeft(currentNode: Node): Node | null {
    const isLeft = isNodeOnLeftSide(currentNode);
    const isRoot = !currentNode.data.parentId;

    if (isRoot) {
      // Root node: go to horizontally closest left child
      return getClosestLeftChild(currentNode);
    }

    if (isLeft) {
      // Left side: go deeper (to first child)
      return getFirstChild(currentNode);
    } else {
      // Right side: go back (to parent)
      return getParent(currentNode);
    }
  }

  /**
   * Navigate right (hierarchy navigation)
   * - Left side: go back (to parent)
   * - Right side: go deeper (to first child)
   * - Root node: go to horizontally closest right child
   */
  function navigateRight(currentNode: Node): Node | null {
    const isLeft = isNodeOnLeftSide(currentNode);
    const isRoot = !currentNode.data.parentId;

    if (isRoot) {
      // Root node: go to horizontally closest right child
      return getClosestRightChild(currentNode);
    }

    if (isLeft) {
      // Left side: go back (to parent)
      return getParent(currentNode);
    } else {
      // Right side: go deeper (to first child)
      return getFirstChild(currentNode);
    }
  }

  /**
   * Navigate up (sibling navigation at same generation level)
   * Move to previous node at same generation on same side, or wrap to opposite side
   */
  function navigateUp(currentNode: Node): Node | null {
    const sameSideNodes = getNodesAtSameGenerationOnSameSide(currentNode);
    const currentIndex = sameSideNodes.findIndex(n => n.id === currentNode.id);

    if (currentIndex > 0) {
      // Move to previous node at same generation on same side
      return sameSideNodes[currentIndex - 1] || null;
    }

    // Wrap to opposite side (last node at same generation)
    const oppositeSideNodes = getNodesAtSameGenerationOnOppositeSide(currentNode);
    if (oppositeSideNodes.length > 0) {
      return oppositeSideNodes[oppositeSideNodes.length - 1] || null;
    }

    return null;
  }

  /**
   * Navigate down (sibling navigation at same generation level)
   * Move to next node at same generation on same side, or wrap to opposite side
   */
  function navigateDown(currentNode: Node): Node | null {
    const sameSideNodes = getNodesAtSameGenerationOnSameSide(currentNode);
    const currentIndex = sameSideNodes.findIndex(n => n.id === currentNode.id);

    if (currentIndex < sameSideNodes.length - 1) {
      // Move to next node at same generation on same side
      return sameSideNodes[currentIndex + 1] || null;
    }

    // Wrap to opposite side (first node at same generation)
    const oppositeSideNodes = getNodesAtSameGenerationOnOppositeSide(currentNode);
    if (oppositeSideNodes.length > 0) {
      return oppositeSideNodes[0] || null;
    }

    return null;
  }

  return {
    // Helper functions
    isNodeOnLeftSide,
    getNodeDepth,
    getNodesAtSameGeneration,
    getNodesAtSameGenerationOnSameSide,
    getNodesAtSameGenerationOnOppositeSide,
    getSiblings,
    getParent,
    getFirstChild,
    getLeftChildren,
    getRightChildren,
    getClosestLeftChild,
    getClosestRightChild,
    getRootNodes,
    getLeftRootNodes,
    getRightRootNodes,

    // Navigation functions
    navigateLeft,
    navigateRight,
    navigateUp,
    navigateDown,
  };
}

