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
import { detectOpeningByOrder } from './openingDetectionService';
import { openingNameForBoard } from './openingAnnouncement';
import { openingPositionsLoaded } from './openingPositions';
import { isWaypointOpening, openingIdentityLine, identityFor, planFor, type IdentityFacts, type LiveIdentityBoard } from './openingIdentity';
import { mastersPlanRead, planStillAhead, mastersBreakIdea, PLAN_WALK, MIN_ROOT_GAMES, MIN_BREAK_SHARE, type MovesAt, type MastersPlanRead } from './mastersPlanRead';
import { masterMovesCachedSync, prefetchMastersTree } from './masterPlayLookup';
import type { MasterPlayResult } from './masterPlayTypes';
import { holeAccess } from './moveInsight';
import { holeKey } from './conceptKey';
import { roadReason, variationLabel } from './openingRoads';
import { deriveNextPlanFacts } from './nextPlans';
import { planAimKey } from './planThread';
import { classifyPhase } from './gamePhaseService';
import { MIN_ALTERNATIVE_SHARE } from './refutedAlternativeCore';
import { NO_PROOF, squaresProof, type FactProof } from './proof';
import { andList, countWord } from '../utils/andList';
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

interface OpeningStoryInput {
  /** SAN from the starting position; the board is after the last move. */
  history: readonly string[];
  student: 'w' | 'b';
  /** REQUIRED: may a story fact name the student's next move (a route's first
   *  square in the board's plan)? Learn's live board says no (LEARN NAMES NO
   *  MOVE UNASKED); Review and chat say yes. */
  namesStudentMoves: boolean;
  /** Masters moves at a position — default: what is already in memory. */
  movesAt?: MovesAt;
}

/** A family at a fork needs this share of the games there (the alternative bar). */
const FORK_MIN_SHARE = MIN_ALTERNATIVE_SHARE / 100;
/** A hole matters to the story when a knight is this close to it AND would hit
 *  something there (lead 2026-10-20: "three moves from it … keeping a5
 *  guarded" was a price with nothing to pay). */
const HOLE_REACH = 2;

const PIECE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const seatOf = (ply: number): 'w' | 'b' => (ply % 2 === 0 ? 'w' : 'b');
const dot = (san: string, side: 'w' | 'b'): string => `${side === 'b' ? '…' : ''}${san}`;

// ONE REPLAY PER PREFIX, shared across plies and calls. The story reads the
// same prefixes every move (OS-3 review, measured 2026-10-20: 20-27 ms a ply on
// desktop, 80 ms worst, most of it replaying the game five times over).
const PREFIX_MEMO_MAX = 2000;
const fenMemo = new Map<string, string | null>();
const nameMemo = new Map<string, string | null>();
const holeMemo = new Map<string, ReturnType<typeof holeAccess>>();
function remember<T>(m: Map<string, T>, k: string, v: T): T {
  if (m.size >= PREFIX_MEMO_MAX) {
    const oldest = m.keys().next().value;
    if (oldest !== undefined) m.delete(oldest);
  }
  m.set(k, v);
  return v;
}

function fenAfter(sans: readonly string[]): string | null {
  const k = sans.join(' ');
  const hit = fenMemo.get(k);
  if (hit !== undefined) return hit;
  let fen: string | null = null;
  if (sans.length === 0) fen = new Chess().fen();
  else {
    const prev = fenAfter(sans.slice(0, -1));
    if (prev) {
      try { const c = new Chess(prev); c.move(sans[sans.length - 1]); fen = c.fen(); } catch { fen = null; }
    }
  }
  return remember(fenMemo, k, fen);
}

function boardAfter(sans: readonly string[]): Chess | null {
  const f = fenAfter(sans);
  return f ? new Chess(f) : null;
}

/** The opening's name after `sans` — the ONE reader the surface announces with
 *  (`openingNameForBoard`), so a road, an identity and the spoken name agree. */
function nameAfter(sans: readonly string[]): string | null {
  const k = sans.join(' ');
  const hit = nameMemo.get(k);
  if (hit !== undefined) return hit;
  const fen = fenAfter(sans);
  const name = fen ? openingNameForBoard(detectOpeningByOrder([...sans]), fen, sans.length).det?.name ?? null : null;
  // The transposition index loads lazily: a name read before it lands is not kept.
  return openingPositionsLoaded() ? remember(nameMemo, k, name) : name;
}

/** `holeAccess`, memoized. `now`: the board the sentence is spoken on (the
 *  knight is counted there), or null when only which square became a hole is
 *  read. */
function holeAt(fenBefore: string, san: string, now: string | null): ReturnType<typeof holeAccess> {
  const k = `${fenBefore}|${san}|${now ?? ''}`;
  if (holeMemo.has(k)) return holeMemo.get(k) ?? null;
  return remember(holeMemo, k, holeAccess(fenBefore, san, now));
}

/** "your knight on f6 and bishop on e7" — what a knight on the hole would hit. */
function hitWords(b: Chess, owner: 'your' | 'their', hits: readonly string[]): string {
  return `${owner} ${andList(hits.map((sq) => `${PIECE[b.get(sq as Square)?.type ?? 'p'] ?? 'piece'} on ${sq}`))}`;
}

/** How far the knight is from the hole, in words — already ON it is said as
 *  such, never "0 moves". */
function knightDistance(owner: 'your' | 'their', from: string, moves: number): string {
  if (moves === 0) return `${owner} knight already sits on it`;
  return `${owner} knight on ${from} is ${moves === 1 ? 'one move' : `${countWord(moves)} moves`} from it`;
}

/** The ply whose move gave the board its current name (null: none did). */
function namedAtPly(history: readonly string[], name: string): number | null {
  let k = history.length;
  while (k > 0 && nameAfter(history.slice(0, k - 1)) === name) k -= 1;
  return k > 0 ? k - 1 : null;
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
  const here = nameAfter(prefix);
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
    const name = nameAfter([...prefix, m.san]);
    if (!name || name === here || seen.has(name) || isWaypointOpening(name)) continue;
    if (name.split(':')[0].trim() !== family) continue;
    seen.add(name);
    families.push({ san: m.san, games: m.games, share: m.games / total, name });
  }
  return families.length >= 2 ? { families, total, fen: b.fen() } : null;
}

const countProof = (short: string, families: readonly Family[]): FactProof => ({
  kind: 'count', exact: true, short,
  full: families.map((f) => `${variationLabel(f.name)}: ${f.games.toLocaleString('en-US')} master games`).join('; '),
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
 *  memory, else the named line's plan computed at build time. The build-time
 *  plan stands in only for a board not looked up YET, and boards are looked up
 *  only in the opening (`warmOpeningStory`): past it an unknown board is not
 *  master theory, so "master games from here" is not said off the name. */
function planHere(fen: string, name: string | null, movesAt: MovesAt, inOpening: boolean): MastersPlanRead | null {
  // Past the horizon the masters plan no longer speaks — the board's does.
  if (knownThin(fen, movesAt)) return null;
  return mastersPlanRead(fen, movesAt) ?? (name && inOpening ? planStillAhead(planFor(name), fen) : null);
}

/** Masters answered here, with fewer games than "usually" can rest on. An
 *  unknown position (nothing looked up) is never thin. */
function knownThin(fen: string, movesAt: MovesAt): boolean {
  const ms = movesAt(fen);
  return ms !== null && ms.reduce((n, m) => n + m.games, 0) < MIN_ROOT_GAMES;
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

/** Holes `side`'s own pawn moves left in this game that are still holes now,
 *  with the ply of the move that left each. */
function holesLeft(history: readonly string[], side: 'w' | 'b', now: Chess): Array<{ hole: string; ply: number }> {
  const out: Array<{ hole: string; ply: number }> = [];
  for (let i = side === 'w' ? 0 : 1; i < history.length; i += 2) {
    const before = fenAfter(history.slice(0, i));
    if (!before) break;
    // Only which square became a hole is read here, as of that move.
    const h = holeAt(before, history[i], null);
    if (h && !out.some((o) => o.hole === h.hole)) out.push({ hole: h.hole, ply: i });
  }
  return out.filter((o) => now.get(o.hole as Square)?.type !== 'p' && !pawnCanCover(now, o.hole, side));
}

const isPiece = (b: Chess, sq: string, color: 'w' | 'b', type: string): boolean => {
  const x = b.get(sq as Square);
  return !!x && x.color === color && x.type === type;
};

/** The board the identity is said over, for its board-truth checks. */
function liveBoard(b: Chess): LiveIdentityBoard {
  const fen = b.fen();
  return {
    pieceAt: (sq) => { const x = b.get(sq as Square); return x ? { color: x.color, type: x.type } : null; },
    canPlay: (san, side) => {
      const parts = fen.split(' ');
      parts[1] = side; parts[3] = '-';
      try { return !!new Chess(parts.join(' ')).move(san); } catch { return false; }
    },
  };
}

/** HELD ON THE STUDENT'S TURN: the fact would name a move the student can
 *  play right now (LEARN NAMES NO MOVE UNASKED). `fen` is the board the fact is
 *  spoken over. */
export function heldWhilePlayable(f: Pick<StoryFact, 'holdWhilePlayable'>, fen: string, student: 'w' | 'b'): boolean {
  return (f.holdWhilePlayable ?? []).some((m) => legalForSide(fen, m, student));
}

/** Would `m` be legal for `side` on this board, whoever is to move? */
function legalForSide(fen: string, m: { from: string; to: string }, side: 'w' | 'b'): boolean {
  const parts = fen.split(' ');
  parts[1] = side; parts[3] = '-';
  try { return new Chess(parts.join(' ')).moves({ verbose: true }).some((x) => x.from === m.from && x.to === m.to); } catch { return false; }
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
 * The story facts at the board after `history`: what the student's last move
 * did, what the opening is, and the standing facts of the opening (their
 * setup, a hole a pawn move left, the castling character) until heard.
 * Ordered by the model's beats; the caller's door ranks and says once.
 */
export function openingStoryAt(i: OpeningStoryInput): StoryFact[] {
  const { history, student } = i;
  const movesAt = i.movesAt ?? masterMovesCachedSync;
  const now = boardAfter(history);
  if (!now || history.length === 0) return [];
  const fen = now.fen();
  const lastPly = history.length - 1;
  const mover = seatOf(lastPly);
  const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  // The SAME name the surface announces (`openingNameForBoard`: the move order,
  // or the named position it transposed into), so the story never tells the
  // identity of an opening the coach did not name.
  const name = nameAfter(history);
  const inOpening = classifyPhase(fen, { ply: history.length }) === 'opening';
  // One masters-plan walk per call (three beats read it).
  let planRead: MastersPlanRead | null | undefined;
  const plan = (): MastersPlanRead | null => {
    if (planRead === undefined) planRead = planHere(fen, name, movesAt, inOpening);
    return planRead;
  };
  // THE STUDENT'S LAST MOVE. Learn reads the story after the coach's reply, so
  // the student's own move is one ply back: its beats are found there and
  // checked on the board now (OS-3 review: read only at the last ply, the
  // branch, cost and payment beats could never fire).
  const studentPly = mover === student ? lastPly : lastPly - 1;
  const out: StoryFact[] = [];

  // 2 — IDENTITY of the opening on the board, offered on every opening move
  // until it is heard. On the live board the line checks each clause: one
  // that names a move of the student's still to come holds the line, one the
  // board has made false is dropped (`openingIdentityLine`).
  if (name && !isWaypointOpening(name) && inOpening) {
    const id = openingIdentityLine(name, student, 'seat', liveBoard(now));
    if (id) out.push({ beat: 'identity', text: id.text, squares: id.squares, proof: NO_PROOF.name, claimKey: id.key });
  }

  // 4 — THE BRANCH THE STUDENT CHOSE, against the main alternative.
  if (studentPly >= 0) {
    const prefix = history.slice(0, studentPly);
    const chosenSan = history[studentPly];
    const sName = nameAfter(history.slice(0, studentPly + 1));
    const sNew = sName && sName !== nameAfter(prefix) && !isWaypointOpening(sName) ? sName : null;
    const fork = sNew ? forkAt(prefix, movesAt) : null;
    const alt = fork?.families.find((f) => f.name !== sNew);
    // Said over the board now: the move's piece must still stand where it went.
    let moved: { to: string; piece: string } | null = null;
    try { const pf = fenAfter(prefix); moved = pf ? new Chess(pf).move(chosenSan) : null; } catch { moved = null; }
    if (sNew && fork && alt && moved && isPiece(now, moved.to, student, moved.piece) && fork.families.some((f) => f.name === sNew)) {
      // WHAT EACH ROAD ALLOWS (lead 2026-10-20): a computed reason, or the
      // structure each road builds when the identity file knows both — never
      // "a different kind of position", which is a description with no reason.
      const reason = roadReason({ prefix, chosenSan, altSan: alt.san, altName: alt.name, student, movesAt });
      const mine = aimWords(sNew); const theirs = aimWords(alt.name);
      // Both roads, or neither: one road's aim alone compares nothing.
      const aims = theirs && mine && theirs !== mine ? ` The ${variationLabel(alt.name)} is a position built around ${theirs}; yours is built around ${mine}.` : '';
      if (reason || aims) out.push({
        beat: 'branch-choice',
        // THE NAME IS THE ANNOUNCEMENT'S (OS-11 #8): the move that made the family
        // is the move the announcement names it on ("It's the Najdorf…"), so the
        // choice says what it does and never names it a second time.
        text: reason ? `What that choice does: ${reason.text}${aims}` : aims.trim(),
        squares: reason?.squares ?? [], proof: reason?.proof ?? countProof(`masters split between the ${variationLabel(sNew)} and the ${variationLabel(alt.name)}`, fork.families),
        claimKey: `story:branch:${positionOf(fork.fen)}`,
      });
    }
  }

  // 3 — THEIR SETUP AND ITS PLAN, while the name THEIR move gave still stands
  // (offered until heard: a one-ply beat was lost for the game when the door
  // held it on a busy turn).
  if (name && inOpening && !isWaypointOpening(name)) {
    const at = namedAtPly(history, name);
    if (at !== null && seatOf(at) === them) {
      const pl = plan();
      const castle = pl ? (them === 'w' ? pl.whiteCastle : pl.blackCastle) : null;
      const br = pl ? (them === 'w' ? pl.white : pl.black) : null;
      const parts: string[] = [];
      const squares: string[] = [];
      if (castle && castle.share >= MIN_BREAK_SHARE) parts.push(`they ${shareAdverb(Math.round(castle.share * 100))} castle ${castle.side}`);
      if (br) { parts.push(`their break is ${dot(br.san, them)}`); squares.push(br.square); }
      if (parts.length) {
        out.push({
          beat: 'their-setup',
          // Named by their move just played, the announcement names it this
          // turn (OS-11 #8); a later offer reminds the student which setup.
          text: at === history.length - 1 ? `In master games from here ${andList(parts)}.` : `They've gone for the ${variationLabel(name)}: in master games from here ${andList(parts)}.`,
          squares, proof: squaresProof(`their plan from master games`, squares) ?? NO_PROOF.description,
          claimKey: `story:setup:${name}`,
        });
      }
    }
  }

  // 5 — THE BUILT-IN COST of the student's own pawn move, and 5b its payment.
  const holes = holesLeft(history, student, now).map((h) => h.hole);
  if (studentPly >= 0) {
    const beforeFen = fenAfter(history.slice(0, studentPly));
    const san = history[studentPly];
    const h = beforeFen ? holeAt(beforeFen, san, fen) : null;
    if (h && h.from && h.moves !== null && h.moves <= HOLE_REACH && h.hits.length && holes.includes(h.hole)) {
      out.push({
        beat: 'structure-cost',
        text: `That's the price of ${dot(san, student)}: no pawn of yours can cover ${h.hole} again, and ${knightDistance('their', h.from, h.moves)}; ${h.moves === 0 ? 'it hits' : 'from there it would hit'} ${hitWords(now, 'your', h.hits)}. Keeping ${h.hole} guarded is part of this structure from here.`,
        squares: [h.hole, h.from], proof: squaresProof(`${h.hole} has no pawn to cover it`, [h.hole, h.from]) ?? NO_PROOF.description,
        claimKey: `story:cost:${h.hole}`,
      });
    } else if (beforeFen) {
      const before = new Chess(beforeFen);
      let mv: ReturnType<Chess['move']> | null = null;
      try { mv = new Chess(beforeFen).move(san); } catch { mv = null; }
      for (const hole of holes) {
        if (!mv || !isPiece(now, mv.to, student, mv.piece)) break;
        const was = before.attackers(hole as Square, student).length;
        const guards = now.attackers(hole as Square, student);
        const sits = mv.to === hole;
        if ((guards.length > was && guards.includes(mv.to)) || sits) {
          out.push({
            beat: 'structure-paid',
            text: `${dot(san, student)} pays that price: your ${PIECE[mv.piece] ?? 'piece'} ${sits ? 'sits on' : 'now guards'} ${hole}.`,
            squares: [hole, mv.to], proof: squaresProof(`${mv.to} covers ${hole}`, [hole, mv.to]) ?? NO_PROOF.description,
            claimKey: `story:paid:${hole}:${mv.to}`,
          });
          break;
        }
      }
    }
  }

  // 6 — THE MIDDLEGAME'S CHARACTER, once a castling side is set (offered until
  // heard, from whichever move set it).
  const myCastle = castledSide(history, student);
  const theirCastle = castledSide(history, them);
  // Opposite wings is the race, said once by its one owner
  // (`planRace.oppositeWingsRace`, claim `race:opposite-wings`), never here.
  if (myCastle && theirCastle) {
    const myWing = myCastle === 'short' ? 'kingside' : 'queenside';
    if (myCastle === theirCastle) out.push({ beat: 'character', text: `Both kings on the ${myWing}: no pawn race — pushing the pawns in front of your own king only weakens it, so the fight is in the centre and on the other wing.`, squares: [], proof: NO_PROOF.description, claimKey: 'story:character' });
  } else if (myCastle || theirCastle) {
    // One side castled: master games say where the other king goes.
    const waiting: 'w' | 'b' = myCastle ? them : student;
    const done = myCastle ?? theirCastle;
    const pl = plan();
    const pred = pl ? (waiting === 'w' ? pl.whiteCastle : pl.blackCastle) : null;
    if (done && pred && pred.side !== done && pred.share >= MIN_BREAK_SHARE) {
      const rank = waiting === 'w' ? '1' : '8';
      out.push({
        beat: 'character', text: `Master games from here ${shareAdverb(Math.round(pred.share * 100))} put ${waiting === student ? 'your' : 'their'} king on the other wing — expect opposite-side castling, which makes it a race of pawn storms.`,
        squares: [], proof: NO_PROOF.description, claimKey: 'story:character-ahead', aim: 'plan-aim:king-attack',
        ...(waiting === student ? { holdWhilePlayable: [{ from: `e${rank}`, to: `${pred.side === 'short' ? 'g' : 'c'}${rank}` }] } : {}),
      });
    }
  }

  // 8 — THE KEY BREAK, as an idea, held while it is the student's legal move.
  // A key move the student can play right now is their next move, not an idea:
  // it is said only while it still needs preparing.
  const brk = mastersBreakIdea(plan(), student, fen, holes);
  if (brk && !legalForSide(fen, brk.move, student)) out.push({ beat: 'key-break', text: brk.text, squares: brk.squares, proof: squaresProof(brk.text, brk.squares) ?? NO_PROOF.description, claimKey: `story:break:${brk.move.to}`, aim: brk.aim, holdWhilePlayable: [brk.move] });

  // 9 — WHAT THEIR PAWN MOVES GAVE AWAY: a hole on their side your knight can
  // reach, offered while it is still a hole and your knight still stands there.
  for (const t of holesLeft(history, them, now)) {
    const beforeFen = fenAfter(history.slice(0, t.ply));
    const h = beforeFen ? holeAt(beforeFen, history[t.ply], fen) : null;
    if (h && h.from && h.moves !== null && h.moves <= HOLE_REACH && h.hits.length) {
      out.push({
        beat: 'consequence',
        text: `${dot(history[t.ply], them)} has a cost for them: no pawn of theirs can cover ${h.hole} again, and ${knightDistance('your', h.from, h.moves)}; ${h.moves === 0 ? 'it hits' : 'from there it would hit'} ${hitWords(now, 'their', h.hits)}.`,
        squares: [h.hole, h.from], proof: squaresProof(`${h.hole} has no pawn of theirs to cover it`, [h.hole, h.from]) ?? NO_PROOF.description,
        claimKey: holeKey(h.hole), aim: `plan-aim:outpost:${h.hole}`,
        ...(h.moves === 1 ? { holdWhilePlayable: [{ from: h.from, to: h.hole }] } : {}),
      });
    }
  }

  // 1 — THE FORK IN FRONT OF THE STUDENT, by family name (their choice only).
  if (now.turn() === student) {
    const fork = forkAt(history, movesAt);
    if (fork) {
      const labels = fork.families.map((f) => `the ${variationLabel(f.name)}`);
      out.push({
        beat: 'fork', text: `A real crossroads: from here master games split into ${andList(labels)} — each its own kind of position.`,
        squares: [], proof: countProof(`master games split ${fork.families.length} ways`, fork.families), claimKey: `story:fork:${positionOf(fork.fen)}`,
      });
    }
  }

  // HORIZON — master games have run out (a known thin answer, never an
  // unknown) after the game was in their book: the board's plan takes over,
  // under the plan thread's own aim key so the plan is announced once. Only
  // past the opening — in it the plan is development (David 2026-10-19), and
  // the plan thread is silent there for the same reason.
  if (knownThin(fen, movesAt) && !inOpening) {
    let wasBook = false;
    for (let k = 0; k < lastPly; k += 1) {
      const f = fenAfter(history.slice(0, k));
      const ms = f ? movesAt(f) : null;
      if (ms && ms.reduce((n, m) => n + m.games, 0) >= MIN_ROOT_GAMES) { wasBook = true; break; }
    }
    const top = wasBook ? deriveNextPlanFacts(fen, student, { namesStudentMoves: i.namesStudentMoves })[0] : undefined;
    if (top) {
      const aim = planAimKey(top.kind, top.squares[0] ?? top.file ?? null);
      out.push({
        beat: 'horizon-plan', text: `The master games run out here, so the board sets the plan: ${top.goal}.`,
        squares: top.squares, proof: squaresProof(top.goal, top.squares) ?? NO_PROOF.description,
        claimKey: `story:horizon:${top.id}`, ...(aim ? { aim } : {}),
      });
    }
  }
  return out.sort((x, y) => BEAT_ORDER[x.beat] - BEAT_ORDER[y.beat]);
}

/** The order a strong coach tells it (lead's 7-run baseline, 2026-10-19):
 *  fork → identity → the choice and its cost at the move they belong to →
 *  the consequence of their choice → the coming game's character → the key
 *  idea last before the middlegame. A new beat fails to compile until placed. */
export const BEAT_ORDER: Record<StoryBeat, number> = {
  fork: 0, identity: 1, 'branch-choice': 2, 'their-setup': 3, 'structure-cost': 4, 'structure-paid': 5,
  consequence: 6, character: 7, 'key-break': 8, 'horizon-plan': 9,
};


/** A path below this weight cannot move a break past `MIN_BREAK_SHARE`. */
const PLAN_PREFETCH_MIN_WEIGHT = 0.1;

/**
 * LOOK THE OPENING UP BEFORE IT IS PLAYED: the next two plies of book (so the
 * fork and "still in book" are known on the student's first moves, not read as
 * out of book), then the tree the plan walk reads, pruned to the paths that can
 * move a "usually". Call before the first move and after each move.
 */
let storyWalk = 0;
export async function prefetchOpeningStory(fen: string, surface: string, lookup?: (fen: string, localOnly: boolean) => Promise<MasterPlayResult>): Promise<void> {
  // ONE WALK AT A TIME (OS-3 review): each move used to start another walk of
  // up to 160 lookups beside the last, so a few quick moves had several
  // running at once. The newest board's walk is the one that matters.
  const mine = ++storyWalk;
  const superseded = (): boolean => mine !== storyWalk;
  await prefetchMastersTree(fen, { surface, plies: 2, branchShare: FORK_MIN_SHARE, minNodeGames: 1, minWeight: 0, maxPositions: 40, lookup, superseded });
  if (superseded()) return;
  await prefetchMastersTree(fen, { surface, plies: PLAN_WALK.depth, branchShare: PLAN_WALK.branchShare, minNodeGames: PLAN_WALK.minNodeGames, minWeight: PLAN_PREFETCH_MIN_WEIGHT, maxPositions: 120, lookup, superseded });
}
