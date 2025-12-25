/**
 * GitHub Personal Access Token management
 */

const TOKEN_STORAGE_KEY = 'github-api-token';

/**
 * Get stored GitHub token
 */
export function getGitHubToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to get GitHub token:', error);
    return null;
  }
}

/**
 * Save GitHub token
 */
export function saveGitHubToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
  } catch (error) {
    console.error('Failed to save GitHub token:', error);
    throw new Error('Failed to save token');
  }
}

/**
 * Remove GitHub token
 */
export function removeGitHubToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to remove GitHub token:', error);
  }
}

/**
 * Check if token is configured
 */
export function hasGitHubToken(): boolean {
  const token = getGitHubToken();
  return token !== null && token.length > 0;
}

/**
 * Validate token format (basic check)
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token || token.trim().length === 0) {
    return false;
  }
  
  const trimmed = token.trim();
  
  // GitHub classic tokens start with 'ghp_' and are 40+ chars
  // GitHub fine-grained tokens start with 'github_pat_' and are longer
  if (trimmed.startsWith('ghp_') && trimmed.length >= 40) {
    return true;
  }
  
  if (trimmed.startsWith('github_pat_') && trimmed.length >= 80) {
    return true;
  }
  
  return false;
}

/**
 * Validate token by making a test API call
 * Returns true if token is valid, false otherwise
 */
export async function validateTokenWithAPI(token: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid token or token has been revoked' };
    }

    if (response.status === 403) {
      return { valid: false, error: 'Token does not have required permissions' };
    }

    return { valid: false, error: `Validation failed: ${response.statusText}` };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Network error during validation' 
    };
  }
}

/**
 * Get authorization headers for GitHub API
 */
export function getAuthHeaders(): HeadersInit {
  const token = getGitHubToken();
  
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }
  
  return {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  used: number;
}

/**
 * Parse rate limit from response headers
 */
export function parseRateLimitFromHeaders(headers: Headers): RateLimitInfo | null {
  try {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');
    const used = headers.get('x-ratelimit-used');
    
    if (limit && remaining && reset) {
      return {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
        used: used ? parseInt(used, 10) : 0,
      };
    }
  } catch (error) {
    console.error('Failed to parse rate limit:', error);
  }
  
  return null;
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('rate limit') || 
           error.message.includes('403');
  }
  return false;
}

/**
 * Get time until rate limit reset (in minutes)
 */
export function getTimeUntilReset(resetTimestamp: number): number {
  const now = Math.floor(Date.now() / 1000);
  const diffSeconds = resetTimestamp - now;
  return Math.ceil(diffSeconds / 60);
}

/**
 * Storage key for rate limit info
 */
const RATE_LIMIT_STORAGE_KEY = 'github-rate-limit-info';

/**
 * Save rate limit info to localStorage
 */
export function setRateLimitInfo(info: RateLimitInfo): void {
  try {
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(info));
  } catch (error) {
    console.error('Failed to save rate limit info:', error);
  }
}

/**
 * Get cached rate limit info from localStorage
 */
export function getCachedRateLimitInfo(): RateLimitInfo | null {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as RateLimitInfo;
    }
  } catch (error) {
    console.error('Failed to get cached rate limit info:', error);
  }
  return null;
}

/**
 * Get cached rate limit info only if it matches the current auth state
 * This prevents showing stale data (e.g., 60 limit when user has token configured)
 */
export function getValidCachedRateLimitInfo(): RateLimitInfo | null {
  const cached = getCachedRateLimitInfo();
  if (!cached) return null;
  
  const hasToken = hasGitHubToken();
  
  // If user has token but cached limit is unauthenticated (60), it's stale
  if (hasToken && cached.limit === 60) {
    return null;
  }
  
  // If user has no token but cached limit is authenticated (5000), it's stale
  if (!hasToken && cached.limit === 5000) {
    return null;
  }
  
  return cached;
}

/**
 * Clear rate limit info from localStorage
 */
export function clearRateLimitInfo(): void {
  try {
    localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear rate limit info:', error);
  }
}

/**
 * Fetch current rate limit from GitHub API
 * This also updates the cached rate limit info
 */
export async function fetchRateLimitInfo(): Promise<RateLimitInfo | null> {
  try {
    const headers = getAuthHeaders();
    const response = await fetch('https://api.github.com/rate_limit', {
      headers,
    });

    if (!response.ok) {
      console.error('Failed to fetch rate limit info:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    // GitHub returns rate limit for different resource types
    // We're interested in the 'core' rate limit
    const coreLimit = data.resources?.core;
    
    if (coreLimit) {
      const rateLimitInfo: RateLimitInfo = {
        limit: coreLimit.limit,
        remaining: coreLimit.remaining,
        reset: coreLimit.reset,
        used: coreLimit.used || (coreLimit.limit - coreLimit.remaining),
      };
      
      // Cache the info
      setRateLimitInfo(rateLimitInfo);
      
      return rateLimitInfo;
    }
  } catch (error) {
    console.error('Error fetching rate limit:', error);
  }
  
  return null;
}

/**
 * Get rate limit info (alias for getCachedRateLimitInfo for backward compatibility)
 */
export function getRateLimitInfo(): RateLimitInfo | null {
  return getCachedRateLimitInfo();
}

