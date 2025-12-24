/**
 * Utility functions for handling URL parameters and route-based engine loading
 */

/**
 * Parse GitHub repository from various URL formats
 * Supports:
 * - https://github.com/owner/repo
 * - http://github.com/owner/repo
 * - github.com/owner/repo
 * - owner/repo
 */
export function parseGitHubRepoFromUrl(
  input: string
): { owner: string; repo: string } | null {
  if (!input.trim()) return null;

  const trimmed = input.trim();

  // Match various formats
  const patterns = [
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/\s?#]+)/i,
    /^github\.com\/([^\/]+)\/([^\/\s?#]+)/i,
    /^([^\/\s]+)\/([^\/\s]+)$/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ""), // Remove .git suffix if present
      };
    }
  }

  return null;
}

/**
 * Get URL search parameters
 */
export function getUrlParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

/**
 * Get repo parameter from URL
 * Supports both 'repo' and 'r' as parameter names
 */
export function getRepoFromUrl(): string | null {
  const params = getUrlParams();
  return params.get("repo") || params.get("r");
}

/**
 * Get branch parameter from URL
 * Supports both 'branch' and 'b' as parameter names
 * Defaults to 'main' if not specified
 */
export function getBranchFromUrl(): string {
  const params = getUrlParams();
  return params.get("branch") || params.get("b") || "main";
}

/**
 * Update URL with current engine info without page reload
 */
export function updateUrlWithEngine(
  repoOwner: string,
  repoName: string,
  branch: string = "main"
): void {
  const url = new URL(window.location.href);
  url.searchParams.set("repo", `${repoOwner}/${repoName}`);
  
  // Only add branch if it's not 'main' (keep URL clean)
  if (branch !== "main") {
    url.searchParams.set("branch", branch);
  } else {
    url.searchParams.delete("branch");
  }

  // Update URL without reload
  window.history.pushState({}, "", url.toString());
}

/**
 * Clear engine parameters from URL
 */
export function clearEngineFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("repo");
  url.searchParams.delete("r");
  url.searchParams.delete("branch");
  url.searchParams.delete("b");

  // Update URL without reload
  window.history.replaceState({}, "", url.toString());
}

/**
 * Check if URL has engine parameters
 */
export function hasEngineInUrl(): boolean {
  const params = getUrlParams();
  return params.has("repo") || params.has("r");
}

/**
 * Parse engine info from URL
 */
export interface UrlEngineInfo {
  owner: string;
  repo: string;
  branch: string;
}

export function parseEngineFromUrl(): UrlEngineInfo | null {
  const repoParam = getRepoFromUrl();
  if (!repoParam) return null;

  const parsed = parseGitHubRepoFromUrl(repoParam);
  if (!parsed) return null;

  return {
    owner: parsed.owner,
    repo: parsed.repo,
    branch: getBranchFromUrl(),
  };
}

