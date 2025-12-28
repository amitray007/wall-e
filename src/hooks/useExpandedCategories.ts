import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'expanded-categories';

/**
 * Clean up expanded categories for engines that no longer exist
 */
export function cleanupStaleExpandedCategories(existingEngineIds: string[]): void {
  try {
    const keysToRemove: string[] = [];
    
    // Iterate through all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${STORAGE_KEY}-`)) {
        // Extract engine ID from key
        const engineId = key.replace(`${STORAGE_KEY}-`, '');
        
        // Check if this engine still exists
        if (!existingEngineIds.includes(engineId)) {
          keysToRemove.push(key);
        }
      }
    }
    
    // Remove stale keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
  } catch (error) {
    console.error('Failed to cleanup stale expanded categories:', error);
  }
}

/**
 * Hook to manage expanded/collapsed state of categories with localStorage persistence
 */
export function useExpandedCategories(engineId: string) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}-${engineId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(parsed);
      }
    } catch (error) {
      console.error('Failed to load expanded categories from localStorage:', error);
    }
    return new Set<string>();
  });

  // Persist to localStorage whenever it changes
  useEffect(() => {
    try {
      const array = Array.from(expandedCategories);
      localStorage.setItem(`${STORAGE_KEY}-${engineId}`, JSON.stringify(array));
    } catch (error) {
      console.error('Failed to save expanded categories to localStorage:', error);
    }
  }, [expandedCategories, engineId]);

  const toggleExpand = useCallback((fullPath: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(fullPath)) {
        next.delete(fullPath);
      } else {
        next.add(fullPath);
      }
      return next;
    });
  }, []);

  const expandCategory = useCallback((fullPath: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.add(fullPath);
      return next;
    });
  }, []);

  const collapseCategory = useCallback((fullPath: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.delete(fullPath);
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  const expandAll = useCallback((allPaths: string[]) => {
    setExpandedCategories(new Set(allPaths));
  }, []);

  return {
    expandedCategories,
    toggleExpand,
    expandCategory,
    collapseCategory,
    collapseAll,
    expandAll,
  };
}

