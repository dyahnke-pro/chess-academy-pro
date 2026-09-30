// planArc — a side's plan followed MOVE BY MOVE across a game (David
// 2026-09-26: "How are the opponent's plans detailed by the coach? Adequate?" —
// threats were, plans were not: every plan reader works off ONE position or ONE
// engine line and forgets it the next move, so the coach could say what they
// want now and never "that's the second step of it", "they got there", or
// "they've given it up").
//
// This is the memory those readers never had. It does not read a plan itself:
// the AIMS come off `SidePlan` (lookaheadPlan), which the Learn surface already
// builds from the engine line every move and review can build from the moves
// actually played. It only decides, per read, what CHANGED about each aim:
//
//   emerge   the same aim read twice running — a plan, not one line's whim
//   advance  the side's actual move lands on the aim's squares
//   arrive   the aim is done on the board (piece on the outpost, rook on the
//            file, piece at the end of its route)
//   drop     an announced aim missing from two reads running
//
// Pure and deterministic (G0): the identity of an aim is WHAT IT IS AIMED AT
// (`outpost:d5`, `file:c`, `route:n:e5`), never its wording, so a pushed pawn
// or a knight one hop closer is the same plan, not a new one.
import { THINK_MARK } from '../utils/thinkPause';
import { Chess, type Square } from 'chess.js';
// TYPE-ONLY on purpose: `lookaheadPlan` re-exports this module (the arc is the
// plan reader's memory, and the Learn surface reaches it through the reader it
// already composes), so a runtime import back would be a cycle.
import type { SidePlan } from './lookaheadPlan';
import { CAPTURE_VALUE } from './pieceValues';

export type AimKind = 'king-attack' | 'outpost' | 'file' | 'passer' | 'route' | 'shield';

export interface Aim {
  /** Stable identity: kind + what it is aimed at. */
  id: string;
  kind: AimKind;
  /** The squares the aim is about — what counts as a step toward it. */
  squares: string[];
  /** Where it is done, when it has a single end (outpost square, route end). */
  goal: string | null;
  /** A noun phrase in the seat's voice: "the outpost on d5", "an attack on your king". */
  phrase: string;
  /** Route only: the square the piece starts from. */
  from?: string;
}

export type Seat = 'student' | 'opponent';

const PIECE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const LETTER: Record<string, string> = Object.fromEntries(Object.entries(PIECE).map(([l, w]) => [w, l]));

/** The aims a side's plan carries, strongest-first, in the seat's voice. */
export function aimsOf(side: SidePlan, seat: Seat): Aim[] {
  const whose = seat === 'opponent' ? 'your' : 'their';
  const out: Aim[] = [];
  if (side.nearEnemyKing >= 2) {
    out.push({ id: 'king-attack', kind: 'king-attack', squares: [...side.kingAttackSquares], goal: null, phrase: `an attack on ${whose} king` });
  }
  if (side.shieldStripped > 0) {
    out.push({ id: 'shield', kind: 'shield', squares: [...side.kingAttackSquares], goal: null, phrase: `prising open the pawns in front of ${whose} king` });
  }
  for (const sq of side.outposts) {
    out.push({ id: `outpost:${sq}`, kind: 'outpost', squares: [sq], goal: sq, phrase: `the outpost on ${sq}` });
  }
  for (const f of side.opening) {
    const onFile = ['1', '2', '3', '4', '5', '6', '7', '8'].map((r) => `${f}${r}`);
    out.push({ id: `file:${f}`, kind: 'file', squares: onFile, goal: null, phrase: `the ${f}-file` });
  }
  for (const sq of side.passedPawns) {
    // Every square of the file: each push is a step, not only the square it
    // stood on when the plan was read (a first read counted d4 toward the king
    // attack because the passer's squares held only d5).
    const onFile = ['1', '2', '3', '4', '5', '6', '7', '8'].map((r) => `${sq[0]}${r}`);
    out.push({ id: `passer:${sq[0]}`, kind: 'passer', squares: onFile, goal: null, phrase: `a passed pawn on the ${sq[0]}-file` });
  }
  if (side.maneuver && side.maneuver.path.length >= 2) {
    const dest = side.maneuver.path[side.maneuver.path.length - 1];
    // `SidePlan.maneuver.piece` is a WORD ("knight"); the board speaks letters.
    // Keying on the word made every route arrival miss — the knight reached g3
    // and the arc called it "another step toward" g3 (first real game read).
    const word = side.maneuver.piece.toLowerCase();
    const piece = LETTER[word] ?? word;
    const name = PIECE[piece] ?? word;
    // Keyed by the PIECE: a knight heading for g3 that then heads on to h5 is
    // one journey, not a dropped plan and a new one (first real game read).
    out.push({ id: `route:${piece}`, kind: 'route', squares: side.maneuver.path.slice(1), goal: dest, phrase: `the ${name}'s walk from ${side.maneuver.path[0]} to ${dest}`, from: side.maneuver.path[0] });
  }
  return out;
}

interface ArcEntry {
  aim: Aim;
  /** Reads in a row this aim has been present. */
  streak: number;
  /** Reads in a row it has been missing (after being present). */
  missing: number;
  announced: boolean;
  /** The side's moves that have landed on this aim's squares. */
  steps: number;
}

export interface ArcState {
  entries: Readonly<Record<string, ArcEntry>>;
  /** Aims already achieved this game — never announced again. */
  done: readonly string[];
  /** Plans announced so far — rotates the emerge stems (a counter, never
   *  Math.random). Its own count: rotating on every event let two announcements
   *  in a row share an opener whenever an advance fell between them. */
  emerged: number;
}

export const EMPTY_ARC: ArcState = { entries: {}, done: [], emerged: 0 };

const EMERGE: Record<Seat, ReadonlyArray<(p: string) => string>> = {
  opponent: [
    (p) => `Their plan is taking shape: ${p}.`,
    (p) => `Here is what they are after: ${p}.`,
    (p) => `Watch where their moves are going — ${p}.`,
  ],
  student: [
    (p) => `Your plan is taking shape: ${p}.`,
    (p) => `Here is what you are building: ${p}.`,
    (p) => `Your moves are pointing at ${p}.`,
  ],
};

/** Which aim a single move counts toward when it touches several: the most
 *  specific one (a route or an outpost is a concrete square; "the king" is a
 *  region). One move, one step. */
const SPECIFICITY: Record<AimKind, number> = { route: 6, outpost: 5, passer: 4, file: 3, shield: 2, 'king-attack': 1 };

export interface ArcEvent {
  id: string;
  kind: 'emerge' | 'advance' | 'arrive' | 'drop';
  /** Whose plan — coupled at emission, never read back out of the prose. */
  seat: Seat;
  text: string;
  squares: string[];
}

/** The side's move this read follows, or null on the first read. */
export interface ArcMove {
  from: string;
  to: string;
  /** Piece letter, lowercase. */
  piece: string;
  /** The piece a pawn became, when the move promoted. */
  promotion?: string;
}

/** Can THIS move be a step toward the aim — not only land on its squares? */
function stepsToward(aim: Aim, moved: ArcMove): boolean {
  if (!aim.squares.includes(moved.to)) return false;
  // A route is ONE piece's journey: a bishop landing on d6 is not the rook's
  // walk to d6 (first real game read).
  // And it is the SAME piece: it moved off the route's start or a square on
  // it. A knight arriving from b1 is not "the knight's walk from f3" (manual
  // claim check 2026-09-30, items 162 and 236).
  if (aim.kind === 'route') {
    return moved.piece === aim.id.split(':')[1] && (moved.from === aim.from || aim.squares.includes(moved.from));
  }
  // A file is taken by its heavy pieces: a knight capture that happens to land
  // on c3 is not "a step toward the c-file" (items 171, 172).
  if (aim.kind === 'file') return moved.piece === 'r' || moved.piece === 'q';
  // A passer is pushed by its own pawn.
  if (aim.kind === 'passer') return moved.piece === 'p';
  // "An attack on your king" is brought by PIECES; pawns storming the king are
  // the shield aim. A pawn to d3 is not a step toward a mate on g2.
  if (aim.kind === 'king-attack') return moved.piece !== 'p';
  return true;
}


/** Is the aim done on this board? */
function arrived(aim: Aim, fen: string, color: 'w' | 'b', promoted: string | null = null): { done: boolean; what: string } {
  let board: Chess;
  try { board = new Chess(fen); } catch { return { done: false, what: '' }; }
  if ((aim.kind === 'outpost' || aim.kind === 'route') && aim.goal) {
    const p = board.get(aim.goal as Square);
    // A route arrives only when ITS piece gets there (a bishop landing on the
    // square a rook was heading for is not the rook's journey done).
    const routePiece = aim.kind === 'route' ? aim.id.split(':')[1] : null;
    if (p && p.color === color && p.type !== 'p' && (!routePiece || p.type === routePiece)) return { done: true, what: `${PIECE[p.type]} on ${aim.goal}` };
    return { done: false, what: '' };
  }
  if (aim.kind === 'passer') {
    return promoted ? { done: true, what: `queen on ${promoted}` } : { done: false, what: '' };
  }
  if (aim.kind === 'file') {
    for (const sq of aim.squares) {
      const p = board.get(sq as Square);
      if (p && p.color === color && (p.type === 'r' || p.type === 'q')) return { done: true, what: `${PIECE[p.type]} on the ${sq[0]}-file` };
    }
  }
  return { done: false, what: '' };
}

/**
 * Advance one side's arc by one read.
 *
 * `aimsNow` is the side's plan read at `fenAfter` (the board after the side's
 * own move, `moved`). `color` is that side's colour — whose pieces "arrive".
 */
export function stepArc(
  state: ArcState,
  aimsIn: readonly Aim[],
  moved: ArcMove | null,
  fenAfter: string,
  color: 'w' | 'b',
  seat: Seat,
): { next: ArcState; events: ArcEvent[] } {
  // AN ATTACK ON THE KING NEEDS THE QUEENS AND A MIDDLEGAME (review walk
  // 2026-09-27, Carlsen–Aronian: "their plan: an attack on your king" at move 7
  // and again in a rook endgame). Two pieces near a king is not a plan then.
  let kingPlanLive = true;
  try {
    const b = new Chess(fenAfter);
    const queens = b.board().flat().filter((c) => c?.type === 'q').length;
    kingPlanLive = queens >= 2 && b.moveNumber() > 10;
  } catch { kingPlanLive = false; }
  const liveAims = kingPlanLive ? aimsIn : aimsIn.filter((a) => a.kind !== 'king-attack' && a.kind !== 'shield');
  // A FILE IS A SIDE'S PLAN ONLY IF ITS OWN PAWN IS OFF IT (manual claim check
  // 2026-09-30: "their plan is taking shape: the c-file" with White's own pawn
  // on c2 — a file half-open for the OTHER side, or closed).
  let ownPawnFiles = new Set<string>();
  try {
    ownPawnFiles = new Set(new Chess(fenAfter).board().flat()
      .filter((c): c is NonNullable<typeof c> => !!c && c.type === 'p' && c.color === color)
      .map((c) => c.square[0]));
  } catch { /* unreadable board: keep the aims as read */ }
  const aimsNow = liveAims.filter((a) => a.kind !== 'file' || !ownPawnFiles.has(a.id.split(':')[1]));
  const their = seat === 'opponent';
  const events: ArcEvent[] = [];
  let emerged = state.emerged;
  const next: Record<string, ArcEntry> = {};
  const done = new Set(state.done);
  const nowIds = new Set(aimsNow.map((a) => a.id));
  // The one announced aim this move counts toward — the most specific it touches.
  const stepTarget = moved
    ? Object.values(state.entries)
      .filter((e) => e.announced && stepsToward(e.aim, moved))
      .sort((a, b) => SPECIFICITY[b.aim.kind] - SPECIFICITY[a.aim.kind])[0]?.aim.id ?? null
    : null;

  // What the move did to aims already in play — judged before this read's
  // aims replace them, so a knight that LANDS on its outpost counts as the
  // arrival of the plan it was following.
  for (const [id, e] of Object.entries(state.entries)) {
    let entry: ArcEntry = { ...e };
    const stepped = !!moved && id === stepTarget;
    if (stepped && e.announced) {
      entry = { ...entry, steps: entry.steps + 1 };
      const reached = arrived(e.aim, fenAfter, color, moved.promotion ? moved.to : null);
      if (reached.done) {
        const whose = their ? 'their' : 'your';
        events.push({
          id, kind: 'arrive', seat, squares: e.aim.goal ? [e.aim.goal] : [moved.to],
          // A promotion is said as the PAWN arriving: "your new queen" was
          // re-owned downstream into "your new your queen" (review sweep,
          // Capablanca–Marshall b8=Q+).
          text: e.aim.kind === 'passer'
            ? `There it is — ${whose} pawn has queened on ${moved.to}. That was the plan: ${e.aim.phrase}.`
            : `There it is — ${whose} ${reached.what}. That was the plan: ${e.aim.phrase}.`,
        });
        done.add(id);
        continue; // done — the aim leaves the arc for the rest of the game
      }
      events.push({
        id, kind: 'advance', seat, squares: [moved.to],
        // WHY THEY PLAYED IT, question first (David 2026-09-30): the move
        // they actually made, read as a step of the plan announced earlier.
        text: their
          ? `What is their ${PIECE[moved.piece] ?? 'piece'} on ${moved.to} doing? ${THINK_MARK} It's ${entry.steps === 1 ? 'a step' : 'another step'} toward ${e.aim.phrase}.`
          : `Your ${PIECE[moved.piece] ?? 'piece'} to ${moved.to} is ${entry.steps === 1 ? 'a step' : 'another step'} toward ${e.aim.phrase}.`,
      });
    }
    // Present now — or just advanced by the move (a step toward an aim is not
    // the moment it is given up).
    if (nowIds.has(id) || stepped) {
      next[id] = { ...entry, missing: 0 };
      continue;
    }
    const missing = entry.missing + 1;
    // A plan is "let go" only if it was PURSUED — at least one move made
    // toward it. An announced aim the engine's next reads simply stopped
    // showing was never the student's news (measured 2026-09-30: 18 of 23
    // announced opponent plans were "let go" within two moves, none walked).
    if (entry.announced && missing >= 2 && entry.steps === 0) continue;
    if (entry.announced && missing >= 2) {
      events.push({
        id, kind: 'drop', seat, squares: [],
        text: their ? `They have let ${e.aim.phrase} go.` : `You have let ${e.aim.phrase} go.`,
      });
      continue;
    }
    if (entry.announced || entry.streak > 0) next[id] = { ...entry, missing, streak: 0 };
  }

  for (const read of aimsNow) {
    if (done.has(read.id)) continue;
    const prev = next[read.id];
    // An aim the board ALREADY shows is not a plan taking shape — a rook
    // that has stood on c1 since move 14 is not "the c-file" emerging on
    // move 26 (first real game read). Mark it done, silently.
    if (!prev?.announced && arrived(read, fenAfter, color).done) {
      done.add(read.id);
      continue;
    }
    // An announced route keeps the goal it was announced with: the engine's
    // next read may point the same rook at a8 instead of c8, and a plan that
    // changes its name every move is not one plan (it said "walk to a8" then
    // "walk to c8" on consecutive moves).
    const aim = prev?.announced && prev.aim.kind === 'route' && prev.aim.goal !== read.goal ? prev.aim : read;
    // A ROUTE IS ONLY "THE SAME PLAN" IF IT GOES TO THE SAME PLACE (found
    // 2026-09-29, the first live walk with the lane open). The id is
    // `route:<piece>` so an ANNOUNCED route keeps its name while the piece
    // walks it — but before it is announced, that same id let two unrelated
    // knight routes on consecutive reads (one engine line wanting e5, the next
    // h2) count as one plan read twice, and "Their plan is taking shape: the
    // knight's walk to h2" was said off a single read. Until announced, a
    // route's streak continues only if the two routes SHARE a square on the way
    // (a rook's e1-c1-c5 growing into e1-c1-c5-c8 is one plan read twice;
    // f6-d7-e5 then f6-g4-h2 is two). Goal equality alone was too strict — the
    // engine's horizon moves the end square as the walk lengthens.
    const sameRoute = !(prev && !prev.announced && prev.aim.kind === 'route'
      && !prev.aim.squares.some((sq) => read.squares.includes(sq)));
    const streak = (sameRoute ? (prev?.streak ?? 0) : 0) + 1;
    const entry: ArcEntry = { aim, streak, missing: 0, announced: prev?.announced ?? false, steps: prev?.steps ?? 0 };
    if (!entry.announced && streak >= 2) {
      entry.announced = true;
      events.push({
        id: aim.id, kind: 'emerge', seat, squares: aim.squares.slice(0, 4),
        text: EMERGE[seat][emerged++ % EMERGE[seat].length](aim.phrase),
      });
    }
    next[aim.id] = entry;
  }

  // A plan LANDING is the story of this move — a plan given up on the same
  // move is noise beside it ("your pawn has queened … You have let an attack
  // on their king go", same sweep).
  const landed = events.some((e) => e.kind === 'arrive');
  const said = landed ? events.filter((e) => e.kind !== 'drop') : events;
  const live = Object.fromEntries(Object.entries(next).filter(([id]) => !done.has(id)));
  return { next: { entries: live, done: [...done], emerged }, events: said };
}


/**
 * Is this aim a plan the side can walk FROM THE BOARD AS IT IS — not only
 * inside the one engine line it was read from?
 *
 * Learn reads a side's plan off ONE engine line (a guess), and that line is
 * free to trade pieces off, open diagonals and change who controls a square
 * before the route makes sense. Said as "their plan" NOW, that was false three
 * times in four on the 2026-09-29 walk: a bishop's "walk to c3" through a
 * diagonal the queen blocks, a knight's "walk to g4" onto a square covered
 * twice. Review reads the moves actually PLAYED, so its routes are real by
 * construction and does not call this.
 *
 * A route passes when every hop is a legal move for that piece on the current
 * board, and the goal is not simply lost to it there (a cheaper attacker, or
 * more attackers than defenders). An outpost passes when the goal is not lost
 * to the side's own minor pieces there. Other aims pass: they are regions or
 * files, not a piece's journey.
 */
export function aimWalkableNow(aim: Aim, fen: string, color: 'w' | 'b'): boolean {
  if (aim.kind !== 'route' && aim.kind !== 'outpost' && aim.kind !== 'king-attack' && aim.kind !== 'shield') return true;
  let board: Chess;
  try { board = new Chess(fen); } catch { return false; }
  const foe: 'w' | 'b' = color === 'w' ? 'b' : 'w';
  if (aim.kind === 'king-attack' || aim.kind === 'shield') {
    // "An attack on your king" is a claim about the board NOW (walk 3,
    // 2026-09-29: said with no black piece bearing on g1 while the real threat
    // was …dxe3). It passes only if at least two of the side's pieces (not
    // pawns, not the king) already hit the enemy king's square or a square
    // next to it.
    const kingSq = board.board().flat().find((c) => c && c.type === 'k' && c.color === foe)?.square;
    if (!kingSq) return false;
    const f = kingSq.charCodeAt(0); const r = Number(kingSq[1]);
    const zone: Square[] = [];
    for (let df = -1; df <= 1; df += 1) for (let dr = -1; dr <= 1; dr += 1) {
      const nf = f + df; const nr = r + dr;
      if (nf >= 97 && nf <= 104 && nr >= 1 && nr <= 8) zone.push(`${String.fromCharCode(nf)}${nr}` as Square);
    }
    const hitters = new Set<string>();
    for (const sq of zone) for (const a of board.attackers(sq, color)) {
      const t = board.get(a)?.type;
      if (t && t !== 'p' && t !== 'k') hitters.add(a);
    }
    return hitters.size >= 2;
  }
  const goal = aim.goal as Square | null;
  if (!goal) return false;
  const lostThere = (pieceType: string): boolean => {
    const attackers = board.attackers(goal, foe);
    if (attackers.length === 0) return false;
    const cheapest = Math.min(...attackers.map((sq) => CAPTURE_VALUE[board.get(sq)?.type ?? 'k'] ?? 100));
    if (cheapest < (CAPTURE_VALUE[pieceType] ?? 0)) return true;
    return attackers.length > board.attackers(goal, color).length;
  };
  if (aim.kind === 'outpost') {
    // An outpost is a square ONE OF THE SIDE'S PAWNS protects and NO enemy pawn
    // can ever attack (walk 4, 2026-09-29: "the outpost on d5" said with no
    // black pawn touching d5). Both, on the board as it is.
    const f = goal.charCodeAt(0); const r = Number(goal[1]);
    const up = color === 'w' ? 1 : -1;
    const ownPawnGuards = [f - 1, f + 1].some((pf) => {
      if (pf < 97 || pf > 104) return false;
      const p = board.get(`${String.fromCharCode(pf)}${r - up}` as Square);
      return !!p && p.type === 'p' && p.color === color;
    });
    if (!ownPawnGuards) return false;
    // An enemy pawn on a neighbouring file that can still advance to hit the
    // square: it sits on the far side of the goal (from the enemy's view).
    const enemyCanHit = [f - 1, f + 1].some((pf) => {
      if (pf < 97 || pf > 104) return false;
      for (let rr = 1; rr <= 8; rr += 1) {
        const p = board.get(`${String.fromCharCode(pf)}${rr}` as Square);
        if (!p || p.type !== 'p' || p.color !== foe) continue;
        // White pawns attack upward, black downward; the pawn must be able to
        // reach the rank that attacks the goal (goal rank - 1 for white foe).
        if (foe === 'w' ? rr <= r - 1 : rr >= r + 1) return true;
      }
      return false;
    });
    return !enemyCanHit && !lostThere('n');
  }
  const piece = aim.id.split(':')[1];
  const start = aim.from as Square | undefined;
  if (!start || !piece) return false;
  const at = board.get(start);
  if (!at || at.color !== color || at.type !== piece) return false;
  // Walk the hops on the CURRENT board: the piece alone moves, everything
  // else stays where it stands now.
  let here: Square = start;
  for (const next of aim.squares as Square[]) {
    const probe = new Chess(fen);
    probe.remove(start);
    if (here !== start) probe.remove(here);
    probe.put({ type: piece as 'n' | 'b' | 'r' | 'q' | 'k', color }, here);
    const parts = probe.fen().split(' ');
    parts[1] = color; parts[3] = '-';
    let legal = false;
    try {
      const turn = new Chess(parts.join(' '), { skipValidation: true });
      legal = turn.moves({ square: here, verbose: true }).some((m) => m.to === next);
    } catch { legal = false; }
    if (!legal) return false;
    here = next;
  }
  return !lostThere(piece);
}
