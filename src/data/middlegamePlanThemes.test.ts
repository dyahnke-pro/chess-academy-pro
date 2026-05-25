import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import plansRaw from './middlegame-plans.json';
import baselineRaw from './middlegamePlanThemes.baseline.json';
import repertoireRaw from './repertoire.json';
import proRaw from './pro-repertoires.json';
import openingManifests from './opening-manifests.json';
import shortBaselineRaw from './middlegamePlanShort.baseline.json';
import { sourcesAreValid } from './narrationSources';

// ─── The "show the theme" gate (David 2026-05-25) ───────────────────────────
// A middlegame-plan playableLine MUST demonstrate the plan's named theme — it
// must actually PLAY one of the plan's own declared pawn breaks, and it must
// not end on a bare promise ("Black is ready for …e5 and the kingside storm")
// without ever showing it. The disease: the "Dutch Leningrad: The Kingside
// Storm" line played d5/Na6/Rb1/Bd7 — zero storm moves — then promised the
// storm in its last annotation. This gate blocks NEW theme-empty / promise-
// only lines; the baseline holds the known offenders and only SHRINKS as lines
// are rewritten to play their breaks. See scripts/audit-plan-line-themes.mjs.

// ─── The "demonstrate the plan" gate (David 2026-05-25) ─────────────────────
// A middlegame-plan playableLine MUST demonstrate its plan: a student move must
// land on one of the plan's GOAL squares — an UNCONDITIONAL declared pawn break
// OR any square named in pieceManeuvers — and it must not end on a bare promise
// ("Black is ready for …e5 and the kingside storm" without ever showing it).
// Conditional breaks ("…c5 only if", "avoid loosening", "the passed c3-pawn")
// are NOT required; those plans are demonstrated through their maneuvers. The
// disease: "Dutch Leningrad: The Kingside Storm" played d5/Na6/Rb1/Bd7 — zero
// storm — then promised the storm. This gate blocks NEW non-demonstrating /
// promise-only lines; the baseline holds the known offenders and only SHRINKS
// as lines are rewritten. See scripts/audit-plan-line-themes.mjs.

interface PlanLine { fen: string; moves: string[]; annotations?: string[]; title?: string }
interface Plan { id: string; openingId: string; title?: string; pawnBreaks?: unknown[]; pieceManeuvers?: unknown[]; playableLines?: PlanLine[] }

const plans = plansRaw as unknown as Plan[];
const baseline = new Set((baselineRaw as { keys: string[] }).keys);

const colorMap: Record<string, 'white' | 'black'> = {};
for (const src of [repertoireRaw, proRaw]) {
  const list = (Array.isArray(src) ? src : []) as Array<{ id?: string; color?: 'white' | 'black' }>;
  for (const o of list) if (o?.id && o?.color) colorMap[o.id] = o.color;
}

const SQUARE = /([a-h][1-8])/g;
const PROMISE = /\b(ready for|ready to|prepares? to|preparing to|will follow|is ready|planning to|intends? to|swinging to|aims? to|looking to|poised|about to|coming next|next comes|to follow)\b/i;
const COND = /\b(only|if|else|avoid|keep|restrain|passed|once|when|unless|never|don'?t|patient|flawless|sound|respect|balance|small)\b/i;

function squaresIn(s: unknown): string[] {
  if (typeof s !== 'string') return [];
  const out: string[] = [];
  let m: RegExpExecArray | null;
  SQUARE.lastIndex = 0;
  while ((m = SQUARE.exec(s)) !== null) out.push(m[1]);
  return out;
}

function goalSquares(plan: Plan): Set<string> {
  const out = new Set<string>();
  for (const pb of plan.pawnBreaks ?? []) {
    const s = typeof pb === 'string' ? pb : (pb as { move?: unknown })?.move;
    if (typeof s === 'string' && !COND.test(s)) for (const q of squaresIn(s)) out.add(q);
  }
  for (const pm of plan.pieceManeuvers ?? []) {
    const obj = pm as { move?: unknown; route?: unknown };
    for (const q of squaresIn(typeof pm === 'string' ? pm : (obj?.move ?? obj?.route))) out.add(q);
  }
  return out;
}

interface Offender { key: string; planId: string; flags: { themeEmpty: boolean; promiseEnding: boolean; badFen: boolean } }

function findOffenders(): Offender[] {
  const offenders: Offender[] = [];
  for (const plan of plans) {
    const lines = plan.playableLines ?? [];
    const color = colorMap[plan.openingId] ?? null;
    const goals = goalSquares(plan);
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      let demo = false;
      let badFen = false;
      try {
        const chess = new Chess(line.fen);
        const studentChar = color === 'black' ? 'b' : color === 'white' ? 'w' : null;
        for (const san of line.moves) {
          const mover = chess.turn();
          let mv;
          try { mv = chess.move(san); } catch { badFen = true; break; }
          const isStudent = studentChar ? mover === studentChar : true;
          if (isStudent && goals.has(mv.to)) demo = true;
        }
      } catch { badFen = true; }
      const anns = line.annotations ?? [];
      const last = anns.length ? anns[anns.length - 1] : '';
      const promiseEnding = PROMISE.test(last);
      const themeEmpty = goals.size > 0 && !demo && !badFen;
      if (themeEmpty || promiseEnding || badFen) {
        offenders.push({ key: `${plan.id}#${li}`, planId: plan.id, flags: { themeEmpty, promiseEnding, badFen } });
      }
    }
  }
  return offenders;
}

describe('middlegame-plan playableLines demonstrate their named theme', () => {
  const offenders = findOffenders();

  it('introduces NO new theme-empty / promise-only lines beyond the baseline', () => {
    const novel = offenders.filter((o) => !baseline.has(o.key));
    expect(novel, `New plan lines fail the show-the-theme gate. Each MUST play one of its plan's declared pawn breaks (and not end on a bare promise). Rewrite them or, only if intentionally exempt, add to middlegamePlanThemes.baseline.json:\n${novel.map((o) => `  ${o.key} ${JSON.stringify(o.flags)}`).join('\n')}`).toHaveLength(0);
  });

  it('never lets a playableLine play an illegal move from its FEN', () => {
    const broken = offenders.filter((o) => o.flags.badFen && !baseline.has(o.key));
    expect(broken, `Illegal move / corrupt FEN in playableLine: ${broken.map((o) => o.key).join(', ')}`).toHaveLength(0);
  });

  it('keeps the fixed Dutch "Kingside Storm" line demonstrating the storm', () => {
    // Regression guard for David's 2026-05-25 report — this line must keep
    // playing a real kingside break (…g5/…g4/…f4), never revert to maneuvering.
    expect(offenders.some((o) => o.key === 'mp-dutchdefence-main#0')).toBe(false);
  });

  // The theme baseline can only SHRINK — a hard ceiling blocks a future build
  // from baselining a new theme-empty / promise-only line. Lower THEME_CEILING
  // as the deferred lines are rewritten; never raise it.
  const THEME_CEILING = 4;
  it(`theme baseline never grows (ceiling ${THEME_CEILING})`, () => {
    expect(baseline.size, 'middlegamePlanThemes.baseline.json grew — fix the line instead of baselining it').toBeLessThanOrEqual(THEME_CEILING);
  });
});

// ─── Short-register coverage gate (David 2026-05-25) ────────────────────────
// Every masterclass plan playableLine MUST carry a hand-authored SHORT register
// (learnCues, one per move) alongside its full Watch annotations — the Learn
// mode should speak an authored cue, not the bare move-dictation fallback. The
// fallback is sanctioned ONLY for non-masterclass / DB-only lines. The baseline
// holds the current backlog (119 lines at lock time) and only SHRINKS, so a NEW
// masterclass plan line can't ship without both registers.
describe('masterclass plan lines carry a short (learnCues) register', () => {
  const baseline = new Set((shortBaselineRaw as { keys: string[] }).keys);
  const masterclass = new Set(Object.keys(openingManifests).filter((k) => !k.startsWith('_')));
  const missing: string[] = [];
  for (const plan of plans) {
    if (!masterclass.has(plan.openingId)) continue;
    (plan.playableLines ?? []).forEach((l, i) => {
      const cues = (l as { learnCues?: string[] }).learnCues;
      if (!(Array.isArray(cues) && cues.length === l.moves.length)) missing.push(`${plan.id}#${i}`);
    });
  }

  it('introduces NO masterclass plan line missing its short register beyond the baseline', () => {
    const novel = missing.filter((k) => !baseline.has(k));
    expect(novel, `New masterclass plan lines have no hand-authored short cues (learnCues, one per move). Author them, or — only if deferred — add to middlegamePlanShort.baseline.json:\n${novel.join('\n')}`).toEqual([]);
  });

  // Short-register backlog can only SHRINK. Lower SHORT_CEILING as cues are
  // authored; never raise it (a new masterclass line must ship with both
  // registers, not be added to the baseline).
  const SHORT_CEILING = 86;
  it(`short-register baseline never grows (ceiling ${SHORT_CEILING})`, () => {
    expect(baseline.size, 'middlegamePlanShort.baseline.json grew — author the short cues instead of baselining').toBeLessThanOrEqual(SHORT_CEILING);
  });
});

// ─── NON-NEGOTIABLE independent-verification gate (David 2026-05-25) ─────────
// Every masterclass plan playableLine MUST record a resolvable verification
// source (sources[]: book:/concept:/reputable-URL). NO baseline escape — all
// 134 masterclass plan lines were sourced 2026-05-25; a new one without a
// source fails this gate.
describe('masterclass plan lines cite an independent verification source', () => {
  const masterclass = new Set(Object.keys(openingManifests).filter((k) => !k.startsWith('_')));
  const unverified: string[] = [];
  for (const plan of plans) {
    if (!masterclass.has(plan.openingId)) continue;
    (plan.playableLines ?? []).forEach((l, i) => {
      if (!sourcesAreValid((l as { sources?: string[] }).sources)) unverified.push(`${plan.id}#${i}`);
    });
  }

  it('EVERY masterclass plan line has a resolvable source — no exceptions', () => {
    expect(unverified, `Masterclass plan lines missing a resolvable verification source (sources: ["book:<id>" | "concept:<id>" | reputable https URL]):\n${unverified.join('\n')}`).toEqual([]);
  });
});
