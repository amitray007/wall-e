import { X, Settings } from 'lucide-react';
import { Button } from './Button';
import { GitHubTokenSettings } from './GitHubTokenSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenChanged?: () => void;
}

export function SettingsModal({ isOpen, onClose, onTokenChanged }: SettingsModalProps) {
  if (!isOpen) return null;

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
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Settings</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <GitHubTokenSettings onTokenChanged={() => {
            onTokenChanged?.();
          }} />
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;

