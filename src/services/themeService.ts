import type { AppTheme } from '../types';

export const THEMES: AppTheme[] = [
  {
    id: 'classic-wood',
    name: 'Classic Wood',
    colors: {
      bg: '#2c1f14',
      bgSecondary: '#3d2a1a',
      surface: '#4a3322',
      border: '#6b4c33',
      text: '#f5e6d3',
      textMuted: '#b89878',
      accent: '#d4a85a',
      accentHover: '#e8c07a',
      success: '#5a9a4a',
      error: '#c04a3a',
      warning: '#d4902a',
    },
  },
  {
    id: 'dark-premium',
    name: 'Dark Premium',
    colors: {
      bg: '#0f0f0f',
      bgSecondary: '#1a1a1a',
      surface: '#242424',
      border: '#333333',
      text: '#f0f0f0',
      textMuted: '#888888',
      accent: '#c9a84c',
      accentHover: '#e0bf70',
      success: '#4caf74',
      error: '#e05252',
      warning: '#e0a030',
    },
  },
  {
    id: 'bold-red-black',
    name: 'Bold Red & Black',
    colors: {
      bg: '#0d0000',
      bgSecondary: '#1a0505',
      surface: '#260808',
      border: '#4d1010',
      text: '#fff0f0',
      textMuted: '#cc7777',
      accent: '#e03030',
      accentHover: '#f04040',
      success: '#40a060',
      error: '#ff4040',
      warning: '#e08020',
    },
  },
  {
    id: 'light-minimal',
    name: 'Light & Minimal',
    colors: {
      bg: '#ffffff',
      bgSecondary: '#f5f5f5',
      surface: '#ebebeb',
      border: '#d0d0d0',
      text: '#1a1a1a',
      textMuted: '#666666',
      accent: '#2563eb',
      accentHover: '#1d4ed8',
      success: '#16a34a',
      error: '#dc2626',
      warning: '#d97706',
    },
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    colors: {
      bg: '#050d1a',
      bgSecondary: '#0a1a30',
      surface: '#0f2540',
      border: '#1a3a5c',
      text: '#e0eeff',
      textMuted: '#6a90b8',
      accent: '#4a90d9',
      accentHover: '#6aaae9',
      success: '#3ab070',
      error: '#d04040',
      warning: '#c09030',
    },
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    colors: {
      bg: '#0a1a0a',
      bgSecondary: '#122012',
      surface: '#1a2e1a',
      border: '#2a4a2a',
      text: '#e0f0e0',
      textMuted: '#6a9a6a',
      accent: '#4a9a4a',
      accentHover: '#5ab45a',
      success: '#5ab45a',
      error: '#c04040',
      warning: '#b09030',
    },
  },
  {
    id: 'kid-mode',
    name: 'Kid Mode',
    colors: {
      bg: '#fef9e7',
      bgSecondary: '#fef3c7',
      surface: '#ffffff',
      border: '#fcd34d',
      text: '#1c1917',
      textMuted: '#78716c',
      accent: '#f59e0b',
      accentHover: '#d97706',
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f97316',
    },
  },
];

export const DEFAULT_THEME_ID = 'dark-premium';

/**
 * Applies a theme by injecting CSS custom properties onto :root.
 */
export function applyTheme(theme: AppTheme): void {
  const root = document.documentElement;
  const { colors } = theme;

  root.style.setProperty('--color-bg', colors.bg);
  root.style.setProperty('--color-bg-secondary', colors.bgSecondary);
  root.style.setProperty('--color-surface', colors.surface);
  root.style.setProperty('--color-border', colors.border);
  root.style.setProperty('--color-text', colors.text);
  root.style.setProperty('--color-text-muted', colors.textMuted);
  root.style.setProperty('--color-accent', colors.accent);
  root.style.setProperty('--color-accent-hover', colors.accentHover);
  root.style.setProperty('--color-success', colors.success);
  root.style.setProperty('--color-error', colors.error);
  root.style.setProperty('--color-warning', colors.warning);

  document.documentElement.setAttribute('data-theme', theme.id);
}

export function getThemeById(id: string): AppTheme {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID);
  if (!theme) throw new Error(`Theme not found: ${id}`);
  return theme;
}
