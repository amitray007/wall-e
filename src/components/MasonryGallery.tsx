import { useState } from 'react';
import type { WallpaperImage } from '../types';
import { Download, Maximize2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './Button';

interface MasonryGalleryProps {
  images: WallpaperImage[];
  onImageClick: (image: WallpaperImage) => void;
  onDownload: (image: WallpaperImage) => void;
}

export function MasonryGallery({ images, onImageClick, onDownload }: MasonryGalleryProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const handleImageLoad = (url: string) => {
    setLoadedImages(prev => new Set(prev).add(url));
  };

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
            {/* Loading skeleton */}
            {!loadedImages.has(image.url) && (
              <div className="absolute inset-0 animate-pulse bg-muted" />
            )}

            {/* Image */}
            <img
              src={image.url}
              alt={image.name}
              loading="lazy"
              onLoad={() => handleImageLoad(image.url)}
              className={cn(
                'w-full h-auto transition-all duration-300',
                'group-hover:scale-105',
                !loadedImages.has(image.url) && 'opacity-0'
              )}
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
