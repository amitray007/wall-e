import { useEffect, useState, useCallback, useRef } from "react";
import type { Engine } from "../types";
import { parseEngineFromUrl, hasEngineInUrl } from "../lib/url-params";
import { fetchBranchSHA, fetchUserAvatar } from "../lib/github-api";

export interface UrlEngineState {
  loading: boolean;
  error: string | null;
  engine: Engine | null;
}

interface UseUrlEngineOptions {
  onEngineLoaded?: (engine: Engine) => void;
  onError?: (error: string) => void;
  onResolved?: () => void; // Called when URL engine processing is complete (success, error, or no URL)
}

/**
 * Custom hook to handle URL-based engine loading
 * Checks URL parameters on mount and loads the specified repository
 */
export function useUrlEngine(options: UseUrlEngineOptions = {}) {
  const [state, setState] = useState<UrlEngineState>({
    loading: false,
    error: null,
    engine: null,
  });

  const hasProcessedUrl = useRef(false);

  const loadEngineFromUrl = useCallback(async () => {
    // Only process once
    if (hasProcessedUrl.current) return;

    // Check if URL has engine parameters
    if (!hasEngineInUrl()) {
      // No URL engine - mark as resolved
      options.onResolved?.();
      return;
    }

    const urlInfo = parseEngineFromUrl();
    if (!urlInfo) {
      const error = "Invalid repository format in URL";
      setState({ loading: false, error, engine: null });
      options.onError?.(error);
      options.onResolved?.();
      return;
    }

    hasProcessedUrl.current = true;
    setState({ loading: true, error: null, engine: null });

    try {
      // Fetch tree SHA from GitHub
      let treeSha: string;
      let actualBranch = urlInfo.branch;

      try {
        treeSha = await fetchBranchSHA(
          urlInfo.owner,
          urlInfo.repo,
          urlInfo.branch
        );
      } catch (error) {
        // If "main" branch failed, try "master" as fallback
        if (urlInfo.branch === "main") {
          try {
            treeSha = await fetchBranchSHA(urlInfo.owner, urlInfo.repo, "master");
            actualBranch = "master";
          } catch {
            // Both branches failed, throw original error
            throw error;
          }
        } else {
          throw error;
        }
      }

      // Fetch user avatar
      let avatarUrl: string;
      try {
        avatarUrl = await fetchUserAvatar(urlInfo.owner);
      } catch {
        avatarUrl = `https://github.com/${urlInfo.owner}.png`;
      }

      // Create temporary engine object
      const engine: Engine = {
        id: `url-${urlInfo.owner}-${urlInfo.repo}-${Date.now()}`,
        name: `${urlInfo.owner}/${urlInfo.repo}`,
        repoOwner: urlInfo.owner,
        repoName: urlInfo.repo,
        branch: actualBranch,
        treeSha,
        excludedFolders: [".github", ".git"],
        imageExtensions: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"],
        isDefault: false,
        avatarUrl,
        createdAt: Date.now(),
      };

      setState({ loading: false, error: null, engine });
      options.onEngineLoaded?.(engine);
      // Note: onResolved is called by onEngineLoaded handler via setTemporaryEngine
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load repository from URL";
      setState({ loading: false, error: errorMessage, engine: null });
      options.onError?.(errorMessage);
      options.onResolved?.();
    }
  }, [options]);

  // Load engine from URL on mount
  useEffect(() => {
    loadEngineFromUrl();
  }, [loadEngineFromUrl]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      // Reset the processed flag to allow reprocessing
      hasProcessedUrl.current = false;
      loadEngineFromUrl();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [loadEngineFromUrl]);

  return state;
}

