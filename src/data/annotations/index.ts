import type { OpeningAnnotations } from '../../types';

type AnnotationLoader = () => Promise<{ default: OpeningAnnotations }>;

/**
 * Auto-discovered annotation files — every `*.json` in this directory
 * becomes a lazy loader keyed by its filename slug (without `.json`).
 *
 * The old manual map only listed 53 of the 1916 annotation files, so
 * ~1860 generated annotations were shipped in the bundle but never
 * reachable at runtime. Vite's `import.meta.glob` with `eager: false`
 * keeps the code-split behaviour (one chunk per file, loaded on
 * demand) while guaranteeing every file is accessible by key.
 *
 * The hand-curated overrides below stay because they cover legacy
 * key shapes the resolver still uses — they get merged last so they
 * win on conflict.
 */
const AUTO_ANNOTATION_MODULES = import.meta.glob<{ default: OpeningAnnotations }>(
  './*.json',
);

function autoMap(): Record<string, AnnotationLoader> {
  const out: Record<string, AnnotationLoader> = {};
  for (const [path, loader] of Object.entries(AUTO_ANNOTATION_MODULES)) {
    // './italian-game.json' → 'italian-game'
    const key = path.replace(/^\.\//, '').replace(/\.json$/, '');
    out[key] = loader as AnnotationLoader;
  }
  return out;
}

// Hand-registered legacy entries were removed after PR #506
// (orphan-rename wave) — 41 of the 53 entries pointed at JSONs that
// no longer exist on disk, so Vite crashed pre-transform with
// "Failed to resolve import './kings-gambit.json'" before any page
// could render. The auto-glob above covers every file actually
// present, so the legacy block was dead weight + a build blocker.
const ANNOTATION_MODULES: Record<string, AnnotationLoader> = {
  ...autoMap(),
  // Legacy hand-registered entries — the autoMap above already covers
  // every `*.json` file in this directory, but a few are kept here as
  // explicit, grep-friendly anchors for the most-trafficked openings.
  // Entries previously listed for filenames that the May-2026 orphan-
  // rename pass deleted (sicilian-najdorf.json, french-defence.json,
  // kings-indian-defence.json, etc.) were removed — those keys are no
  // longer reachable from any code path and the broken imports were
  // failing the Vite build. Any stale alias in PRO_SUFFIX_TO_BASE /
  // NAME_ALIASES that pointed at a deleted key now returns null from
  // loadModule (the `if (!loader)` guard at line 149 of
  // annotationService.ts) instead of throwing.
  'italian-game': () => import('./italian-game.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'ruy-lopez': () => import('./ruy-lopez.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'scotch-game': () => import('./scotch-game.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'vienna-game': () => import('./vienna-game.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'four-knights-game': () => import('./four-knights-game.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'london-system': () => import('./london-system.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'catalan-opening': () => import('./catalan-opening.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'trompowsky-attack': () => import('./trompowsky-attack.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'english-opening': () => import('./english-opening.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'englund-gambit': () => import('./englund-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'danish-gambit': () => import('./danish-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'pro-naroditsky-jobava-london': () => import('./pro-naroditsky-jobava-london.json') as unknown as Promise<{ default: OpeningAnnotations }>,
};

export { ANNOTATION_MODULES };
