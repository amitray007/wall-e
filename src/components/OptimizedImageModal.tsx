import { useEffect, useState } from 'react';
import type { WallpaperImage } from '../types';
import { X, Download, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../lib/utils';

interface OptimizedImageModalProps {
  image: WallpaperImage | null;
  onClose: () => void;
  onDownload: (image: WallpaperImage) => void;
}

export function OptimizedImageModal({ image, onClose, onDownload }: OptimizedImageModalProps) {
  const [isFullResLoaded, setIsFullResLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSrc, setCurrentSrc] = useState<string>('');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (image) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';

      // Start with thumbnail
      setCurrentSrc(image.thumbnailUrl);
      setIsFullResLoaded(false);
      setIsLoading(true);

      // Load full resolution in background
      const fullResImg = new Image();
      fullResImg.src = image.url;

      fullResImg.onload = () => {
        setCurrentSrc(image.url);
        setIsFullResLoaded(true);
        setIsLoading(false);
      };

      fullResImg.onerror = () => {
        // If full res fails, stick with thumbnail
        setIsLoading(false);
      };

      return () => {
        fullResImg.onload = null;
        fullResImg.onerror = null;
      };
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-full" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white z-10"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Image info and actions */}
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 z-10 max-w-md">
          <h3 className="text-white font-medium text-sm mb-1 truncate">{image.name}</h3>
          <p className="text-white/70 text-xs capitalize">Category: {image.category}</p>
          {image.size && (
            <p className="text-white/70 text-xs">
              Size: {(image.size / 1024).toFixed(2)} KB
            </p>
          )}
          {!isFullResLoaded && isLoading && (
            <div className="flex items-center gap-2 mt-2 text-white/70 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading full resolution...</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute bottom-4 right-4 flex gap-2 z-10">
          <Button
            variant="ghost"
            className="bg-black/50 hover:bg-black/70 text-white"
            onClick={() => onDownload(image)}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button
            variant="ghost"
            className="bg-black/50 hover:bg-black/70 text-white"
            onClick={() => window.open(image.url, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open
          </Button>
        </div>

        {/* Image with progressive loading */}
        <img
          src={currentSrc}
          alt={image.name}
          className={cn(
            'max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl transition-all duration-300',
            !isFullResLoaded && 'blur-sm scale-95',
            isFullResLoaded && 'blur-0 scale-100'
          )}
        />
      </div>
    </div>
  );
}
