import { useState, useEffect, useMemo, useRef, lazy, Suspense, useCallback } from 'react';
import UmamiAnalytics from '@danielgtmn/umami-react';
import type { WallpaperImage, Category, CategoryNode, ThumbnailSize, SortOption, Engine } from './types';
import { getAllImages, getCategories, getCategoryTree } from './lib/github-api';
import { fetchRateLimitInfo } from './lib/github-token';
import type { RateLimitInfo } from './lib/github-token';
import { flattenCategoryPaths } from './lib/category-tree';
import { useTheme } from './hooks/useTheme';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';
import { useExpandedCategories } from './hooks/useExpandedCategories';
import { useEngine } from './contexts/EngineContext';
import { useUrlEngine } from './hooks/useUrlEngine';
import { updateUrlWithEngine } from './lib/url-params';
import { useEngineDiscoveryPopup } from './hooks/useEngineDiscoveryPopup';
import { Sidebar } from './components/Sidebar';
import { SearchBar } from './components/SearchBar';
import { VirtualMasonryGallery } from './components/VirtualMasonryGallery';
import { InfiniteScrollTrigger } from './components/InfiniteScrollTrigger';
import { GallerySkeleton } from './components/GallerySkeleton';
import { ModalSkeleton } from './components/ModalSkeleton';
import { UrlEngineBanner } from './components/UrlEngineBanner';
import { RateLimitError } from './components/RateLimitError';
import { EngineDiscoveryPopup } from './components/EngineDiscoveryPopup';
import { EndOfGalleryShowcase } from './components/EndOfGalleryShowcase';
import { SocialBanner } from './components/SocialBanner';
import { AlertCircle, Library, Grid3x3, Grid2x2, LayoutGrid, ArrowUpDown, Menu, MoreVertical } from 'lucide-react';
import { Button } from './components/Button';

// Lazy load heavy modal components
const OptimizedImageModal = lazy(() => import('./components/OptimizedImageModal'));
const EnginesModal = lazy(() => import('./components/EnginesModal'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

function App() {
  const { theme, toggleTheme } = useTheme();
  const { activeEngine, setTemporaryEngine, addEngine, switchEngine, allEngines, isWaitingForUrlEngine, setUrlEngineResolved } = useEngine();
  const { expandedCategories, toggleExpand } = useExpandedCategories(activeEngine.id);
  const [allImages, setAllImages] = useState<WallpaperImage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<WallpaperImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEnginesModal, setShowEnginesModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [urlEngineError, setUrlEngineError] = useState<string | null>(null);
  const [showUrlBanner, setShowUrlBanner] = useState(false);
  const [urlLoadedEngine, setUrlLoadedEngine] = useState<Engine | null>(null);
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>(() => {
    const stored = localStorage.getItem('thumbnailSize') as ThumbnailSize;
    return stored || 'medium';
  });
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    const stored = localStorage.getItem('sortOption') as SortOption;
    return stored || 'default';
  });
  // Don't initialize from cache - always fetch fresh from /rate_limit API
  // Cached data from headers can be stale when engine data is cached
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [rateLimitLoading, setRateLimitLoading] = useState(true);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showMobileOverflowMenu, setShowMobileOverflowMenu] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const mobileOverflowRef = useRef<HTMLDivElement>(null);
  const [scrollCount, setScrollCount] = useState(0);

  // Handle URL-based engine loading
  const urlEngineState = useUrlEngine({
    onEngineLoaded: (engine) => {
      // Check if this engine already exists (by matching repoOwner, repoName, and branch)
      const engineExists = allEngines.some(
        e => e.repoOwner === engine.repoOwner && 
             e.repoName === engine.repoName && 
             e.branch === engine.branch
      );

      if (engineExists) {
        // Engine already exists, just switch to it without showing banner
        const existingEngine = allEngines.find(
          e => e.repoOwner === engine.repoOwner && 
               e.repoName === engine.repoName && 
               e.branch === engine.branch
        );
        if (existingEngine) {
          // Switch to existing engine instead of creating temporary one
          switchEngine(existingEngine.id);
        }
        setUrlEngineError(null);
        setShowUrlBanner(false);
        setUrlLoadedEngine(null);
        // Mark URL engine as resolved since we're switching to existing
        setUrlEngineResolved();
      } else {
        // New engine, show banner and set as temporary
        // Note: setTemporaryEngine also marks URL engine as resolved
        setTemporaryEngine(engine);
        setUrlEngineError(null);
        setShowUrlBanner(true);
        setUrlLoadedEngine(engine);
      }
    },
    onError: (error) => {
      setUrlEngineError(error);
    },
    onResolved: () => {
      // Called when URL engine processing is complete (no URL or error)
      setUrlEngineResolved();
    },
  });

  // Handle saving URL-loaded engine
  const handleSaveUrlEngine = async () => {
    if (!urlLoadedEngine) return;

    try {
      const savedEngine = await addEngine({
        name: urlLoadedEngine.name,
        repoOwner: urlLoadedEngine.repoOwner,
        repoName: urlLoadedEngine.repoName,
        branch: urlLoadedEngine.branch,
        treeSha: urlLoadedEngine.treeSha,
        excludedFolders: urlLoadedEngine.excludedFolders,
        imageExtensions: urlLoadedEngine.imageExtensions,
        avatarUrl: urlLoadedEngine.avatarUrl,
      });

      // Switch to the saved engine
      await switchEngine(savedEngine.id);
      setShowUrlBanner(false);
      setUrlLoadedEngine(null);

      // Clear URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    } catch (error) {
      console.error('Failed to save engine:', error);
      alert('Failed to save engine. Please try again.');
    }
  };

  // Refresh rate limit info
  const refreshRateLimitInfo = async () => {
    const updatedInfo = await fetchRateLimitInfo();
    if (updatedInfo) {
      setRateLimitInfo(updatedInfo);
    }
  };

  // Open settings modal (used by RateLimitIndicator)
  const openSettings = useCallback(() => {
    setShowSettingsModal(true);
  }, []);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };

    if (showSortDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortDropdown]);

  // Close mobile sidebar when clicking outside or on window resize
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileSidebarOpen && !(event.target as Element).closest('.mobile-sidebar')) {
        setIsMobileSidebarOpen(false);
      }
    };

    const handleResize = () => {
      // Close mobile sidebar if window becomes desktop-sized
      if (window.innerWidth >= 768 && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    };

    if (isMobileSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleResize);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobileSidebarOpen]);

  // Close mobile overflow menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileOverflowRef.current && !mobileOverflowRef.current.contains(event.target as Node)) {
        setShowMobileOverflowMenu(false);
      }
    };

    if (showMobileOverflowMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileOverflowMenu]);

  // Update document title when active engine changes
  useEffect(() => {
    // Don't update title while waiting for URL engine to prevent showing wrong engine name
    if (isWaitingForUrlEngine) {
      document.title = 'WALL·E Gallery - Loading...';
    } else {
      document.title = `WALL·E Gallery - ${activeEngine.name}`;
    }
  }, [activeEngine, isWaitingForUrlEngine]);

  // Fetch fresh rate limit info from /rate_limit API on mount and after data loads
  // We use a ref to track the last engine we fetched for to avoid duplicate calls
  const lastRateLimitFetchRef = useRef<string | null>(null);
  
  useEffect(() => {
    const fetchFreshRateLimit = async (showLoading: boolean) => {
      if (showLoading) {
        setRateLimitLoading(true);
      }
      try {
        const info = await fetchRateLimitInfo();
        if (info) {
          setRateLimitInfo(info);
        }
      } finally {
        if (showLoading) {
          setRateLimitLoading(false);
        }
      }
    };

    // If waiting for URL engine, don't fetch yet
    if (isWaitingForUrlEngine) {
      return;
    }

    // If data is still loading, don't fetch yet
    if (loading) {
      return;
    }

    // If there's an error, don't fetch
    if (error) {
      setRateLimitLoading(false);
      return;
    }

    // Only fetch if we haven't fetched for this engine yet
    const currentEngineId = activeEngine.id;
    if (lastRateLimitFetchRef.current === currentEngineId) {
      return;
    }

    // Mark as fetching for this engine
    lastRateLimitFetchRef.current = currentEngineId;
    
    // Show loading state only on initial fetch (when rateLimitInfo is null)
    const isInitialFetch = rateLimitInfo === null;
    fetchFreshRateLimit(isInitialFetch);
  }, [loading, error, activeEngine.id, isWaitingForUrlEngine, rateLimitInfo]);

  // Update URL when active engine changes (for sharing)
  useEffect(() => {
    // Only update URL if it's not a default engine and not already from URL
    if (!activeEngine.isDefault && activeEngine.id.startsWith('url-')) {
      updateUrlWithEngine(activeEngine.repoOwner, activeEngine.repoName, activeEngine.branch);
    }
  }, [activeEngine]);

  // Persist thumbnail size to localStorage
  useEffect(() => {
    localStorage.setItem('thumbnailSize', thumbnailSize);
  }, [thumbnailSize]);

  // Persist sort option to localStorage
  useEffect(() => {
    localStorage.setItem('sortOption', sortOption);
  }, [sortOption]);

  // Load data when active engine or thumbnail size changes
  useEffect(() => {
    // Don't fetch data while waiting for URL engine to resolve
    // This prevents unnecessary API calls to the default engine
    if (isWaitingForUrlEngine) {
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [images, cats, tree] = await Promise.all([
          getAllImages(activeEngine, thumbnailSize),
          getCategories(activeEngine),
          getCategoryTree(activeEngine)
        ]);
        setAllImages(images);
        setCategories(cats);
        setCategoryTree(tree);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load wallpapers');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeEngine, thumbnailSize, isWaitingForUrlEngine]);

  // Filter and sort images based on category, search, and sort option
  const filteredImages = useMemo(() => {
    let filtered = allImages;

    // Filter by category (including nested children)
    if (selectedCategory) {
      // Find the selected category node in the tree
      const findNode = (nodes: CategoryNode[], path: string): CategoryNode | null => {
        for (const node of nodes) {
          if (node.fullPath === path) return node;
          const found = findNode(node.children, path);
          if (found) return found;
        }
        return null;
      };
      
      const selectedNode = findNode(categoryTree, selectedCategory);
      
      if (selectedNode) {
        // Get all paths including children
        const allPaths = flattenCategoryPaths(selectedNode);
        
        // Filter images that belong to this category or any of its children
        filtered = filtered.filter(img => {
          if (selectedCategory === 'uncategorized') {
            // For uncategorized, match images without folders
            return img.pathSegments.length === 1;
          }
          
          // Check if image path starts with any of the category paths
          const imgPath = img.pathSegments.slice(0, -1).join('/');
          return allPaths.some(path => imgPath === path || imgPath.startsWith(path + '/'));
        });
      } else {
        // Fallback to old behavior for flat categories
        filtered = filtered.filter(img => img.category === selectedCategory);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(img =>
        img.name.toLowerCase().includes(query) ||
        img.category.toLowerCase().includes(query) ||
        img.path.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortOption !== 'default') {
      filtered = [...filtered]; // Create a copy to avoid mutating original array

      switch (sortOption) {
        case 'name-asc':
          filtered.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'name-desc':
          filtered.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case 'size-asc':
          filtered.sort((a, b) => (a.size || 0) - (b.size || 0));
          break;
        case 'size-desc':
          filtered.sort((a, b) => (b.size || 0) - (a.size || 0));
          break;
      }
    }

    return filtered;
  }, [allImages, selectedCategory, searchQuery, sortOption, categoryTree]);

  // Infinite scroll
  const { displayedImages, hasMore, fetchMore } = useInfiniteScroll({
    allImages: filteredImages,
    pageSize: 20
  });

  // Wrap fetchMore to track scroll count for discovery popup
  const handleFetchMore = useCallback(() => {
    setScrollCount(c => c + 1);
    fetchMore();
  }, [fetchMore]);

  // Engine discovery popup
  const {
    showPopup: showDiscoveryPopup,
    suggestedEngines,
    dismissPopup: dismissDiscoveryPopup,
    dontShowAgain: dontShowDiscoveryAgain,
  } = useEngineDiscoveryPopup({
    scrollCount,
    activeEngineId: activeEngine.id,
    allEngines,
  });

  // Reset scroll count when engine or filters change
  useEffect(() => {
    setScrollCount(0);
  }, [activeEngine.id, selectedCategory, searchQuery]);

  // Download handler
  const handleDownload = async (image: WallpaperImage) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download image. Please try again.');
    }
  };

  // Show gallery skeleton during initial load, URL engine loading, or waiting for URL engine resolution
  const showGallerySkeleton = loading || urlEngineState.loading || isWaitingForUrlEngine;

  // Show error for URL engine or regular errors
  const displayError = urlEngineError || error;
  
  // Check if it's a rate limit error
  const isRateLimitErr = displayError && (
    displayError.includes('rate limit') || 
    displayError.includes('403')
  );

  // Determine if analytics should be enabled
  const isAnalyticsEnabled = useMemo(() => {
    const forceEnable = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';    
    if (forceEnable) return true;
    return import.meta.env.PROD;
  }, []);

  // Show rate limit error screen if applicable
  if (isRateLimitErr) {
    return (
      <RateLimitError
        rateLimitInfo={rateLimitInfo}
        onTokenSaved={async () => {
          await refreshRateLimitInfo();
          window.location.reload();
        }}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (displayError) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold mb-2">
            {urlEngineError ? 'Error Loading Repository from URL' : 'Error Loading Wallpapers'}
          </h2>
          <p className="text-muted-foreground mb-4">{displayError}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
            {urlEngineError && (
              <button
                onClick={() => {
                  window.history.pushState({}, '', window.location.pathname);
                  window.location.reload();
                }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
              >
                Go to Home
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Analytics */}
      {isAnalyticsEnabled && (
        <UmamiAnalytics
          url={import.meta.env.VITE_UMAMI_URL || 'https://um.kairo.click'}
          websiteId={import.meta.env.VITE_UMAMI_ID || 'e1767cc6-3e0b-4ab0-b1fe-701b92a8741e'}
          lazyLoad={true}
        />
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          categories={categories}
          categoryTree={categoryTree}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          theme={theme}
          onThemeToggle={toggleTheme}
          activeEngine={activeEngine}
          expandedCategories={expandedCategories}
          onToggleExpand={toggleExpand}
          rateLimitInfo={rateLimitInfo}
          rateLimitLoading={rateLimitLoading}
          onOpenSettings={openSettings}
          isEngineLoading={isWaitingForUrlEngine}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] mobile-sidebar">
            <Sidebar
              categories={categories}
              categoryTree={categoryTree}
              selectedCategory={selectedCategory}
              onCategorySelect={(category) => {
                setSelectedCategory(category);
                setIsMobileSidebarOpen(false);
              }}
              theme={theme}
              onThemeToggle={toggleTheme}
              activeEngine={activeEngine}
              expandedCategories={expandedCategories}
              onToggleExpand={toggleExpand}
              isMobile={true}
              onClose={() => setIsMobileSidebarOpen(false)}
              rateLimitInfo={rateLimitInfo}
              rateLimitLoading={rateLimitLoading}
              onOpenSettings={openSettings}
              isEngineLoading={isWaitingForUrlEngine}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header with search */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
          <div className="flex items-center gap-4">
            {/* Mobile hamburger menu */}
            <Button
              variant="ghost"
              size="icon"
              mobileSize="touch"
              className="md:hidden"
              onClick={() => setIsMobileSidebarOpen(true)}
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="flex-1 max-w-2xl">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by name or category..."
              />
            </div>

            {/* Desktop controls - hidden on mobile */}
            <div className="hidden md:flex items-center gap-2">
              {/* Sort selector */}
              <div className="border border-border rounded-md h-10 px-1 flex items-center">
              <div className="relative" ref={sortDropdownRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  title="Sort options"
                  className={`h-8 w-8 ${sortOption !== 'default' ? 'bg-accent' : ''}`}
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>

                {showSortDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-md shadow-lg z-20">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setSortOption('default');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-accent ${sortOption === 'default' ? 'bg-accent font-medium' : ''}`}
                      >
                        Default
                      </button>
                      <button
                        onClick={() => {
                          setSortOption('name-asc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-accent ${sortOption === 'name-asc' ? 'bg-accent font-medium' : ''}`}
                      >
                        Name (A → Z)
                      </button>
                      <button
                        onClick={() => {
                          setSortOption('name-desc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-accent ${sortOption === 'name-desc' ? 'bg-accent font-medium' : ''}`}
                      >
                        Name (Z → A)
                      </button>
                      <button
                        onClick={() => {
                          setSortOption('size-asc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-accent ${sortOption === 'size-asc' ? 'bg-accent font-medium' : ''}`}
                      >
                        Size (Small → Large)
                      </button>
                      <button
                        onClick={() => {
                          setSortOption('size-desc');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-accent ${sortOption === 'size-desc' ? 'bg-accent font-medium' : ''}`}
                      >
                        Size (Large → Small)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnail size selector */}
            <div className="flex items-center gap-1 border border-border rounded-md h-10 px-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setThumbnailSize('small')}
                title="Small thumbnails"
                className={`h-8 w-8 ${thumbnailSize === 'small' ? 'bg-accent' : ''}`}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setThumbnailSize('medium')}
                title="Medium thumbnails"
                className={`h-8 w-8 ${thumbnailSize === 'medium' ? 'bg-accent' : ''}`}
              >
                <Grid2x2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setThumbnailSize('large')}
                title="Large thumbnails"
                className={`h-8 w-8 ${thumbnailSize === 'large' ? 'bg-accent' : ''}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>

            </div>

            {/* Desktop Collections button with text */}
            <Button
              variant="ghost"
              onClick={() => setShowEnginesModal(true)}
              title="Wallpaper Collections"
              className="hidden md:flex items-center gap-2 h-10 px-3 border border-border rounded-md"
            >
              <Library className="w-5 h-5" />
              <span className="text-sm font-medium">Collections</span>
            </Button>

            {/* Mobile Collections button - icon only */}
            <Button
              variant="ghost"
              size="icon"
              mobileSize="touch"
              onClick={() => setShowEnginesModal(true)}
              title="Wallpaper Collections"
              className="md:hidden border border-border rounded-md"
            >
              <Library className="w-5 h-5" />
            </Button>

            {/* Mobile overflow menu */}
            <div className="md:hidden">
              <div className="relative" ref={mobileOverflowRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  mobileSize="touch"
                  onClick={() => setShowMobileOverflowMenu(!showMobileOverflowMenu)}
                  title="More options"
                  className="md:hidden"
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>

                {showMobileOverflowMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-background border border-border rounded-md shadow-lg z-20">
                    <div className="p-2">
                      {/* Sort options */}
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Sort</p>
                        <div className="space-y-1">
                          <button
                            onClick={() => {
                              setSortOption('default');
                              setShowMobileOverflowMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent ${sortOption === 'default' ? 'bg-accent font-medium' : ''}`}
                          >
                            Default
                          </button>
                          <button
                            onClick={() => {
                              setSortOption('name-asc');
                              setShowMobileOverflowMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent ${sortOption === 'name-asc' ? 'bg-accent font-medium' : ''}`}
                          >
                            Name (A → Z)
                          </button>
                          <button
                            onClick={() => {
                              setSortOption('name-desc');
                              setShowMobileOverflowMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent ${sortOption === 'name-desc' ? 'bg-accent font-medium' : ''}`}
                          >
                            Name (Z → A)
                          </button>
                          <button
                            onClick={() => {
                              setSortOption('size-asc');
                              setShowMobileOverflowMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent ${sortOption === 'size-asc' ? 'bg-accent font-medium' : ''}`}
                          >
                            Size (Small → Large)
                          </button>
                          <button
                            onClick={() => {
                              setSortOption('size-desc');
                              setShowMobileOverflowMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent ${sortOption === 'size-desc' ? 'bg-accent font-medium' : ''}`}
                          >
                            Size (Large → Small)
                          </button>
                        </div>
                      </div>

                      {/* Collections */}
                      <div className="border-t border-border pt-2">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            setShowEnginesModal(true);
                            setShowMobileOverflowMenu(false);
                          }}
                        >
                          <Library className="w-4 h-4 mr-2" />
                          Collections
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {selectedCategory ? (
              <span>
                <span className="capitalize font-medium">
                  {selectedCategory.split('/').pop()}
                </span>
                {selectedCategory.includes('/') && (
                  <span className="text-xs ml-1">({selectedCategory})</span>
                )}
                {' • '}{filteredImages.length} wallpapers
              </span>
            ) : (
              <span>
                Showing {filteredImages.length} of {allImages.length} wallpapers
              </span>
            )}
          </div>
        </div>

        {/* Gallery */}
        {showGallerySkeleton ? (
          <GallerySkeleton count={12} thumbnailSize={thumbnailSize} />
        ) : filteredImages.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">
              {searchQuery ? 'No wallpapers found matching your search.' : 'No wallpapers available.'}
            </p>
          </div>
        ) : (
          <>
            <VirtualMasonryGallery
              images={displayedImages}
              onImageClick={setSelectedImage}
              onDownload={handleDownload}
              thumbnailSize={thumbnailSize}
            />
            <InfiniteScrollTrigger
              onIntersect={handleFetchMore}
              hasMore={hasMore}
            />
            {/* End of gallery showcase */}
            {!hasMore && displayedImages.length > 0 && (
              <EndOfGalleryShowcase
                currentEngine={activeEngine}
                allEngines={allEngines}
                onEngineSelect={(engineId) => switchEngine(engineId)}
                onViewAll={() => setShowEnginesModal(true)}
                totalImages={filteredImages.length}
              />
            )}
          </>
        )}
      </main>

      {/* Fullscreen modal with optimized loading - lazy loaded */}
      {selectedImage && (
        <Suspense fallback={<ModalSkeleton />}>
          <OptimizedImageModal
            image={selectedImage}
            onClose={() => setSelectedImage(null)}
            onDownload={handleDownload}
          />
        </Suspense>
      )}

      {/* Engines configuration modal - lazy loaded */}
      {showEnginesModal && (
        <Suspense fallback={<ModalSkeleton />}>
          <EnginesModal
            isOpen={showEnginesModal}
            onClose={() => setShowEnginesModal(false)}
          />
        </Suspense>
      )}

      {/* Settings modal - lazy loaded */}
      {showSettingsModal && (
        <Suspense fallback={<ModalSkeleton />}>
          <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            onTokenChanged={refreshRateLimitInfo}
          />
        </Suspense>
      )}

      {/* URL Engine Banner - Bottom right corner */}
      {showUrlBanner && urlLoadedEngine && (
        <UrlEngineBanner
          engine={urlLoadedEngine}
          onSave={handleSaveUrlEngine}
          onDismiss={() => setShowUrlBanner(false)}
        />
      )}

      {/* Engine Discovery Popup - Bottom right corner */}
      {showDiscoveryPopup && !showUrlBanner && (
        <EngineDiscoveryPopup
          engines={suggestedEngines}
          onEngineSelect={(engineId) => switchEngine(engineId)}
          onDismiss={dismissDiscoveryPopup}
          onDontShowAgain={dontShowDiscoveryAgain}
          onViewAll={() => {
            dismissDiscoveryPopup();
            setShowEnginesModal(true);
          }}
        />
      )}

      {/* Social Banner - Always visible, shifts up when other popups are shown */}
      <SocialBanner hasPopupBelow={showDiscoveryPopup || showUrlBanner} />
    </div>
  );
}

export default App;
