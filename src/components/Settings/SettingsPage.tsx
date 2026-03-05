import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { exportUserData } from '../../services/dbService';
import { ThemePickerPanel } from '../ui/ThemePickerPanel';
import { SyncSettingsPanel } from './SyncSettingsPanel';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';
import { encryptApiKey } from '../../services/cryptoService';
import { User, Palette, Bot, Info } from 'lucide-react';
import { APP_VERSION, BETA_MODE } from '../../utils/constants';

type SettingsTab = 'profile' | 'coach' | 'appearance' | 'about';

const TABS: { id: SettingsTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'coach', label: 'Coach', icon: Bot },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'about', label: 'About', icon: Info },
];

export function SettingsPage(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const [tab, setTab] = useState<SettingsTab>('profile');

  if (!activeProfile) return <></>;

  return (
    <div
      className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto pb-20 md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="settings-page"
    >
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--color-bg-secondary)' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              background: tab === id ? 'var(--color-surface)' : 'transparent',
              color: tab === id ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}
            data-testid={`tab-${id}`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div
        className="rounded-xl p-5 border"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {tab === 'profile' && (
          <ProfileTab profile={activeProfile} setProfile={setActiveProfile} />
        )}
        {tab === 'coach' && (
          <CoachTab profile={activeProfile} setProfile={setActiveProfile} />
        )}
        {tab === 'appearance' && <AppearanceTab profile={activeProfile} setProfile={setActiveProfile} />}
        {tab === 'about' && <AboutTab />}
      </div>
    </div>
  );
}

function ProfileTab({
  profile,
  setProfile,
}: {
  profile: import('../../types').UserProfile;
  setProfile: (p: import('../../types').UserProfile) => void;
}): JSX.Element {
  const [name, setName] = useState(profile.name);
  const [elo, setElo] = useState(profile.currentRating);
  const [dailyMin, setDailyMin] = useState(profile.preferences.dailySessionMinutes);
  const [kidMode, setKidMode] = useState(profile.isKidMode);

  const handleSaveProfile = async (): Promise<void> => {
    const updated = {
      ...profile,
      name,
      currentRating: elo,
      isKidMode: kidMode,
      preferences: { ...profile.preferences, dailySessionMinutes: dailyMin },
    };
    await db.profiles.update(profile.id, {
      name,
      currentRating: elo,
      isKidMode: kidMode,
      preferences: updated.preferences,
    });
    setProfile(updated);
  };

  const handleExport = async (): Promise<void> => {
    const data = await exportUserData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chess-academy-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" data-testid="profile-tab">
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          data-testid="name-input"
        />
      </div>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>ELO Rating</label>
        <input
          type="number"
          value={elo}
          onChange={(e) => setElo(Number(e.target.value))}
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          data-testid="elo-input"
        />
      </div>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Daily Session (min)</label>
        <select
          value={dailyMin}
          onChange={(e) => setDailyMin(Number(e.target.value))}
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          data-testid="daily-min-select"
        >
          {[15, 30, 45, 60, 90].map((m) => (
            <option key={m} value={m}>{m} minutes</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={kidMode}
          onChange={(e) => setKidMode(e.target.checked)}
          data-testid="kid-mode-toggle"
        />
        <label className="text-sm">Kid Mode</label>
      </div>
      <button
        onClick={() => void handleSaveProfile()}
        className="w-full py-2 rounded-lg text-sm font-medium"
        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
        data-testid="save-profile-btn"
      >
        Save Profile
      </button>
      <button
        onClick={() => void handleExport()}
        className="w-full py-2 rounded-lg text-sm font-medium border"
        style={{ borderColor: 'var(--color-border)' }}
        data-testid="export-data-btn"
      >
        Export Data
      </button>

      <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <SyncSettingsPanel />
      </div>
    </div>
  );
}

function CoachTab({
  profile,
  setProfile,
}: {
  profile: import('../../types').UserProfile;
  setProfile: (p: import('../../types').UserProfile) => void;
}): JSX.Element {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [budgetCap, setBudgetCap] = useState<number | null>(profile.preferences.monthlyBudgetCap);
  const [commentaryModel, setCommentaryModel] = useState(profile.preferences.preferredModel.commentary);
  const [analysisModel, setAnalysisModel] = useState(profile.preferences.preferredModel.analysis);
  const [reportsModel, setReportsModel] = useState(profile.preferences.preferredModel.reports);
  const [status, setStatus] = useState<string | null>(null);

  const hasExistingKey = Boolean(profile.preferences.apiKeyEncrypted);
  const modelOptions = [
    { value: 'claude-haiku-4-5-20251001', label: 'Haiku (fastest)' },
    { value: 'claude-sonnet-4-5-20250514', label: 'Sonnet (balanced)' },
    { value: 'claude-opus-4-5-20250514', label: 'Opus (best)' },
  ];

  const handleSaveApiKey = async (): Promise<void> => {
    if (!apiKey.trim()) return;
    try {
      const { encrypted, iv } = await encryptApiKey(apiKey.trim());
      const updatedPrefs = {
        ...profile.preferences,
        apiKeyEncrypted: encrypted,
        apiKeyIv: iv,
      };
      await db.profiles.update(profile.id, { preferences: updatedPrefs });
      setProfile({ ...profile, preferences: updatedPrefs });
      setApiKey('');
      setStatus('API key saved');
    } catch {
      setStatus('Error saving key');
    }
    setTimeout(() => setStatus(null), 2000);
  };

  const handleSaveCoachSettings = async (): Promise<void> => {
    const updatedPrefs = {
      ...profile.preferences,
      monthlyBudgetCap: budgetCap,
      preferredModel: {
        commentary: commentaryModel,
        analysis: analysisModel,
        reports: reportsModel,
      },
    };
    await db.profiles.update(profile.id, { preferences: updatedPrefs });
    setProfile({ ...profile, preferences: updatedPrefs });
    setStatus('Settings saved');
    setTimeout(() => setStatus(null), 2000);
  };

  return (
    <div className="space-y-4" data-testid="coach-tab">
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>
          Anthropic API Key {hasExistingKey && '(saved)'}
        </label>
        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasExistingKey ? '••••••••' : 'sk-ant-...'}
            className="flex-1 px-3 py-2 rounded-lg border text-sm"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            data-testid="api-key-input"
          />
          <button onClick={() => setShowKey((s) => !s)} className="px-3 py-2 rounded-lg border text-xs" style={{ borderColor: 'var(--color-border)' }}>
            {showKey ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={() => void handleSaveApiKey()}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="save-api-key-btn"
          >
            Save
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Monthly Budget Cap ($)</label>
        <input
          type="number"
          value={budgetCap ?? ''}
          onChange={(e) => setBudgetCap(e.target.value ? Number(e.target.value) : null)}
          placeholder="No limit"
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          data-testid="budget-input"
        />
      </div>
      <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Estimated spend this month: ${profile.preferences.estimatedSpend.toFixed(2)}
      </div>

      {[
        { label: 'Commentary Model', value: commentaryModel, setter: setCommentaryModel, testId: 'model-commentary' },
        { label: 'Analysis Model', value: analysisModel, setter: setAnalysisModel, testId: 'model-analysis' },
        { label: 'Reports Model', value: reportsModel, setter: setReportsModel, testId: 'model-reports' },
      ].map(({ label, value, setter, testId }) => (
        <div key={testId}>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
          <select
            value={value}
            onChange={(e) => setter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            data-testid={testId}
          >
            {modelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      ))}

      <button
        onClick={() => void handleSaveCoachSettings()}
        className="w-full py-2 rounded-lg text-sm font-medium"
        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
        data-testid="save-coach-settings-btn"
      >
        Save Coach Settings
      </button>

      {status && <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{status}</p>}

      <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <VoiceSettingsPanel />
      </div>
    </div>
  );
}

function AppearanceTab({
  profile,
  setProfile,
}: {
  profile: import('../../types').UserProfile;
  setProfile: (p: import('../../types').UserProfile) => void;
}): JSX.Element {
  const [boardColor, setBoardColor] = useState(profile.preferences.boardColor);
  const [pieceSet, setPieceSet] = useState(profile.preferences.pieceSet);
  const [soundEnabled, setSoundEnabled] = useState(profile.preferences.soundEnabled);
  const [showEvalBar, setShowEvalBar] = useState(profile.preferences.showEvalBar);
  const [showEngineLines, setShowEngineLines] = useState(profile.preferences.showEngineLines);

  const handleSave = async (): Promise<void> => {
    const updatedPrefs = {
      ...profile.preferences,
      boardColor,
      pieceSet,
      soundEnabled,
      showEvalBar,
      showEngineLines,
    };
    await db.profiles.update(profile.id, { preferences: updatedPrefs });
    setProfile({ ...profile, preferences: updatedPrefs });
  };

  return (
    <div className="space-y-4" data-testid="appearance-tab">
      <ThemePickerPanel />

      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Board Color</label>
        <select
          value={boardColor}
          onChange={(e) => setBoardColor(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          data-testid="board-color-select"
        >
          {['classic', 'tournament', 'green', 'blue'].map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>Piece Set</label>
        <select
          value={pieceSet}
          onChange={(e) => setPieceSet(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          data-testid="piece-set-select"
        >
          {['staunton', 'neo', 'alpha', 'merida'].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        {[
          { label: 'Sound', checked: soundEnabled, setter: setSoundEnabled, testId: 'sound-toggle' },
          { label: 'Eval Bar', checked: showEvalBar, setter: setShowEvalBar, testId: 'eval-bar-toggle' },
          { label: 'Engine Lines', checked: showEngineLines, setter: setShowEngineLines, testId: 'engine-lines-toggle' },
        ].map(({ label, checked, setter, testId }) => (
          <div key={testId} className="flex items-center gap-3">
            <input type="checkbox" checked={checked} onChange={(e) => setter(e.target.checked)} data-testid={testId} />
            <label className="text-sm">{label}</label>
          </div>
        ))}
      </div>
      <button
        onClick={() => void handleSave()}
        className="w-full py-2 rounded-lg text-sm font-medium"
        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
        data-testid="save-appearance-btn"
      >
        Save Appearance
      </button>
    </div>
  );
}

function AboutTab(): JSX.Element {
  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = async (): Promise<void> => {
    await db.delete();
    window.location.reload();
  };

  return (
    <div className="space-y-4" data-testid="about-tab">
      <div>
        <div className="text-lg font-bold">Chess Academy Pro</div>
        <div className="flex items-center gap-2">
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>v{APP_VERSION}</div>
          {BETA_MODE && (
            <span className="px-1.5 py-0.5 rounded text-xs font-bold"
              style={{ background: 'var(--color-warning)', color: '#000' }}>
              BETA
            </span>
          )}
        </div>
      </div>
      <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Built with React, TypeScript, Vite, Tailwind CSS, chess.js, Stockfish WASM, Dexie.js, Zustand, and Claude API.
      </div>
      <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-error)', color: '#fff' }}
            data-testid="reset-btn"
          >
            Reset All Data
          </button>
        ) : (
          <button
            onClick={() => void handleReset()}
            className="w-full py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-error)', color: '#fff' }}
            data-testid="confirm-reset-btn"
          >
            Are you sure? This cannot be undone.
          </button>
        )}
      </div>
    </div>
  );
}
