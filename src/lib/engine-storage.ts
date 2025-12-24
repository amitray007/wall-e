import type { Engine, EngineMetadata } from '../types';
import { DEFAULT_ENGINES, getDefaultEngine } from './engines';
import { cleanupStaleExpandedCategories } from '../hooks/useExpandedCategories';

const STORAGE_KEY = 'wallpaper-engines';

/**
 * Load engine metadata from localStorage
 */
export function loadEngineMetadata(): EngineMetadata {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as EngineMetadata;
      // Validate that active engine exists
      const allEngines = getAllEngines(parsed.customEngines);
      const activeExists = allEngines.some(e => e.id === parsed.activeEngineId);

      return {
        activeEngineId: activeExists ? parsed.activeEngineId : getDefaultEngine().id,
        customEngines: parsed.customEngines || []
      };
    }
  } catch (error) {
    console.error('Failed to load engine metadata:', error);
  }

  // Return default metadata
  return {
    activeEngineId: getDefaultEngine().id,
    customEngines: []
  };
}

/**
 * Save engine metadata to localStorage
 */
export function saveEngineMetadata(metadata: EngineMetadata): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('Failed to save engine metadata:', error);
    throw new Error('Failed to save engine configuration');
  }
}

/**
 * Get all engines (defaults + custom)
 */
export function getAllEngines(customEngines: Engine[] = []): Engine[] {
  return [...DEFAULT_ENGINES, ...customEngines];
}

/**
 * Get the currently active engine
 */
export function getActiveEngine(): Engine {
  const metadata = loadEngineMetadata();
  const allEngines = getAllEngines(metadata.customEngines);
  const active = allEngines.find(e => e.id === metadata.activeEngineId);

  return active || getDefaultEngine();
}

/**
 * Set the active engine
 */
export function setActiveEngine(engineId: string): void {
  const metadata = loadEngineMetadata();
  const allEngines = getAllEngines(metadata.customEngines);

  // Verify engine exists
  if (!allEngines.some(e => e.id === engineId)) {
    throw new Error(`Engine not found: ${engineId}`);
  }

  metadata.activeEngineId = engineId;
  saveEngineMetadata(metadata);
}

/**
 * Add a custom engine
 */
export function addCustomEngine(engine: Omit<Engine, 'id' | 'isDefault' | 'createdAt'>): Engine {
  const metadata = loadEngineMetadata();

  // Generate unique ID
  const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const newEngine: Engine = {
    ...engine,
    id,
    isDefault: false,
    createdAt: Date.now()
  };

  // Check for duplicates
  const isDuplicate = metadata.customEngines.some(
    e => e.repoOwner === engine.repoOwner &&
         e.repoName === engine.repoName &&
         e.branch === engine.branch
  );

  if (isDuplicate) {
    throw new Error('An engine with this repository and branch already exists');
  }

  metadata.customEngines.push(newEngine);
  saveEngineMetadata(metadata);

  return newEngine;
}

/**
 * Remove a custom engine
 */
export function removeCustomEngine(engineId: string): void {
  const metadata = loadEngineMetadata();

  // Can't remove default engines
  if (DEFAULT_ENGINES.some(e => e.id === engineId)) {
    throw new Error('Cannot remove default engines');
  }

  metadata.customEngines = metadata.customEngines.filter(e => e.id !== engineId);

  // If we're removing the active engine, switch to default
  if (metadata.activeEngineId === engineId) {
    metadata.activeEngineId = getDefaultEngine().id;
  }

  saveEngineMetadata(metadata);
  
  // Clean up stale expanded categories after removal
  const allEngines = getAllEngines(metadata.customEngines);
  const engineIds = allEngines.map(e => e.id);
  cleanupStaleExpandedCategories(engineIds);
}

/**
 * Find an engine by ID
 */
export function findEngine(engineId: string): Engine | undefined {
  const metadata = loadEngineMetadata();
  const allEngines = getAllEngines(metadata.customEngines);
  return allEngines.find(e => e.id === engineId);
}
