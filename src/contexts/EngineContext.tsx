import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Engine } from '../types';
import {
  loadEngineMetadata,
  getAllEngines,
  addCustomEngine as addCustomEngineToStorage,
  removeCustomEngine as removeCustomEngineFromStorage,
  setActiveEngine as setActiveEngineInStorage,
  getActiveEngine as getActiveEngineFromStorage
} from '../lib/engine-storage';
import { fetchBranchSHA, clearEngineCache, fetchUserAvatar } from '../lib/github-api';

interface EngineContextValue {
  activeEngine: Engine;
  allEngines: Engine[];
  isLoading: boolean;
  switchEngine: (engineId: string) => Promise<void>;
  addEngine: (engine: Omit<Engine, 'id' | 'isDefault' | 'createdAt'>) => Promise<Engine>;
  removeEngine: (engineId: string) => void;
  fetchSHA: (owner: string, repo: string, branch: string) => Promise<string>;
  refreshEngines: () => void;
}

const EngineContext = createContext<EngineContextValue | undefined>(undefined);

interface EngineProviderProps {
  children: ReactNode;
}

export function EngineProvider({ children }: EngineProviderProps) {
  const [activeEngine, setActiveEngine] = useState<Engine>(() => getActiveEngineFromStorage());
  const [isLoading, setIsLoading] = useState(false);
  const [allEngines, setAllEngines] = useState<Engine[]>(() => {
    const metadata = loadEngineMetadata();
    return getAllEngines(metadata.customEngines);
  });

  const refreshEngines = useCallback(() => {
    const updated = getActiveEngineFromStorage();
    setActiveEngine(updated);
    const metadata = loadEngineMetadata();
    setAllEngines(getAllEngines(metadata.customEngines));
  }, []);

  const switchEngine = useCallback(async (engineId: string) => {
    setIsLoading(true);
    try {
      setActiveEngineInStorage(engineId);

      const metadata = loadEngineMetadata();
      const allEngines = getAllEngines(metadata.customEngines);
      const newEngine = allEngines.find(e => e.id === engineId);

      if (newEngine) {
        setActiveEngine(newEngine);
        // Clear cache for old engine to free memory
        clearEngineCache(activeEngine.id);
      }
    } catch (error) {
      console.error('Failed to switch engine:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [activeEngine.id]);

  const addEngine = useCallback(async (
    engine: Omit<Engine, 'id' | 'isDefault' | 'createdAt'>
  ): Promise<Engine> => {
    try {
      // Fetch avatar URL if not provided
      let avatarUrl = engine.avatarUrl;
      if (!avatarUrl) {
        try {
          avatarUrl = await fetchUserAvatar(engine.repoOwner);
        } catch (error) {
          console.warn('Failed to fetch avatar, using fallback:', error);
          avatarUrl = `https://github.com/${engine.repoOwner}.png`;
        }
      }

      const newEngine = addCustomEngineToStorage({ ...engine, avatarUrl });
      refreshEngines();
      return newEngine;
    } catch (error) {
      console.error('Failed to add engine:', error);
      throw error;
    }
  }, [refreshEngines]);

  const removeEngine = useCallback((engineId: string) => {
    try {
      removeCustomEngineFromStorage(engineId);
      clearEngineCache(engineId);
      refreshEngines();
    } catch (error) {
      console.error('Failed to remove engine:', error);
      throw error;
    }
  }, [refreshEngines]);

  const fetchSHA = useCallback(async (
    owner: string,
    repo: string,
    branch: string
  ): Promise<string> => {
    return await fetchBranchSHA(owner, repo, branch);
  }, []);

  const value: EngineContextValue = {
    activeEngine,
    allEngines,
    isLoading,
    switchEngine,
    addEngine,
    removeEngine,
    fetchSHA,
    refreshEngines
  };

  return (
    <EngineContext.Provider value={value}>
      {children}
    </EngineContext.Provider>
  );
}

export function useEngine(): EngineContextValue {
  const context = useContext(EngineContext);
  if (!context) {
    throw new Error('useEngine must be used within an EngineProvider');
  }
  return context;
}
