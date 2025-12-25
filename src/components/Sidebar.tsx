import type { Category, CategoryNode, Engine } from "../types";
import { cn } from "../lib/utils";
import { Layers, Moon, Sun, X } from "lucide-react";
import { Button } from "./Button";
import { CategoryTreeItem } from "./CategoryTreeItem";
import { RateLimitIndicator } from "./RateLimitIndicator";
import type { Theme } from "../hooks/useTheme";
import type { RateLimitInfo } from "../lib/github-token";

interface SidebarProps {
  categories: Category[];
  categoryTree: CategoryNode[];
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
  theme: Theme;
  onThemeToggle: () => void;
  activeEngine: Engine;
  expandedCategories: Set<string>;
  onToggleExpand: (fullPath: string) => void;
  isMobile?: boolean;
  onClose?: () => void;
  rateLimitInfo?: RateLimitInfo | null;
  rateLimitLoading?: boolean;
  onOpenSettings?: () => void;
}

export function Sidebar({
  categories,
  categoryTree,
  selectedCategory,
  onCategorySelect,
  theme,
  onThemeToggle,
  activeEngine,
  expandedCategories,
  onToggleExpand,
  isMobile = false,
  onClose,
  rateLimitInfo,
  rateLimitLoading = false,
  onOpenSettings,
}: SidebarProps) {
  // Calculate total count from tree or fallback to categories
  const totalCount = categoryTree.length > 0
    ? categoryTree.reduce((sum, node) => sum + node.count, 0)
    : categories.reduce((sum, cat) => sum + cat.count, 0);
  
  // Use tree view if available, otherwise fall back to flat list
  const useTreeView = categoryTree.length > 0;
  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col sticky top-0">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Layers className="w-5 h-5" />
            WALL·E
          </h1>
           <div className="flex items-center gap-2">
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
             {isMobile && onClose && (
               <Button
                 variant="ghost"
                 size="icon"
                 onClick={onClose}
                 title="Close menu"
               >
                 <X className="w-5 h-5" />
               </Button>
             )}
           </div>
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
              {totalCount}
            </span>
          </div>
        </button>

        <div className="space-y-1">
          {useTreeView ? (
            // Tree view for nested categories
            categoryTree.map((node) => (
              <CategoryTreeItem
                key={node.fullPath}
                node={node}
                selectedCategory={selectedCategory}
                onCategorySelect={onCategorySelect}
                expandedCategories={expandedCategories}
                onToggleExpand={onToggleExpand}
              />
            ))
          ) : (
            // Flat view fallback
            categories.map((category) => (
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
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border text-xs space-y-3">
        {/* Rate Limit Indicator */}
        <RateLimitIndicator rateLimitInfo={rateLimitInfo ?? null} loading={rateLimitLoading} onOpenSettings={onOpenSettings} />
        
        {/* Engine Info */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            {activeEngine.avatarUrl && (
              <img
                src={activeEngine.avatarUrl}
                alt={`${activeEngine.repoOwner} avatar`}
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="font-medium text-foreground truncate">
              {activeEngine.name}
            </span>
          </div>
          <a
            href={`https://github.com/${activeEngine.repoOwner}/${activeEngine.repoName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="View on GitHub"
          >
            View on GitHub →
          </a>
        </div>
      </div>
    </aside>
  );
}
