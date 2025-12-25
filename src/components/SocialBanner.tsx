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

export function SocialBanner({ hasPopupBelow = false }: SocialBannerProps) {
  return (
    <div
      className={`fixed right-4 z-40 transition-all duration-300 ease-out ${
        hasPopupBelow ? 'bottom-[220px]' : 'bottom-4'
      }`}
    >
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
          Follow us
        </span>
      </a>
    </div>
  );
}

