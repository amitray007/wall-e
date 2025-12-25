import { Library, Sparkles } from 'lucide-react';
import { Button } from './Button';
import type { Engine } from '../types';

interface EndOfGalleryShowcaseProps {
  currentEngine: Engine;
  allEngines: Engine[];
  onEngineSelect: (engineId: string) => void;
  onViewAll: () => void;
  totalImages: number;
}

export function EndOfGalleryShowcase({
  currentEngine,
  allEngines,
  onEngineSelect,
  onViewAll,
  totalImages,
}: EndOfGalleryShowcaseProps) {
  // Filter out current engine and get other collections
  const otherEngines = allEngines.filter(e => e.id !== currentEngine.id);

  // Don't render if no other engines available
  if (otherEngines.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" aria-hidden="true" />
        <h2 className="text-xl font-bold mb-2">You've seen it all!</h2>
        <p className="text-muted-foreground">
          All {totalImages} wallpapers from {currentEngine.name} explored.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label="Discover more wallpaper collections"
      className="px-4 py-8 sm:py-12 border-t border-border bg-muted/30"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <Sparkles className="w-7 h-7 text-primary" aria-hidden="true" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">
            You've explored all wallpapers!
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            All <span className="font-semibold text-foreground">{totalImages}</span> wallpapers from{' '}
            <span className="font-mono text-foreground">{currentEngine.name}</span>.{' '}
            Discover more amazing collections below.
          </p>
        </div>

        {/* Engine grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
          {otherEngines.map((engine) => (
            <button
              key={engine.id}
              onClick={() => onEngineSelect(engine.id)}
              className="group flex flex-col items-center p-4 rounded-xl border border-border bg-background hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-200"
              aria-label={`Switch to ${engine.name} collection`}
            >
              <img
                src={engine.avatarUrl || `https://github.com/${engine.repoOwner}.png`}
                alt=""
                aria-hidden="true"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-border group-hover:border-primary transition-colors duration-200 mb-3"
                loading="lazy"
              />
              <span className="text-sm font-medium text-center truncate w-full group-hover:text-primary transition-colors">
                {engine.repoOwner}
              </span>
              <span className="text-xs text-muted-foreground truncate w-full text-center">
                {engine.repoName}
              </span>
            </button>
          ))}
        </div>

        {/* View all button */}
        <div className="text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={onViewAll}
            className="min-w-[200px]"
          >
            <Library className="w-5 h-5 mr-2" aria-hidden="true" />
            Browse All Collections
          </Button>
        </div>
      </div>
    </section>
  );
}

