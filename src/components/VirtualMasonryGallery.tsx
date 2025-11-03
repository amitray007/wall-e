import { useRef, useEffect, useState, useMemo } from 'react';
import type { WallpaperImage, ThumbnailSize } from '../types';
import { Download, Maximize2 } from 'lucide-react';
import { Button } from './Button';
import { ProgressiveImage } from './ProgressiveImage';

interface VirtualMasonryGalleryProps {
  images: WallpaperImage[];
  onImageClick: (image: WallpaperImage) => void;
  onDownload: (image: WallpaperImage) => void;
  thumbnailSize?: ThumbnailSize;
}

// Helper to get number of columns based on screen width and thumbnail size
function getColumnCount(thumbnailSize: ThumbnailSize = 'medium'): number {
  const width = window.innerWidth;

  // Multipliers for different thumbnail sizes
  const sizeMultiplier = {
    small: 1.5,   // More columns (denser)
    medium: 1,    // Normal
    large: 0.67   // Fewer columns (larger images)
  };

  const multiplier = sizeMultiplier[thumbnailSize];

  if (width >= 1536) return Math.max(1, Math.round(5 * multiplier)); // 2xl: 7/5/3
  if (width >= 1280) return Math.max(1, Math.round(4 * multiplier)); // xl: 6/4/3
  if (width >= 1024) return Math.max(1, Math.round(3 * multiplier)); // lg: 4/3/2
  if (width >= 640) return Math.max(1, Math.round(2 * multiplier));  // sm: 3/2/1
  return 1; // xs: always 1
}

export function VirtualMasonryGallery({ images, onImageClick, onDownload, thumbnailSize = 'medium' }: VirtualMasonryGalleryProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [columns, setColumns] = useState(() => getColumnCount(thumbnailSize));

  // Update columns when thumbnail size or window size changes
  useEffect(() => {
    const handleResize = () => setColumns(getColumnCount(thumbnailSize));
    handleResize(); // Update immediately
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [thumbnailSize]);

  useEffect(() => {
    // Set up intersection observer for lazy loading
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              observerRef.current?.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '200px',
        threshold: 0.01
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Distribute images into columns maintaining order
  const columnedImages = useMemo(() => {
    const cols: WallpaperImage[][] = Array.from({ length: columns }, () => []);
    images.forEach((image, index) => {
      cols[index % columns].push(image);
    });
    return cols;
  }, [images, columns]);

  const handleDownloadClick = (e: React.MouseEvent, image: WallpaperImage) => {
    e.stopPropagation();
    onDownload(image);
  };

  const renderImage = (image: WallpaperImage, index: number) => (
    <div
      key={`${image.path}-${index}`}
      className="mb-4 group relative cursor-pointer"
      onClick={() => onImageClick(image)}
    >
      <div className="relative overflow-hidden rounded-lg bg-muted">
        {/* Progressive Image with thumbnail */}
        <ProgressiveImage
          src={image.url}
          thumbnail={image.thumbnailUrl}
          alt={image.name}
          className="group-hover:scale-105"
        />

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3">
          {/* Top info */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">
                {image.name}
              </p>
              <p className="text-white/70 text-xs capitalize">
                {image.category}
              </p>
            </div>
          </div>

          {/* Bottom actions */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="bg-white/10 hover:bg-white/20 text-white h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onImageClick(image);
              }}
              title="View fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-white/10 hover:bg-white/20 text-white h-8 w-8"
              onClick={(e) => handleDownloadClick(e, image)}
              title="Download"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex gap-4 p-4">
      {columnedImages.map((columnImages, columnIndex) => (
        <div
          key={columnIndex}
          className="flex-1 flex flex-col"
        >
          {columnImages.map((image, imageIndex) => renderImage(image, imageIndex))}
        </div>
      ))}
    </div>
  );
}
