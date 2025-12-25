import { useEffect, useRef } from 'react';
import { X, Library, BellOff } from 'lucide-react';
import { Button } from './Button';
import type { Engine } from '../types';

interface EngineDiscoveryPopupProps {
  engines: Engine[];
  onEngineSelect: (engineId: string) => void;
  onDismiss: () => void;
  onDontShowAgain: () => void;
  onViewAll: () => void;
}

export function EngineDiscoveryPopup({
  engines,
  onEngineSelect,
  onDismiss,
  onDontShowAgain,
  onViewAll,
}: EngineDiscoveryPopupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management for accessibility
  useEffect(() => {
    // Focus the first interactive element when popup appears
    const timer = setTimeout(() => {
      firstButtonRef.current?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onDismiss();
    }
  };

  // Handle engine click
  const handleEngineClick = (engineId: string) => {
    onEngineSelect(engineId);
    onDismiss();
  };

  return (
    <div
      ref={containerRef}
      role="complementary"
      aria-label="Discover more wallpaper collections"
      onKeyDown={handleKeyDown}
      className="fixed bottom-4 right-4 z-50 max-w-sm w-full sm:w-auto animate-in slide-in-from-bottom-5 fade-in duration-300 motion-reduce:animate-none"
    >
      <div className="bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-xl overflow-hidden mx-4 sm:mx-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Library className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold">Explore More Collections</span>
          </div>
          <Button
            ref={firstButtonRef}
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="h-7 w-7 -mr-1"
            aria-label="Dismiss popup"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Engine avatars */}
        <div className="p-4">
          <div className="flex justify-center gap-3 mb-4">
            {engines.map((engine) => (
              <button
                key={engine.id}
                onClick={() => handleEngineClick(engine.id)}
                className="group flex flex-col items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg p-1"
                aria-label={`Switch to ${engine.name} collection`}
              >
                <div className="relative">
                  <img
                    src={engine.avatarUrl || `https://github.com/${engine.repoOwner}.png`}
                    alt=""
                    aria-hidden="true"
                    className="w-12 h-12 rounded-full border-2 border-border group-hover:border-primary group-focus-visible:border-primary transition-colors duration-200"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 rounded-full bg-primary/0 group-hover:bg-primary/10 transition-colors duration-200" />
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground group-focus-visible:text-foreground transition-colors max-w-[60px] truncate">
                  {engine.repoOwner}
                </span>
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={onViewAll}
              className="w-full justify-center"
            >
              <Library className="w-4 h-4 mr-2" aria-hidden="true" />
              View All Collections
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onDontShowAgain}
              className="w-full justify-center text-muted-foreground hover:text-foreground"
            >
              <BellOff className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
              Don't show
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

