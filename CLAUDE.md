# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WALL·E Gallery is a high-performance wallpaper gallery app that displays images from **any public GitHub repository**. It supports multiple wallpaper sources (engines) and implements aggressive performance optimizations to handle heavy images efficiently.

**Default Engines:**
- dharmx/walls (3.8GB, thousands of 4K+ wallpapers)
- mylinuxforwork/wallpaper
- D3Ext/aesthetic-wallpapers

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind CSS v3

## Development Commands

```bash
# Start development server (localhost:5173)
npm run dev

# Type check and build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Architecture

### Engine System (Multi-Source Support)

The app supports multiple wallpaper sources called "engines". Each engine represents a different GitHub repository:

**Engine Storage:**
- **Default engines**: Stored in `src/data/default-engines.json` (3 built-in repositories)
- **Custom engines**: User-added, stored in localStorage under `'wallpaper-engines'`
- **Active engine**: Tracked in localStorage under engine metadata

**Engine Properties:**
```typescript
{
  id: string;                    // Unique identifier
  name: string;                  // Display name (e.g., "dharmx/walls")
  repoOwner: string;             // GitHub username
  repoName: string;              // Repository name
  branch: string;                // Branch to fetch from (usually "main")
  treeSha: string;               // Git commit SHA (40-char hex)
  excludedFolders: string[];     // Folders to ignore (e.g., [".github", "docs"])
  imageExtensions: string[];     // Supported formats (e.g., [".png", ".jpg"])
  isDefault: boolean;            // True for built-in engines
  avatarUrl?: string;            // GitHub user avatar
  createdAt?: number;            // Timestamp for custom engines
}
```

**Adding New Default Engines:**
Update `src/data/default-engines.json` with the new engine configuration. Fetch tree SHA using:
```bash
curl -s https://api.github.com/repos/{owner}/{repo}/branches/{branch} | grep '"sha"' | head -1
```

### Data Flow & Caching Strategy

The app fetches repository trees once per engine and caches them for the session:

1. **GitHub API** (`src/lib/github-api.ts:fetchRepoTree()`) - Fetches recursive tree structure
2. **Per-engine cache** (`engineCache` Map) - Each engine's data cached separately
3. **Request deduplication** (`inflightRequests` Map) - Prevents concurrent duplicate API calls
4. **Client-side operations** - All filtering, searching, sorting happen on cached data

**Cache Management:**
- Cache cleared when switching engines
- Each engine can maintain its own cache simultaneously
- No automatic refresh (requires page reload or engine re-selection)

### Performance Optimization System

The app uses a **three-tier image loading strategy** to handle heavy wallpapers:

#### 1. Image Proxy Service (wsrv.nl)
- **Location:** `src/lib/github-api.ts:getThumbnailUrl()`
- Generates WebP thumbnails on-the-fly (from ~10MB originals to ~50KB)
- All gallery images use thumbnails only
- **Three sizes available:**
  - Small: 300px width, 75% quality
  - Medium: 400px width, 80% quality (default)
  - Large: 600px width, 85% quality
- User can toggle between sizes (persisted to localStorage as `'thumbnailSize'`)

#### 2. Progressive Loading Components
- **ProgressiveImage** (`src/components/ProgressiveImage.tsx`) - Shows skeleton → thumbnail with blur → sharp
- **VirtualMasonryGallery** (`src/components/VirtualMasonryGallery.tsx`) - Gallery uses thumbnails only, column count adjusts based on thumbnail size
- **OptimizedImageModal** (`src/components/OptimizedImageModal.tsx`) - Loads full resolution only when modal opens

#### 3. Rendering Strategy
- **Infinite scroll** (`src/hooks/useInfiniteScroll.ts`) - Loads 20 images per batch
- **Intersection Observer** - Images load 200px before entering viewport
- **Flexbox masonry** - Manual round-robin distribution prevents scrambling on new loads

**Result:** 99.5% bandwidth reduction, 90% memory reduction (see PERFORMANCE.md for details)

### Component Architecture

#### Core Layout
- **App.tsx** - Main orchestrator, manages state and data flow
- **Sidebar.tsx** - Category navigation + theme toggle
- **VirtualMasonryGallery.tsx** - Main gallery view (thumbnails only)
- **OptimizedImageModal.tsx** - Full-screen preview (loads full res on demand)

#### State Management
- **useTheme** (`src/hooks/useTheme.ts`) - Dark/light mode with localStorage persistence
- **useInfiniteScroll** (`src/hooks/useInfiniteScroll.ts`) - Pagination logic, 20 images per page
- Local state in App.tsx - No external state management library

#### Type System
- **WallpaperImage** interface includes both `url` (full res) and `thumbnailUrl` (proxy)
- All GitHub API responses typed in `src/types/index.ts`

### Styling Approach

- **Tailwind CSS v3** - Utility-first, configured in `tailwind.config.js`
- **CSS variables** - Theme colors defined in `src/index.css` (`:root` and `.dark`)
- **Shadcn-inspired design** - Custom components with `class-variance-authority` for variants
- **Monospace font** - JetBrains Mono loaded from Google Fonts

### Key Configuration Files

- **tailwind.config.js** - Custom theme colors using CSS variables (`hsl(var(--background))`)
- **vite.config.ts** - Build configuration
- **tsconfig.json** - TypeScript settings with `verbatimModuleSyntax` enabled (requires `type` imports)

## Important Implementation Details

### TypeScript Import Requirements
Due to `verbatimModuleSyntax`, all type-only imports must use the `type` keyword:
```typescript
// Correct
import type { WallpaperImage } from '../types';

// Will cause build error
import { WallpaperImage } from '../types';
```

### Image URL Structure
- **Full resolution:** `https://raw.githubusercontent.com/<owner>/<repoName>/main/{path}`
- **Thumbnail:** `https://wsrv.nl/?url={encoded-url}&w=400&q=80&output=webp`

Both URLs are generated in `src/lib/github-api.ts:getAllImages()` and stored in the WallpaperImage type.

### Excluded Folders
Certain folders are excluded from the gallery (`src/lib/github-api.ts:EXCLUDED_FOLDERS`):
- `.github` - GitHub workflows
- `logo` - Repository branding
- `m-26.jp` - Non-image content

### Theme System
- Initial theme defaults to `'dark'`
- Stored in localStorage as `'theme'`
- Applied as class on `<html>` element (`light` or `dark`)
- Toggle button in Sidebar component

## Performance Considerations

When modifying the app, maintain these performance characteristics:

1. **Gallery must use thumbnails** - Never load full resolution in the gallery grid
2. **Batch loading** - Keep infinite scroll page size around 20 images
3. **Progressive enhancement** - Show thumbnails first, load full res only when needed
4. **Lazy loading** - All images must use `loading="lazy"` attribute
5. **Memory management** - Avoid keeping full-res images in state unnecessarily

See PERFORMANCE.md for detailed optimization documentation.

## Build Output

- Production build outputs to `dist/`
- Includes favicons: `favicon.svg` (light mode) and `favicon-dark.svg` (dark mode)
- Typical bundle size: ~240KB JS (gzipped: ~75KB), ~16KB CSS (gzipped: ~4KB)
