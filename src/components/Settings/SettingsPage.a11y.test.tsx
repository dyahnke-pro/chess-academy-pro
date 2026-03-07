import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

// Mock service deps
vi.mock('../../services/dbService', () => ({
  exportUserData: vi.fn().mockResolvedValue('{}'),
}));

vi.mock('../../services/cryptoService', () => ({
  encryptApiKey: vi.fn().mockResolvedValue({ encrypted: 'enc', iv: 'iv' }),
}));

vi.mock('../../db/schema', () => ({
  db: {
    profiles: { update: vi.fn() },
    delete: vi.fn(),
    meta: { get: vi.fn().mockResolvedValue(null) },
  },
}));

vi.mock('../ui/ThemePickerPanel', () => ({
  ThemePickerPanel: () => <div data-testid="theme-picker">Theme Picker</div>,
}));

vi.mock('./SyncSettingsPanel', () => ({
  SyncSettingsPanel: () => <div data-testid="sync-panel">Sync Panel</div>,
}));

vi.mock('./VoiceSettingsPanel', () => ({
  VoiceSettingsPanel: () => <div data-testid="voice-panel">Voice Panel</div>,
}));

vi.mock('../../utils/constants', () => ({
  APP_VERSION: '1.0.0',
  BETA_MODE: true,
}));

const { SettingsPage } = await import('./SettingsPage');

describe('SettingsPage a11y', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    const profile = buildUserProfile({ id: 'main', name: 'TestPlayer' });
    useAppStore.getState().setActiveProfile(profile);
  });

  it('renders settings page container', () => {
    render(<SettingsPage />);
    expect(screen.getByTestId('settings-page')).toBeInTheDocument();
  });

  it('has heading element', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('tab buttons are clickable and labeled', () => {
    render(<SettingsPage />);
    expect(screen.getByTestId('tab-profile')).toHaveTextContent('Profile');
    expect(screen.getByTestId('tab-coach')).toHaveTextContent('Coach');
    expect(screen.getByTestId('tab-appearance')).toHaveTextContent('Appearance');
    expect(screen.getByTestId('tab-about')).toHaveTextContent('About');
  });

  it('form inputs have labels', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('ELO Rating')).toBeInTheDocument();
  });

  it('name input has data-testid', () => {
    render(<SettingsPage />);
    expect(screen.getByTestId('name-input')).toBeInTheDocument();
  });

  it('coach tab renders with correct form elements', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('tab-coach'));
    expect(screen.getByTestId('coach-tab')).toBeInTheDocument();
    expect(screen.getByTestId('api-key-input')).toBeInTheDocument();
  });

  it('api key input has password type by default', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('tab-coach'));
    const input = screen.getByTestId('api-key-input');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('show/hide toggle changes input type', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('tab-coach'));
    const showBtn = screen.getByText('Show');
    fireEvent.click(showBtn);
    const input = screen.getByTestId('api-key-input');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('board tab has checkbox toggles with labels', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('tab-board'));
    expect(screen.getByText('Sound Effects')).toBeInTheDocument();
    expect(screen.getByText('Eval Bar')).toBeInTheDocument();
    expect(screen.getByText('Engine Lines')).toBeInTheDocument();
  });

  it('about tab displays version and app name', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('tab-about'));
    expect(screen.getByText('Chess Academy Pro')).toBeInTheDocument();
    expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
  });

  it('about tab renders with correct structure', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('tab-about'));
    expect(screen.getByTestId('about-tab')).toBeInTheDocument();
  });
});
