import { useState, useEffect } from 'react';
import type { ThumbnailSize } from '../types';
import { ImageCardSkeleton } from './ImageCardSkeleton';

interface GallerySkeletonProps {
  count?: number;
  thumbnailSize?: ThumbnailSize;
}

// Helper to get number of columns based on screen width and thumbnail size
function getColumnCount(thumbnailSize: ThumbnailSize = 'medium'): number {
  const width = window.innerWidth;

  const sizeMultiplier = {
    small: 1.5,
    medium: 1,
    large: 0.67
  };

  const multiplier = sizeMultiplier[thumbnailSize];

  if (width >= 1536) return Math.max(1, Math.round(5 * multiplier));
  if (width >= 1280) return Math.max(1, Math.round(4 * multiplier));
  if (width >= 1024) return Math.max(1, Math.round(3 * multiplier));
  if (width >= 640) return Math.max(1, Math.round(2 * multiplier));
  return 1;
}

export function GallerySkeleton({ count = 12, thumbnailSize = 'medium' }: GallerySkeletonProps) {
  const [columns, setColumns] = useState(() => getColumnCount(thumbnailSize));

  useEffect(() => {
    const handleResize = () => setColumns(getColumnCount(thumbnailSize));
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [thumbnailSize]);

  // Distribute skeletons into columns
  const columnedSkeletons: number[][] = Array.from({ length: columns }, () => []);
  for (let i = 0; i < count; i++) {
    columnedSkeletons[i % columns].push(i);
  }

  return (
    <div className="flex gap-4 p-4">
      {columnedSkeletons.map((columnItems, columnIndex) => (
        <div key={columnIndex} className="flex-1 flex flex-col">
          {columnItems.map((index) => (
            <ImageCardSkeleton key={index} />
          ))}
        </div>
      ))}
    </div>
  );
}
