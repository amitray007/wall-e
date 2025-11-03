import { useState, useEffect, useMemo } from 'react';
import type { WallpaperImage, Category } from './types';
import { getAllImages, getCategories } from './lib/github-api';
import { useTheme } from './hooks/useTheme';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';
import { useEngine } from './contexts/EngineContext';
import { Sidebar } from './components/Sidebar';
import { SearchBar } from './components/SearchBar';
import { VirtualMasonryGallery } from './components/VirtualMasonryGallery';
import { OptimizedImageModal } from './components/OptimizedImageModal';
import { InfiniteScrollTrigger } from './components/InfiniteScrollTrigger';
import { EnginesModal } from './components/EnginesModal';
import { Loader2, AlertCircle, Settings } from 'lucide-react';
import { Button } from './components/Button';

function App() {
  const { theme, toggleTheme } = useTheme();
  const { activeEngine } = useEngine();
  const [allImages, setAllImages] = useState<WallpaperImage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<WallpaperImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEnginesModal, setShowEnginesModal] = useState(false);

  // Update document title when active engine changes
  useEffect(() => {
    document.title = `WALL·E Gallery - ${activeEngine.name}`;
  }, [activeEngine]);

  // Load data when active engine changes
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [images, cats] = await Promise.all([
          getAllImages(activeEngine),
          getCategories(activeEngine)
        ]);
        setAllImages(images);
        setCategories(cats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load wallpapers');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeEngine]);

  // Filter images based on category and search
  const filteredImages = useMemo(() => {
    let filtered = allImages;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(img => img.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(img =>
        img.name.toLowerCase().includes(query) ||
        img.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allImages, selectedCategory, searchQuery]);

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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading wallpapers...</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
        theme={theme}
        onThemeToggle={toggleTheme}
        activeEngine={activeEngine}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header with search */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-2xl">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by name or category..."
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEnginesModal(true)}
              title="Engines"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {selectedCategory ? (
              <span>
                <span className="capitalize font-medium">{selectedCategory}</span> • {filteredImages.length} wallpapers
              </span>
            ) : (
              <span>
                Showing {filteredImages.length} of {allImages.length} wallpapers
              </span>
            )}
          </div>
        </div>

        {/* Gallery */}
        {filteredImages.length === 0 ? (
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
            />
            <InfiniteScrollTrigger
              onIntersect={fetchMore}
              hasMore={hasMore}
            />
          </>
        )}
      </main>

      {/* Fullscreen modal with optimized loading */}
      <OptimizedImageModal
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
        onDownload={handleDownload}
      />

      {/* Engines configuration modal */}
      <EnginesModal
        isOpen={showEnginesModal}
        onClose={() => setShowEnginesModal(false)}
      />
    </div>
  );
}

export default App;
