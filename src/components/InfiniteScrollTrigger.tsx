import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollTriggerProps {
  onIntersect: () => void;
  hasMore: boolean;
}

export function InfiniteScrollTrigger({ onIntersect, hasMore }: InfiniteScrollTriggerProps) {
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });

  useEffect(() => {
    if (inView && hasMore) {
      onIntersect();
    }
  }, [inView, hasMore, onIntersect]);

  if (!hasMore) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No more wallpapers to load
      </div>
    );
  }

  return (
    <div ref={ref} className="flex justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}
