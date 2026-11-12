// OPENING THEORY, CALCULATED (David 2026-11-12: "I want opening theory to be
// calculated" → "I want the gap filled"). The ideas a theory page states about
// a move — is it the main move, what else is played here and what each aims
// for, what the other side answers, how it scores — read off the masters'
// games at the board and the board itself. Sources (Wikibooks, Wikipedia) are
// training and reference only: no sentence of theirs is spoken.
//
// Gap list A2 (main move), A3 (expected reply), A4 (alternatives with their
// aims), A5 (results). Pure: the masters' table is read synchronously; no
// engine, no fetch. G3: every move named is one masters played here.
import { Chess, type Color } from 'chess.js';
import { masterMovesCachedSync, type LocalDbMove } from './masterPlayLookup';
import { moveJob, MINE, THEIRS } from './bookMoveWhy';
import { NO_FOLLOW } from './exchangeLedger';
import { shareAdverb } from '../utils/shareWords';
import { scoreWords } from './explorerTranslate';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

/** Fewer master games than this and the board has no theory to state. */
export const THEORY_MIN_GAMES = 40;
/** A move this share of the games or more is one of the board's main moves. */
export const MAIN_SHARE = 15;
/** Another move at this share or more is a real alternative, said with its
 *  aim. Measured on the Wikibooks pages (2,528 alternatives they name): 15%
 *  and up caught 373, 10% adds 53 more; below that the pages name moves
 *  masters barely play — refutations, which are the known-mistake index's. */
export const ALT_SHARE = 10;
/** A move below this share is a sideline worth saying so. */
export const RARE_SHARE = 5;
/** A score this far from even, over enough games, is worth saying. */
export const SCORE_EDGE = 0.05;
export const SCORE_MIN_GAMES = 100;

export type TheoryFactKind = 'book-standing' | 'book-alternatives' | 'book-reply' | 'book-score';

export interface TheoryFact {
  kind: TheoryFactKind;
  /** Said as the turn's lead, after the move's intro: "is the main move here". */
  clause: string;
  /** Said behind another line on the move: "It's the main move here." */
  sentence: string;
  /** Squares the fact is about: the played move's, an alternative's, the reply's. */
  squares: string[];
  /** The moves it names (SAN), for the say-once claim. */
  names: string[];
}

interface Read { san: string; games: number; pct: number; score: number | null; to: string }

function readBoard(fen: string, mover: Color): { total: number; moves: Read[] } | null {
  const raw: LocalDbMove[] | null = masterMovesCachedSync(fen);
  if (!raw || raw.length === 0) return null;
  const total = raw.reduce((s, m) => s + m.games, 0);
  if (total < THEORY_MIN_GAMES) return null;
  const moves: Read[] = [];
  for (const m of [...raw].sort((a, b) => b.games - a.games)) {
    let to = '';
    try { to = new Chess(fen).move(m.san).to; } catch { continue; }
    const decided = (m.white ?? 0) + (m.draws ?? 0) + (m.black ?? 0);
    const won = mover === 'w' ? (m.white ?? 0) : (m.black ?? 0);
    const score = decided > 0 ? (won + 0.5 * (m.draws ?? 0)) / decided : null;
    moves.push({ san: m.san, games: m.games, pct: (100 * m.games) / total, score, to });
  }
  return { total, moves };
}

const clean = (s: string): string => s.replace(/[+#!?]+$/, '');
const dotted = (san: string, mover: Color): string => (mover === 'b' ? `…${san}` : san);

/** What a move aims for, as a clause ("which prepares d4"), from the board. */
function aimOf(fen: string, san: string, mover: Color, mine: boolean): string | null {
  try {
    const job = moveJob(fen, san, mover, mine ? MINE : THEIRS, null, NO_FOLLOW);
    if (!job || !job.clause) return null;
    return job.clause.replace(/^it /, '');
  } catch { return null; }
}

/**
 * The theory facts for `san` played on `fenBefore`, in the mover's seat
 * (`mine`: the student moved). Each fact is said only where the masters'
 * games say something: a main move, a rare one, a real alternative, a firm
 * reply, a score away from even.
 */
export function openingTheoryFacts(fenBefore: string, san: string, mine: boolean): TheoryFact[] {
  let mover: Color;
  let fenAfter: string;
  let to: string;
  try { const c = new Chess(fenBefore); mover = c.turn(); const mv = c.move(san); to = mv.to; fenAfter = c.fen(); } catch { return []; }
  const here = readBoard(fenBefore, mover);
  if (!here) return [];
  const played = here.moves.find((m) => clean(m.san) === clean(san));
  const key = stemKeyOf(`${fenBefore}|${san}`);
  const out: TheoryFact[] = [];
  const who = mine ? 'you' : 'they';
  const Who = mine ? 'You' : 'They';

  // A2 — the move's standing among the masters' moves here.
  const top = here.moves[0];
  const topSaid = dotted(top.san, mover);
  if (played && clean(top.san) === clean(san) && played.pct >= MAIN_SHARE) {
    const how = played.pct >= 45 ? `masters ${shareAdverb(played.pct)} play it` : 'masters play it most, though the field is split';
    out.push({ kind: 'book-standing', clause: `is the main move here — ${how}`, sentence: rotateStem([`It's the main move here — ${how}.`, `That's the main line: ${how}.`], key), squares: [to], names: [san] });
  } else if (played && played.pct >= MAIN_SHARE) {
    out.push({ kind: 'book-standing', clause: `is one of the main moves here, beside ${topSaid}`, sentence: `It's one of the main moves here, beside ${topSaid}.`, squares: [to, top.to], names: [san, top.san] });
  } else if (played && played.pct < RARE_SHARE) {
    out.push({ kind: 'book-standing', clause: `is a sideline — masters rarely play it, and ${topSaid} is the main move`, sentence: `It's a sideline — masters rarely play it here, and ${topSaid} is the main move.`, squares: [to, top.to], names: [san, top.san] });
  } else if (!played) {
    out.push({ kind: 'book-standing', clause: `leaves the masters' moves — ${topSaid} is the main move here`, sentence: `${Who} leave the masters' moves here: ${topSaid} is the main move.`, squares: [to, top.to], names: [san, top.san] });
  }

  // A4 — every other main move, each with what it aims for (a bar, never a cap).
  // An alternative that aims for what the move played aims for is said as
  // that ("Masters also play …Nc6 here, with the same idea") — never its aim
  // in the same words again (the voice gate, 2026-11-12: "d6 prepares e5 …
  // …Nc6, which prepares e5").
  const ownAim = aimOf(fenBefore, san, mover, mine);
  const aimKey = (a: string): string => a.split(/[,—:]/)[0].trim();
  for (const m of here.moves.filter((x) => clean(x.san) !== clean(san) && x.pct >= ALT_SHARE)) {
    const aim = aimOf(fenBefore, m.san, mover, mine);
    if (!aim) continue;
    const alt = dotted(m.san, mover);
    const same = ownAim !== null && aimKey(aim) === aimKey(ownAim);
    out.push(same
      ? { kind: 'book-alternatives', clause: `isn't the only main move — masters also play ${alt}, with the same idea`, sentence: `Masters also play ${alt} here, with the same idea.`, squares: [m.to], names: [m.san] }
      : { kind: 'book-alternatives', clause: `isn't the only main move — masters also play ${alt}, which ${aim}`, sentence: `Masters also play ${alt} here, which ${aim}.`, squares: [m.to], names: [m.san] });
  }

  // A5 — how it scores for the mover, where the games say it clearly.
  if (played && played.score !== null && played.games >= SCORE_MIN_GAMES && Math.abs(played.score - 0.5) >= SCORE_EDGE) {
    const forWho = who === 'you' ? 'you' : 'them';
    out.push({ kind: 'book-score', clause: `${scoreWords(played.score)} for ${forWho} in master games`, sentence: `In master games it ${scoreWords(played.score)} for ${forWho}.`, squares: [to], names: [san] });
  }

  // A3 — what the other side answers, when the masters agree.
  const them: Color = mover === 'w' ? 'b' : 'w';
  const next = readBoard(fenAfter, them);
  if (next && next.moves[0].pct >= 45) {
    const reply = next.moves[0];
    const r = dotted(reply.san, them);
    out.push({ kind: 'book-reply', clause: `is ${shareAdverb(reply.pct)} met by ${r} in master games`, sentence: `Masters ${shareAdverb(reply.pct)} answer with ${r}.`, squares: [reply.to], names: [reply.san] });
  }
  return out;
}
