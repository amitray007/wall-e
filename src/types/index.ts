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
