# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WALL·E Gallery is a high-performance wallpaper gallery app that displays images from the [dharmx/walls](https://github.com/dharmx/walls) GitHub repository (3.8GB, thousands of 4K+ wallpapers). The app implements aggressive performance optimizations to handle heavy images efficiently.

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

### Data Flow & Caching Strategy

The app fetches the entire GitHub repository tree once on initial load and caches it in memory for the session:

1. **GitHub API** (`src/lib/github-api.ts:fetchRepoTree()`) - Fetches recursive tree structure from GitHub API
2. **In-memory cache** (`cachedTreeData`) - Stored for the entire session, never refetched
3. **Client-side filtering** - All category/search operations happen client-side on cached data

**Important:** If you need to update the repository data source, modify these constants in `src/lib/github-api.ts`:
```typescript
const REPO_OWNER = 'dharmx';
const REPO_NAME = 'walls';
const TREE_SHA = '6bf4d733ebf2b484a37c17d742eb47e5139e6a14'; // Git tree SHA
```

### Performance Optimization System

The app uses a **three-tier image loading strategy** to handle heavy wallpapers:

#### 1. Image Proxy Service (wsrv.nl)
- **Location:** `src/lib/github-api.ts:getThumbnailUrl()`
- Generates 400px WebP thumbnails on-the-fly (from ~10MB originals to ~50KB)
- All gallery images use thumbnails only
- Configuration: `THUMBNAIL_WIDTH = 400`, `THUMBNAIL_QUALITY = 80`

#### 2. Progressive Loading Components
- **ProgressiveImage** (`src/components/ProgressiveImage.tsx`) - Shows skeleton → thumbnail with blur → sharp
- **VirtualMasonryGallery** (`src/components/VirtualMasonryGallery.tsx`) - Gallery uses thumbnails only
- **OptimizedImageModal** (`src/components/OptimizedImageModal.tsx`) - Loads full resolution only when modal opens

#### 3. Rendering Strategy
- **Infinite scroll** (`src/hooks/useInfiniteScroll.ts`) - Loads 20 images per batch
- **Intersection Observer** - Images load 200px before entering viewport
- **CSS columns masonry** - GPU-accelerated layout, no JS calculation

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
- **Full resolution:** `https://raw.githubusercontent.com/dharmx/walls/main/{path}`
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
