/**
 * SOURCE A REAL GAME AT RUNTIME — the shared game picker (David 2026-09-17:
 * "I want new games audited each time. No good to have the same one over and
 * over. It doesn't tell us anything new.").
 *
 * An audit that replays ONE hardcoded PGN every run is a regression test
 * wearing an audit's clothes: it proves the wiring still works and tells you
 * nothing you did not already know. Every real defect found by reading review
 * output came from a NEW position.
 *
 * G3 holds — no PGN ever comes from memory. The masters explorer (through the
 * app's own proxy) decides WHICH games exist; the game-export proxy delivers
 * the movetext; chess.js replays every SAN before a game is allowed out of
 * here. We only declare the opening seed and which result the student needs.
 *
 * This logic lived inside `audit-review-fleet-newgames.mjs`. It moved here when
 * the live review audit needed the same picker — one copy, because a second one
 * is the drift this repo keeps paying for.
 */
import { Chess } from 'chess.js';

/** Both colours, wins AND losses AND draws, different openings and lengths —
 *  a fleet that only ever audits wins never sees the losing register. */
export const SEEDS = [
  { name: 'Najdorf (student=White, win)', play: 'e2e4,c7c5,g1f3,d7d6,d2d4,c5d4,f3d4,g8f6,b1c3,a7a6', student: 'white', want: 'white' },
  { name: 'Caro-Kann (student=Black, win)', play: 'e2e4,c7c6,d2d4,d7d5', student: 'black', want: 'black' },
  { name: 'QGD (student=Black, LOSS)', play: 'd2d4,d7d5,c2c4,e7e6,b1c3,g8f6', student: 'black', want: 'white' },
  { name: "King's Indian (student=White, LOSS)", play: 'd2d4,g8f6,c2c4,g7g6,b1c3,f8g7,e2e4,d7d6', student: 'white', want: 'black' },
  { name: 'Ruy Lopez (student=White, DRAW)', play: 'e2e4,e7e5,g1f3,b8c6,f1b5,a7a6', student: 'white', want: 'draw' },
  { name: 'French (student=Black, win)', play: 'e2e4,e7e6,d2d4,d7d5', student: 'black', want: 'black' },
  { name: 'Sicilian Dragon (student=Black, win)', play: 'e2e4,c7c5,g1f3,d7d6,d2d4,c5d4,f3d4,g8f6,b1c3,g7g6', student: 'black', want: 'black' },
  { name: 'Slav (student=Black, DRAW)', play: 'd2d4,d7d5,c2c4,c7c6', student: 'black', want: 'draw' },
  { name: 'Scandinavian (student=Black, LOSS)', play: 'e2e4,d7d5,e4d5,d8d5,b1c3', student: 'black', want: 'white' },
];

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

/** Strip headers/comments/NAGs from an exported PGN → bare movetext. */
export function movetextOf(raw) {
  return raw.replace(/^\[.*\]\s*$/gm, '').trim()
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\$\d+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Legality gate (G3): every SAN must replay. Returns the CANONICAL
 * chess.js-regenerated movetext — headers and the `*` placeholder stripped,
 * because chess.js `pgn()` prepends seven tags and appending them poisoned a
 * consumer's SAN parse (the replay froze on '[Event' and every board check
 * compared against the start position).
 */
export function verifyLegal(movetext) {
  const sans = movetext.replace(/\d+\.(\.\.)?\s*/g, '').replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim()
    .split(/\s+/).filter((t) => t && !/^\.+$/.test(t));
  const c = new Chess();
  for (const s of sans) {
    try { c.move(s.replace(/[?!]+$/, '')); } catch { return null; }
  }
  const canonical = c.pgn().replace(/^\[[^\]]*\]\s*$/gm, '').replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ').trim();
  return { plyCount: sans.length, canonical };
}

/** Fetch ONE known game by its lichess id — the reproduce path, so a red row
 *  from a rotated run can be re-run on the exact same board. */
export async function fetchGameById(base, id) {
  const raw = await fetchText(`${base}/api/lichess-game-export?id=${id}`);
  const legal = verifyLegal(movetextOf(raw));
  if (!legal) return null;
  const header = (tag) => (new RegExp(`\\[${tag} "([^"]*)"`).exec(raw)?.[1]) ?? '?';
  const result = header('Result');
  return {
    id,
    white: header('White'),
    black: header('Black'),
    result: result === '?' ? '*' : result,
    movetext: legal.canonical,
    plyCount: legal.plyCount,
  };
}

/**
 * Pick a real game for a seed. `exclude` is a Set of ids already used this run.
 * Returns null when no candidate clears the gates — the caller decides whether
 * that is fatal, because "the explorer had nothing" is not a product failure.
 *
 * 16..100 plies: long enough to exercise every narration pass, short enough
 * that a 126-ply grind does not overrun the analysis-readiness budget and abort
 * the walk before it starts.
 */
export async function pickRealGame(base, seed, exclude = new Set(), bounds = { min: 16, max: 100 }) {
  const ex = await fetchJson(`${base}/api/lichess-explorer?source=masters&play=${seed.play}`);
  const candidates = (ex.topGames || []).filter((g) => {
    const res = g.winner === 'white' ? 'white' : g.winner === 'black' ? 'black' : 'draw';
    return res === seed.want && g.id && !exclude.has(g.id);
  });
  for (const g of candidates) {
    try {
      const raw = await fetchText(`${base}/api/lichess-game-export?id=${g.id}`);
      const legal = verifyLegal(movetextOf(raw));
      if (!legal || legal.plyCount < bounds.min || legal.plyCount > bounds.max) continue;
      exclude.add(g.id);
      return {
        id: g.id,
        white: g.white?.name ?? '?',
        black: g.black?.name ?? '?',
        players: `${g.white?.name ?? '?'} vs ${g.black?.name ?? '?'}`,
        movetext: legal.canonical,
        plyCount: legal.plyCount,
        result: seed.want === 'draw' ? '1/2-1/2' : seed.want === 'white' ? '1-0' : '0-1',
        studentSide: seed.student,
        seedName: seed.name,
      };
    } catch { /* next candidate */ }
  }
  return null;
}

/** Rotate deterministically-by-default: a different seed each run, and the
 *  chosen index is PRINTED so the run can be repeated exactly. */
export function rotateSeed(index = Date.now()) {
  return SEEDS[Math.abs(Math.floor(index)) % SEEDS.length];
}
