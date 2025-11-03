import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Loader2, Copy, Check, RefreshCw, Github, ChevronDown, ChevronRight } from 'lucide-react';
import { useEngine } from '../contexts/EngineContext';

interface AddEngineFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

// Parse GitHub repository URL or short format
function parseGitHubRepo(input: string): { owner: string; repo: string } | null {
  if (!input.trim()) return null;

  const trimmed = input.trim();

  // Match various formats:
  // https://github.com/owner/repo
  // http://github.com/owner/repo
  // github.com/owner/repo
  // owner/repo
  const patterns = [
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/\s]+)/i,
    /^github\.com\/([^\/]+)\/([^\/\s]+)/i,
    /^([^\/\s]+)\/([^\/\s]+)$/
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, '') // Remove .git suffix if present
      };
    }
  }

  return null;
}

export function AddEngineForm({ onSuccess, onCancel }: AddEngineFormProps) {
  const { addEngine, fetchSHA } = useEngine();

  const [repoUrl, setRepoUrl] = useState('');
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [branch, setBranch] = useState('main');
  const [treeSha, setTreeSha] = useState('');
  const [excludedFolders, setExcludedFolders] = useState('.github');
  const [imageExtensions, setImageExtensions] = useState('.png,.jpg,.jpeg,.webp,.gif,.bmp');

  const [fetchingSHA, setFetchingSHA] = useState(false);
  const [shaError, setShaError] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showParsedMessage, setShowParsedMessage] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const canSave = repoOwner && repoName && branch && !shaError;

  const handleRepoUrlChange = (value: string) => {
    setRepoUrl(value);
    setUrlError('');

    const parsed = parseGitHubRepo(value);
    if (parsed) {
      setRepoOwner(parsed.owner);
      setRepoName(parsed.repo);
      setUrlError('');
      setShowParsedMessage(true);
    } else {
      setShowParsedMessage(false);
      if (value.trim()) {
        setUrlError('Invalid format. Use: owner/repo or https://github.com/owner/repo');
      }
    }
  };

  const handleFetchSHA = useCallback(async (silent = false) => {
    if (!repoOwner || !repoName || !branch) {
      if (!silent) {
        setShaError('Please fill in repository owner, name, and branch');
      }
      return null;
    }

    setFetchingSHA(true);
    setShaError('');
    if (!silent) {
      setTreeSha('');
    }

    try {
      const sha = await fetchSHA(repoOwner, repoName, branch);
      setTreeSha(sha);
      setShaError('');
      return sha;
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please check repository details.';
      setShaError(errorMsg);
      return null;
    } finally {
      setFetchingSHA(false);
    }
  }, [repoOwner, repoName, branch, fetchSHA]);

  // Debounced auto-fetch when repo details change
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only auto-fetch if we have all required fields
    if (repoOwner && repoName && branch) {
      debounceTimerRef.current = setTimeout(() => {
        handleFetchSHA(true); // Silent fetch
      }, 1000); // 1 second debounce
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [repoOwner, repoName, branch, handleFetchSHA]);

  const handleCopySHA = () => {
    if (treeSha) {
      navigator.clipboard.writeText(treeSha);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSave) return;

    setSaving(true);
    setSaveError('');

    try {
      // If treeSha is empty, fetch it before saving
      let finalTreeSha = treeSha;
      if (!finalTreeSha) {
        const fetchedSha = await handleFetchSHA(false);
        if (!fetchedSha) {
          // Error already set by handleFetchSHA
          setSaving(false);
          return;
        }
        finalTreeSha = fetchedSha;
      }

      const excludedArray = excludedFolders
        .split(',')
        .map(f => f.trim())
        .filter(Boolean);

      const extensionsArray = imageExtensions
        .split(',')
        .map(ext => ext.trim())
        .filter(Boolean)
        .map(ext => ext.startsWith('.') ? ext : `.${ext}`);

      await addEngine({
        name: `${repoOwner}/${repoName}`,
        repoOwner,
        repoName,
        branch,
        treeSha: finalTreeSha,
        excludedFolders: excludedArray,
        imageExtensions: extensionsArray
      });

      onSuccess();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to add engine';
      setSaveError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* GitHub Repository URL */}
      <div>
        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
          <Github className="w-4 h-4" />
          GitHub Repository <span className="text-destructive">*</span>
        </label>
        <Input
          type="text"
          value={repoUrl}
          onChange={(e) => handleRepoUrlChange(e.target.value)}
          placeholder="owner/repo or https://github.com/owner/repo"
          className={urlError ? 'border-destructive' : ''}
        />
        {urlError && (
          <p className="text-xs text-destructive mt-1">{urlError}</p>
        )}
        {showParsedMessage && repoOwner && repoName && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            ✓ Parsed: {repoOwner}/{repoName}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex-1 h-px bg-border"></div>
        <span>or enter manually</span>
        <div className="flex-1 h-px bg-border"></div>
      </div>

      {/* Manual Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-2">
            Owner
          </label>
          <Input
            type="text"
            value={repoOwner}
            onChange={(e) => {
              setRepoOwner(e.target.value);
              setRepoUrl('');
              setShowParsedMessage(false);
            }}
            placeholder="e.g., username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Repository
          </label>
          <Input
            type="text"
            value={repoName}
            onChange={(e) => {
              setRepoName(e.target.value);
              setRepoUrl('');
              setShowParsedMessage(false);
            }}
            placeholder="e.g., repo-name"
          />
        </div>
      </div>

      {/* Advanced Settings - Expandable */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
        >
          {showAdvanced ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          Advanced Settings
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 p-4 border border-border rounded-lg bg-muted/30">
            <div>
              <label className="block text-sm font-medium mb-2">
                Branch <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g., main or master"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Tree SHA <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={treeSha}
                  readOnly
                  placeholder="Auto-fetching..."
                  className={shaError ? 'border-destructive' : ''}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleFetchSHA(false)}
                  disabled={fetchingSHA || !repoOwner || !repoName || !branch}
                  title="Fetch Tree SHA"
                >
                  {fetchingSHA ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopySHA}
                  disabled={!treeSha}
                  title="Copy SHA"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {shaError && (
                <p className="text-sm text-destructive mt-1">{shaError}</p>
              )}
              {fetchingSHA && (
                <p className="text-sm text-muted-foreground mt-1">Fetching SHA from GitHub...</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Excluded Folders (comma separated)
        </label>
        <Input
          type="text"
          value={excludedFolders}
          onChange={(e) => setExcludedFolders(e.target.value)}
          placeholder="e.g., .github, .git, docs"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Folders to exclude from the gallery
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Image Extensions (comma separated)
        </label>
        <Input
          type="text"
          value={imageExtensions}
          onChange={(e) => setImageExtensions(e.target.value)}
          placeholder="e.g., .png, .jpg, .jpeg"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Supported image file extensions
        </p>
      </div>

      {saveError && (
        <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
          <p className="text-sm text-destructive">{saveError}</p>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!canSave || saving}
          className="flex-1"
          title={
            shaError
              ? `Cannot save: ${shaError}`
              : !repoOwner || !repoName
              ? 'Please fill in repository details'
              : !branch
              ? 'Please specify a branch'
              : ''
          }
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Engine'
          )}
        </Button>
      </div>
    </form>
  );
}
