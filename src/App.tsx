import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import UmamiAnalytics from '@danielgtmn/umami-react';
import type { WallpaperImage, Category, CategoryNode, ThumbnailSize, SortOption } from './types';
import { getAllImages, getCategories, getCategoryTree } from './lib/github-api';
import { flattenCategoryPaths } from './lib/category-tree';
import { useTheme } from './hooks/useTheme';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';
import { useExpandedCategories } from './hooks/useExpandedCategories';
import { useEngine } from './contexts/EngineContext';
import { Sidebar } from './components/Sidebar';
import { SearchBar } from './components/SearchBar';
import { VirtualMasonryGallery } from './components/VirtualMasonryGallery';
import { InfiniteScrollTrigger } from './components/InfiniteScrollTrigger';
import { GallerySkeleton } from './components/GallerySkeleton';
import { ModalSkeleton } from './components/ModalSkeleton';
import { AlertCircle, Settings, Grid3x3, Grid2x2, LayoutGrid, ArrowUpDown, Menu, MoreVertical } from 'lucide-react';
import { Button } from './components/Button';

// Lazy load heavy modal components
const OptimizedImageModal = lazy(() => import('./components/OptimizedImageModal'));
const EnginesModal = lazy(() => import('./components/EnginesModal'));

function App() {
  const { theme, toggleTheme } = useTheme();
  const { activeEngine } = useEngine();
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
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>(() => {
    const stored = localStorage.getItem('thumbnailSize') as ThumbnailSize;
    return stored || 'medium';
  });
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    const stored = localStorage.getItem('sortOption') as SortOption;
    return stored || 'default';
  });
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showMobileOverflowMenu, setShowMobileOverflowMenu] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const mobileOverflowRef = useRef<HTMLDivElement>(null);

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
    document.title = `WALL·E Gallery - ${activeEngine.name}`;
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
  }, [activeEngine, thumbnailSize]);

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

  // Show gallery skeleton during initial load
  const showGallerySkeleton = loading;

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold mb-2">Error Loading Wallpapers</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Determine if analytics should be enabled
  const isAnalyticsEnabled = useMemo(() => {
    const forceEnable = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';    
    if (forceEnable) return true;
    return import.meta.env.PROD;
  }, []);

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

              {/* Settings button */}
              <div className="border border-border rounded-md h-10 px-1 flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEnginesModal(true)}
                  title="Engines"
                  className="h-8 w-8"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>

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

                      {/* Settings */}
                      <div className="border-t border-border pt-2">
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            setShowEnginesModal(true);
                            setShowMobileOverflowMenu(false);
                          }}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Engines
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
              onIntersect={fetchMore}
              hasMore={hasMore}
            />
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
    </div>
  );
}

export default App;
