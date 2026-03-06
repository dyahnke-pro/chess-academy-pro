import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { pushToCloud, pullFromCloud } from '../../services/syncService';
import { Cloud, Download, Upload } from 'lucide-react';

export function SyncSettingsPanel(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const getSyncPref = (key: string): string => {
    if (!activeProfile) return '';
    const prefs = activeProfile.preferences as unknown as Record<string, unknown>;
    const val: unknown = prefs[key];
    return typeof val === 'string' ? val : '';
  };

  const [supabaseUrl, setSupabaseUrl] = useState(() => getSyncPref('supabaseUrl'));
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => getSyncPref('supabaseAnonKey'));
  const [syncUserId, setSyncUserId] = useState(() => getSyncPref('syncUserId'));

  const [status, setStatus] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const lastSyncDate = getSyncPref('lastSyncDate') || null;

  const handleSaveConfig = async (): Promise<void> => {
    if (!activeProfile) return;
    const updatedPrefs = {
      ...activeProfile.preferences,
      supabaseUrl: supabaseUrl || null,
      supabaseAnonKey: supabaseAnonKey || null,
      syncUserId: syncUserId || null,
    } as unknown as Record<string, unknown>;

    await db.profiles.update(activeProfile.id, { preferences: updatedPrefs as unknown as typeof activeProfile.preferences });
    setActiveProfile({ ...activeProfile, preferences: updatedPrefs as unknown as typeof activeProfile.preferences });
    setStatus('Config saved');
    setTimeout(() => setStatus(null), 2000);
  };

  const handleBackup = async (): Promise<void> => {
    if (!activeProfile) return;
    setStatus('Backing up...');
    try {
      await pushToCloud(activeProfile);
      setStatus('Backup complete!');
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : 'unknown'}`);
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const handleRestore = async (): Promise<void> => {
    if (!activeProfile) return;
    setConfirmRestore(false);
    setStatus('Restoring...');
    try {
      await pullFromCloud(activeProfile);
      setStatus('Restore complete! Reload to see changes.');
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : 'unknown'}`);
    }
    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div className="space-y-4" data-testid="sync-settings-panel">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Cloud size={16} />
        Cloud Sync (Supabase)
      </h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Supabase URL
          </label>
          <input
            type="text"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            placeholder="https://xxxx.supabase.co"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            data-testid="sync-url-input"
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Anon Key
          </label>
          <input
            type="password"
            value={supabaseAnonKey}
            onChange={(e) => setSupabaseAnonKey(e.target.value)}
            placeholder="eyJ..."
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            data-testid="sync-key-input"
          />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>
            User ID
          </label>
          <input
            type="text"
            value={syncUserId}
            onChange={(e) => setSyncUserId(e.target.value)}
            placeholder="your-user-id"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            data-testid="sync-user-input"
          />
        </div>

        <button
          onClick={() => void handleSaveConfig()}
          className="w-full py-2 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
          data-testid="sync-save-btn"
        >
          Save Config
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => void handleBackup()}
          className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          data-testid="sync-backup-btn"
        >
          <Upload size={14} />
          Backup Now
        </button>
        {!confirmRestore ? (
          <button
            onClick={() => setConfirmRestore(true)}
            className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border"
            style={{ borderColor: 'var(--color-border)' }}
            data-testid="sync-restore-btn"
          >
            <Download size={14} />
            Restore
          </button>
        ) : (
          <button
            onClick={() => void handleRestore()}
            className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-error)', color: '#fff' }}
            data-testid="sync-confirm-restore-btn"
          >
            Confirm Restore?
          </button>
        )}
      </div>

      {lastSyncDate && (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Last sync: {new Date(lastSyncDate).toLocaleString()}
        </p>
      )}

      {status && (
        <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }} data-testid="sync-status">
          {status}
        </p>
      )}
    </div>
  );
}
