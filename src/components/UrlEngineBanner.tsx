import { useState } from 'react';
import { Save, ExternalLink } from 'lucide-react';
import { Button } from './Button';
import type { Engine } from '../types';

interface UrlEngineBannerProps {
  engine: Engine;
  onSave: () => void;
  onDismiss: () => void;
}

export function UrlEngineBanner({ engine, onSave, onDismiss }: UrlEngineBannerProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-background border border-border rounded-lg shadow-lg overflow-hidden">
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
        
        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <ExternalLink className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-1">
                Repository loaded from URL
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                <span className="font-mono text-foreground">{engine.name}</span> is temporary. Save it?
              </p>
              
              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="h-8 px-3 text-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="h-8 px-3 text-xs"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

