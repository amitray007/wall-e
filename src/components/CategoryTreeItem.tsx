import { useEffect } from 'react';
import type { CategoryNode } from '../types';
import { cn } from '../lib/utils';
import { ChevronRight, Folder, FolderOpen } from 'lucide-react';

interface CategoryTreeItemProps {
  node: CategoryNode;
  selectedCategory: string | null;
  onCategorySelect: (fullPath: string) => void;
  expandedCategories: Set<string>;
  onToggleExpand: (fullPath: string) => void;
  level?: number;
}

export function CategoryTreeItem({
  node,
  selectedCategory,
  onCategorySelect,
  expandedCategories,
  onToggleExpand,
  level = 0,
}: CategoryTreeItemProps) {
  const isExpanded = expandedCategories.has(node.fullPath);
  const isSelected = selectedCategory === node.fullPath;
  const hasChildren = node.children.length > 0;
  
  // Auto-expand if selected category is a child of this node
  useEffect(() => {
    if (selectedCategory && selectedCategory.startsWith(node.fullPath + '/')) {
      if (!isExpanded) {
        onToggleExpand(node.fullPath);
      }
    }
  }, [selectedCategory, node.fullPath, isExpanded, onToggleExpand]);

  const handleClick = () => {
    if (hasChildren) {
      // If has children, toggle expand/collapse
      onToggleExpand(node.fullPath);
    }
    // Always select the category when clicked
    onCategorySelect(node.fullPath);
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(node.fullPath);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200',
          'hover:bg-accent hover:text-accent-foreground',
          'flex items-center gap-2',
          isSelected && 'bg-accent text-accent-foreground font-medium',
        )}
        style={{ paddingLeft: `${0.75 + level * 0.75}rem` }}
      >
        {/* Chevron for expandable items */}
        {hasChildren ? (
          <button
            onClick={handleChevronClick}
            className={cn(
              'flex-shrink-0 transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* Folder icon */}
        {hasChildren ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 flex-shrink-0" />
          )
        ) : (
          <Folder className="w-4 h-4 flex-shrink-0" />
        )}

        {/* Category name and count */}
        <span className="flex-1 truncate capitalize">{node.name}</span>
        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
          {node.count}
        </span>
      </button>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="space-y-1">
          {node.children.map((child) => (
            <CategoryTreeItem
              key={child.fullPath}
              node={child}
              selectedCategory={selectedCategory}
              onCategorySelect={onCategorySelect}
              expandedCategories={expandedCategories}
              onToggleExpand={onToggleExpand}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

