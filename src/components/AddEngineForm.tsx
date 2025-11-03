import { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Loader2, Copy, Check, RefreshCw, Github } from 'lucide-react';
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

  const canSave = repoOwner && repoName && branch && treeSha && !shaError;

  const handleRepoUrlChange = (value: string) => {
    setRepoUrl(value);
    setUrlError('');

    const parsed = parseGitHubRepo(value);
    if (parsed) {
      setRepoOwner(parsed.owner);
      setRepoName(parsed.repo);
      setUrlError('');
    } else if (value.trim()) {
      setUrlError('Invalid format. Use: owner/repo or https://github.com/owner/repo');
    }
  };

  const handleFetchSHA = async () => {
    if (!repoOwner || !repoName || !branch) {
      setShaError('Please fill in repository owner, name, and branch');
      return;
    }

    setFetchingSHA(true);
    setShaError('');
    setTreeSha('');

    try {
      const sha = await fetchSHA(repoOwner, repoName, branch);
      setTreeSha(sha);
    } catch (error) {
      setShaError(error instanceof Error ? error.message : 'Failed to fetch SHA');
    } finally {
      setFetchingSHA(false);
    }
  };

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
    try {
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
        treeSha,
        excludedFolders: excludedArray,
        imageExtensions: extensionsArray
      });

      onSuccess();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add engine');
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
        {repoOwner && repoName && (
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
            }}
            placeholder="e.g., repo-name"
          />
        </div>
      </div>

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
            placeholder="Click refresh to fetch..."
            className={shaError ? 'border-destructive' : ''}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleFetchSHA}
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
