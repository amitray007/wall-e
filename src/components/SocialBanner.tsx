import { Star } from 'lucide-react';

interface SocialBannerProps {
  /** Whether another popup is showing (shifts this banner up) */
  hasPopupBelow?: boolean;
}

// X (formerly Twitter) icon - custom SVG since lucide doesn't have the new X logo
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// GitHub icon
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function SocialBanner({ hasPopupBelow = false }: SocialBannerProps) {
  return (
    <div
      className={`fixed right-4 z-40 transition-all duration-300 ease-out flex items-center gap-2 ${
        hasPopupBelow ? 'bottom-[220px]' : 'bottom-4'
      }`}
    >
      {/* GitHub Star Button */}
      <a
        href="https://github.com/amitray007/wall-e"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2 px-3 py-2 bg-background/95 backdrop-blur-md border border-border rounded-full shadow-lg hover:shadow-xl hover:border-yellow-500/50 transition-all duration-200"
        title="Star on GitHub"
        aria-label="Star WALL·E Gallery on GitHub"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background group-hover:scale-110 transition-transform">
          <GitHubIcon className="w-4 h-4" />
        </div>
        <Star className="w-4 h-4 text-yellow-500 hidden sm:block" />
        <span className="text-sm font-medium pr-1 hidden sm:inline">
          Star
        </span>
      </a>

      {/* X/Twitter Follow Button */}
      <a
        href="https://x.com/Niyxuis"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2 px-3 py-2 bg-background/95 backdrop-blur-md border border-border rounded-full shadow-lg hover:shadow-xl hover:border-primary/50 transition-all duration-200"
        title="Follow on X"
        aria-label="Follow @Niyxuis on X"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background group-hover:scale-110 transition-transform">
          <XIcon className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium pr-1 hidden sm:inline">
          Follow
        </span>
      </a>
    </div>
  );
}
