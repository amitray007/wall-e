import { cn } from '../lib/utils';

interface ImageCardSkeletonProps {
  className?: string;
}

export function ImageCardSkeleton({ className }: ImageCardSkeletonProps) {
  return (
    <div className={cn('mb-4', className)}>
      <div className="overflow-hidden rounded-lg bg-muted animate-pulse aspect-[16/10]" />
    </div>
  );
}
