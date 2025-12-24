import type { CategoryNode } from '../types';

/**
 * Flatten a category tree into a list of all paths
 * Useful for filtering images by category and all its children
 */
export function flattenCategoryPaths(node: CategoryNode): string[] {
  const paths = [node.fullPath];
  
  node.children.forEach(child => {
    paths.push(...flattenCategoryPaths(child));
  });
  
  return paths;
}

/**
 * Check if an image path belongs to a category or any of its children
 */
export function isImageInCategory(imagePath: string, categoryPath: string, categoryTree: CategoryNode[]): boolean {
  // Find the category node
  const findNode = (nodes: CategoryNode[], path: string): CategoryNode | null => {
    for (const node of nodes) {
      if (node.fullPath === path) return node;
      const found = findNode(node.children, path);
      if (found) return found;
    }
    return null;
  };
  
  const node = findNode(categoryTree, categoryPath);
  if (!node) return false;
  
  // Get all paths including children
  const allPaths = flattenCategoryPaths(node);
  
  // Check if image path starts with any of these paths
  return allPaths.some(path => {
    if (path === 'uncategorized') {
      // For uncategorized, image should not have any folder
      return !imagePath.includes('/');
    }
    return imagePath.startsWith(path + '/') || imagePath === path;
  });
}

/**
 * Get the total count of images in a category and all its children
 */
export function getTotalCount(node: CategoryNode): number {
  return node.count;
}

/**
 * Find a category node by its full path
 */
export function findCategoryNode(tree: CategoryNode[], fullPath: string): CategoryNode | null {
  for (const node of tree) {
    if (node.fullPath === fullPath) return node;
    const found = findCategoryNode(node.children, fullPath);
    if (found) return found;
  }
  return null;
}

/**
 * Get all ancestor paths for a given category path
 * Example: 'folder/subfolder/deep' -> ['folder', 'folder/subfolder', 'folder/subfolder/deep']
 */
export function getAncestorPaths(fullPath: string): string[] {
  const segments = fullPath.split('/');
  const paths: string[] = [];
  
  for (let i = 0; i < segments.length; i++) {
    paths.push(segments.slice(0, i + 1).join('/'));
  }
  
  return paths;
}

/**
 * Check if a category should be expanded based on selected category
 * A category should be expanded if the selected category is one of its children
 */
export function shouldAutoExpand(nodeFullPath: string, selectedCategoryPath: string | null): boolean {
  if (!selectedCategoryPath) return false;
  
  // Check if selected category is a child of this node
  return selectedCategoryPath.startsWith(nodeFullPath + '/');
}

