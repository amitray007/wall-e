import { Activity, AlertTriangle } from 'lucide-react';
import type { RateLimitInfo } from '../lib/github-token';
import { hasGitHubToken } from '../lib/github-token';

interface RateLimitIndicatorProps {
  rateLimitInfo: RateLimitInfo | null;
}

export function RateLimitIndicator({ rateLimitInfo }: RateLimitIndicatorProps) {
  if (!rateLimitInfo) return null;

  const percentage = (rateLimitInfo.remaining / rateLimitInfo.limit) * 100;
  const isLow = percentage < 20;
  const isAuthenticated = hasGitHubToken();

  return (
    <div className="text-xs space-y-1">
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

      {!isAuthenticated && isLow && (
        <p className="text-yellow-600 dark:text-yellow-500 text-[10px]">
          Add token in Settings for higher limit
        </p>
      )}
    </div>
  );
}

