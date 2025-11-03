import type { Category } from "../types";
import { cn } from "../lib/utils";
import { Layers, Moon, Sun } from "lucide-react";
import { Button } from "./Button";
import type { Theme } from "../hooks/useTheme";

interface SidebarProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
  theme: Theme;
  onThemeToggle: () => void;
}

export function Sidebar({
  categories,
  selectedCategory,
  onCategorySelect,
  theme,
  onThemeToggle,
}: SidebarProps) {
  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col sticky top-0">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Layers className="w-5 h-5" />
            WALL·E
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={onThemeToggle}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Wallpaper Gallery</p>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-2 px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Categories
        </div>

        <button
          onClick={() => onCategorySelect(null)}
          className={cn(
            "w-full text-left px-3 py-2 rounded-md text-sm transition-colors mb-1",
            "hover:bg-accent hover:text-accent-foreground",
            selectedCategory === null &&
              "bg-accent text-accent-foreground font-medium",
          )}
        >
          <div className="flex items-center justify-between">
            <span>All Wallpapers</span>
            <span className="text-xs text-muted-foreground">
              {categories.reduce((sum, cat) => sum + cat.count, 0)}
            </span>
          </div>
        </button>

        <div className="space-y-1">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => onCategorySelect(category.name)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                selectedCategory === category.name &&
                  "bg-accent text-accent-foreground font-medium",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="capitalize truncate">{category.name}</span>
                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                  {category.count}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border text-xs text-muted-foreground">
        <a
          href="https://github.com/dharmx/walls"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          View on GitHub →
        </a>
      </div>
    </aside>
  );
}
