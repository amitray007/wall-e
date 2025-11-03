import type { GitHubTreeResponse, WallpaperImage, Category, Engine } from '../types';

// Image proxy for thumbnails - wsrv.nl supports on-the-fly resizing
const IMAGE_PROXY_URL = 'https://wsrv.nl';
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_QUALITY = 80;

/**
 * Generate thumbnail URL using image proxy
 */
function getThumbnailUrl(originalUrl: string): string {
  // wsrv.nl params: w=width, q=quality, output=webp for better compression
  return `${IMAGE_PROXY_URL}/?url=${encodeURIComponent(originalUrl)}&w=${THUMBNAIL_WIDTH}&q=${THUMBNAIL_QUALITY}&output=webp`;
}

// Cache tree data per engine
const engineCache = new Map<string, GitHubTreeResponse>();
// Track in-flight requests to prevent duplicate API calls
const inflightRequests = new Map<string, Promise<GitHubTreeResponse>>();

/**
 * Fetch the complete repository tree structure for an engine
 */
export async function fetchRepoTree(engine: Engine): Promise<GitHubTreeResponse> {
  // Check cache first
  if (engineCache.has(engine.id)) {
    console.log(`[Cache HIT] Using cached tree for ${engine.id}`);
    return engineCache.get(engine.id)!;
  }

  // Check if there's already a request in flight for this engine
  if (inflightRequests.has(engine.id)) {
    console.log(`[Dedup] Waiting for in-flight request for ${engine.id}`);
    return inflightRequests.get(engine.id)!;
  }

  // Start new request and track it
  console.log(`[API CALL] Fetching tree from GitHub for ${engine.id}`);
  const requestPromise = (async () => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${engine.repoOwner}/${engine.repoName}/git/trees/${engine.treeSha}?recursive=1`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch repository tree: ${response.statusText}`);
      }

      const data: GitHubTreeResponse = await response.json();
      engineCache.set(engine.id, data);
      console.log(`[Cache SET] Cached tree for ${engine.id}`);
      return data;
    } finally {
      // Remove from in-flight requests when done
      inflightRequests.delete(engine.id);
    }
  })();

  // Store the promise so concurrent calls can reuse it
  inflightRequests.set(engine.id, requestPromise);
  return requestPromise;
}

/**
 * Check if a file is an image based on extension
 */
function isImageFile(path: string, extensions: string[]): boolean {
  const ext = path.toLowerCase().substring(path.lastIndexOf('.'));
  return extensions.includes(ext);
}

/**
 * Get all categories (folders containing images) for an engine
 */
export async function getCategories(engine: Engine): Promise<Category[]> {
  const tree = await fetchRepoTree(engine);

  const categoryMap = new Map<string, number>();

  tree.tree.forEach(item => {
    if (item.type === 'blob' && isImageFile(item.path, engine.imageExtensions)) {
      const parts = item.path.split('/');

      // Handle both nested (folder/image.png) and flat (image.png) structures
      let category: string;
      if (parts.length >= 2) {
        // Nested: use folder name
        category = parts[0];
      } else {
        // Flat: use 'root' or 'uncategorized' as category
        category = 'uncategorized';
      }

      if (!engine.excludedFolders.includes(category)) {
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      }
    }
  });

  return Array.from(categoryMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      path: name
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get all images from the repository for an engine
 */
export async function getAllImages(engine: Engine): Promise<WallpaperImage[]> {
  const tree = await fetchRepoTree(engine);
  const rawBaseUrl = `https://raw.githubusercontent.com/${engine.repoOwner}/${engine.repoName}/${engine.branch}`;

  return tree.tree
    .filter(item => {
      if (item.type !== 'blob' || !isImageFile(item.path, engine.imageExtensions)) return false;

      const parts = item.path.split('/');
      // Determine category based on structure
      const category = parts.length >= 2 ? parts[0] : 'uncategorized';

      return !engine.excludedFolders.includes(category);
    })
    .map(item => {
      const parts = item.path.split('/');

      // Handle both nested and flat structures
      const category = parts.length >= 2 ? parts[0] : 'uncategorized';
      const fileName = parts[parts.length - 1];

      const fullUrl = `${rawBaseUrl}/${item.path}`;

      return {
        path: item.path,
        url: fullUrl,
        thumbnailUrl: getThumbnailUrl(fullUrl),
        category,
        name: fileName,
        size: item.size
      };
    });
}

/**
 * Get images by category
 */
export async function getImagesByCategory(engine: Engine, category: string): Promise<WallpaperImage[]> {
  const allImages = await getAllImages(engine);
  return allImages.filter(img => img.category === category);
}

/**
 * Search images by query (searches in category and filename)
 */
export async function searchImages(engine: Engine, query: string): Promise<WallpaperImage[]> {
  const allImages = await getAllImages(engine);
  const lowerQuery = query.toLowerCase();

  return allImages.filter(img =>
    img.category.toLowerCase().includes(lowerQuery) ||
    img.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get paginated images
 */
export function paginateImages(
  images: WallpaperImage[],
  page: number,
  pageSize: number = 20
): WallpaperImage[] {
  const start = page * pageSize;
  const end = start + pageSize;
  return images.slice(start, end);
}

/**
 * Clear cache for a specific engine
 */
export function clearEngineCache(engineId: string): void {
  engineCache.delete(engineId);
}

/**
 * Clear all engine caches
 */
export function clearAllCaches(): void {
  engineCache.clear();
}

/**
 * Fetch branch SHA from GitHub API
 */
export async function fetchBranchSHA(
  repoOwner: string,
  repoName: string,
  branch: string
): Promise<string> {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/branches/${branch}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Branch '${branch}' not found in ${repoOwner}/${repoName}`);
    }
    throw new Error(`Failed to fetch branch info: ${response.statusText}`);
  }

  const data = await response.json();
  return data.commit.sha;
}

/**
 * Validate repository and fetch tree SHA
 */
export async function validateRepository(
  repoOwner: string,
  repoName: string,
  branch: string
): Promise<{ valid: boolean; error?: string; sha?: string }> {
  try {
    const sha = await fetchBranchSHA(repoOwner, repoName, branch);
    return { valid: true, sha };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate repository'
    };
  }
}

/**
 * Fetch GitHub user avatar URL
 */
export async function fetchUserAvatar(username: string): Promise<string> {
  const url = `https://api.github.com/users/${username}`;
  const response = await fetch(url);

  if (!response.ok) {
    // Return a fallback avatar if fetch fails
    return `https://github.com/${username}.png`;
  }

  const data = await response.json();
  return data.avatar_url || `https://github.com/${username}.png`;
}
