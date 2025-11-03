import type { Engine } from '../types';
import defaultEnginesData from '../data/default-engines.json';

/**
 * Default engines loaded from JSON configuration
 */
export const DEFAULT_ENGINES: Engine[] = defaultEnginesData as Engine[];

/**
 * Get default engine (dharmx/walls)
 */
export function getDefaultEngine(): Engine {
  return DEFAULT_ENGINES[0];
}

/**
 * Check if an engine ID is a default engine
 */
export function isDefaultEngine(engineId: string): boolean {
  return DEFAULT_ENGINES.some(engine => engine.id === engineId);
}

/**
 * Find an engine by ID in the default engines list
 */
export function findDefaultEngine(engineId: string): Engine | undefined {
  return DEFAULT_ENGINES.find(engine => engine.id === engineId);
}
