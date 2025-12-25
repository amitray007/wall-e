import { useState } from 'react';
import { Key, ExternalLink, Eye, EyeOff, Check, Trash2, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { 
  getGitHubToken, 
  saveGitHubToken, 
  removeGitHubToken, 
  isValidTokenFormat,
  hasGitHubToken,
  validateTokenWithAPI,
  fetchRateLimitInfo,
  clearRateLimitInfo
} from '../lib/github-token';

interface GitHubTokenSettingsProps {
  onTokenChanged?: () => void;
}

export function GitHubTokenSettings({ onTokenChanged }: GitHubTokenSettingsProps) {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(!hasGitHubToken());
  const [validating, setValidating] = useState(false);
  const hasExistingToken = hasGitHubToken();

  const handleSave = async () => {
    setError('');
    setSuccess(false);

    if (!token.trim()) {
      setError('Please enter a token');
      return;
    }

    if (!isValidTokenFormat(token)) {
      setError('Invalid token format. Should start with "ghp_" or "github_pat_"');
      return;
    }

    // Validate token with GitHub API
    setValidating(true);
    try {
      const validation = await validateTokenWithAPI(token);
      
      if (!validation.valid) {
        setError(validation.error || 'Token validation failed');
        return;
      }

      // Token is valid, save it
      saveGitHubToken(token);
      
      // Fetch updated rate limit info
      await fetchRateLimitInfo();
      
      setToken('');
      setShowToken(false);
      setIsEditing(false);
      setSuccess(true);
      onTokenChanged?.();
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to validate token. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleRemove = async () => {
    if (confirm('Remove GitHub token? This will reduce your rate limit to 60 requests/hour.')) {
      // Remove token first
      removeGitHubToken();
      
      // Clear the cached rate limit info to force a fresh fetch
      // This prevents stale authenticated rate limits from being displayed
      clearRateLimitInfo();
      
      setIsEditing(true);
      
      // Notify parent to refresh rate limit (will fetch fresh unauthenticated limits)
      onTokenChanged?.();
    }
  };

  const handleEdit = () => {
    const existingToken = getGitHubToken();
    if (existingToken) {
      setToken(existingToken);
    }
    setIsEditing(true);
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Key className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">GitHub Personal Access Token</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Increase API rate limit from 60 to 5,000 requests/hour
            </p>
          </div>
        </div>
      </div>

      {!isEditing && hasExistingToken ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm">
            Token configured ✓
          </div>
          <Button variant="outline" size="sm" onClick={handleEdit}>
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleRemove}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className={error ? 'border-destructive pr-10' : 'pr-10'}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {success && (
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Token saved successfully!
            </p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" className="flex-1" disabled={validating}>
              {validating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Save Token
                </>
              )}
            </Button>
            {hasExistingToken && (
              <Button variant="outline" size="sm" onClick={() => {
                setIsEditing(false);
                setToken('');
                setError('');
              }} disabled={validating}>
                Cancel
              </Button>
            )}
          </div>

          <div className="text-xs space-y-2">
            <a
              href="https://github.com/settings/tokens/new?scopes=&description=WALL-E%20Gallery"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Create a token on GitHub (no permissions needed)
            </a>
            <p className="text-muted-foreground">
              • The token is stored locally in your browser<br />
              • No permissions (scopes) are required<br />
              • Used only for GitHub API requests
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

