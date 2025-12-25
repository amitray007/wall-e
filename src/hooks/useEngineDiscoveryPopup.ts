import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Engine } from '../types';

// ============================================
// CONFIGURATION - Easy to tweak
// ============================================
const SCROLL_TRIGGER_INTERVAL = 5; // Show popup every N scroll loads (adjust as needed)
const DONT_SHOW_AGAIN_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const SUGGESTED_ENGINES_COUNT = 4; // Number of engines to suggest
const STORAGE_KEY = 'engineDiscoveryDontShowAgain';

interface UseEngineDiscoveryPopupOptions {
  scrollCount: number;
  activeEngineId: string;
  allEngines: Engine[];
}

interface UseEngineDiscoveryPopupResult {
  showPopup: boolean;
  suggestedEngines: Engine[];
  dismissPopup: () => void;
  dontShowAgain: () => void;
}

/**
 * Check if "don't show again" is still active (within 24 hours)
 */
function isDontShowAgainActive(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    const timestamp = parseInt(stored, 10);
    if (isNaN(timestamp)) return false;

    const now = Date.now();
    return now - timestamp < DONT_SHOW_AGAIN_DURATION_MS;
  } catch {
    return false;
  }
}

/**
 * Set "don't show again" timestamp
 */
function setDontShowAgainTimestamp(): void {
  try {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  } catch (error) {
    console.warn('Failed to save dont show again preference:', error);
  }
}

/**
 * Hook to manage engine discovery popup visibility and suggestions
 */
/**
 * Fisher-Yates shuffle with seed for consistent but different results each time
 */
function shuffleArray<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let currentIndex = result.length;
  
  // Simple seeded random number generator
  const seededRandom = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  while (currentIndex > 0) {
    const randomIndex = Math.floor(seededRandom() * currentIndex);
    currentIndex--;
    [result[currentIndex], result[randomIndex]] = [result[randomIndex], result[currentIndex]];
  }

  return result;
}

export function useEngineDiscoveryPopup({
  scrollCount,
  activeEngineId,
  allEngines,
}: UseEngineDiscoveryPopupOptions): UseEngineDiscoveryPopupResult {
  const [isVisible, setIsVisible] = useState(false);
  const [lastShownAtScroll, setLastShownAtScroll] = useState(0);
  const [isDontShowAgain, setIsDontShowAgain] = useState(() => isDontShowAgainActive());
  const [shuffleSeed, setShuffleSeed] = useState(() => Date.now());

  // Get suggested engines (excluding active engine) - reshuffles each time shuffleSeed changes
  const suggestedEngines = useMemo(() => {
    const otherEngines = allEngines.filter(e => e.id !== activeEngineId);
    
    // Shuffle using seed and take first N engines
    const shuffled = shuffleArray(otherEngines, shuffleSeed);
    return shuffled.slice(0, SUGGESTED_ENGINES_COUNT);
  }, [allEngines, activeEngineId, shuffleSeed]);

  // Check if popup should show based on scroll count
  useEffect(() => {
    // Don't show if "don't show again" is active
    if (isDontShowAgain) return;

    // Don't show if no other engines available
    if (allEngines.filter(e => e.id !== activeEngineId).length === 0) return;

    // Check if we've hit a trigger point (every N scrolls)
    // scrollCount starts at 0, so we trigger at 5, 10, 15, etc.
    if (scrollCount > 0 && scrollCount % SCROLL_TRIGGER_INTERVAL === 0) {
      // Only show if this is a new trigger (not the same scroll count we already showed for)
      if (scrollCount !== lastShownAtScroll) {
        // Generate new shuffle seed for fresh random selection
        setShuffleSeed(Date.now() + Math.random() * 1000);
        setIsVisible(true);
        setLastShownAtScroll(scrollCount);
      }
    }
  }, [scrollCount, isDontShowAgain, allEngines, activeEngineId, lastShownAtScroll]);

  // Reset visibility when active engine changes
  useEffect(() => {
    setIsVisible(false);
    setLastShownAtScroll(0);
  }, [activeEngineId]);

  // Dismiss popup (temporary, will show again on next trigger)
  const dismissPopup = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Don't show again for 24 hours
  const dontShowAgain = useCallback(() => {
    setDontShowAgainTimestamp();
    setIsDontShowAgain(true);
    setIsVisible(false);
  }, []);

  return {
    showPopup: isVisible,
    suggestedEngines,
    dismissPopup,
    dontShowAgain,
  };
}

// Export config for potential external use
export { SCROLL_TRIGGER_INTERVAL, DONT_SHOW_AGAIN_DURATION_MS };

