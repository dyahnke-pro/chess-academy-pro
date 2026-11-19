// positionalRead — something true to say when nothing is happening.
//
// David 2026-08-08, after seeing the ply-by-ply transcript: "There needs to be
// positional notes then or something at the silent plies."
//
// Measured over the 656 student plies of the repertoire we teach, all lanes
// together speak on 54.3%. The corpus reaches ~14% (only 6,768 of 58,124 notes
// carry a position at all), the tactic and threat detectors reach the sharp
// moments, and `buildPlayCommentary` covers the rest of what is CONCRETE. What
// is left is the quiet middle: legal, balanced, nothing hanging, no alignment —
// and a coach that says nothing there feels absent for half the game.
//
// A quiet position is not an empty one. It has a king that has or has not
// castled, a development count, a weak pawn, an outpost, a lever available. All
// of that is already computed, board-true, in `positionReadingService` — and
// was reachable only through a model prompt block (deleted 2026-10-30) that
// could never be spoken. So the facts existed and the voice could not use them.
//
// This turns the same computation into ONE spoken sentence. Ranked, so the
// student hears the most useful observation rather than the first one found,
// and hard-capped at one: filling silence with a paragraph is how a coach gets
// muted.
//
// It is the LOWEST-priority lane by design. It should never displace a tactic,
// a threat, a gem or a taught note — it is what plays when none of them have
// anything, which per the measurement is about half the game.
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { sideToMoveAs } from './threatOut';
import { openSentence } from '../utils/openSentence';
import { pieceRef } from './pieceRef';
import { describeStructure } from './boardStructure';
import { homeMinorCount } from './development';
import { isolaniStructure, passerTrumpSentence } from './nextPlans';
import { Chess, type Color, type Square } from 'chess.js';
import { strandedAt } from './trappedPiece';
import { countWord, andList } from '../utils/andList';
import {
  kingSafetyRead,
  developmentRead,
  findWeakPawns,
  findPieceQuality,
  goodPieceClause,
  findPawnBreaks,
  breakContacts,
  rimKnightHeading,
  findColorComplexWeakness,
  findMinorityAttack,
  findPassedPawns,
  findOpenFiles,
  canBeAimedAt,
  bishopBlockingPawns,
  goodPieceIdeaKey,
  type PieceQualityKind,
} from './positionReadingService';

/** What makes a bad piece bad, said after its name in players' words ("Their
 *  bishop is their problem piece, hemmed in behind its own pawns") — never the
 *  note's label with its reason in brackets read aloud. */
function badPieceWords(note: { kind: PieceQualityKind; reason: string; square: string }): string {
  if (note.kind === 'bad-bishop') return 'hemmed in behind its own pawns';
  // The rim, said as the squares it reaches (Danya's article boards,
  // 2026-11-18): "stuck" was false where the engine's best move IS that
  // knight's way out (Nhf5) — a knight on the rim is short of squares, not
  // trapped, and the count is true on every board.
  if (note.kind === 'rim-knight') return `out on the rim, where it reaches only ${knightReach(note.square)} squares`;
  return note.reason;
}

/** What a good piece DOES from its square, said from the owner's seat, or null
 *  when the board names no job: an outpost no pawn can kick; a rook on a file
 *  pressing the first enemy piece in front of it, or with a clear road into
 *  their camp; a rook on the seventh hitting pawns there or penning the king.
 *  Board geometry and chess.js. */
function goodPieceWork(fen: string, q: { square: string; piece: string; kind: PieceQualityKind; color: Color }, own: boolean): { text: string; squares: string[] } | null {
  const board = chessOf(fen);
  if (!board) return null;
  const foe = own ? 'their' : 'your';
  const enemy: Color = q.color === 'w' ? 'b' : 'w';
  if (q.kind === 'outpost') return { text: goodPieceClause(q.kind, q.square), squares: [] };
  if (q.kind === 'open-file' || q.kind === 'semi-open-file') {
    const step = q.color === 'w' ? 1 : -1;
    const f = q.square[0];
    for (let r = Number(q.square[1]) + step; r >= 1 && r <= 8; r += step) {
      const sq = `${f}${r}` as Square;
      const occ = board.get(sq);
      if (!occ) continue;
      if (occ.color === q.color) return null;
      const loose = board.attackers(sq, enemy).length === 0;
      return { text: `it presses down the ${f}-file on ${foe} ${NAME[occ.type] ?? 'piece'} on ${sq}${loose ? ', and nothing guards it' : ''}`, squares: [sq] };
    }
    const entry = `${f}${q.color === 'w' ? 7 : 2}` as Square;
    if (board.attackers(entry, enemy).length > 0) return null;
    return { text: `the ${f}-file is clear all the way to ${entry}, its road into ${foe} camp`, squares: [entry] };
  }
  if (q.kind === 'seventh-rank') {
    const rank7 = q.color === 'w' ? '7' : '2';
    const back = q.color === 'w' ? '8' : '1';
    const pawns = board.board().flat().flatMap((c) => (c && c.color === enemy && c.type === 'p' && c.square[1] === rank7 ? [c.square as string] : []));
    if (pawns.length > 0) {
      return { text: `on the seventh it attacks ${foe} pawn${pawns.length > 1 ? 's' : ''} on ${pawns.length > 2 ? `the ${rank7 === '7' ? 'seventh' : 'second'} rank` : andList(pawns)}`, squares: pawns };
    }
    const king = board.board().flat().find((c) => c && c.color === enemy && c.type === 'k')?.square;
    if (king && king[1] === back) return { text: `on the seventh it keeps ${foe} king shut in on the back rank`, squares: [king] };
    return null;
  }
  return null;
}

/** Squares a knight on `square` reaches on an empty board — the rim's cost. */
function knightReach(square: string): number {
  const f = square.charCodeAt(0) - 97;
  const r = Number(square[1]) - 1;
  let n = 0;
  for (const [df, dr] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) {
    const ff = f + df; const rr = r + dr;
    if (ff >= 0 && ff < 8 && rr >= 0 && rr < 8) n += 1;
  }
  return n;
}

/** A board, or null when the FEN does not parse. */
function chessOf(fen: string): Chess | null {
  try { return new Chess(fen); } catch { return null; }
}

const NAME: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/**
 * ONE OBSERVATION about the position, on either side of the board.
 *
 * David 2026-08-09: "We will need to know the plans for both sides. That is the
 * most important part of teaching chess." This read was built one-sided — eight
 * of its nine rungs described the student and nothing else — so a coach using
 * it could describe half a chess position. Every rung now runs for both
 * colours, and each observation carries whose it is.
 */
type ObservationKind =
  | 'plan' | 'king' | 'development' | 'piece' | 'structure' | 'lever'
  // WIDENED BOARD AWARENESS (David 2026-09-13: "increased scope … our strongest
  // narration tool"). Each is a concrete, board-provable feature, ranked by how
  // much it should lead a quiet-position read.
  | 'minority' | 'passer' | 'complex' | 'file'
  // THEIR BISHOP PAIR (Danya's article boards 2026-11-18: "White's two
  // bishops are the long-term danger", "White has the two bishops" — five
  // boards where the pair was the opponent's and the read never said it).
  | 'pair';

interface PositionalObservation {
  /** Dedupe key for the caller's said-set — keyed on the IDEA, never on a
   *  square a piece is standing on (fresh-game walk 2026-09-27: "your rook on
   *  g8 / g7 / g6 has the half-open g-file" four times as the rook slid down
   *  the file, and "their passed pawn on h2 / h4 / h5 is the danger" three
   *  times as it ran — every step was a new square, so a new key). */
  key: string;
  /** Other claims this one also makes — a rook that owns the d-file and "the
   *  d-file is open" are one claim. Skipped when any is said; all are
   *  remembered when it speaks. */
  aliases?: readonly string[];
  /** Whose feature this is. */
  side: 'student' | 'opponent';
  kind: ObservationKind;
  /** Higher speaks first. The caller decides how far down the list to read. */
  rank: number;
  /** Speakable as-is. Names squares, never a move. */
  text: string;
  /** The same observation for a surface that holds the student's next move
   *  (Learn): the idea, not the move it points at (David 2026-11-05: "Yes it
   *  can point without saying the move"). Absent when `text` names no move. */
  heldText?: string;
  /** THE KEY SQUARES THIS OBSERVATION NAMES (David 2026-09-13: "add highlights
   *  to all spoken key squares"). Handed over with the fact so the board marks
   *  what the voice named — computed here, never scraped from the prose (the
   *  coupling rule). Empty when the read names only files/counts, not squares. */
  squares?: readonly string[];
}

/** Urgency by kind. A plan outranks the facts it is built from — that is the
 *  whole reason to build it. */
const RANK: Record<ObservationKind, number> = {
  plan: 100, king: 90, development: 70,
  // A concrete plan with a legal lever outranks a static piece read; a passer
  // and a colour-complex weakness are notable assets/targets; a fully-open file
  // is the lowest of the new rungs (a where-rooks-belong pointer).
  minority: 65, piece: 60, passer: 58, complex: 55, pair: 52, structure: 50, file: 45, lever: 40,
};

/** The same fact about the opponent is worth slightly less than about the
 *  student, so ties break toward the board the student is responsible for. */
const OPPONENT_PENALTY = 5;

/** A position with `color` to move — the reading helpers that only look at the
 *  side to move (pawn breaks) need this to answer for the other side. En
 *  passant is cleared because it belongs to the real move order. */
function withTurn(fen: string, color: Color): string | null {
  // The one null-move rule (threatOut.sideToMoveAs, census 2026-10-10).
  return sideToMoveAs(fen, color);
}

/** A rook of `color` can step onto `file` in one move along its own rank —
 *  the empty squares between, and a landing square that is empty or enemy. A
 *  rook already standing on the file counts as there. ONE predicate for every
 *  "your rook belongs on that file" claim. */
export function rookReachesFile(fen: string, color: Color, file: string): boolean {
  let b: Chess;
  try { b = new Chess(fen); } catch { return false; }
  for (const c of b.board().flat()) {
    if (!c || c.color !== color || c.type !== 'r') continue;
    if (c.square[0] === file) return true;
    const rank = c.square[1];
    const from = c.square.charCodeAt(0);
    const to = file.charCodeAt(0);
    const step = to > from ? 1 : -1;
    let clear = true;
    for (let f = from + step; f !== to; f += step) {
      if (b.get(`${String.fromCharCode(f)}${rank}` as Square)) { clear = false; break; }
    }
    const target = b.get(`${file}${rank}` as Square);
    if (clear && (!target || target.color !== color)) return true;
  }
  return false;
}

/** The castling right is held and every square between king and rook is empty. */
export function castleIsOneMoveAway(fen: string, color: Color): boolean {
  let b: Chess;
  try { b = new Chess(fen); } catch { return false; }
  const rights = fen.split(' ')[2] ?? '-';
  const r = color === 'w' ? '1' : '8';
  const clear = (files: readonly string[]): boolean => files.every((f) => !b.get(`${f}${r}` as Square));
  const kingSide = rights.includes(color === 'w' ? 'K' : 'k') && clear(['f', 'g']);
  const queenSide = rights.includes(color === 'w' ? 'Q' : 'q') && clear(['b', 'c', 'd']);
  if (!kingSide && !queenSide) return false;
  // …AND LEGAL: not in check, not through or onto an attacked square (claim
  // check 2026-09-27: "castling is one move away" twice where the king could
  // not castle — the squares were empty but attacked). Read with the colour
  // to move, so the answer is about THEIR next move whoever is on move now.
  try {
    const parts = fen.split(' ');
    parts[1] = color;
    parts[3] = '-';
    const probe = new Chess(parts.join(' '));
    return probe.moves({ verbose: true }).some((m) => m.isKingsideCastle() || m.isQueensideCastle());
  } catch {
    return false;
  }
}

/** `color`'s bishop pair on `fen`: two bishops on opposite-coloured squares
 *  against at most one, the other side still holding a minor. The rival is
 *  what the other side has against them, in words. Null otherwise. */
export function theirBishopPair(fen: string, color: Color): { bishops: Square[]; rival: string } | null {
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  const other: Color = color === 'w' ? 'b' : 'w';
  const mine = b.findPiece({ type: 'b', color });
  if (mine.length !== 2 || b.squareColor(mine[0]) === b.squareColor(mine[1])) return null;
  const theirB = b.findPiece({ type: 'b', color: other }).length;
  const theirN = b.findPiece({ type: 'n', color: other }).length;
  if (theirB > 1 || theirB + theirN === 0) return null;
  const rival = theirB === 1
    ? (theirN > 0 ? `knight${theirN > 1 ? 's' : ''} and bishop` : 'lone bishop')
    : `knight${theirN > 1 ? 's' : ''}`;
  return { bishops: mine, rival: theirB === 0 && theirN === 2 ? 'two knights' : rival };
}

/** Every observation for one side. */
function observationsFor(
  fen: string,
  color: Color,
  side: 'student' | 'opponent',
): PositionalObservation[] {
  const out: PositionalObservation[] = [];
  const rank = (k: ObservationKind): number => RANK[k] - (side === 'opponent' ? OPPONENT_PENALTY : 0);
  const own = side === 'student';
  const your = own ? 'Your' : 'Their';

  // QUEENS OFF, THE KING IS A FIGHTING PIECE. A centralised king in an
  // endgame is right, not a weakness, and "lines open toward your king" is the
  // middlegame worry (hand walk 2340, moves 32-34: both read with the queens
  // traded). No queen on the board → the king reads stay quiet.
  const queensOn = /[qQ]/.test(fen.split(' ')[0] ?? '');
  const king = queensOn ? kingSafetyRead(fen, color) : null;
  // "Get castled" is advice only when castling is ONE move away: the right is
  // still held and the squares between king and rook are empty. At move three
  // (1.e4 e5 2.Nf3 d6 3.d4) the f1-bishop still blocks it, so the line told the
  // student to castle when they could not — and faulted the book move d4 for it
  // (hand walk 2026-09-24). The student's version waits for that; the opponent's
  // version is a different claim (lines toward their king) and keeps its gate.
  const fullMove = Number(fen.split(' ')[5] ?? '1') || 1;
  // Theirs is a weakness only once they CANNOT castle next move and the
  // opening is over — at move five with …O-O one move away it is noise.
  const centreCounts = own
    ? castleIsOneMoveAway(fen, color)
    : !castleIsOneMoveAway(fen, color) && fullMove >= 8;
  // THEIR KING STUCK IN THE CENTRE (Danya, the knockout blow #2: "Black's
  // king is stranded in the centre" — on d7, both castling rights gone, queens
  // on): one step off the home rank is still the centre once it can no longer
  // castle.
  const rights = fen.split(' ')[2] ?? '-';
  const canCastle = color === 'w' ? /[KQ]/.test(rights) : /[kq]/.test(rights);
  if (!own && king && !canCastle && 'de'.includes(king.square[0]) && king.square[1] === (color === 'w' ? '2' : '7') && fullMove >= 8) {
    out.push({
      key: `${side}-king-centre`, side, kind: 'king', rank: rank('king'),
      squares: [king.square],
      text: `Their king on ${king.square} is stuck in the centre — it can no longer castle, so every line that opens toward it is worth looking at.`,
    });
  }
  if (king?.inCenter && !king.castled && centreCounts) {
    out.push({
      key: `${side}-king-centre`, side, kind: 'king', rank: rank('king'),
      squares: [king.square],
      text: own
        ? 'Your king is still in the centre and castling is one move away — tuck it in before the centre opens.'
        : 'Their king is still in the centre — every line that opens toward it is worth looking at.',
      ...(own ? { heldText: 'Your king is still in the centre — get it to safety before the centre opens, because a king in the middle is caught the moment lines open.' } : {}),
    });
  }
  // An open file next to a king is only "the road an attack comes down" if the
  // other side owns something that travels down files. Without this the read
  // fires on a bare king-and-pawn ending — every file is open there, and the
  // attack it warns about cannot exist. A precondition the caller can name is
  // the difference between a fact and a scary-sounding one.
  const heavyAttackers = (() => {
    try {
      const b = new Chess(fen);
      const foe: Color = color === 'w' ? 'b' : 'w';
      return b.board().flat().filter((c) => c && c.color === foe && (c.type === 'r' || c.type === 'q')).length;
    } catch { return 0; }
  })();
  const foeColor: Color = color === 'w' ? 'b' : 'w';
  const roads = (king?.openFilesNearKing ?? []).filter((f) => attackerCanUseFile(fen, f, foeColor));
  if (king?.exposed && roads.length > 0 && heavyAttackers > 0) {
    const files = roads.slice(0, 2).join(' and ');
    const plural = roads.length > 1 ? 's are' : ' is';
    // AND WHAT TO DO ABOUT IT — never the road alone (David 2026-09-30:
    // "describing the board is what we do not want"). Your king: step it off
    // the road, or put your own rook on it. Their king: put yours on it.
    const road = roads[0];
    const castle = own ? castleOffFile(fen, color) : null;
    const onto = heavyPieceToFile(fen, own ? color : foeColor, road);
    const todo = castle
      ? ` Castle and the king steps off it.`
      : onto
        // The IDEA, never the move: a board read speaks every ply, and naming
        // the move there hands it over (narrationAdversarial). The move is the
        // student's to find.
        ? own
          ? ` Contest it — get your ${onto.piece} onto the ${road}-file first.`
          : ` Take it — get your ${onto.piece} onto the ${road}-file.`
        : '';
    out.push({
      key: `${side}-king-open-file`, side, kind: 'king', rank: rank('king'),
      text: own
        ? `The ${files} file${plural} open toward your king — that is the road an attack would come down.${todo}`
        : `The ${files} file${plural} open toward their king — that is the road an attack would come down.${todo}`,
    });
  }

  const mine = developmentRead(fen, color);
  const other = developmentRead(fen, color === 'w' ? 'b' : 'w');
  // Development is an opening/middlegame read: with the queens off, a knight
  // "at home" is an endgame piece, not a lag (hand walk 2026-09-25, move 36).
  if (queensOn && mine && other && mine.totalMinors > 0) {
    const asleep = mine.totalMinors - mine.developedMinors;
    // One tempo is not a lead in the first moves — White moves first, and
    // "they are ahead in development" after 1.e4 c6 2.Nf3 d5 3.e5 is a nag
    // about one knight (hand walk 1600). Two pieces, or one past move five.
    // Measured as pieces still AT HOME, the work left — not pieces out, which
    // read a side that had lost a minor as "behind" with 2 at home each
    // (claim check 2026-09-28).
    const lead = asleep - (other.totalMinors - other.developedMinors);
    const moveNo = Number(fen.split(' ')[5] ?? '1') || 1;
    if (asleep >= 2 && (lead >= 2 || (lead >= 1 && moveNo >= 6))) {
      out.push({
        key: `${side}-development`, side, kind: 'development', rank: rank('development'),
        text: own
          ? `You still have ${asleep} minor pieces at home and they are ahead in development — the next move probably belongs to a piece, not a pawn.`
          // SEATED AND WHAT TO DO (walk 2026-09-30: "a lead in development is
          // only worth something while it lasts" never said whose lead, or how
          // to use it). The lead is the student's; its use is opening the game.
          : `You're ahead in development — they still have ${asleep} minor pieces at home, so open the position before they catch up.`,
      });
    }
  }

  const quality = findPieceQuality(fen);
  // A GOOD PIECE IS SAID WITH ITS WORK (Danya have-check 2026-11-19: "your rook
  // on d2 is your best-placed piece — it has the half-open d-file" on 70
  // boards, the file named and nothing it does there). The first good piece
  // whose job the board can name speaks; one with no job is not praised.
  const goods = quality.filter((q) => q.color === color && q.quality === 'good');
  const outpost = goods.map((q) => ({ q, work: goodPieceWork(fen, q, own) })).find((g) => g.work !== null) ?? null;
  if (outpost && outpost.work) {
    const q = outpost.q;
    out.push({
      key: goodPieceIdeaKey(side, q.piece, q.kind, q.square), side, kind: 'piece', rank: rank('piece'),
      aliases: q.kind === 'open-file' || q.kind === 'semi-open-file' ? [`file-${q.square[0]}`] : [],
      squares: [q.square, ...outpost.work.squares],
      text: own
        ? `Your ${NAME[q.piece] ?? 'piece'} on ${q.square} is your best-placed piece — ${outpost.work.text}.`
        // Not "their best-placed piece": the engine's piece read owns THEIR best
        // ("the piece doing the most work for them"), and two computers crowning
        // two different pieces on one move contradicted each other (hand walk
        // 2340: rook d8 "best-placed", then knight c6 "most work"). This names
        // the fact about the piece, which is true whichever wins that ranking.
        : `Their ${NAME[q.piece] ?? 'piece'} on ${q.square} is well placed — ${outpost.work.text}.`,
    });
  }
  // STRANDED (Danya, the positional rook lift #2: "White's bishop on h6 is
  // stranded — every move loses it"): a minor deep in the other camp with
  // squares to go to, every one of them covered. Not lost yet; one attack
  // from it. The squares it could go to are what the words name.
  for (const cell of chessOf(fen)?.board().flat() ?? []) {
    if (!cell || cell.color !== color || (cell.type !== 'n' && cell.type !== 'b')) continue;
    const st = strandedAt(fen, cell.square);
    if (!st) continue;
    // Two squares are named; three or more are "every square it can go to",
    // lit on the board (a list of squares read out is the robot, David
    // 2026-11-05).
    const where = st.squares.length > 2 ? 'every square it can go to is covered'
      : st.squares.length === 2 ? `${andList(st.squares)} are both covered` : `${st.squares[0]} is covered`;
    out.push({
      key: `${side}-stranded-${cell.type}`, side, kind: 'piece', rank: rank('piece'),
      squares: [cell.square, ...st.squares],
      text: own
        ? `Your ${NAME[cell.type]} on ${cell.square} is stranded: ${where}, so it has no safe square — if it is attacked it has nowhere to go.`
        : `Their ${NAME[cell.type]} on ${cell.square} is stranded: ${where}, so it has no safe square — attack it and it has nowhere to go.`,
    });
  }
  // Same rule as the join: a piece still on its starting square is not a
  // problem piece, it is a piece that has not been developed yet.
  const startRank = color === 'w' ? '1' : '8';
  // Their rim knight one jump from a hole is on its way there, not a piece to
  // keep bad (Danya, weak squares who cares #0: the h4 knight heading for
  // f5). The student's own such knight stays: the road is its plan.
  const heading = (q: { kind: PieceQualityKind; square: string }): boolean => {
    const b = chessOf(fen);
    return !own && q.kind === 'rim-knight' && !!b && rimKnightHeading(b, q.square as Square, color);
  };
  const bad = quality.find((q) => q.color === color && q.quality === 'bad' && q.square[1] !== startRank && !heading(q));
  if (bad) {
    out.push({
      key: `${side}-bad-${bad.square}`, side, kind: 'piece', rank: rank('piece'),
      squares: [bad.square],
      text: own
        // ONE sentence each: the say-once dedupe works per sentence, and a
        // tail left standing alone ("Keeping it bad is worth as much as
        // winning a pawn.", hand walk 2026-09-25) names nothing.
        ? `Your ${NAME[bad.piece] ?? 'piece'} on ${bad.square} is your problem piece, ${badPieceWords(bad)}, so improving it is a plan in itself.`
        : `Their ${NAME[bad.piece] ?? 'piece'} on ${bad.square} is their problem piece, ${badPieceWords(bad)}, and keeping it bad is worth as much as winning a pawn.`,
    });
  }

  // THE BISHOP PAIR, THEIRS. The student's own pair is a plan (`nextPlans`
  // "make your bishop pair count"); theirs is the long-term danger the student
  // must play against. Two bishops on opposite colours against at most one,
  // with a minor of the student's still on the board (the pair is a minor
  // imbalance: two bishops against a knight and a bishop, or two knights).
  if (!own) {
    const pair = theirBishopPair(fen, color);
    if (pair) {
      out.push({
        key: `${side}-bishop-pair`, side, kind: 'pair', rank: rank('pair'),
        squares: pair.bishops,
        text: rotateStem([
          `They have the bishop pair against your ${pair.rival} — two bishops grow stronger as the board opens, so keep it closed or trade one of them off.`,
          `Their two bishops are the long-term danger against your ${pair.rival}: every pawn that comes off opens a diagonal for them, so keep the position closed or trade a bishop.`,
        ], stemKeyOf(`${fen.split(' ')[0]}|pair`)),
      });
    }
  }

  const weak = findWeakPawns(fen, color);
  // An isolated d-pawn IS the isolani — the structure lane names it with its
  // plan ("you hold the isolated queen's pawn…"), so this read stays off it
  // (hand walk 2340: both said it on one move).
  const isolani = !!isolaniStructure(fen, color);
  if (isolani) weak.isolated = weak.isolated.filter((sq) => sq[0] !== 'd');
  // A passed pawn is a runner, not a long-term target — the passer read owns it.
  // (An ADVANCED one — four squares or fewer to queen; a passer still at home
  // can be a target like any isolated pawn.)
  const toGo = (sq: Square): number => (color === 'w' ? 8 - Number(sq[1]) : Number(sq[1]) - 1);
  weak.isolated = weak.isolated.filter((sq) => !(findPassedPawns(fen, color).includes(sq) && toGo(sq) <= 4));
  // A WEAKNESS IS A TARGET ONLY WHEN THE OTHER SIDE CAN GET AT IT (Danya
  // article boards 2026-11-18: "isolated — a long-term target" for a rim pawn
  // nothing could reach, on board after board). A piece of theirs attacks it
  // now or one quiet move away.
  const enemyOf: Color = color === 'w' ? 'b' : 'w';
  weak.isolated = weak.isolated.filter((sq) => canBeAimedAt(fen, sq, enemyOf));
  // EVERY WEAK PAWN, NEVER THE FIRST (G4.5; Danya's article board, the
  // positional rook lift #1: White's doubled g-pawns in front of the king were
  // the point, and the read named only the doubled b-pawns, the first file it
  // met). One sentence a kind, every pawn of it named; the key is the first
  // file's (the other lanes' say-once key), the rest ride as aliases.
  if (weak.isolated.length > 0) {
    const iso = weak.isolated;
    const n = iso.length;
    // One or two are named; three or more are counted and lit (a list of
    // squares read out is the robot, David 2026-11-05).
    const who = n > 2 ? `${countWord(n)} isolated pawns` : `pawn${n > 1 ? 's' : ''} on ${andList(iso)}`;
    out.push({
      key: `${side}-iso-${iso[0][0]}`, side, kind: 'structure', rank: rank('structure'),
      aliases: iso.slice(1).map((sq) => `${side}-iso-${sq[0]}`),
      squares: [...iso],
      text: own
        ? (n > 2 ? `You have ${who} — no friendly pawn can ever defend them, so pieces have to.` : `Your ${who} ${n > 1 ? 'are' : 'is'} isolated — no friendly pawn can ever defend ${n > 1 ? 'them' : 'it'}, so a piece has to.`)
        : (n > 2 ? `They have ${who} — long-term targets worth playing against.` : `Their ${who} ${n > 1 ? 'are' : 'is'} isolated — ${n > 1 ? 'those are long-term targets' : 'that is a long-term target'} worth playing against.`),
    });
  }
  // DOUBLED PAWNS ARE A TARGET ONLY WHEN ONE IS LOOSE AND CAN BE REACHED
  // (Danya, how to ruin your pawn structure #1: Black's doubled f-pawns "are
  // defended by the e7 bishop and do not matter" — the read called them
  // targets on the bare fact that they were doubled). The doubling is the
  // cause; the consequence is a pawn nothing guards that the other side can
  // aim at. A guarded or unreachable pair says nothing.
  const doubledFiles = [...new Set(weak.doubled.map((sq) => sq[0]))].sort();
  // The weakest of the doubled pawns: one no pawn guards that the other side
  // can aim at — nothing guarding it at all, or (own side) only a piece, which
  // that piece is then tied to.
  const doubledRead = (() => {
    const board = chessOf(fen);
    if (!board) return null;
    let tied: { sq: Square; guard: Square } | null = null;
    for (const sq of weak.doubled) {
      const guards = board.attackers(sq, color);
      if (guards.some((g) => board.get(g)?.type === 'p')) continue;
      if (!canBeAimedAt(fen, sq, enemyOf)) continue;
      if (guards.length === 0) return { loose: sq, tied: null };
      if (!tied && guards.length === 1) tied = { sq, guard: guards[0] };
    }
    return tied ? { loose: null, tied } : null;
  })();
  if (doubledFiles.length > 0 && doubledRead && (doubledRead.loose || own)) {
    const sq = doubledRead.loose ?? doubledRead.tied?.sq ?? weak.doubled[0];
    const guard = doubledRead.tied?.guard ?? null;
    const guardName = guard ? NAME[chessOf(fen)?.get(guard)?.type ?? ''] ?? 'piece' : '';
    out.push({
      key: `${side}-doubled-${doubledFiles[0]}`, side, kind: 'structure', rank: rank('structure'),
      aliases: doubledFiles.slice(1).map((f) => `${side}-doubled-${f}`),
      squares: guard ? [sq, guard] : [sq],
      text: doubledRead.loose
        ? (own
          ? `Your pawns on the ${sq[0]}-file are doubled, and nothing guards the one on ${sq} — they can aim a piece at it, so give it a guard.`
          : `Their pawns on the ${sq[0]}-file are doubled, and nothing guards the one on ${sq} — aim a piece at it.`)
        : `Your pawns on the ${sq[0]}-file are doubled, so no pawn can guard the one on ${sq}. Only your ${guardName} on ${guard} does, and it is tied to it.`,
    });
  }

  const turned = withTurn(fen, color);
  // NO LEVER TALK BEFORE THE PIECES ARE OUT (hand walk 2026-09-27: "you have
  // a pawn break on f5" after 1.e4 c5 2.Nf3 d6). With three or more of that
  // side's minors still at home, development decides the game and the
  // principle lane owns the teaching; a French at move 8 (…f6, …c4) keeps its
  // levers because by then the break IS the plan.
  let undeveloped = 0;
  try { undeveloped = homeMinorCount(new Chess(fen), color); } catch { undeveloped = 0; }
  const breaks = turned && undeveloped < 3 ? findPawnBreaks(turned) : [];
  // THE BREAK SAYS WHAT IT HITS (Danya have-check 2026-11-19: "you have a
  // pawn break on f4 — the pawn levers are where the play comes from" named a
  // square and no consequence, on 54 boards). The pawn it challenges is the
  // point of the break; a break with no pawn to name is not said.
  const hit = breaks.length > 0 && turned ? breakContacts(turned, breaks[0], color)[0] ?? null : null;
  if (breaks.length > 0 && hit) {
    out.push({
      key: `${side}-break-${breaks[0]}`, side, kind: 'lever', rank: rank('lever'),
      squares: [breaks[0], hit],
      text: own
        ? `The push to ${breaks[0]} is your pawn break: it challenges their pawn on ${hit}.`
        : `Their pawn break is the push to ${breaks[0]}: it challenges your pawn on ${hit}.`,
    });
  }

  // ── WIDENED BOARD AWARENESS (David 2026-09-13) — each fires only when the
  //    feature is genuinely on the board (selective at source, so the read never
  //    pads), and each runs for BOTH sides via the caller. ──────────────────────

  // MINORITY ATTACK — fewer pawns on a flank with a LEGAL lever onto an enemy
  // pawn. A concrete plan, so it leads the new rungs.
  const minority = findMinorityAttack(fen, color);
  if (minority) {
    out.push({
      key: `${side}-minority-${minority.flank}`, side, kind: 'minority', rank: rank('minority'),
      squares: [minority.leverTo, minority.target],
      text: own
        ? `You have a minority attack on the ${minority.flank} — ${minority.leverSan} makes contact and leaves them a weak pawn on ${minority.target}.`
        : `They have a minority attack on the ${minority.flank} — ${minority.leverSan} is the lever, and it would leave you a weak pawn on ${minority.target}.`,
    });
  }

  // PASSED PAWN — no enemy pawn ahead on its own or an adjacent file.
  // The most advanced passer first: it is the one the board is about.
  const passers = findPassedPawns(fen, color)
    .sort((a, b) => (color === 'w' ? Number(b[1]) - Number(a[1]) : Number(a[1]) - Number(b[1])));
  // The sentence is the structure plan's own (nextPlans), so the two lanes
  // that read this passer say one claim in one wording (hand walk 1200). Null
  // for their passer in a race: the student's passer says the race once.
  const passerText = passers.length > 0 ? passerTrumpSentence(fen, passers[0], own) : null;
  if (passerText) {
    out.push({
      key: `${side}-passer-${passers[0][0]}`, side, kind: 'passer', rank: rank('passer'),
      squares: [passers[0]],
      text: passerText,
    });
  }

  // COLOUR COMPLEX — a side missing the bishop of a colour with ≥2 own-camp holes
  // of it, so no piece naturally covers those squares.
  for (const cc of findColorComplexWeakness(fen)) {
    if (cc.side !== color) continue;
    // Every hole is lit; two are named, more are counted (G4.5: no cap on
    // what the board shows; David 2026-11-05: no list of squares read out).
    const many = cc.squares.length > 2;
    const sqs = many ? `${countWord(cc.squares.length)} of them` : cc.squares.join(' and ');
    out.push({
      key: `${side}-complex-${cc.complex}`, side, kind: 'complex', rank: rank('complex'),
      squares: [...cc.squares],
      text: own
        ? `Your ${cc.complex} squares are weak: with no bishop of that colour, no pawn or bishop of yours can cover ${sqs}. Their ${cc.by} can settle there.`
        : rotateStem([
          `Their ${cc.complex} squares are weak: no bishop of theirs covers ${sqs}. ${cc.by === 'knight' ? 'A knight belongs on one' : 'Your bishop can work on them'}.`,
          `Their ${cc.complex} squares are holes, with no bishop of theirs to cover ${sqs}. ${cc.by === 'knight' ? 'Put a knight on one' : 'Your bishop rules them'}.`,
        ], stemKeyOf(fen)),
    });
    break; // one complex read is enough — the second is the same lesson
  }

  // FULLY-OPEN FILE — where the rooks belong. Only the fully-open files (semi-open
  // are too common to be notable), lowest of the new rungs, and STUDENT-side only:
  // a fully-open file is open for both, so emitting it on both passes would twin
  // (and the file token isn't an [a-h][1-8] square the dedupe guard catches).
  // Requires the side to actually HAVE a rook — on a pawnless K+K board every file
  // is "open" and means nothing, the same precondition the king-open-file rung uses.
  const openFiles = findOpenFiles(fen).open;
  if (own && openFiles.length > 0) {
    // A rook must be able to step ONTO the file in one move — the same one
    // predicate `danyaBehaviors`' open-file uses (hand walk 2026-09-24: at move
    // twelve the e1-queen and the c1-bishop walled both rooks off the d-file).
    const rookOn = (f: string): boolean => {
      try { return new Chess(fen).board().flat().some((c) => c && c.color === color && c.type === 'r' && c.square[0] === f); }
      catch { return false; }
    };
    const file = openFiles.some(rookOn) ? undefined : openFiles.find((f) => rookReachesFile(fen, color, f));
    // An open file is worth a rook only for where it leads (Danya have-check
    // 2026-11-19: "the d-file is open — that is where a rook wants to be" on
    // 21 boards, the file named and not its road): the entry square in their
    // camp, when nothing of theirs covers it.
    const entry = file ? `${file}${color === 'w' ? 7 : 2}` as Square : null;
    const entryFree = (() => {
      const b = chessOf(fen);
      return !!b && !!entry && b.attackers(entry, enemyOf).length === 0 && !b.get(entry);
    })();
    if (file && entry && entryFree) {
      out.push({
        key: `${side}-file-${file}`, side, kind: 'file', rank: rank('file'),
        aliases: [`file-${file}`],
        squares: [entry],
        text: `The ${file}-file is open, and nothing of theirs covers ${entry} — a rook there gets into their camp.`,
      });
    }
  }
  void your;
  return out;
}

/** The piece on `square` named from `viewer`'s seat (`pieceRef`), or the
 *  fallback words when the square is empty. */
function pieceWords(fen: string, square: string, viewer: Color, fallback: string): string {
  return pieceRef(fen, square, viewer)?.words ?? fallback;
}

/**
 * THE JOINS — where teaching actually lives.
 *
 * A bad piece is a fact. An available break is a fact. A bad piece plus the
 * break that FREES it is a plan, and the ranked list above would have spoken
 * them as two unrelated observations on two different plies, if at all.
 *
 * The join is PROVED, not asserted: play the break on a probe board and re-run
 * the same quality read. If the piece is no longer bad, the two facts really
 * are one plan. If it is still bad, they are two facts and stay separate — no
 * amount of plausibility makes an unproved join speakable (G0).
 */
function joinsFor(
  fen: string,
  color: Color,
  side: 'student' | 'opponent',
): PositionalObservation[] {
  const turned = withTurn(fen, color);
  if (!turned) return [];
  const badBefore = findPieceQuality(fen).filter((q) => q.color === color && q.quality === 'bad');
  if (badBefore.length === 0) return [];
  const out: PositionalObservation[] = [];
  let probe: Chess;
  try { probe = new Chess(turned); } catch { return []; }
  // A PIECE THAT HAS NOT MOVED IS NOT A PROBLEM PIECE. Every game starts with
  // both bishops hemmed in by their own pawns, so the bad-bishop test is true
  // of the opening position itself. A live prod run duly said, at move two,
  // "your bishop on f1 is your problem piece … and the pawn move to a3 is what
  // fixes it" — a3 "fixes" it only because a2 is a light square, so pushing it
  // drops the count below the threshold. True arithmetic, absurd teaching.
  const homeRank = color === 'w' ? '1' : '8';
  const atHome = new Set(badBefore.filter((b) => b.square[1] === homeRank).map((b) => b.square as string));

  // ONLY A PAWN ON THE BLOCKED RAY CAN FIX IT, AND ONE JOIN PER BISHOP
  // (WO-STANDARD-01 D-1, prod tape 2026-09-22: "a pawn to a6 would fix it"
  // spoken FOUR times at one ply — every pawn move that happened to drop the
  // colour count "fixed" the bishop, and each one was its own observation).
  // The blocking pawns are the bishop computer's own answer; a move by any
  // other pawn is not a fix, whatever it does to a count.
  const blockersOf = new Map<string, Set<string>>();
  for (const b of badBefore) {
    if (b.piece !== 'b') continue;
    blockersOf.set(b.square, new Set(bishopBlockingPawns(probe, b.square, color)));
  }
  const fixed = new Set<string>();
  for (const mv of probe.moves({ verbose: true })) {
    if (mv.piece !== 'p') continue;
    let after: Chess;
    try {
      after = new Chess(turned);
      after.move(mv);
    } catch { continue; }
    const stillBad = new Set(
      findPieceQuality(after.fen())
        .filter((q) => q.color === color && q.quality === 'bad')
        .map((q) => q.square as string),
    );
    for (const b of badBefore) {
      if (atHome.has(b.square)) continue; // see `atHome`
      if (fixed.has(b.square)) continue; // one join per problem piece (D-1)
      const blockers = blockersOf.get(b.square);
      if (blockers && !blockers.has(mv.from)) continue; // not the blocking pawn (D-1)
      // The piece must not merely have MOVED out of the list — it has to still
      // be on its square and no longer be bad.
      if (stillBad.has(b.square)) continue;
      fixed.add(b.square);
      const piece = after.get(b.square);
      if (!piece || piece.type !== b.piece || piece.color !== color) continue;
      out.push({
        key: `${side}-join-${b.square}-${mv.to}`,
        side,
        kind: 'plan',
        rank: RANK.plan - (side === 'opponent' ? OPPONENT_PENALTY : 0),
        // The piece and the pawn by what they are, one square said (David
        // 2026-11-05: three squares in a breath is the robot); the board
        // lights all three.
        squares: [b.square, mv.from, mv.to],
        text: side === 'student'
          ? `${openSentence(pieceWords(fen, b.square, color, `your ${NAME[b.piece] ?? 'piece'} on ${b.square}`))} is your problem piece, ${badPieceWords(b)}, and your ${mv.from[0]}-pawn going to ${mv.to} frees it, so that pawn move is really about the piece.`
          : `${openSentence(pieceWords(fen, b.square, color === 'w' ? 'b' : 'w', `their ${NAME[b.piece] ?? 'piece'} on ${b.square}`))} is their problem piece, ${badPieceWords(b)}, and their ${mv.from[0]}-pawn going to ${mv.to} would free it, so stopping that pawn matters more than it looks.`,
      });
      break; // one join per bad piece; the first proved fix is enough to teach
    }
    if (out.length >= 2) break;
  }
  return out;
}

/**
 * Every observation about the position, both sides, most urgent first.
 *
 * The caller decides how much to say — which is what makes the hint register
 * (`hintRegister`) able to hand over one fact or three from the same read.
 */
export function readPosition(
  fen: string,
  studentColor: 'white' | 'black',
): PositionalObservation[] {
  const me: Color = studentColor === 'white' ? 'w' : 'b';
  const them: Color = me === 'w' ? 'b' : 'w';
  const all = [
    ...joinsFor(fen, me, 'student'),
    ...joinsFor(fen, them, 'opponent'),
    ...observationsFor(fen, me, 'student'),
    ...observationsFor(fen, them, 'opponent'),
  ];
  // A join supersedes the bare fact it was built from — otherwise the coach
  // says "your bishop is bad" and then, a rung later, "your bishop is bad and
  // here is the break that fixes it".
  const joinedSquares = new Set(
    all.filter((o) => o.kind === 'plan').map((o) => o.key.split('-')[2]),
  );
  const deduped = all.filter((o) => !(o.kind === 'piece' && joinedSquares.has(o.key.split('-').pop() ?? '')));
  // A PAWN RACE IS THE WHOLE POSITION (g9 walk 2026-09-27: "their pawn on b4
  // is isolated", "their b-pawns are doubled", "a5 is a pawn break for you" —
  // while their d-pawn stood two squares from queening). With a passed pawn
  // that close, the slow structural reads are scenery: only the passer itself
  // and danger to a king still speak.
  const racing = racingPasser(fen);
  const kept = racing ? deduped.filter((o) => o.kind === 'passer' || o.kind === 'king') : deduped;
  return kept.sort((a, b) => b.rank - a.rank);
}

/**
 * One speakable observation about a quiet position, or '' when even this has
 * nothing — which is rare, and when it happens silence is the honest answer.
 *
 * The single-sentence face of `readPosition`: take the highest-ranked thing
 * nobody has said yet. Kept because the quiet lane must stay hard-capped at one
 * sentence — filling silence with a paragraph is how a coach gets muted.
 *
 * Deliberately NOT a "your strongest piece is X" fallback. That branch existed
 * and was cut on 2026-08-08 after reading its output: on a quiet Pirc it
 * produced "Your queen on d1 is doing the most work — build around it." True by
 * the mobility score, and terrible teaching — the queen had not moved, and
 * "build around it" is advice a student would be worse for taking. Silence
 * beats bad advice.
 */
export function buildPositionalRead(
  fen: string,
  studentColor: 'white' | 'black',
  /** Observation keys already spoken this game. A quiet position often has the
   *  SAME true thing to say for many plies running — an uncastled king stays
   *  uncastled — and repeating it is what makes a coach sound stuck. So the
   *  ladder SKIPS what has been said and descends to the next true observation
   *  instead. Caller owns the set for the game. */
  said?: Set<string>,
  /** Keys another lane already spoke this game (the phase turn's balance
   *  sheet names the same facts under the same keys). Read, never written. */
  heard?: ReadonlySet<string>,
  /** The square the student's piece JUST landed on. That move's own purpose is
   *  what speaks this turn; calling the same piece "your problem piece" beside
   *  it is two coaches (run E walk 2026-09-30: "Nxh3, not gxh3 …" then "Your
   *  knight on h3 is your problem piece"). Skipped, not said — it can come back. */
  justMoved?: string | null,
): PositionalObservation | null {
  // Returns the whole observation (not just its text) so the caller can mark the
  // squares it named (David 2026-09-13: "add highlights to all spoken key
  // squares"). `.text` is the line; `.squares` are what to highlight.
  // THE LEVER IDEA IS TAUGHT ONCE (Blumenfeld walk F1/F13/F15/F22): the key is
  // per square, so every new break square re-said "in a quiet position the pawn
  // levers are where the play comes from" — five times in one game. The next
  // break square is still news; the lesson around it is not.
  const leverTaught = (side: string): boolean => [...(said ?? []), ...(heard ?? [])].some((k) => k.startsWith(`${side}-break-`));
  for (const o of readPosition(fen, studentColor)) {
    const keys = [o.key, ...(o.aliases ?? [])];
    if (keys.some((k) => said?.has(k) || heard?.has(k))) continue;
    if (justMoved && o.kind === 'piece' && o.side === 'student' && (o.squares ?? []).includes(justMoved)) continue;
    const stem = o.kind === 'lever' && leverTaught(o.side) ? leverStem(o) : null;
    for (const k of keys) said?.add(k);
    return stem ? { ...o, text: stem } : o;
  }
  return null;
}

/** The short form of a pawn break once the idea has been taught this game. */
function leverStem(o: PositionalObservation): string {
  const sq = o.squares?.[0] ?? '';
  return o.side === 'student' ? `${sq} is a pawn break for you now.` : `They can break with ${sq} now.`;
}

/** A file is a ROAD toward a king only if the ATTACKER has no pawn on it (hand
 *  walk 2026-09-24: "the d-file is open toward their king" with White's own
 *  d3-pawn standing on it — the file was open for BLACK, not for the attack). */
export function attackerCanUseFile(fen: string, file: string, attacker: 'w' | 'b'): boolean {
  try {
    const b = new Chess(fen);
    for (let r = 1; r <= 8; r += 1) {
      const p = b.get(`${file}${r}` as Square);
      if (p && p.type === 'p' && p.color === attacker) return false;
    }
    return true;
  } catch { return true; }
}

/** THE FIRST STEP ONTO A FILE (walk 2026-09-30: "the e-file is open toward
 *  their king" said nothing about what to do with it). A rook — or, with no
 *  rook able to, the queen — of `color` that lands on `file` in one move on a
 *  square nothing of theirs attacks. Rook first: the rook is the piece a file
 *  is for. Null when no such move exists, and then nothing is suggested. */
export function heavyPieceToFile(fen: string, color: Color, file: string): { san: string; from: string; to: string; piece: 'rook' | 'queen' } | null {
  try {
    const parts = fen.split(' ');
    parts[1] = color;
    parts[3] = '-';
    const b = new Chess(parts.join(' '));
    if (b.inCheck()) return null;
    const foe: Color = color === 'w' ? 'b' : 'w';
    for (const type of ['r', 'q'] as const) {
      if (b.board().flat().some((c) => c && c.color === color && c.type === type && c.square[0] === file)) return null;
      for (const m of b.moves({ verbose: true })) {
        if (m.piece !== type || m.to[0] !== file || m.from[0] === file || m.captured) continue;
        const after = new Chess(b.fen());
        after.move(m.san);
        if (after.attackers(m.to, foe).length > 0) continue;
        return { san: m.san, from: m.from, to: m.to, piece: type === 'r' ? 'rook' : 'queen' };
      }
    }
  } catch { /* no suggestion */ }
  return null;
}

/** Castling that takes `color`'s king off the board's open files, when legal. */
export function castleOffFile(fen: string, color: Color): string | null {
  try {
    const parts = fen.split(' ');
    parts[1] = color;
    parts[3] = '-';
    const b = new Chess(parts.join(' '));
    const m = b.moves().find((x) => x === 'O-O' || x === 'O-O+') ?? b.moves().find((x) => x.startsWith('O-O-O'));
    return m ?? null;
  } catch { return null; }
}


/** A passed pawn, either side, two squares or fewer from promoting. */
export function racingPasser(fen: string): string | null {
  const st = describeStructure(fen);
  if (!st) return null;
  for (const color of ['w', 'b'] as const) {
    for (const sq of st.pawns.passedPawns[color]) {
      const rank = Number(sq[1]);
      if ((color === 'w' && rank >= 6) || (color === 'b' && rank <= 3)) return sq;
    }
  }
  return null;
}
