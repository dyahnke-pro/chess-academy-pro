export interface NeonColor {
  rgb: string;
  border: string;
  borderHover: string;
  shadow: string;
  shadowHover: string;
  tagBg: string;
  tagText: string;
  ecoBadge: string;
}

function makeNeon(rgb: string, tagBg: string, tagText: string, ecoBadge?: string): NeonColor {
  return {
    rgb,
    border: `rgba(${rgb}, 0.4)`,
    borderHover: `rgba(${rgb}, 0.8)`,
    shadow: `0 0 8px rgba(${rgb}, 0.6), 0 0 16px rgba(${rgb}, 0.35), 0 0 28px rgba(${rgb}, 0.18)`,
    shadowHover: `0 0 10px rgba(${rgb}, 0.8), 0 0 20px rgba(${rgb}, 0.5), 0 0 34px rgba(${rgb}, 0.3)`,
    tagBg,
    tagText,
    ecoBadge: ecoBadge ?? tagText,
  };
}

/**
 * Compute a scaled shadow string for a given rgb and brightness (0–200, 100 = default).
 * Used by components that respect the global glow dimmer settings.
 */
export function scaledShadow(rgb: string, brightness: number): string {
  const s = brightness / 100;
  return `0 0 ${Math.round(8 * s)}px rgba(${rgb}, ${Math.min(1, 0.6 * s)}), 0 0 ${Math.round(16 * s)}px rgba(${rgb}, ${Math.min(1, 0.35 * s)}), 0 0 ${Math.round(28 * s)}px rgba(${rgb}, ${Math.min(1, 0.18 * s)})`;
}

export function scaledBorder(rgb: string, brightness: number): string {
  const s = brightness / 100;
  return `rgba(${rgb}, ${Math.min(1, 0.4 * s)})`;
}

/**
 * Build a CSS drop-shadow filter for piece glow, scaled by brightness.
 * Returns empty string when brightness is 0.
 */
export function buildPieceGlowFilter(rgb: string, brightness: number): string {
  if (rgb === 'none') return 'none';
  if (brightness <= 0) return '';
  const s = brightness / 100;
  const r = Math.round;
  return `drop-shadow(0 0 ${r(3 * s)}px rgba(${rgb}, ${Math.min(1, 0.6 * s)})) drop-shadow(0 0 ${r(1 * s)}px rgba(${rgb}, ${Math.min(1, 0.9 * s)}))`;
}

const STYLE_COLORS: Record<string, NeonColor> = {
  aggressive:   makeNeon('239, 68, 68',   'bg-red-500/15',    'text-red-400'),
  positional:   makeNeon('59, 130, 246',   'bg-blue-500/15',   'text-blue-400'),
  dynamic:      makeNeon('168, 85, 247',   'bg-purple-500/15', 'text-purple-400'),
  solid:        makeNeon('34, 197, 94',    'bg-green-500/15',  'text-green-400'),
  classical:    makeNeon('245, 158, 11',   'bg-amber-500/15',  'text-amber-400'),
  sharp:        makeNeon('249, 115, 22',   'bg-orange-500/15', 'text-orange-400'),
  gambit:       makeNeon('236, 72, 153',   'bg-pink-500/15',   'text-pink-400'),
  tactical:     makeNeon('6, 182, 212',    'bg-cyan-500/15',   'text-cyan-400'),
  hypermodern:  makeNeon('99, 102, 241',   'bg-indigo-500/15', 'text-indigo-400'),
  open:         makeNeon('56, 189, 248',   'bg-sky-500/15',    'text-sky-400'),
  romantic:     makeNeon('251, 113, 133',  'bg-rose-500/15',   'text-rose-400'),
  trappy:       makeNeon('132, 204, 22',   'bg-lime-500/15',   'text-lime-400'),
  provocative:  makeNeon('244, 114, 182',  'bg-pink-400/15',   'text-pink-300'),
  flexible:     makeNeon('45, 212, 191',   'bg-teal-500/15',   'text-teal-400'),
  sacrificial:  makeNeon('239, 68, 68',    'bg-red-500/15',    'text-red-400'),
  active:       makeNeon('251, 191, 36',   'bg-yellow-500/15', 'text-yellow-400'),
  universal:    makeNeon('139, 92, 246',   'bg-violet-500/15', 'text-violet-400'),
  creative:     makeNeon('244, 114, 182',  'bg-pink-500/15',   'text-pink-400'),
  entertaining: makeNeon('250, 204, 21',   'bg-yellow-400/15', 'text-yellow-400'),
  balanced:     makeNeon('96, 165, 250',   'bg-blue-400/15',   'text-blue-400'),
  practical:    makeNeon('34, 197, 94',    'bg-green-500/15',  'text-green-400'),
  precise:      makeNeon('56, 189, 248',   'bg-sky-500/15',    'text-sky-400'),
  strategic:    makeNeon('99, 102, 241',   'bg-indigo-500/15', 'text-indigo-400'),
  theoretical:  makeNeon('139, 92, 246',   'bg-violet-500/15', 'text-violet-400'),
  pressure:     makeNeon('249, 115, 22',   'bg-orange-500/15', 'text-orange-400'),
  symmetrical:  makeNeon('96, 165, 250',   'bg-blue-400/15',   'text-blue-400'),
  unorthodox:   makeNeon('250, 204, 21',   'bg-yellow-400/15', 'text-yellow-400'),
};

const DEFAULT_NEON: NeonColor = makeNeon('45, 212, 191', 'bg-teal-500/15', 'text-teal-400');

export function getNeonColor(style: string | undefined): NeonColor {
  if (!style) return DEFAULT_NEON;
  const primary = style.split(',')[0].trim().toLowerCase().replace(/-/g, '');
  const normalized = primary.replace('ultra', '');
  return STYLE_COLORS[normalized] ?? DEFAULT_NEON;
}
