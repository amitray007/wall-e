import { useState } from 'react';
import { AlertTriangle, Key, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { saveGitHubToken, isValidTokenFormat, getTimeUntilReset, validateTokenWithAPI, fetchRateLimitInfo } from '../lib/github-token';
import type { RateLimitInfo } from '../lib/github-token';

interface RateLimitErrorProps {
  rateLimitInfo?: RateLimitInfo | null;
  onTokenSaved?: () => void;
  onRetry?: () => void;
}

export function RateLimitError({ rateLimitInfo, onTokenSaved, onRetry }: RateLimitErrorProps) {
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  const handleSaveToken = async () => {
    setError('');
    
    if (!token.trim()) {
      setError('Please enter a token');
      return;
    }

    if (!isValidTokenFormat(token)) {
      setError('Invalid token format. Token should start with "ghp_" or "github_pat_"');
      return;
    }

    setSaving(true);
    try {
      // Validate token with GitHub API
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
      setShowTokenInput(false);
      onTokenSaved?.();
    } catch (err) {
      setError('Failed to validate token. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetTime = rateLimitInfo ? getTimeUntilReset(rateLimitInfo.reset) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">GitHub API Rate Limit Exceeded</h1>
          <p className="text-muted-foreground">
            You've reached the limit for unauthenticated requests to GitHub's API.
          </p>
        </div>

        {/* Rate Limit Info */}
        {rateLimitInfo && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{rateLimitInfo.limit}</p>
                <p className="text-xs text-muted-foreground">Limit</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{rateLimitInfo.remaining}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{rateLimitInfo.used}</p>
                <p className="text-xs text-muted-foreground">Used</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{resetTime || '—'}</p>
                <p className="text-xs text-muted-foreground">Resets in (min)</p>
              </div>
            </div>
          </div>
        )}

        {/* Solutions */}
        <div className="space-y-4 mb-6">
          <div className="border border-border rounded-lg p-6">
            <h2 className="font-semibold mb-2 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Recommended: Add a GitHub Token
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Increase your rate limit from <strong>60</strong> to <strong>5,000</strong> requests per hour by adding a Personal Access Token.
            </p>

            {!showTokenInput ? (
              <Button onClick={() => setShowTokenInput(true)} className="w-full md:w-auto">
                <Key className="w-4 h-4 mr-2" />
                Add GitHub Token
              </Button>
            ) : (
              <div className="space-y-3">
                <div>
                  <Input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className={error ? 'border-destructive' : ''}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveToken();
                    }}
                  />
                  {error && (
                    <p className="text-xs text-destructive mt-1">{error}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveToken} disabled={saving} className="flex-1">
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      'Save Token'
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowTokenInput(false);
                    setToken('');
                    setError('');
                  }} disabled={saving}>
                    Cancel
                  </Button>
                </div>
                <a
                  href="https://github.com/settings/tokens/new?scopes=&description=WALL-E%20Gallery"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Create a token on GitHub (no permissions needed)
                </a>
              </div>
            )}
          </div>

          <div className="border border-border rounded-lg p-6">
            <h2 className="font-semibold mb-2 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Wait and Retry
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {resetTime 
                ? `Your rate limit will reset in approximately ${resetTime} minutes.`
                : 'Wait for the rate limit to reset and try again.'}
            </p>
            <Button variant="outline" onClick={onRetry} className="w-full md:w-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Now
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Your token is stored locally and only used for GitHub API requests.
          </p>
          <a
            href="https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1 mt-2"
          >
            Learn more about GitHub rate limits
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

