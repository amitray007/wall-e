import { Activity, AlertTriangle, ArrowUpRight, Settings } from 'lucide-react';
import type { RateLimitInfo } from '../lib/github-token';
import { hasGitHubToken } from '../lib/github-token';

interface RateLimitIndicatorProps {
  rateLimitInfo: RateLimitInfo | null;
  loading?: boolean;
  onOpenSettings?: () => void;
}

// Skeleton component for loading state - matches full layout to prevent CLS
function RateLimitSkeleton() {
  return (
    <div className="text-xs space-y-1.5">
      {/* Header row */}
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="flex items-center gap-1">
          <Activity className="w-3 h-3 opacity-50" />
          <span>API Limit</span>
        </span>
        <div className="h-3 w-10 bg-muted rounded animate-pulse" />
      </div>
      
      {/* Skeleton progress bar */}
      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-muted-foreground/20 rounded-full animate-pulse" />
      </div>

      {/* Skeleton for the action link - prevents layout shift */}
      <div className="flex items-center gap-1 text-[10px] h-4">
        <div className="w-3 h-3 bg-muted rounded animate-pulse" />
        <div className="h-3 w-20 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

export function RateLimitIndicator({ rateLimitInfo, loading = false, onOpenSettings }: RateLimitIndicatorProps) {
  // Show skeleton while loading
  if (loading && !rateLimitInfo) {
    return <RateLimitSkeleton />;
  }

  // Don't show anything if no data and not loading
  if (!rateLimitInfo) return null;

  const percentage = (rateLimitInfo.remaining / rateLimitInfo.limit) * 100;
  const isLow = percentage < 20;
  const isAuthenticated = hasGitHubToken();

  return (
    <div className="text-xs space-y-1.5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="flex items-center gap-1">
          {isLow ? (
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
          ) : (
            <Activity className="w-3 h-3" />
          )}
          API Limit
        </span>
        <span className={isLow ? 'text-yellow-500 font-medium' : ''}>
          {rateLimitInfo.remaining}/{rateLimitInfo.limit}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isLow ? 'bg-yellow-500' : 'bg-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Settings link - show different text based on auth state */}
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 hover:underline transition-colors w-full"
      >
        {isAuthenticated ? (
          <>
            <Settings className="w-3 h-3" />
            <span>Manage Token</span>
          </>
        ) : (
          <>
            <ArrowUpRight className="w-3 h-3" />
            <span>Increase API Limit</span>
          </>
        )}
      </button>

      {/* Low limit warning for authenticated users */}
      {isAuthenticated && isLow && (
        <p className="text-yellow-600 dark:text-yellow-500 text-[10px]">
          Rate limit running low
        </p>
      )}
    </div>
  );
}

