import { useState, useMemo } from 'react';
import { X, Plus, Check, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { AddEngineForm } from './AddEngineForm';
import { cn } from '../lib/utils';
import { useEngine } from '../contexts/EngineContext';

interface EnginesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CUSTOM_ENGINES_PER_PAGE = 10;
const SUPPORTED_ENGINES_PER_PAGE = 6; // 3x2 grid for testing

export function EnginesModal({ isOpen, onClose }: EnginesModalProps) {
  const { activeEngine, allEngines, switchEngine, removeEngine, refreshEngines } = useEngine();
  const [showAddForm, setShowAddForm] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [customPage, setCustomPage] = useState(0);
  const [supportedPage, setSupportedPage] = useState(0);

  // Separate default and custom engines
  const defaultEngines = useMemo(() => allEngines.filter(e => e.isDefault), [allEngines]);
  const customEngines = useMemo(() => allEngines.filter(e => !e.isDefault), [allEngines]);

  if (!isOpen) return null;

  // Paginate supported engines
  const supportedTotalPages = Math.ceil(defaultEngines.length / SUPPORTED_ENGINES_PER_PAGE);
  const supportedStartIndex = supportedPage * SUPPORTED_ENGINES_PER_PAGE;
  const supportedEndIndex = supportedStartIndex + SUPPORTED_ENGINES_PER_PAGE;
  const paginatedSupportedEngines = defaultEngines.slice(supportedStartIndex, supportedEndIndex);

  // Paginate custom engines
  const customTotalPages = Math.ceil(customEngines.length / CUSTOM_ENGINES_PER_PAGE);
  const customStartIndex = customPage * CUSTOM_ENGINES_PER_PAGE;
  const customEndIndex = customStartIndex + CUSTOM_ENGINES_PER_PAGE;
  const paginatedCustomEngines = customEngines.slice(customStartIndex, customEndIndex);

  const handleSwitchEngine = async (engineId: string) => {
    if (engineId === activeEngine.id) return;

    setSwitching(engineId);
    try {
      await switchEngine(engineId);
      // Reload the page to fetch new data
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch engine:', error);
      alert('Failed to switch engine. Please try again.');
      setSwitching(null);
    }
  };

  const handleRemoveEngine = (engineId: string) => {
    if (confirm('Are you sure you want to remove this engine?')) {
      try {
        removeEngine(engineId);
        refreshEngines();

        // Adjust page if current page is now empty
        const newCustomCount = customEngines.length - 1;
        const newTotalPages = Math.ceil(newCustomCount / CUSTOM_ENGINES_PER_PAGE);
        if (customPage >= newTotalPages && customPage > 0) {
          setCustomPage(customPage - 1);
        }
      } catch (error) {
        console.error('Failed to remove engine:', error);
        alert('Failed to remove engine. Please try again.');
      }
    }
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
    refreshEngines();

    // Navigate to last page to show newly added engine
    const newCustomCount = customEngines.length + 1;
    const newTotalPages = Math.ceil(newCustomCount / CUSTOM_ENGINES_PER_PAGE);
    setCustomPage(newTotalPages - 1);
  };

  // Supported engines pagination
  const goToNextSupportedPage = () => {
    if (supportedPage < supportedTotalPages - 1) {
      setSupportedPage(supportedPage + 1);
    }
  };

  const goToPrevSupportedPage = () => {
    if (supportedPage > 0) {
      setSupportedPage(supportedPage - 1);
    }
  };

  // Custom engines pagination
  const goToNextCustomPage = () => {
    if (customPage < customTotalPages - 1) {
      setCustomPage(customPage + 1);
    }
  };

  const goToPrevCustomPage = () => {
    if (customPage > 0) {
      setCustomPage(customPage - 1);
    }
  };

  const renderGridEngineItem = (engine: typeof allEngines[0]) => {
    const isActive = engine.id === activeEngine.id;
    const isSwitching = switching === engine.id;

    // Only show tooltip for long names that will be truncated
    const isLongName = engine.name.length > 25;
    const tooltipText = isLongName ? `${engine.name}\n${engine.repoOwner}/${engine.repoName} (${engine.branch})` : undefined;

    return (
      <div
        key={engine.id}
        className={cn(
          'flex flex-col items-center p-4 rounded-lg border transition-all cursor-pointer relative',
          isActive
            ? 'bg-accent border-primary shadow-sm'
            : 'bg-background border-border hover:bg-accent/50'
        )}
        onClick={() => !isSwitching && handleSwitchEngine(engine.id)}
        title={tooltipText}
      >
        {isActive && (
          <div className="absolute top-2 right-2">
            <Check className="w-4 h-4 text-primary" />
          </div>
        )}
        {isSwitching && (
          <div className="absolute top-2 right-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {engine.avatarUrl && (
          <img
            src={engine.avatarUrl}
            alt={`${engine.repoOwner} avatar`}
            className="w-16 h-16 rounded-full mb-3 flex-shrink-0"
          />
        )}

        <div className="text-center w-full min-w-0">
          <p
            className={cn(
              'font-medium text-sm mb-1 px-1 break-words line-clamp-2',
              isActive && 'text-primary'
            )}
            style={{ wordBreak: 'break-word' }}
          >
            {engine.name}
          </p>
          <p className="text-xs text-muted-foreground truncate px-1">
            {engine.branch}
          </p>
        </div>
      </div>
    );
  };

  const renderListEngineItem = (engine: typeof allEngines[0]) => {
    const isActive = engine.id === activeEngine.id;
    const isSwitching = switching === engine.id;

    // Only show tooltip for long names that will be truncated
    // More conservative thresholds to avoid unnecessary tooltips
    const isLongName = engine.name.length > 30 || `${engine.repoOwner}/${engine.repoName}`.length > 50;
    const tooltipText = isLongName ? `${engine.name}\n${engine.repoOwner}/${engine.repoName} (${engine.branch})` : undefined;

    return (
      <div
        key={engine.id}
        className={cn(
          'flex items-center justify-between p-3 rounded-md border transition-all cursor-pointer',
          isActive
            ? 'bg-accent border-primary shadow-sm'
            : 'bg-background border-border hover:bg-accent/50'
        )}
        onClick={() => !isSwitching && handleSwitchEngine(engine.id)}
        title={tooltipText}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isActive && (
            <Check className="w-4 h-4 text-primary flex-shrink-0" />
          )}
          {engine.avatarUrl && (
            <img
              src={engine.avatarUrl}
              alt={`${engine.repoOwner} avatar`}
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <p
                className={cn(
                  'font-medium truncate',
                  isActive && 'text-primary'
                )}
              >
                {engine.name}
              </p>
              {engine.isDefault && (
                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full flex-shrink-0">
                  Default
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {engine.repoOwner}/{engine.repoName} ({engine.branch})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isSwitching && (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
          {!engine.isDefault && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveEngine(engine.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Engines</h2>
            <p className="text-xs text-muted-foreground">
              {defaultEngines.length} supported • {customEngines.length} custom
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {showAddForm ? (
            <AddEngineForm
              onSuccess={handleAddSuccess}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <div className="space-y-6">
              {/* Supported Engines Section */}
              {defaultEngines.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Supported Engines
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {paginatedSupportedEngines.map(renderGridEngineItem)}
                  </div>

                  {/* Pagination for Supported Engines */}
                  {supportedTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPrevSupportedPage}
                        disabled={supportedPage === 0}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {supportedPage + 1} of {supportedTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextSupportedPage}
                        disabled={supportedPage >= supportedTotalPages - 1}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Engines Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Custom Engines {customEngines.length > 0 && `(${customEngines.length})`}
                  </h3>
                </div>

                {customEngines.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      {paginatedCustomEngines.map(renderListEngineItem)}
                    </div>

                    {/* Pagination for Custom Engines */}
                    {customTotalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPrevCustomPage}
                          disabled={customPage === 0}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {customPage + 1} of {customTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextCustomPage}
                          disabled={customPage >= customTotalPages - 1}
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-md">
                    No custom engines yet. Add one to get started!
                  </p>
                )}
              </div>

              {/* Add Engine Button */}
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-md border-2 border-dashed border-border hover:border-primary hover:bg-accent/50 transition-all text-muted-foreground hover:text-primary"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add Custom Engine</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
