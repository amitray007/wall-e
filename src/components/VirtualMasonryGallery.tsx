import { useRef, useEffect } from 'react';
import type { WallpaperImage } from '../types';
import { Download, Maximize2 } from 'lucide-react';
import { Button } from './Button';
import { ProgressiveImage } from './ProgressiveImage';

interface VirtualMasonryGalleryProps {
  images: WallpaperImage[];
  onImageClick: (image: WallpaperImage) => void;
  onDownload: (image: WallpaperImage) => void;
}

export function VirtualMasonryGallery({ images, onImageClick, onDownload }: VirtualMasonryGalleryProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);

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

  const handleDownloadClick = (e: React.MouseEvent, image: WallpaperImage) => {
    e.stopPropagation();
    onDownload(image);
  };

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4 p-4">
      {images.map((image) => (
        <div
          key={image.path}
          className="mb-4 break-inside-avoid group relative cursor-pointer"
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
      ))}
    </div>
  );
}
