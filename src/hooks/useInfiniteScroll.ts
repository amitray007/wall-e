import { useState, useCallback, useEffect } from 'react';
import type { WallpaperImage } from '../types';

interface UseInfiniteScrollProps {
  allImages: WallpaperImage[];
  pageSize?: number;
}

export function useInfiniteScroll({ allImages, pageSize = 20 }: UseInfiniteScrollProps) {
  const [displayedImages, setDisplayedImages] = useState<WallpaperImage[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Reset when allImages changes
  useEffect(() => {
    const start = 0;
    const end = pageSize;
    const newImages = allImages.slice(start, end);

    setPage(0);
    setDisplayedImages(newImages);
    setHasMore(end < allImages.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allImages]);

  const loadMore = useCallback((currentPage: number) => {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    const newImages = allImages.slice(start, end);

    if (newImages.length === 0) {
      setHasMore(false);
      return;
    }

    setDisplayedImages(prev => {
      if (currentPage === 0) return newImages;
      return [...prev, ...newImages];
    });
    setHasMore(end < allImages.length);
  }, [allImages, pageSize]);

  const fetchMore = useCallback(() => {
    if (hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadMore(nextPage);
    }
  }, [page, hasMore, loadMore]);

  return {
    displayedImages,
    hasMore,
    fetchMore
  };
}
