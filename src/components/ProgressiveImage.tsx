import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface ProgressiveImageProps {
  src: string;
  thumbnail: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
}

export function ProgressiveImage({
  src,
  thumbnail,
  alt,
  className,
  onLoad
}: ProgressiveImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(thumbnail);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Start with thumbnail
    setCurrentSrc(thumbnail);
    setIsLoading(true);

    // Preload thumbnail
    const thumbnailImg = new Image();
    thumbnailImg.src = thumbnail;

    thumbnailImg.onload = () => {
      setCurrentSrc(thumbnail);
      setIsLoading(false);
    };

    // Only load full resolution when thumbnail is loaded (for modal)
    // For gallery, we stick with thumbnails

    return () => {
      thumbnailImg.onload = null;
    };
  }, [thumbnail, src]);

  const handleLoad = () => {
    if (onLoad) onLoad();
  };

  return (
    <div className="relative overflow-hidden">
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}

      {/* Image with blur effect while loading */}
      <img
        src={currentSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        className={cn(
          'w-full h-auto transition-all duration-500',
          isLoading ? 'opacity-0 scale-95 blur-lg' : 'opacity-100 scale-100 blur-0',
          className
        )}
      />
    </div>
  );
}
