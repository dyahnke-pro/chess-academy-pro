// TODO: WO-SECURITY — Before launch, audit all settings that affect game integrity
// (autoPromoteQueen, moveMethod, etc.) and lock down structural settings.
// Users should only see user-facing preferences. Core settings that could break
// the app experience must be hidden or admin-only.

import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { exportUserData } from '../../services/dbService';
import { ThemePickerPanel } from '../ui/ThemePickerPanel';
import { SyncSettingsPanel } from './SyncSettingsPanel';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';
import { encryptApiKey } from '../../services/cryptoService';

import { APP_VERSION, BETA_MODE } from '../../utils/constants';
import type { UserProfile, PieceAnimationSpeed, MoveMethod } from '../../types';

type SettingsTab = 'profile' | 'board' | 'coach' | 'appearance' | 'about';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'board', label: 'Board' },
  { id: 'coach', label: 'Coach' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'about', label: 'About' },
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
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              background: tab === id ? 'var(--color-surface)' : 'transparent',
              color: tab === id ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}
            data-testid={`tab-${id}`}
          >
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
        {tab === 'board' && (
          <BoardGameplayTab profile={activeProfile} setProfile={setActiveProfile} />
        )}
        {tab === 'coach' && (
          <CoachTab profile={activeProfile} setProfile={setActiveProfile} />
        )}
        {tab === 'appearance' && <AppearanceTab />}
        {tab === 'about' && <AboutTab />}
      </div>
    </div>
  );
}

// ─── Shared UI helpers ──────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  tooltip: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testId: string;
  disabled?: boolean;
}

function ToggleRow({ label, tooltip, checked, onChange, testId, disabled }: ToggleRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between py-1.5" title={tooltip}>
      <div className="flex flex-col">
        <span className="text-sm">{label}</span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tooltip}</span>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 accent-current"
        data-testid={testId}
      />
    </div>
  );
}

interface SelectRowProps {
  label: string;
  tooltip: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  testId: string;
  disabled?: boolean;
}

function SelectRow({ label, tooltip, value, options, onChange, testId, disabled }: SelectRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between py-1.5" title={tooltip}>
      <div className="flex flex-col">
        <span className="text-sm">{label}</span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tooltip}</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="px-2 py-1 rounded-lg border text-sm"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        data-testid={testId}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function SectionHeader({ title }: { title: string }): JSX.Element {
  return (
    <h3
      className="text-xs font-semibold uppercase tracking-wider pt-3 pb-1 border-t"
      style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
    >
      {title}
    </h3>
  );
}

// ─── Tab Props ────────────────────────────────────────────────────────────────

interface TabProps {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
}

// ─── Board & Gameplay Tab ────────────────────────────────────────────────────

function BoardGameplayTab({ profile, setProfile }: TabProps): JSX.Element {
  const prefs = profile.preferences;

  const [highlightLastMove, setHighlightLastMove] = useState(prefs.highlightLastMove);
  const [showLegalMoves, setShowLegalMoves] = useState(prefs.showLegalMoves);
  const [showCoordinates, setShowCoordinates] = useState(prefs.showCoordinates);
  const [pieceAnimationSpeed, setPieceAnimationSpeed] = useState<PieceAnimationSpeed>(prefs.pieceAnimationSpeed);
  const [boardOrientation, setBoardOrientation] = useState(prefs.boardOrientation);

  const [boardColor, setBoardColor] = useState(prefs.boardColor);
  const [pieceSet, setPieceSet] = useState(prefs.pieceSet);

  const [soundEnabled, setSoundEnabled] = useState(prefs.soundEnabled);

  const [showEvalBar, setShowEvalBar] = useState(prefs.showEvalBar);
  const [showEngineLines, setShowEngineLines] = useState(prefs.showEngineLines);

  const [moveQualityFlash, setMoveQualityFlash] = useState(prefs.moveQualityFlash);
  const [showHints, setShowHints] = useState(prefs.showHints);
  const [voiceEnabled, setVoiceEnabled] = useState(prefs.voiceEnabled);

  const [moveMethod, setMoveMethod] = useState<MoveMethod>(prefs.moveMethod);
  const [moveConfirmation, setMoveConfirmation] = useState(prefs.moveConfirmation);
  const [autoPromoteQueen, setAutoPromoteQueen] = useState(prefs.autoPromoteQueen);

  const [masterAllOff, setMasterAllOff] = useState(prefs.masterAllOff);
  const [boardSaveStatus, setBoardSaveStatus] = useState<string | null>(null);

  const handleToggleMasterOff = (): void => {
    const next = !masterAllOff;
    setMasterAllOff(next);
    if (next) {
      setVoiceEnabled(false);
      setShowHints(false);
      setMoveQualityFlash(false);
      setHighlightLastMove(false);
      setShowLegalMoves(false);
      setPieceAnimationSpeed('none');
    } else {
      // Restore all features when turning Master Off off
      setVoiceEnabled(true);
      setShowHints(true);
      setHighlightLastMove(true);
      setShowLegalMoves(true);
      setPieceAnimationSpeed('medium');
    }
  };

  const handleSave = async (): Promise<void> => {
    const updatedPrefs = {
      ...prefs,
      highlightLastMove,
      showLegalMoves,
      showCoordinates,
      pieceAnimationSpeed,
      boardOrientation,
      boardColor,
      pieceSet,
      soundEnabled,
      showEvalBar,
      showEngineLines,
      moveQualityFlash,
      showHints,
      voiceEnabled,
      moveMethod,
      moveConfirmation,
      autoPromoteQueen,
      masterAllOff,
    };
    await db.profiles.update(profile.id, { preferences: updatedPrefs });
    setProfile({ ...profile, preferences: updatedPrefs });
    setBoardSaveStatus('Board settings saved');
    setTimeout(() => setBoardSaveStatus(null), 2000);
  };

  const affectedByMaster = masterAllOff;

  return (
    <div className="space-y-2" data-testid="board-tab">
      {/* Master All Off */}
      <button
        onClick={handleToggleMasterOff}
        className="w-full py-3 rounded-lg text-sm font-bold transition-colors"
        style={{
          background: masterAllOff ? 'var(--color-error)' : 'var(--color-bg)',
          color: masterAllOff ? '#fff' : 'var(--color-text)',
          border: masterAllOff ? 'none' : '1px solid var(--color-border)',
        }}
        data-testid="master-all-off-toggle"
      >
        {masterAllOff ? 'Master Off — All Features Disabled' : 'Master All Off'}
      </button>
      {masterAllOff && (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Voice, hints, move flash, highlights, legal moves, and animations are disabled.
          Sound and theme are unaffected.
        </p>
      )}

      {/* Board Display */}
      <SectionHeader title="Board Display" />
      <ToggleRow
        label="Highlight Last Move"
        tooltip="Show yellow highlight on the last move's from/to squares"
        checked={highlightLastMove}
        onChange={setHighlightLastMove}
        testId="highlight-last-move-toggle"
        disabled={affectedByMaster}
      />
      <ToggleRow
        label="Show Legal Moves"
        tooltip="Show dots on valid squares when a piece is selected"
        checked={showLegalMoves}
        onChange={setShowLegalMoves}
        testId="show-legal-moves-toggle"
        disabled={affectedByMaster}
      />
      <ToggleRow
        label="Show Coordinates"
        tooltip="Display a-h and 1-8 rank/file labels on the board"
        checked={showCoordinates}
        onChange={setShowCoordinates}
        testId="show-coordinates-toggle"
      />
      <SelectRow
        label="Piece Animation"
        tooltip="Speed of piece movement animation"
        value={pieceAnimationSpeed}
        options={[
          { value: 'none', label: 'None' },
          { value: 'fast', label: 'Fast' },
          { value: 'medium', label: 'Medium' },
          { value: 'slow', label: 'Slow' },
        ]}
        onChange={(v) => setPieceAnimationSpeed(v as PieceAnimationSpeed)}
        testId="animation-speed-select"
        disabled={affectedByMaster}
      />
      <ToggleRow
        label="White on Bottom"
        tooltip="Always show the board with white pieces on the bottom"
        checked={boardOrientation}
        onChange={setBoardOrientation}
        testId="board-orientation-toggle"
      />

      {/* Board Appearance */}
      <SectionHeader title="Board Appearance" />
      <SelectRow
        label="Board Color"
        tooltip="Color scheme for the board squares"
        value={boardColor}
        options={[
          { value: 'classic', label: 'Classic' },
          { value: 'tournament', label: 'Tournament' },
          { value: 'green', label: 'Green' },
          { value: 'blue', label: 'Blue' },
          { value: 'purple', label: 'Purple' },
          { value: 'wood', label: 'Wood' },
          { value: 'ice', label: 'Ice' },
          { value: 'coral', label: 'Coral' },
        ]}
        onChange={setBoardColor}
        testId="board-color-select"
      />
      <SelectRow
        label="Piece Set"
        tooltip="Visual style of chess pieces"
        value={pieceSet}
        options={[
          { value: 'staunton', label: 'Staunton' },
          { value: 'neo', label: 'Neo' },
          { value: 'alpha', label: 'Alpha' },
          { value: 'merida', label: 'Merida' },
          { value: 'california', label: 'California' },
          { value: 'cardinal', label: 'Cardinal' },
          { value: 'tatiana', label: 'Tatiana' },
          { value: 'pixel', label: 'Pixel' },
          { value: 'horsey', label: 'Horsey' },
          { value: 'letter', label: 'Letter' },
        ]}
        onChange={setPieceSet}
        testId="piece-set-select"
      />

      {/* Audio */}
      <SectionHeader title="Audio" />
      <ToggleRow
        label="Sound Effects"
        tooltip="Play sounds on piece moves, captures, and checks"
        checked={soundEnabled}
        onChange={setSoundEnabled}
        testId="sound-toggle"
      />

      {/* Engine */}
      <SectionHeader title="Engine" />
      <ToggleRow
        label="Eval Bar"
        tooltip="Show the Stockfish evaluation bar alongside the board"
        checked={showEvalBar}
        onChange={setShowEvalBar}
        testId="eval-bar-toggle"
      />
      <ToggleRow
        label="Engine Lines"
        tooltip="Display computer analysis lines during play"
        checked={showEngineLines}
        onChange={setShowEngineLines}
        testId="engine-lines-toggle"
      />

      {/* Feedback & Coaching */}
      <SectionHeader title="Feedback & Coaching" />
      <ToggleRow
        label="Move Quality Flash"
        tooltip="Board border flashes green/yellow/red based on move quality"
        checked={moveQualityFlash}
        onChange={setMoveQualityFlash}
        testId="move-quality-flash-toggle"
        disabled={affectedByMaster}
      />
      <ToggleRow
        label="Show Hints"
        tooltip="Allow hint button to appear during play and drills"
        checked={showHints}
        onChange={setShowHints}
        testId="show-hints-toggle"
        disabled={affectedByMaster}
      />
      <ToggleRow
        label="Voice Narration"
        tooltip="Enable spoken coach commentary and narration"
        checked={voiceEnabled}
        onChange={setVoiceEnabled}
        testId="voice-narration-toggle"
        disabled={affectedByMaster}
      />

      {/* Game Behavior */}
      <SectionHeader title="Game Behavior" />
      <SelectRow
        label="Move Method"
        tooltip="How to move pieces: drag, click, or both"
        value={moveMethod}
        options={[
          { value: 'drag', label: 'Drag Only' },
          { value: 'click', label: 'Click Only' },
          { value: 'both', label: 'Both' },
        ]}
        onChange={(v) => setMoveMethod(v as MoveMethod)}
        testId="move-method-select"
      />
      <ToggleRow
        label="Move Confirmation"
        tooltip="Require confirmation before each move is committed"
        checked={moveConfirmation}
        onChange={setMoveConfirmation}
        testId="move-confirmation-toggle"
      />
      <ToggleRow
        label="Auto-Promote to Queen"
        tooltip="Automatically promote pawns to queen without asking"
        checked={autoPromoteQueen}
        onChange={setAutoPromoteQueen}
        testId="auto-promote-queen-toggle"
      />

      <button
        onClick={() => void handleSave()}
        className="w-full py-2 rounded-lg text-sm font-medium mt-4"
        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
        data-testid="save-board-btn"
      >
        Save Board Settings
      </button>
      {boardSaveStatus && (
        <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }} data-testid="board-save-status">
          {boardSaveStatus}
        </p>
      )}
    </div>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ profile, setProfile }: TabProps): JSX.Element {
  const [name, setName] = useState(profile.name);
  const [elo, setElo] = useState(profile.currentRating);
  const [dailyMin, setDailyMin] = useState(profile.preferences.dailySessionMinutes);
  const [kidMode, setKidMode] = useState(profile.isKidMode);
  const [profileSaveStatus, setProfileSaveStatus] = useState<string | null>(null);

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
    setProfileSaveStatus('Profile saved');
    setTimeout(() => setProfileSaveStatus(null), 2000);
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
      {profileSaveStatus && (
        <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }} data-testid="profile-save-status">
          {profileSaveStatus}
        </p>
      )}
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

// ─── Coach Tab ───────────────────────────────────────────────────────────────

function CoachTab({ profile, setProfile }: TabProps): JSX.Element {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState<'deepseek' | 'anthropic'>(profile.preferences.aiProvider);
  const [budgetCap, setBudgetCap] = useState<number | null>(profile.preferences.monthlyBudgetCap);
  const [commentaryModel, setCommentaryModel] = useState(profile.preferences.preferredModel.commentary);
  const [analysisModel, setAnalysisModel] = useState(profile.preferences.preferredModel.analysis);
  const [reportsModel, setReportsModel] = useState(profile.preferences.preferredModel.reports);
  const [status, setStatus] = useState<string | null>(null);

  const isAnthropic = provider === 'anthropic';
  const hasExistingKey = isAnthropic
    ? Boolean(profile.preferences.anthropicApiKeyEncrypted)
    : Boolean(profile.preferences.apiKeyEncrypted);

  const modelOptions = isAnthropic
    ? [
        { value: 'claude-haiku-4-5-20251001', label: 'Haiku (fastest)' },
        { value: 'claude-sonnet-4-6', label: 'Sonnet (balanced)' },
        { value: 'claude-opus-4-6', label: 'Opus (best)' },
      ]
    : [
        { value: 'deepseek-chat', label: 'DeepSeek V3 (fast)' },
        { value: 'deepseek-reasoner', label: 'DeepSeek R1 (reasoning)' },
      ];

  const handleProviderChange = async (newProvider: 'deepseek' | 'anthropic'): Promise<void> => {
    setProvider(newProvider);
    const updatedPrefs = { ...profile.preferences, aiProvider: newProvider };
    await db.profiles.update(profile.id, { preferences: updatedPrefs });
    setProfile({ ...profile, preferences: updatedPrefs });
    setApiKey('');
    setShowKey(false);
  };

  const handleSaveApiKey = async (): Promise<void> => {
    if (!apiKey.trim()) return;
    try {
      const { encrypted, iv } = await encryptApiKey(apiKey.trim());
      const updatedPrefs = isAnthropic
        ? { ...profile.preferences, anthropicApiKeyEncrypted: encrypted, anthropicApiKeyIv: iv }
        : { ...profile.preferences, apiKeyEncrypted: encrypted, apiKeyIv: iv };
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
          AI Provider
        </label>
        <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }} data-testid="provider-toggle">
          {(['deepseek', 'anthropic'] as const).map((p) => (
            <button
              key={p}
              onClick={() => void handleProviderChange(p)}
              className="flex-1 px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: provider === p ? 'var(--color-accent)' : 'var(--color-bg)',
                color: provider === p ? 'var(--color-bg)' : 'var(--color-text)',
              }}
              data-testid={`provider-${p}`}
            >
              {p === 'deepseek' ? 'DeepSeek' : 'Anthropic'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>
          {isAnthropic ? 'Anthropic' : 'DeepSeek'} API Key {hasExistingKey && '(saved)'}
        </label>
        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasExistingKey ? '••••••••' : (isAnthropic ? 'sk-ant-...' : 'sk-...')}
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
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {isAnthropic ? 'Get a key at console.anthropic.com' : 'Get a key at platform.deepseek.com'}
        </p>
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

// ─── Appearance Tab ──────────────────────────────────────────────────────────

function AppearanceTab(): JSX.Element {
  return (
    <div className="space-y-4" data-testid="appearance-tab">
      <ThemePickerPanel />
    </div>
  );
}

// ─── About Tab ───────────────────────────────────────────────────────────────

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
