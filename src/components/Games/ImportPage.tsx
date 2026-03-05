import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { importLichessGames } from '../../services/lichessService';
import { importChessComGames } from '../../services/chesscomService';
import { ArrowLeft } from 'lucide-react';

type Platform = 'lichess' | 'chesscom';

export function ImportPage(): JSX.Element {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform>('lichess');
  const [username, setUsername] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);

  const handleImport = async (): Promise<void> => {
    if (!username.trim()) return;
    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const count = platform === 'lichess'
        ? await importLichessGames(username, setProgress)
        : await importChessComGames(username, setProgress);
      setResult(`Imported ${count} games`);
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto pb-20 md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="import-page"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => void navigate('/games')}
          className="p-2 rounded-lg hover:opacity-80"
          style={{ background: 'var(--color-surface)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold">Import Games</h1>
      </div>

      {/* Platform toggle */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--color-bg-secondary)' }}>
        <button
          onClick={() => setPlatform('lichess')}
          className="flex-1 py-2 rounded-md text-sm font-medium"
          style={{
            background: platform === 'lichess' ? 'var(--color-surface)' : 'transparent',
            color: platform === 'lichess' ? 'var(--color-text)' : 'var(--color-text-muted)',
          }}
          data-testid="platform-lichess"
        >
          Lichess
        </button>
        <button
          onClick={() => setPlatform('chesscom')}
          className="flex-1 py-2 rounded-md text-sm font-medium"
          style={{
            background: platform === 'chesscom' ? 'var(--color-surface)' : 'transparent',
            color: platform === 'chesscom' ? 'var(--color-text)' : 'var(--color-text-muted)',
          }}
          data-testid="platform-chesscom"
        >
          Chess.com
        </button>
      </div>

      {/* Username input */}
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>
          {platform === 'lichess' ? 'Lichess' : 'Chess.com'} Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username..."
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          data-testid="username-input"
        />
      </div>

      {/* Import button */}
      <button
        onClick={() => void handleImport()}
        disabled={importing || !username.trim()}
        className="w-full py-3 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-50"
        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
        data-testid="import-btn"
      >
        {importing ? `Importing... (${progress})` : 'Import Games'}
      </button>

      {/* Progress bar */}
      {importing && (
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(progress * 5, 100)}%`, background: 'var(--color-accent)' }}
            data-testid="import-progress"
          />
        </div>
      )}

      {/* Result message */}
      {result && (
        <p className="text-sm font-medium text-center" style={{ color: 'var(--color-accent)' }} data-testid="import-result">
          {result}
        </p>
      )}
    </div>
  );
}
