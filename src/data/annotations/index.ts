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

const ANNOTATION_MODULES: Record<string, AnnotationLoader> = {
  ...autoMap(),
  // Legacy hand-registered entries — overrides below keep working
  // for anything the glob path format wouldn't catch.
  'italian-game': () => import('./italian-game.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'ruy-lopez': () => import('./ruy-lopez.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'scotch-game': () => import('./scotch-game.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'vienna-game': () => import('./vienna-game.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'kings-gambit': () => import('./kings-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'four-knights-game': () => import('./four-knights-game.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'sicilian-najdorf': () => import('./sicilian-najdorf.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'sicilian-dragon': () => import('./sicilian-dragon.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'sicilian-sveshnikov': () => import('./sicilian-sveshnikov.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'sicilian-alapin': () => import('./sicilian-alapin.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'french-defence': () => import('./french-defence.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'caro-kann': () => import('./caro-kann.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'pirc-defence': () => import('./pirc-defence.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'scandinavian-defence': () => import('./scandinavian-defence.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'alekhine-defence': () => import('./alekhine-defence.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'philidor-defence': () => import('./philidor-defence.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'petrov-defence': () => import('./petrov-defence.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'queens-gambit': () => import('./queens-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'london-system': () => import('./london-system.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'catalan-opening': () => import('./catalan-opening.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'trompowsky-attack': () => import('./trompowsky-attack.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'qgd': () => import('./qgd.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'qga': () => import('./qga.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'slav-defence': () => import('./slav-defence.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'semi-slav': () => import('./semi-slav.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'kings-indian-defence': () => import('./kings-indian-defence.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'nimzo-indian': () => import('./nimzo-indian.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'grunfeld-defence': () => import('./grunfeld-defence.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'dutch-defence': () => import('./dutch-defence.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'benoni-defence': () => import('./benoni-defence.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'benko-gambit': () => import('./benko-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'queens-indian': () => import('./queens-indian.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'budapest-gambit': () => import('./budapest-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'old-indian-defence': () => import('./old-indian-defence.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'english-opening': () => import('./english-opening.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'reti-opening': () => import('./reti-opening.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'kings-indian-attack': () => import('./kings-indian-attack.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'birds-opening': () => import('./birds-opening.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'two-knights-defence': () => import('./two-knights-defence.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'evans-gambit': () => import('./evans-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'stafford-gambit': () => import('./stafford-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'englund-gambit': () => import('./englund-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'smith-morra-gambit': () => import('./smith-morra-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'scotch-gambit': () => import('./scotch-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'vienna-gambit': () => import('./vienna-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'danish-gambit': () => import('./danish-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'marshall-attack': () => import('./marshall-attack.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'albin-countergambit': () => import('./albin-countergambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'gambit-kings-gambit': () => import('./gambit-kings-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'gambit-evans-gambit': () => import('./gambit-evans-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'gambit-budapest-gambit': () => import('./gambit-budapest-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'gambit-benko-gambit': () => import('./gambit-benko-gambit.json') as unknown as Promise<{ default: OpeningAnnotations }>,
  'pro-naroditsky-jobava-london': () => import('./pro-naroditsky-jobava-london.json') as unknown as Promise<{ default: OpeningAnnotations }>,
};

export { ANNOTATION_MODULES };
