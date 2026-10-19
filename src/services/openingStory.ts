// openingStory — HOW A STRONG COACH EXPLAINS AN OPENING, COMPOSED FROM THE
// COMPUTERS WE ALREADY OWN (docs/plans/2026-10-19-opening-explanation-model.md).
//
// Each fact is one beat of the model, computed on the board, the opening DB and
// the master-game counts — nothing authored, nothing guessed (G0):
//   fork            — the real crossroads, by FAMILY NAME, only when the choice
//                     is the student's (David 2026-10-19)
//   identity        — what the opening is (`openingIdentityLine`)
//   their-setup     — the system their move chose, and its plan from master games
//   branch-choice   — the branch the student chose against the main alternative
//   structure-cost  — the hole the student's own pawn move left (`holeAccess`)
//   structure-paid  — the student's move that guards that hole
//   character       — the middlegame's kind once the castling sides are set
//   key-break       — the break master games go for, as an IDEA (held while legal)
//   consequence     — what THEIR move just gave away (a branch is said only once
//                     their move creates it — David 2026-10-19)
//   horizon-plan    — past the master games, the board's plan under the SAME
//                     aim keys the plan thread uses, so the plan never repeats
// PURE given its `movesAt` reader; the caller ranks, dedupes and speaks.
import { Chess, type Square } from 'chess.js';
import { detectOpening } from './openingDetectionService';
import { isWaypointOpening, openingIdentityLine, identityFor, planFor, type IdentityFacts } from './openingIdentity';
import { mastersPlanRead, planStillAhead, mastersBreakIdea, PLAN_WALK, MIN_ROOT_GAMES, MIN_BREAK_SHARE, type MovesAt, type MastersPlanRead } from './mastersPlanRead';
import { masterMovesCachedSync, prefetchMastersTree } from './masterPlayLookup';
import type { MasterPlayResult } from './masterPlayTypes';
import { holeAccess } from './moveInsight';
import { deriveNextPlanFacts } from './nextPlans';
import { planAimKey } from './planThread';
import { MIN_ALTERNATIVE_SHARE } from './refutedAlternativeCore';
import { NO_PROOF, squaresProof, type FactProof } from './proof';
import { andList } from '../utils/andList';
import { shareAdverb } from '../utils/shareWords';
import { positionOf } from '../utils/samePosition';

export type StoryBeat =
  | 'fork' | 'identity' | 'their-setup' | 'branch-choice' | 'structure-cost' | 'structure-paid'
  | 'character' | 'key-break' | 'consequence' | 'horizon-plan';

export interface StoryFact {
  beat: StoryBeat;
  text: string;
  squares: string[];
  proof: FactProof;
  /** Say-once key for the claim ledger. */
  claimKey: string;
  /** The plan arc's aim key, when the fact states a plan (shared with
   *  `planThreadTurn`, so one plan is announced once). */
  aim?: string;
  /** Moves of the student's that this fact would name: held while any of them
   *  is legal on the student's turn (LEARN NAMES NO MOVE UNASKED). */
  holdWhilePlayable?: Array<{ from: string; to: string }>;
}

export interface OpeningStoryInput {
  /** SAN from the starting position; the board is after the last move. */
  history: readonly string[];
  student: 'w' | 'b';
  /** Masters moves at a position — default: what is already in memory. */
  movesAt?: MovesAt;
}

/** A family at a fork needs this share of the games there (the alternative bar). */
export const FORK_MIN_SHARE = MIN_ALTERNATIVE_SHARE / 100;
/** A hole matters to the story when their knight is this close to it. */
const HOLE_REACH = 3;

const PIECE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const seatOf = (ply: number): 'w' | 'b' => (ply % 2 === 0 ? 'w' : 'b');
const dot = (san: string, side: 'w' | 'b'): string => `${side === 'b' ? '…' : ''}${san}`;

function boardAfter(sans: readonly string[]): Chess | null {
  const c = new Chess();
  try { for (const s of sans) c.move(s); } catch { return null; }
  return c;
}

/** The variation's own name: "Sicilian Defense: Najdorf Variation" → "Najdorf". */
export function familyLabel(name: string): string {
  const tail = name.includes(':') ? name.slice(name.indexOf(':') + 1).trim() : name;
  return tail.replace(/ Variation\b/g, '').trim();
}

interface Family { san: string; games: number; share: number; name: string }

/** The real crossroads at the board after `prefix`: masters moves with a real
 *  share that lead to a DIFFERENT named family. Null below two families. */
function forkAt(prefix: readonly string[], movesAt: MovesAt): { families: Family[]; total: number; fen: string } | null {
  const b = boardAfter(prefix);
  if (!b) return null;
  const ms = movesAt(b.fen());
  const total = ms?.reduce((n, m) => n + m.games, 0) ?? 0;
  if (!ms || total < MIN_ROOT_GAMES) return null;
  const here = detectOpening([...prefix])?.name ?? null;
  // Inside a named family the crossroads is between ITS variations: a move
  // order that transposes into another family (2…e6 in the Sicilian, a French)
  // is not a road of this opening.
  // Before a family exists the student's own first moves are still choosing
  // one (baseline 2026-10-19: skip the fork while the first moves fix a
  // system) — so a waypoint or unnamed board has no crossroads to name.
  if (!here || isWaypointOpening(here)) return null;
  const family = here.split(':')[0].trim();
  const seen = new Set<string>();
  const families: Family[] = [];
  for (const m of [...ms].sort((a, c) => c.games - a.games)) {
    if (m.games / total < FORK_MIN_SHARE) continue;
    const name = detectOpening([...prefix, m.san])?.name;
    if (!name || name === here || seen.has(name) || isWaypointOpening(name)) continue;
    if (name.split(':')[0].trim() !== family) continue;
    seen.add(name);
    families.push({ san: m.san, games: m.games, share: m.games / total, name });
  }
  return families.length >= 2 ? { families, total, fen: b.fen() } : null;
}

const countProof = (short: string, families: readonly Family[]): FactProof => ({
  kind: 'count', exact: true, short,
  full: families.map((f) => `${familyLabel(f.name)}: ${f.games.toLocaleString('en-US')} master games`).join('; '),
});

const AIM_WORDS: Record<IdentityFacts['aims'][number]['kind'], string> = {
  'locked-centre': 'a locked centre',
  'isolated-d-pawn': 'an isolated d-pawn',
  fianchetto: 'a fianchettoed bishop on the long diagonal',
};
function aimWords(name: string): string | null {
  const aims = identityFor(name)?.facts.aims ?? [];
  return aims.length ? andList(aims.map((a) => AIM_WORDS[a.kind])) : null;
}

/** The plan master games play from this board: the live walk over what is in
 *  memory, else the named line's plan computed at build time. */
function planHere(fen: string, name: string | null, movesAt: MovesAt): MastersPlanRead | null {
  return mastersPlanRead(fen, movesAt) ?? (name ? planStillAhead(planFor(name), fen) : null);
}

/** Can a pawn of `me` still ever cover `hole`? (One standing behind it on a
 *  neighbouring file can advance to it.) */
function pawnCanCover(b: Chess, hole: string, me: 'w' | 'b'): boolean {
  const f = hole.charCodeAt(0); const r = Number(hole[1]);
  for (const df of [-1, 1]) {
    const ff = f + df;
    if (ff < 97 || ff > 104) continue;
    for (let rr = 1; rr <= 8; rr += 1) {
      const behind = me === 'w' ? rr < r : rr > r;
      if (!behind) continue;
      const p = b.get(`${String.fromCharCode(ff)}${rr}` as Square);
      if (p?.type === 'p' && p.color === me) return true;
    }
  }
  return false;
}

/** Holes the student's own pawn moves left in this game that are still holes. */
function studentHoles(history: readonly string[], student: 'w' | 'b', now: Chess): string[] {
  const out: string[] = [];
  const c = new Chess();
  for (let i = 0; i < history.length; i += 1) {
    const before = c.fen();
    if (seatOf(i) === student) {
      const h = holeAccess(before, history[i]);
      if (h && !out.includes(h.hole)) out.push(h.hole);
    }
    try { c.move(history[i]); } catch { break; }
  }
  return out.filter((sq) => now.get(sq as Square)?.type !== 'p' && !pawnCanCover(now, sq, student));
}

function legalMove(b: Chess, san: string): { from: string; to: string } | null {
  try { const m = new Chess(b.fen()).move(san); return m ? { from: m.from, to: m.to } : null; } catch { return null; }
}

function castledSide(history: readonly string[], side: 'w' | 'b'): 'short' | 'long' | null {
  for (let i = side === 'w' ? 0 : 1; i < history.length; i += 2) {
    const s = history[i].replace(/[+#]/g, '');
    if (s === 'O-O-O') return 'long';
    if (s === 'O-O') return 'short';
  }
  return null;
}

/**
 * The story facts at the board after `history`, each about what the LAST move
 * did or about the decision now in front of the student. Ordered by the
 * model's beats; the caller's door ranks and says once.
 */
export function openingStoryAt(i: OpeningStoryInput): StoryFact[] {
  const { history, student } = i;
  const movesAt = i.movesAt ?? masterMovesCachedSync;
  const now = boardAfter(history);
  if (!now || history.length === 0) return [];
  const fen = now.fen();
  const lastPly = history.length - 1;
  const lastSan = history[lastPly];
  const mover = seatOf(lastPly);
  const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  const before = boardAfter(history.slice(0, -1));
  if (!before) return [];
  const fenBefore = before.fen();
  const name = detectOpening([...history])?.name ?? null;
  const prevName = detectOpening(history.slice(0, -1))?.name ?? null;
  const newName = name && name !== prevName && !isWaypointOpening(name) ? name : null;
  const out: StoryFact[] = [];

  // 2 — IDENTITY, the move the name changed.
  if (newName) {
    const id = openingIdentityLine(newName, student, 'seat');
    // The identity names the usual REPLY — the student's next move when it is
    // theirs to play (English Attack: "the usual answer is the pawn to e5").
    const reply = identityFor(newName)?.facts.provokes?.reply ?? null;
    const held = reply && now.turn() === student ? legalMove(now, reply) : null;
    if (id) out.push({ beat: 'identity', text: id.text, squares: id.squares, proof: NO_PROOF.name, claimKey: id.key, ...(held ? { holdWhilePlayable: [held] } : {}) });
  }

  // 4 — THE BRANCH THE STUDENT CHOSE, against the main alternative.
  if (mover === student && newName) {
    const fork = forkAt(history.slice(0, -1), movesAt);
    const alt = fork?.families.find((f) => f.name !== newName);
    if (fork && alt && fork.families.some((f) => f.name === newName)) {
      const mine = aimWords(newName); const theirs = aimWords(alt.name);
      const leads = theirs && theirs !== mine ? ` — a position built around ${theirs}${mine ? `, where yours is built around ${mine}` : ''}` : ' — a different kind of position';
      out.push({
        beat: 'branch-choice',
        text: `You chose the ${familyLabel(newName)}. The other main road here is the ${familyLabel(alt.name)}${leads}.`,
        squares: [], proof: countProof(`masters split between the ${familyLabel(newName)} and the ${familyLabel(alt.name)}`, fork.families),
        claimKey: `story:branch:${positionOf(fork.fen)}`,
      });
    }
  }

  // 3 — THEIR SETUP AND ITS PLAN, the move their choice named it.
  if (mover === them && newName) {
    const plan = planHere(fen, newName, movesAt);
    const castle = plan ? (them === 'w' ? plan.whiteCastle : plan.blackCastle) : null;
    const br = plan ? (them === 'w' ? plan.white : plan.black) : null;
    const parts: string[] = [];
    const squares: string[] = [];
    if (castle && castle.share >= MIN_BREAK_SHARE) parts.push(`they ${shareAdverb(Math.round(castle.share * 100))} castle ${castle.side}`);
    if (br) { parts.push(`their break is ${dot(br.san, them)}`); squares.push(br.square); }
    if (parts.length) {
      out.push({
        beat: 'their-setup',
        text: `They've gone for the ${familyLabel(newName)}: in master games from here ${andList(parts)}.`,
        squares, proof: squaresProof(`their plan from master games`, squares) ?? NO_PROOF.description,
        claimKey: `story:setup:${newName}`,
      });
    }
  }

  // 5 — THE BUILT-IN COST of the student's own pawn move, and 5b its payment.
  const holes = studentHoles(history, student, now);
  if (mover === student) {
    const h = holeAccess(fenBefore, lastSan);
    if (h && h.from && h.moves !== null && h.moves <= HOLE_REACH && holes.includes(h.hole)) {
      out.push({
        beat: 'structure-cost',
        text: `That's the price of ${dot(lastSan, student)}: no pawn of yours can cover ${h.hole} again, and their knight on ${h.from} is ${h.moves === 1 ? 'one move' : `${h.moves} moves`} from it. Keeping ${h.hole} guarded is part of this structure from here.`,
        squares: [h.hole, h.from], proof: squaresProof(`${h.hole} has no pawn to cover it`, [h.hole, h.from]) ?? NO_PROOF.description,
        claimKey: `story:cost:${h.hole}`,
      });
    } else {
      let mv: ReturnType<Chess['move']> | null = null;
      try { mv = new Chess(fenBefore).move(lastSan); } catch { mv = null; }
      for (const hole of holes) {
        if (!mv) break;
        const was = before.attackers(hole as Square, student).length;
        const is = now.attackers(hole as Square, student).length;
        const sits = mv.to === hole;
        if ((is > was && now.attackers(hole as Square, student).includes(mv.to)) || sits) {
          out.push({
            beat: 'structure-paid',
            text: `${dot(lastSan, student)} pays that price: your ${PIECE[mv.piece] ?? 'piece'} ${sits ? 'sits on' : 'now guards'} ${hole}.`,
            squares: [hole, mv.to], proof: squaresProof(`${mv.to} covers ${hole}`, [hole, mv.to]) ?? NO_PROOF.description,
            claimKey: `story:paid:${hole}:${mv.to}`,
          });
          break;
        }
      }
    }
  }

  // 6 — THE MIDDLEGAME'S CHARACTER, once the castling sides are set.
  const myCastle = castledSide(history, student);
  const theirCastle = castledSide(history, them);
  if (/^O-O/.test(lastSan)) {
    if (myCastle && theirCastle) {
      const opposite = myCastle !== theirCastle;
      const theirWing = theirCastle === 'short' ? 'kingside' : 'queenside';
      const myWing = myCastle === 'short' ? 'kingside' : 'queenside';
      out.push(opposite
        ? { beat: 'character', text: `Kings on opposite wings: this is a race. Your pawns can storm the ${theirWing} without opening your own king, and theirs will storm the ${myWing} — every tempo counts.`, squares: [], proof: NO_PROOF.description, claimKey: 'story:character', aim: 'plan-aim:king-attack' }
        : { beat: 'character', text: `Both kings on the ${myWing}: no pawn race — pushing the pawns in front of your own king only weakens it, so the fight is in the centre and on the other wing.`, squares: [], proof: NO_PROOF.description, claimKey: 'story:character' });
    } else {
      // One side castled: master games say where the other king goes.
      const waiting: 'w' | 'b' = myCastle ? them : student;
      const done = myCastle ?? theirCastle;
      const plan = planHere(fen, name, movesAt);
      const pred = plan ? (waiting === 'w' ? plan.whiteCastle : plan.blackCastle) : null;
      if (done && pred && pred.side !== done && pred.share >= MIN_BREAK_SHARE) {
        const rank = waiting === 'w' ? '1' : '8';
        out.push({
          beat: 'character', text: `Master games from here ${shareAdverb(Math.round(pred.share * 100))} put ${waiting === student ? 'your' : 'their'} king on the other wing — expect opposite-side castling, which makes it a race of pawn storms.`,
          squares: [], proof: NO_PROOF.description, claimKey: 'story:character-ahead', aim: 'plan-aim:king-attack',
          ...(waiting === student ? { holdWhilePlayable: [{ from: `e${rank}`, to: `${pred.side === 'short' ? 'g' : 'c'}${rank}` }] } : {}),
        });
      }
    }
  }

  // 8 — THE KEY BREAK, as an idea, held while it is the student's legal move.
  const brk = mastersBreakIdea(planHere(fen, name, movesAt), student, fen, holes);
  if (brk) out.push({ beat: 'key-break', text: brk.text, squares: brk.squares, proof: squaresProof(brk.text, brk.squares) ?? NO_PROOF.description, claimKey: `story:break:${brk.move.to}`, aim: brk.aim, holdWhilePlayable: [brk.move] });

  // 9 — WHAT THEIR MOVE GAVE AWAY: a hole on their side your knight can reach.
  if (mover === them) {
    const h = holeAccess(fenBefore, lastSan);
    if (h && h.from && h.moves !== null && h.moves <= HOLE_REACH) {
      out.push({
        beat: 'consequence',
        text: `${dot(lastSan, them)} has a cost for them: no pawn of theirs can cover ${h.hole} again, and your knight on ${h.from} is ${h.moves === 1 ? 'one move' : `${h.moves} moves`} from it.`,
        squares: [h.hole, h.from], proof: squaresProof(`${h.hole} has no pawn of theirs to cover it`, [h.hole, h.from]) ?? NO_PROOF.description,
        claimKey: `story:gift:${h.hole}`, aim: `plan-aim:outpost:${h.hole}`,
        ...(h.moves === 1 ? { holdWhilePlayable: [{ from: h.from, to: h.hole }] } : {}),
      });
    }
  }

  // 1 — THE FORK IN FRONT OF THE STUDENT, by family name (their choice only).
  if (now.turn() === student) {
    const fork = forkAt(history, movesAt);
    if (fork) {
      const labels = fork.families.map((f) => `the ${familyLabel(f.name)}`);
      out.push({
        beat: 'fork', text: `A real crossroads: from here master games split into ${andList(labels)} — each its own kind of position.`,
        squares: [], proof: countProof(`master games split ${fork.families.length} ways`, fork.families), claimKey: `story:fork:${positionOf(fork.fen)}`,
      });
    }
  }

  // HORIZON — master games run out (a known thin answer, never an unknown):
  // the board's plan takes over under the plan thread's own aim key.
  const here = movesAt(fen);
  const thin = here !== null && here.reduce((n, m) => n + m.games, 0) < MIN_ROOT_GAMES;
  const prev = movesAt(fenBefore);
  const wasBook = prev !== null && prev.reduce((n, m) => n + m.games, 0) >= MIN_ROOT_GAMES;
  if (thin && wasBook) {
    const top = deriveNextPlanFacts(fen, student)[0];
    const aim = top ? planAimKey(top.kind, top.squares[0] ?? top.file ?? null) : null;
    if (top) {
      out.push({
        beat: 'horizon-plan', text: `The master games run out here, so the board sets the plan: ${top.goal}.`,
        squares: top.squares, proof: squaresProof(top.goal, top.squares) ?? NO_PROOF.description,
        claimKey: `story:horizon:${top.id}`, ...(aim ? { aim } : {}),
      });
    }
  }
  return out;
}


/** A path below this weight cannot move a break past `MIN_BREAK_SHARE`. */
export const PLAN_PREFETCH_MIN_WEIGHT = 0.05;

/**
 * LOOK THE OPENING UP BEFORE IT IS PLAYED: the next two plies of book (so the
 * fork and "still in book" are known on the student's first moves, not read as
 * out of book), then the tree the plan walk reads, pruned to the paths that can
 * move a "usually". Call before the first move and after each move.
 */
export async function prefetchOpeningStory(fen: string, surface: string, lookup?: (fen: string) => Promise<MasterPlayResult>): Promise<void> {
  await prefetchMastersTree(fen, { surface, plies: 2, branchShare: FORK_MIN_SHARE, minNodeGames: 1, minWeight: 0, maxPositions: 40, lookup });
  await prefetchMastersTree(fen, { surface, plies: PLAN_WALK.depth, branchShare: PLAN_WALK.branchShare, minNodeGames: PLAN_WALK.minNodeGames, minWeight: PLAN_PREFETCH_MIN_WEIGHT, maxPositions: 80, lookup });
}
