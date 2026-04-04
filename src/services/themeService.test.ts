import { describe, it, expect, afterEach } from 'vitest';
import { THEMES, DEFAULT_THEME_ID, applyTheme, getThemeById } from './themeService';
import type { AppTheme } from '../types';

const REQUIRED_COLOR_KEYS: (keyof AppTheme['colors'])[] = [
  'bg', 'bgSecondary', 'surface', 'border', 'text', 'textMuted',
  'accent', 'accentHover', 'success', 'error', 'warning',
];

describe('themeService', () => {
  afterEach(() => {
    // Clean up applied styles
    const root = document.documentElement;
    for (const key of REQUIRED_COLOR_KEYS) {
      root.style.removeProperty(`--color-${key}`);
    }
    root.removeAttribute('data-theme');
  });

  describe('THEMES constant', () => {
    it('has 8 theme entries', () => {
      expect(THEMES).toHaveLength(8);
    });

    it('each theme has all required color keys', () => {
      for (const theme of THEMES) {
        for (const key of REQUIRED_COLOR_KEYS) {
          expect(theme.colors[key]).toBeTruthy();
        }
      }
    });

    it('each theme has a unique id', () => {
      const ids = THEMES.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('each theme has a non-empty name', () => {
      for (const theme of THEMES) {
        expect(theme.name.length).toBeGreaterThan(0);
      }
    });

    it('each color value is a valid hex color or CSS color', () => {
      for (const theme of THEMES) {
        for (const key of REQUIRED_COLOR_KEYS) {
          expect(theme.colors[key]).toMatch(/^#[0-9a-fA-F]{6}$/);
        }
      }
    });

    it('contains the default theme', () => {
      const defaultTheme = THEMES.find((t) => t.id === DEFAULT_THEME_ID);
      expect(defaultTheme).toBeDefined();
    });

    it('contains kid-mode theme', () => {
      const kidTheme = THEMES.find((t) => t.id === 'kid-mode');
      expect(kidTheme).toBeDefined();
      expect(kidTheme?.name).toBe('Kid Mode');
    });
  });

  describe('getThemeById', () => {
    it('returns correct theme for valid ID', () => {
      const theme = getThemeById('dark-premium');
      expect(theme.id).toBe('dark-premium');
      expect(theme.name).toBe('Dark Premium');
    });

    it('returns default theme for invalid ID', () => {
      const theme = getThemeById('nonexistent-theme');
      expect(theme.id).toBe(DEFAULT_THEME_ID);
    });

    it('returns each theme by its ID', () => {
      for (const expected of THEMES) {
        const theme = getThemeById(expected.id);
        expect(theme.id).toBe(expected.id);
      }
    });
  });

  describe('applyTheme', () => {
    it('sets CSS custom properties on :root', () => {
      const theme = getThemeById('dark-premium');
      applyTheme(theme);

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--color-bg')).toBe(theme.colors.bg);
      expect(root.style.getPropertyValue('--color-accent')).toBe(theme.colors.accent);
      expect(root.style.getPropertyValue('--color-text')).toBe(theme.colors.text);
    });

    it('sets data-theme attribute on documentElement', () => {
      const theme = getThemeById('midnight-blue');
      applyTheme(theme);

      expect(document.documentElement.getAttribute('data-theme')).toBe('midnight-blue');
    });

    it('overwrites previous theme properties', () => {
      applyTheme(getThemeById('dark-premium'));
      applyTheme(getThemeById('light-minimal'));

      const root = document.documentElement;
      const lightTheme = getThemeById('light-minimal');
      expect(root.style.getPropertyValue('--color-bg')).toBe(lightTheme.colors.bg);
      expect(document.documentElement.getAttribute('data-theme')).toBe('light-minimal');
    });

    it('sets all 11 CSS custom properties', () => {
      const theme = getThemeById('forest-green');
      applyTheme(theme);

      const root = document.documentElement;
      const mappings: Record<string, keyof AppTheme['colors']> = {
        '--color-bg': 'bg',
        '--color-bg-secondary': 'bgSecondary',
        '--color-surface': 'surface',
        '--color-border': 'border',
        '--color-text': 'text',
        '--color-text-muted': 'textMuted',
        '--color-accent': 'accent',
        '--color-accent-hover': 'accentHover',
        '--color-success': 'success',
        '--color-error': 'error',
        '--color-warning': 'warning',
      };

      for (const [cssVar, colorKey] of Object.entries(mappings)) {
        expect(root.style.getPropertyValue(cssVar)).toBe(theme.colors[colorKey]);
      }
    });
  });
});
