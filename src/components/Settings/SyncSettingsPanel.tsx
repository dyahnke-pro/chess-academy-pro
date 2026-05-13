import { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { pushToCloud, pullFromCloud, getSyncConfig } from '../../services/syncService';
import { encryptApiKey } from '../../services/cryptoService';
import { Cloud, Download, Upload } from 'lucide-react';

export function SyncSettingsPanel(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  // All three fields (URL, anon key, user ID) now persist encrypted
  // via cryptoService. Initial state shows the decrypted form so the
  // user can read/edit them in-place; legacy plaintext profiles get
  // upgraded on the next Save Config. (Anon key still hidden by
  // password input, but URL + user ID are clear text in the field —
  // the encryption is for at-rest XSS exfiltration defense, not
  // user-facing redaction.)
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [syncUserId, setSyncUserId] = useState('');
  useEffect(() => {
    if (!activeProfile) return;
    void (async () => {
      const cfg = await getSyncConfig(activeProfile);
      setSupabaseUrl(cfg.supabaseUrl ?? '');
      setSupabaseAnonKey(cfg.supabaseAnonKey ?? '');
      setSyncUserId(cfg.syncUserId ?? '');
    })();
  }, [activeProfile]);

  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'info' | 'success' | 'error'>('info');
  const [busy, setBusy] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const getSyncPref = (key: string): string => {
    if (!activeProfile) return '';
    const prefs = activeProfile.preferences as unknown as Record<string, unknown>;
    const val: unknown = prefs[key];
    return typeof val === 'string' ? val : '';
  };

  const lastSyncDate = getSyncPref('lastSyncDate') || null;

  const handleSaveConfig = async (): Promise<void> => {
    if (!activeProfile) return;
    // Encrypt ALL three sync fields before persisting. Security audit
    // (R6) flagged plaintext storage as an XSS exfiltration vector;
    // anon key was already encrypted, URL + user ID lagged. Each
    // legacy plaintext field is nulled out so stale reads can't pick
    // them up.
    async function encryptOrNull(value: string): Promise<{ encrypted: string | null; iv: string | null }> {
      if (!value) return { encrypted: null, iv: null };
      const enc = await encryptApiKey(value);
      return { encrypted: enc.encrypted, iv: enc.iv };
    }
    const [anonKey, url, userId] = await Promise.all([
      encryptOrNull(supabaseAnonKey),
      encryptOrNull(supabaseUrl),
      encryptOrNull(syncUserId),
    ]);
    const updatedPrefs = {
      ...activeProfile.preferences,
      // Drop legacy plaintext so a stale read can't pick them up.
      supabaseUrl: null,
      supabaseUrlEncrypted: url.encrypted,
      supabaseUrlIv: url.iv,
      supabaseAnonKey: null,
      supabaseAnonKeyEncrypted: anonKey.encrypted,
      supabaseAnonKeyIv: anonKey.iv,
      syncUserId: null,
      syncUserIdEncrypted: userId.encrypted,
      syncUserIdIv: userId.iv,
    } as unknown as Record<string, unknown>;

    await db.profiles.update(activeProfile.id, { preferences: updatedPrefs as unknown as typeof activeProfile.preferences });
    setActiveProfile({ ...activeProfile, preferences: updatedPrefs as unknown as typeof activeProfile.preferences });
    setStatus('Config saved');
    setTimeout(() => setStatus(null), 2000);
  };

  const handleBackup = async (): Promise<void> => {
    if (!activeProfile || busy) return;
    setBusy(true);
    setStatus('Backing up...');
    setStatusKind('info');
    try {
      await pushToCloud(activeProfile);
      setStatus('Backup complete.');
      setStatusKind('success');
      // Auto-clear successes so the banner doesn't linger forever.
      setTimeout(() => setStatus(null), 4000);
    } catch (err) {
      // Errors STAY VISIBLE until the user acts — previously they
      // vanished in 3s and the user had no idea the backup failed.
      setStatus(`Backup failed: ${err instanceof Error ? err.message : 'unknown error'}`);
      setStatusKind('error');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (): Promise<void> => {
    if (!activeProfile || busy) return;
    setBusy(true);
    setConfirmRestore(false);
    setStatus('Restoring...');
    setStatusKind('info');
    try {
      await pullFromCloud(activeProfile);
      setStatus('Restore complete. Reload to see changes.');
      setStatusKind('success');
      setTimeout(() => setStatus(null), 4000);
    } catch (err) {
      setStatus(`Restore failed: ${err instanceof Error ? err.message : 'unknown error'}`);
      setStatusKind('error');
    } finally {
      setBusy(false);
    }
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
          disabled={busy}
          className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          data-testid="sync-backup-btn"
        >
          <Upload size={14} />
          Backup Now
        </button>
        {!confirmRestore ? (
          <button
            onClick={() => setConfirmRestore(true)}
            disabled={busy}
            className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border disabled:opacity-50"
            style={{ borderColor: 'var(--color-border)' }}
            data-testid="sync-restore-btn"
          >
            <Download size={14} />
            Restore
          </button>
        ) : (
          <button
            onClick={() => void handleRestore()}
            disabled={busy}
            className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
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
        <div
          className="flex items-start justify-between gap-2 p-2 rounded-lg"
          style={{
            background: statusKind === 'error'
              ? 'rgba(239, 68, 68, 0.12)'
              : statusKind === 'success'
                ? 'rgba(34, 197, 94, 0.12)'
                : 'rgba(6, 182, 212, 0.12)',
            borderLeft: `3px solid ${
              statusKind === 'error'
                ? 'rgb(239, 68, 68)'
                : statusKind === 'success'
                  ? 'rgb(34, 197, 94)'
                  : 'var(--color-accent)'
            }`,
          }}
          data-testid="sync-status"
        >
          <p
            className="text-sm font-medium"
            style={{
              color: statusKind === 'error'
                ? 'rgb(239, 68, 68)'
                : statusKind === 'success'
                  ? 'rgb(34, 197, 94)'
                  : 'var(--color-accent)',
            }}
          >
            {status}
          </p>
          {statusKind === 'error' && (
            <button
              onClick={() => setStatus(null)}
              className="text-xs px-2 py-0.5 rounded hover:opacity-70"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Dismiss error"
              data-testid="sync-status-dismiss"
            >
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}
