export interface WallpaperImage {
  path: string;
  url: string;
  thumbnailUrl: string;
  category: string;
  name: string;
  size?: number;
}

export interface Category {
  name: string;
  count: number;
  path: string;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export interface Engine {
  id: string;
  name: string;
  repoOwner: string;
  repoName: string;
  branch: string;
  treeSha: string;
  excludedFolders: string[];
  imageExtensions: string[];
  isDefault: boolean;
  avatarUrl?: string;
  createdAt?: number;
}

export interface EngineMetadata {
  activeEngineId: string;
  customEngines: Engine[];
}

export type ThumbnailSize = 'small' | 'medium' | 'large';

export type SortOption = 'default' | 'name-asc' | 'name-desc' | 'size-asc' | 'size-desc';
