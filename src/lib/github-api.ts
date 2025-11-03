import type { GitHubTreeResponse, WallpaperImage, Category } from '../types';

const REPO_OWNER = 'dharmx';
const REPO_NAME = 'walls';
const TREE_SHA = '6bf4d733ebf2b484a37c17d742eb47e5139e6a14';
const RAW_BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main`;

// Image proxy for thumbnails - wsrv.nl supports on-the-fly resizing
const IMAGE_PROXY_URL = 'https://wsrv.nl';
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_QUALITY = 80;

const EXCLUDED_FOLDERS = ['.github', 'logo', 'm-26.jp'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];

/**
 * Generate thumbnail URL using image proxy
 */
function getThumbnailUrl(originalUrl: string): string {
  // wsrv.nl params: w=width, q=quality, output=webp for better compression
  return `${IMAGE_PROXY_URL}/?url=${encodeURIComponent(originalUrl)}&w=${THUMBNAIL_WIDTH}&q=${THUMBNAIL_QUALITY}&output=webp`;
}

let cachedTreeData: GitHubTreeResponse | null = null;

/**
 * Fetch the complete repository tree structure
 */
export async function fetchRepoTree(): Promise<GitHubTreeResponse> {
  if (cachedTreeData) {
    return cachedTreeData;
  }

  const response = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${TREE_SHA}?recursive=1`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch repository tree: ${response.statusText}`);
  }

  const data: GitHubTreeResponse = await response.json();
  cachedTreeData = data;
  return data;
}

/**
 * Check if a file is an image based on extension
 */
function isImageFile(path: string): boolean {
  const ext = path.toLowerCase().substring(path.lastIndexOf('.'));
  return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Get all categories (folders containing images)
 */
export async function getCategories(): Promise<Category[]> {
  const tree = await fetchRepoTree();

  const categoryMap = new Map<string, number>();

  tree.tree.forEach(item => {
    if (item.type === 'blob' && isImageFile(item.path)) {
      const parts = item.path.split('/');
      if (parts.length >= 2) {
        const category = parts[0];
        if (!EXCLUDED_FOLDERS.includes(category)) {
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        }
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
 * Get all images from the repository
 */
export async function getAllImages(): Promise<WallpaperImage[]> {
  const tree = await fetchRepoTree();

  return tree.tree
    .filter(item => {
      if (item.type !== 'blob' || !isImageFile(item.path)) return false;
      const category = item.path.split('/')[0];
      return !EXCLUDED_FOLDERS.includes(category);
    })
    .map(item => {
      const parts = item.path.split('/');
      const category = parts[0];
      const fileName = parts[parts.length - 1];

      const fullUrl = `${RAW_BASE_URL}/${item.path}`;

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
export async function getImagesByCategory(category: string): Promise<WallpaperImage[]> {
  const allImages = await getAllImages();
  return allImages.filter(img => img.category === category);
}

/**
 * Search images by query (searches in category and filename)
 */
export async function searchImages(query: string): Promise<WallpaperImage[]> {
  const allImages = await getAllImages();
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
