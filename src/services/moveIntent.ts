// moveIntent — what a move is FOR (David 2026-09-29: "focus on number 1": the
// coach describes the board; Naroditsky says why a move is played).
//
// Two questions, each answered by the engine, never by a guess:
//   PREVENTS — what would the opponent play if this side PASSED? If this move
//              takes that reply away (illegal now, or no longer one of their
//              good moves), the move stops it: "h3 — so …Bg4 isn't possible."
//   PREPARES — what would this side play if it moved AGAIN? If that move was
//              illegal or clearly worse before this one, this move prepares it:
//              "first X, so that Y".
// Both at once is "one move, two jobs". The same computer reads either seat, so
// "what is their move for?" is the same question asked of the other side.
//
// Pure: the four engine reads are handed in (see `IntentReads`). No engine call
// here, no model — the caller owns the search budget.
import type { ReplyRead } from './ifTheyPlay';
import type { WeighRead } from './weighedMoves';
import { flipSideToMove } from './threatOut';
import { ruleForPurpose } from './moveFundamentals';
import { Chess, type Square } from 'chess.js';
import type { AnalysisLine } from '../types';
import { storedMate } from './engineConstants';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { legalSeeGainFor, legalSeeGainOn, standsSafe } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';
import { materialDeficit } from './exchangeLedger';
import { isOnHomeSquare } from './development';
import { unmarked } from '../utils/sanMark';

export interface IntentReads {
  /** Mover to move at the board BEFORE the move (the ordinary read). */
  before: readonly AnalysisLine[];
  /** Opponent to move at the board before the move — a null move: the side
   *  that is about to move passes. `nullMoveFen(fenBefore)`. */
  passBefore: readonly AnalysisLine[];
  /** Opponent to move at the board AFTER the move (the ordinary read). */
  after: readonly AnalysisLine[];
  /** Mover to move again at the board after the move — a null move for the
   *  opponent. `nullMoveFen(fenAfter)`. */
  passAfter: readonly AnalysisLine[];
  /** Their actual reply to the move, when the surface knows it (Learn does:
   *  the coach's own move). Defaults to the first move of `after[0]`. */
  reply?: string;
  /** THE LINE THE SURFACE GOES ON WITH after the move (UCI, the reply first):
   *  a lesson's taught line. A move it plays was not "stopped". Absent: the
   *  surface shows no line (a live game). */
  lineAfter?: readonly string[];
  /** THE FOLLOW-UP PLAYED FIRST (`moveOrder`'s second read): the board where
   *  the mover's next move in the line was played instead of this one,
   *  opponent to move — read by a surface that makes the extra search (a
   *  lesson, when the follow-up is legal before the move). Absent: not read. */
  followFirst?: { uci: string; line: AnalysisLine } | null;
  /** EVERY LEGAL REPLY on the board after the move, scored by one read (the
   *  reply tree's input, `ifTheyPlay`), with the rating the replies are read
   *  at — read by a surface that makes the read (a lesson). Absent: not read. */
  everyAfter?: { replies: readonly ReplyRead[]; rating: number } | null;
  /** ONE READ PER CANDIDATE A PLAYER WEIGHS (`weighedMoves`), from the board
   *  before the move, the move played among them — read by a surface that
   *  makes the search (Review's record). Absent: not read; the fan before the
   *  move stands in, each line a read of its first move. */
  weigh?: readonly WeighRead[] | null;
}

export interface IntentMove { uci: string; san: string }

/** What a recorded move keeps of the engine: one search's best line and the
 *  played move's line, each with its score (White's view). */
export interface StoredMoveRead {
  bestMove: string | null;
  /** The best move's score from the search that scored the played move. */
  bestMoveEval?: number | null;
  /** The score of the board before the move (the best line's), from the
   *  position read — used when the record kept no `bestMoveEval`. */
  preMoveEval?: number | null;
  /** The score after the played move. */
  evaluation: number | null;
  pv?: { afterPlayed: readonly string[]; afterBest: readonly string[] };
}

/** THE STORED FAN BEFORE A RECORDED MOVE (WO-STORY-MATRIX-01 P1-9): the best
 *  line, then the played move's line when it is another move — the two lines
 *  one search kept, as the board-before read a computer weighs moves from.
 *  Empty when the record kept no best move. One builder for every reader of a
 *  record (Review's move facts, the record's posed reason). */
export function storedFanBefore(rec: StoredMoveRead, playedUci: string | null): AnalysisLine[] {
  if (!rec.bestMove) return [];
  const bestEval = rec.bestMoveEval ?? rec.preMoveEval;
  if (bestEval == null) return [];
  const out: AnalysisLine[] = [{ rank: 1, evaluation: bestEval, mate: storedMate(bestEval), moves: [rec.bestMove, ...(rec.pv?.afterBest ?? [])] }];
  if (playedUci && playedUci !== rec.bestMove && rec.evaluation != null && rec.pv?.afterPlayed.length) {
    out.push({ rank: 2, evaluation: rec.evaluation, mate: storedMate(rec.evaluation), moves: [playedUci, ...rec.pv.afterPlayed] });
  }
  return out;
}

/** A recorded move's reads as the four a move's computers take: the stored fan
 *  before it, and the played line as the board-after read. No pass reads are
 *  stored, so those are empty — never invented. Null when the record kept no
 *  line at all. */
export function storedIntentReads(fenBefore: string, san: string, rec: StoredMoveRead): IntentReads | null {
  let playedUci: string | null = null;
  try { const m = new Chess(fenBefore).move(san); playedUci = `${m.from}${m.to}${m.promotion ?? ''}`; } catch { return null; }
  const before = storedFanBefore(rec, playedUci);
  const after: AnalysisLine[] = rec.evaluation != null && rec.pv?.afterPlayed.length
    ? [{ rank: 1, evaluation: rec.evaluation, mate: storedMate(rec.evaluation), moves: [...rec.pv.afterPlayed] }]
    : [];
  if (before.length === 0 && after.length === 0) return null;
  return { before, after, passBefore: [], passAfter: [] };
}


/** How each half reads the engine. Chosen by measurement against his games
 *  (`moveIntent.measure.test.ts`), not by taste. */
export interface IntentOptions {
  /** 'pass' — the best move after a free extra move; 'line' — the next move
   *  this side plays in the engine's own main line after the move. */
  prepare: 'pass' | 'line' | 'unlock';
  /** 'any' — every strong reply after a pass; 'concrete' — only a reply that
   *  mates, gives check, or wins material by exchange. */
  prevent: 'any' | 'concrete' | 'deny' | 'any+deny';
  /** The move is still in opening book: speak only a real stopped threat or a
   *  prepared move with its reason (never silence for being in book). */
  book?: boolean;
  /** Learn, before the student's next move: what the student's move PREPARES
   *  is said by its piece and job, never by the move (LEARN NAMES NO MOVE
   *  UNASKED — replay 2026-10-19: "You play d4 first, to free your knight on
   *  b1 for Nd2" named the move they had not played yet). Set only through
   *  `intentWithFallback`, where it is required. */
  holdPrepared?: boolean;
  /** Learn: the student's move just PLAYED is "your move", never its name
   *  (David 2026-11-09: "the user knows that, they see it play out"; prod focus
   *  audit the same night: "Your f7 stops king to e8"). Set only through
   *  `intentWithFallback` and `decisiveReason`, where it is required. */
  holdPlayed?: boolean;
}
export const DEFAULT_INTENT: IntentOptions = { prepare: 'unlock', prevent: 'any+deny' };

export interface MoveIntent {
  /** The reply this move took away from the opponent. */
  prevents: (IntentMove & { threatCp: number; /** The stopped move was mate. */ mate?: boolean }) | null;
  /** The follow-up this move made possible or clearly better. */
  prepares: (IntentMove & { gainCp: number }) | null;
  text: string;
  /** Every square the text is about — the move's own landing square, and the
   *  from/to of the move it stops or prepares. Always non-empty, so the fact
   *  can SUPPORT a lead that shares a square (the Learn door, WO-1b). */
  squares: string[];
  /** Whose move this is about. */
  about: 'student' | 'opponent';
}

/** A real threat costs the side that passes at least this much. */
export const THREAT_CP = 100;
/** A follow-up is "prepared" when it gained at least this much. */
const PREPARE_CP = 50;
/** A stopped move the surface's own line plays within this many plies was not
 *  stopped (three moves a side). */
const STOPPED_PLIES = 6;
/** A reply counts as gone when it now scores this much worse than their best. */
const GONE_CP = 60;

const MATE = 100_000;

/** Line value in centipawns from `pov`'s side ('w' | 'b'). Mate is folded to a
 *  large number, nearer mates larger. */
function valueFor(l: AnalysisLine, pov: 'w' | 'b'): number {
  const white = l.mate !== null && l.mate !== undefined
    ? (l.mate > 0 ? MATE - Math.abs(l.mate) : -(MATE - Math.abs(l.mate)))
    : l.evaluation;
  return pov === 'w' ? white : -white;
}

/** The same board with the other side to move — a pass. Null when the side to
 *  move is in check (a pass would be illegal) or the FEN is unreadable. */
export function nullMoveFen(fen: string): string | null {
  // The one null-move rule lives in threatOut (census 2026-10-10).
  return flipSideToMove(fen);
}

function sanOf(fen: string, uci: string): string | null {
  try {
    const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
    return m?.san ?? null;
  } catch { return null; }
}

const firstMove = (l: AnalysisLine | undefined): string | null => l?.moves?.[0] ?? null;

/** The value of `uci` among `lines` for `pov`, or null when it is not listed. */
function valueOfMove(lines: readonly AnalysisLine[], uci: string, pov: 'w' | 'b'): number | null {
  const hit = lines.find((l) => firstMove(l) === uci);
  return hit ? valueFor(hit, pov) : null;
}

/**
 * What `playedSan` (from `fenBefore`) is FOR, or null when the engine shows no
 * reply it took away and no follow-up it made possible.
 */
export function moveIntent(
  fenBefore: string,
  playedSan: string,
  reads: IntentReads,
  /** Whose move this is, for the wording: the student's, or their opponent's. */
  seat: 'student' | 'opponent',
  opts: IntentOptions = DEFAULT_INTENT,
): MoveIntent | null {
  let fenAfter: string;
  let playedUci: string;
  let mover: 'w' | 'b';
  try {
    const c = new Chess(fenBefore);
    mover = c.turn();
    const m = c.move(playedSan);
    if (!m) return null;
    playedUci = `${m.from}${m.to}${m.promotion ?? ''}`;
    fenAfter = c.fen();
    if (c.isGameOver()) return null;
  } catch { return null; }
  const opp: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
  if (!reads.before.length || !reads.after.length) return null;

  // ── PREVENTS ────────────────────────────────────────────────────────────
  // Every reply the opponent would have after a pass is a candidate — his
  // "prevents" is often their second idea, not their first. The strongest
  // real threat the move took away is the one named.
  let prevents: MoveIntent['prevents'] = null;
  const passFen = nullMoveFen(fenBefore);
  if (passFen && opts.prevent === 'deny') {
    prevents = denied(fenBefore, fenAfter, passFen, playedUci, mover, reads);
  } else if (passFen && reads.before[0]) {
    const ifBest = -valueFor(reads.before[0], mover);
    const theirBestNow = reads.after[0] ? valueFor(reads.after[0], opp) : null;
    const worstListed = reads.after.length ? Math.min(...reads.after.map((l) => valueFor(l, opp))) : null;
    for (const line of reads.passBefore) {
      const threat = firstMove(line);
      if (!threat) continue;
      // What passing would cost the mover: this reply after a pass, against
      // the mover's own best move now (both from the opponent's side).
      const threatCp = valueFor(line, opp) - ifBest;
      if (threatCp < THREAT_CP || (prevents && prevents.threatCp >= threatCp)) continue;
      const threatSan = sanOf(passFen, threat);
      // Moving the attacked piece away is a rescue, not a purpose worth naming.
      // A threat that MATES is not about the piece it lands on (David's Colle
      // read 2026-11-05, 23…g6: Qxg7 was mate, and the skip made the line say
      // "…g6 stops your Rxe6" instead).
      const mates = line.mate !== null && line.mate !== undefined && (line.mate > 0) === (opp === 'w');
      const rescue = threat.slice(2, 4) === playedUci.slice(0, 2) && !mates;
      // A PIECE TAKEN IS NOT STOPPED (prod focus audit 2026-11-09: "Their rook
      // taking on b3 stops your queen taking their pawn on b5" — the rook took
      // the queen). A threat by the piece the move captured is the capture's,
      // never a second job.
      const taken = threat.slice(0, 2) === playedUci.slice(2, 4);
      // …nor a threat whose point was the piece that moved: it hit the square
      // the piece just left (prod focus audit 2026-11-09: "Their bishop taking
      // on f7 stops your g6, which would hit their bishop on h5" — the bishop
      // had left h5). The move escaped it; the escape is not a second job.
      const escaped = !mates && hitsSquareLeft(passFen, threat, playedUci.slice(0, 2));
      if (!threatSan || rescue || taken || escaped || threat === playedUci) continue;
      if (opts.prevent === 'concrete' && !concreteThreat(passFen, threat, threatSan, line)) continue;
      const stillLegal = sanOf(fenAfter, threat) !== null;
      const threatNow = valueOfMove(reads.after, threat, opp);
      const gone = !stillLegal
        || (theirBestNow !== null && threatNow !== null && threatNow <= theirBestNow - GONE_CP)
        // Not even among their listed moves: worse than the worst of them.
        || (threatNow === null && theirBestNow !== null && worstListed !== null && worstListed <= theirBestNow - GONE_CP)
        // Their best reply to a pass, worth a real threat, and now not even in
        // their top lines: it no longer works.
        || (threatNow === null && line === reads.passBefore[0]);
      // "Takes it away" must be TRUE on the board (manual claim check
      // 2026-09-30: "Re1 takes …Re8 away" when Rxe8+ Kxe8 is an even trade;
      // "Bg5 takes …Ne7 away" when …Ne7 was their best move). A move still
      // legal, still safe to land, and not measured worse by the engine is
      // not gone — absence from the top lines alone proves nothing.
      // A MATE THAT NO LONGER MATES IS GONE (contract board 2026-10-17: after
      // …h6, Re8+ is still legal and lands safely, so it read as "still fine"
      // and the luft move never got its reason). Still legal is not still mate.
      const wasMate = line.mate !== null && line.mate !== undefined && Math.abs(line.mate) === 1;
      const mateGone = wasMate && !matesFrom(fenAfter, threat);
      const stillFine = !mateGone && stillLegal && safeLanding(fenAfter, uciToMove(threat))
        && (threatNow === null || theirBestNow === null || threatNow > theirBestNow - GONE_CP);
      if ((gone || mateGone) && !stillFine) prevents = { uci: threat, san: threatSan, threatCp, ...(mateGone ? { mate: true } : {}) };
    }
    if (!prevents && opts.prevent === 'any+deny') prevents = denied(fenBefore, fenAfter, passFen, playedUci, mover, reads);
  }
  // A MOVE THEY THEN PLAYED WAS NOT "STOPPED" (walk 2026-09-30: "Ng5 — now
  // …e6 doesn't work", and …e6 was their very next move). On the board the
  // student hears it on, the line contradicts what just happened.
  if (prevents && reads.reply && reads.reply.slice(0, 4) === prevents.uci.slice(0, 4)) prevents = null;
  // …nor one the line the surface shows goes on to play within three moves
  // (task 172: "d4 stops your …e5" in the Albin, whose line plays …e5 a move
  // later; "…c6 stops your cxd5" with cxd5 the lesson's next move).
  if (prevents && reads.lineAfter) {
    const theirs = reads.lineAfter.slice(0, STOPPED_PLIES).filter((_, k) => k % 2 === 0);
    const stopped = prevents.uci.slice(0, 4);
    if (theirs.some((u) => u.slice(0, 4) === stopped)) prevents = null;
  }
  // A move onto the square the student just took is not "stopped", it is
  // blocked by the piece standing there (merged walk 2026-09-30: "…c4 — now
  // c4 doesn't work"). Nothing to teach.
  if (prevents && prevents.uci.slice(2, 4) === playedUci.slice(2, 4)) prevents = null;
  // …nor a move by the piece the move just took (the 'deny' reader too).
  if (prevents && prevents.uci.slice(0, 2) === playedUci.slice(2, 4)) prevents = null;

  // ── PREPARES ────────────────────────────────────────────────────────────
  let prepares: MoveIntent['prepares'] = null;
  if (opts.prepare === 'unlock') {
    // What the move UNLOCKS (board + exchange counting), and of those, the one
    // the engine actually plays for this side in its lines; a lone unlock is
    // named as it stands; several with none in the lines stay unnamed.
    // THE REPLAY GUARD (WO-COACH-TEACHER review 2026-09-29): the move must be
    // the CAUSE. Replay their reply without the move (this side passes) — the
    // follow-up must fail there, and must work after the move and the reply.
    const unlocked = unlockedMoves(fenBefore, playedSan);
    // THE ENGINE PLAYS IT, FOR THIS SIDE, IN ITS OWN LINES AFTER THE MOVE (task
    // 172, 2026-11-11). A move the board unlocked is PREPARED only when a real
    // line goes on to play it — it sees the pins and the replies exchange
    // counting cannot (Kh1 then f4). Two looser kinds of evidence stood here
    // and are gone: the move the side would play after a FREE extra move (the
    // pass read — a move that needs the opponent to do nothing is no plan), and
    // a lone unlock that only passed a replay of one reply. Between them they
    // said "e4 frees their bishop to come out with Be2" where every line goes
    // …Bxf1; "…Nfd7 prepares …f6", "Nxd4 first, so that f3 comes next", "…Bf8
    // prepares …Qe7", "Bf4 first, so that Rc1 can take the c-file" — moves in
    // no line of the engine's.
    const engineSaw = new Set<string>();
    for (const l of reads.after) (l.moves ?? []).forEach((u, k) => { if (k % 2 === 1) engineSaw.add(u); });
    const pick = unlocked.find((u) => engineSaw.has(u.uci));
    if (pick) prepares = { uci: pick.uci, san: pick.san, gainCp: PREPARE_CP };
  } else if (opts.prepare === 'line') {
    // The engine's main line after the move, walked for THIS side's moves (the
    // 2nd, 4th, 6th ply). The first one that was not available before — illegal
    // then, or clearly worse then — is what this move is heading for. "Kh1, …,
    // then f4": the plan move is rarely the very next one.
    const line = reads.after[0]?.moves ?? [];
    const bestBefore = valueFor(reads.before[0], mover);
    try {
      const c = new Chess(fenAfter);
      for (let i = 0; i < Math.min(line.length, 6); i += 1) {
        const u = line[i];
        const mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.slice(4, 5) || undefined });
        if (!mv) break;
        if (i % 2 === 0) continue; // their move
        if (mv.captured || /[+#]/.test(mv.san)) continue; // forcing is not a plan
        if (u === playedUci) continue;
        // ILLEGAL BEFORE PROVES NOTHING when an earlier move of the LINE is
        // what cleared the way (Learn audit 2026-10-15: "Their castle kingside
        // prepares c3" — the line's Nb5 vacated c3, not the castle). A path any
        // move of the line cleared — theirs or ours — is not the played move's doing.
        if (sanOf(fenBefore, u) === null && line.slice(0, i).some((x) => pathOf(u).includes(x.slice(0, 2)))) continue;
        const legalBefore = sanOf(fenBefore, u) !== null;
        const beforeValue = valueOfMove(reads.before, u, mover);
        const gainCp = !legalBefore ? PREPARE_CP : beforeValue !== null ? bestBefore - beforeValue : null;
        if (gainCp !== null && gainCp >= PREPARE_CP) { prepares = { uci: u, san: mv.san, gainCp }; break; }
      }
    } catch { /* an unreadable line prepares nothing */ }
  } else {
    const againFen = nullMoveFen(fenAfter);
    const follow = firstMove(reads.passAfter[0]);
    if (againFen && follow && reads.passAfter[0] && follow !== playedUci) {
      const followSan = sanOf(againFen, follow);
      // A capture or a check after a PASS is an artifact of the pass — the
      // opponent never got to answer. A plan move is quiet.
      const forcing = !!followSan && /[x+#]/.test(followSan);
      const nowValue = valueFor(reads.passAfter[0], mover);
      const legalBefore = sanOf(fenBefore, follow) !== null;
      const beforeValue = valueOfMove(reads.before, follow, mover);
      const gainCp = !legalBefore ? PREPARE_CP : beforeValue !== null ? nowValue - beforeValue : null;
      if (followSan && !forcing && gainCp !== null && gainCp >= PREPARE_CP) prepares = { uci: follow, san: followSan, gainCp };
    }
  }

  // A follow-up by the piece this move just put down is not a plan the move
  // prepared — castling "prepares Re1" is the castled rook moving again
  // (walk 2026-09-29).
  if (prepares) {
    try {
      const m = new Chess(fenBefore).move(playedSan);
      const own = [m.to, castledRookSquare(m)].filter(Boolean);
      if (own.includes(prepares.uci.slice(0, 2))) prepares = null;
    } catch { /* keep */ }
  }
  // A RETREAT TO THE BACK RANK IS NOT WHAT A MOVE PREPARES (prod walk on
  // David's record, 2026-10-19: "You play …c6 first, so that …Qd8 can take the
  // half-open d-file"). …c6 did open the a5–d8 diagonal, so the retreat was
  // illegal before and the test above counts it — but a piece going home is
  // the engine regrouping, never the point the student is taught for …c6.
  if (prepares && !/^[a-h]/.test(prepares.san) && !prepares.san.startsWith('O-O')) {
    const home = mover === 'w' ? '1' : '8';
    if (prepares.uci[3] === home && prepares.uci[1] !== home) prepares = null;
  }
  // IN BOOK THE SAME TEACHING, HELD TO ITS SUBSTANCE (David 2026-09-29: "He
  // is not quiet during book moves"). He speaks every move of the opening,
  // so book is never a reason for silence — but "e4 stops …d5 and prepares
  // Be2" teaches nothing. In book a stopped move must be a real threat (a
  // check, a capture, mate — "Nf3 stops …Qh4+") and a prepared move must come
  // with what it does.
  if (opts.book) {
    if (prevents && !/[x+#]/.test(prevents.san)) prevents = null;
    if (prepares && !whatItDoes(fenAfter, prepares.uci, mover)) prepares = null;
  }
  // A PREPARED PIECE MOVE WITH NO REASON TEACHES NOTHING (walk 2026-09-30:
  // "d4 prepares Bd2."). A prepared pawn move is a break or a plan ("c3
  // prepares d4") and stands on its own; a quiet piece move needs its point.
  if (prepares && !/^[a-h]/.test(prepares.san) && !prepares.san.startsWith('O-O') && !whatItDoes(fenAfter, prepares.uci, mover)) prepares = null;
  // A MOVE THAT HITS SOMETHING IS ABOUT THE HIT (walk 2026-09-30: "…g4 first,
  // so that …h5 comes next" — …g4 attacked the bishop on f3, and after e5 the
  // recapture was forced). When the moved piece now wins material by force if
  // left alone, "prepares" is not its point; the threat lanes own it.
  if (prepares) {
    const again = nullMoveFen(fenAfter);
    try {
      const to = playedUci.slice(2, 4);
      const hits = again ? new Chess(again).moves({ verbose: true })
        .some((m) => m.from === to && m.captured && legalSeeGainOn(new Chess(again), m.to) >= 1) : false;
      if (hits) prepares = null;
      // A PAWN THAT STRIKES A PAWN is a lever: the strike is its point, not
      // the piece it happens to unblock (Alekhine walk 2026-10-19: "…d6 first,
      // to free their knight for …Nd7" — …d6 hit the pawn on e5).
      const moved = again ? new Chess(again).get(to as Parameters<Chess['get']>[0]) : null;
      if (moved?.type === 'p' && again && new Chess(again).moves({ verbose: true }).some((m) => m.from === to && m.captured === 'p')) prepares = null;
    } catch { /* keep */ }
  }
  // …and A PIECE SAVED IS NOT A PLAN (pass-2 walk 2026-09-30: "They play Ba2
  // first, so that Rb1 can take the open b-file" — the bishop on c4 was
  // attacked by the rook and simply stepped away). When the moved piece stood
  // en prise before the move, saving it is the move's point.
  if (prepares) {
    try {
      const parts = fenBefore.split(' ');
      parts[1] = parts[1] === 'w' ? 'b' : 'w'; parts[3] = '-';
      if (legalSeeGainOn(new Chess(parts.join(' ')), playedUci.slice(0, 2) as Parameters<typeof legalSeeGainOn>[1]) >= 1) prepares = null;
    } catch { /* keep */ }
  }
  // …and A CAPTURE THAT ONLY GETS MATERIAL BACK IS ABOUT THE TRADE (task 172:
  // "…exd5 first, to free your knight on b8 for …Nc6", "their Qxd2 prepares
  // c5", "their Bxc4 prepares d5" — take-backs). The side was behind by what it
  // took: the capture's point is that it is level again.
  if (prepares) {
    try {
      const m = new Chess(fenBefore).move(playedSan);
      if (m.captured && materialDeficit(fenBefore, mover) >= (MATERIAL_VALUE[m.captured] ?? 0)) prepares = null;
    } catch { /* keep */ }
  }
  if (!prevents && !prepares) return null;
  const squares = [...new Set([
    playedUci.slice(2, 4),
    ...(prevents ? [prevents.uci.slice(0, 2), prevents.uci.slice(2, 4)] : []),
    // A held prepared move marks the piece it frees, never where it goes.
    ...(prepares ? (opts.holdPrepared && seat === 'student' ? [prepares.uci.slice(0, 2)] : [prepares.uci.slice(0, 2), prepares.uci.slice(2, 4)]) : []),
  ])];
  const why = prevents ? stopReason(fenAfter, prevents.uci, mover) : null;
  // WHAT THE STOPPED MOVE WOULD HAVE DONE (escalating walk 2026-10-17: "Bxd7+
  // — now …g6 doesn't work" never said …g6 was hitting the f5-knight): read
  // on the board before the move, the mover passing.
  const threatDid = prevents ? whatTheStopDid(fenBefore, prevents.uci, opp) : null;
  const text = phrase(playedSan, prevents, prepares, seat, mover, fenAfter, prepares ? whatItDoes(fenAfter, prepares.uci, mover) : null, why, threatDid, !!opts.holdPrepared, !!opts.holdPlayed);
  // Nothing worth saying (a held move with no point): no intent at all.
  if (!text) return null;
  return { prevents, prepares, text, squares, about: seat };
}

/** Does `uci` (the side to move after a pass) still give mate from `fenAfter`? */
function matesFrom(fenAfter: string, uci: string): boolean {
  const pass = nullMoveFen(fenAfter);
  if (!pass) return false;
  try {
    const c = new Chess(pass);
    c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
    return c.isCheckmate();
  } catch { return false; }
}

/** A threat worth naming as "stopped": it mates, checks, or wins material by
 *  exchange on the square it lands on. A quiet reply the engine merely likes
 *  is not a threat a student can see. */
function concreteThreat(passFen: string, uci: string, san: string, line: AnalysisLine): boolean {
  if (line.mate !== null && line.mate !== undefined) return true;
  if (/[+#]/.test(san)) return true;
  if (!san.includes('x')) return false;
  try { return legalSeeGainOn(new Chess(passFen), uci.slice(2, 4) as Parameters<typeof legalSeeGainOn>[1]) >= 1; } catch { return false; }
}

const PREP_PIECE: Record<string, string> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight' };
/** A held prepared move, by its piece: "your knight", "a pawn push". */
function preparedPieceWords(san: string): string {
  const piece = PREP_PIECE[san[0]];
  return piece ? `your ${piece}` : 'a pawn push';
}

function phrase(
  san: string,
  prevents: MoveIntent['prevents'],
  prepares: MoveIntent['prepares'],
  seat: 'student' | 'opponent',
  mover: 'w' | 'b',
  fenAfter: string,
  /** What the prepared move does once played — "hit the pawn on e5", "take
   *  the open e-file", "castle" — so the line teaches the WHY, not a bare move. */
  does: PreparedPoint | null,
  /** WHY the stopped move no longer works, counted — "you cover d5 three
   *  times to their two" (census #12, his "count it"). */
  why: string | null = null,
  /** What the stopped move would have done (its target, said from the
   *  student's seat), so a stop is never a bare "doesn't work". */
  threatDid: PreparedPoint | null = null,
  /** The student's prepared move is said by its piece, not named. */
  holdPrepared = false,
  /** The student's played move is "your move", not named. */
  holdPlayed = false,
): string {
  const dot = (s: string, side: 'w' | 'b'): string => (side === 'b' ? `…${s}` : s);
  const opp: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
  const played = dot(san, mover);
  // A castle is done, not played: "You play castle queenside first" (prod
  // 2026-10-20) reads as a garble.
  const castles = san.startsWith('O-O') ? `castle ${san.startsWith('O-O-O') ? 'queenside' : 'kingside'}` : null;
  const youPlay = castles ? `You ${castles}` : `You play ${played}`;
  const theyPlay = castles ? `They ${castles}` : `They play ${played}`;
  const key = stemKeyOf(fenAfter);
  // WHOSE piece it hits, said from the student's seat (run B walk 2026-09-30:
  // "…Rad8 prepares …Qd2, to hit the queen on c1" — theirs, unsaid).
  if (does && /^hit the /.test(does.verb)) does = { ...does, verb: does.verb.replace(/^hit the /, seat === 'student' ? 'hit their ' : 'hit your ') };
  if (seat === 'student') {
    const capWords = prevents && !prevents.mate ? stoppedCapture(prevents.san, threatDid, 'their', 'your') : null;
    const stop = prevents ? capWords ?? dot(prevents.san, opp) : '';
    // Said alone (a review ply with nothing else to say) a bare "Qh4 — now
    // …axb4 doesn't work" names no seat (review audit 2026-10-28, ply 49).
    const yours = holdPlayed ? 'Your move' : castles ? 'Castling' : `Your ${played}`;
    const pointOf = holdPlayed ? 'The point of your move' : castles ? 'The point of castling' : `The point of your ${played}`;
    const yourMove = holdPlayed ? 'Your move' : `Your ${played}`;
    // "You play f4 first, so that …" names the move: held, only the forms that
    // say "your move" are spoken.
    const first = (rest: string): string[] => (holdPlayed ? [] : [`${youPlay} first, ${rest}`]);
    // A castle is a move too (OS-11: "You play Nf3 first, so you can castle
    // next" before 7.O-O, in all four games): held like any other.
    const held = holdPrepared && !!prepares;
    const prep = !prepares ? '' : held ? preparedPieceWords(prepares.san) : dot(prepares.san, mover);
    // A HELD prepared move with no point it was computed to have says nothing
    // (prod Learn 2026-10-29: "Your c5 gets a pawn push ready." — which push,
    // and for what?): held, it cannot be named; pointless, there is no reason.
    if (prevents && prepares && held && does) return `${yours} does two jobs: it stops ${stop}, and ${does.develops ? `it frees your ${does.develops.piece} on ${does.develops.from}` : `it gets ${prep} ready to ${does.verb}`}.`;
    if (prevents && prepares && !held) return `${yours} does two jobs: it stops ${stop}, and it prepares ${prep}${does?.develops ? `, freeing your ${does.develops.piece} on ${does.develops.from}` : does ? `, to ${does.verb}` : ''}.`;
    // "doesn't work", never "isn't possible" — the stopped move is still
    // LEGAL, it just loses (walk 2026-09-30: said five times in one game).
    const wouldDo = threatDid && !threatDid.castle && !capWords ? threatDid.verb.replace(/^(hit|take) the /, '$1 your ') : null;
    if (prevents?.mate) { const m = unmarked(stop); return rotateStem([`${yours} stops ${m}, which was mate.`, `${pointOf}: ${m} was mate, and now it isn't.`], key); }
    if (prevents && why) return `${yours} stops ${stop}: ${why}.`;
    if (prevents && wouldDo) return `${yours} stops ${stop}, which would ${wouldDo}.`;
    if (prevents) return rotateStem([`${yours} stops ${stop}.`, `${pointOf}: it rules out ${stop}.`], key);
    // Every stem names the seat (review audit 2026-10-15: "…e5 first, so that
    // …Bd6 can bring the bishop into the game" said whose move to no one).
    if (does?.castle && held) return `${yourMove} clears the last piece from between your king and rook.`;
    if (does?.castle) return rotateStem([`${yourMove} clears the way to castle.`, ...first('so you can castle next.')], key);
    if (does?.develops && held) return rotateStem([...first(`to free your ${does.develops.piece} on ${does.develops.from}.`), `${yourMove} frees your ${does.develops.piece} on ${does.develops.from} to come out.`], key);
    if (does?.develops) return rotateStem([...first(`to free your ${does.develops.piece} on ${does.develops.from} for ${prep}.`), `${yourMove} frees your ${does.develops.piece} on ${does.develops.from} to come out with ${prep}.`], key);
    if (does && held) return rotateStem([...first(`so that ${prep} can ${does.verb}.`), `${yourMove} gets ${prep} ready to ${does.verb}.`], key);
    if (does) return rotateStem([...first(`so that ${prep} can ${does.verb}.`), `${yourMove} prepares ${prep}, to ${does.verb}.`], key);
    if (held) return '';
    return rotateStem([`${yourMove} prepares ${prep}.`, ...first(`so that ${prep} comes next.`)], key);
  }
  const capWords = prevents && !prevents.mate ? stoppedCapture(prevents.san, threatDid, 'your', 'their') : null;
  const stop = prevents ? capWords ?? `your ${dot(prevents.san, opp)}` : '';
  const prep = prepares ? dot(prepares.san, mover) : '';
  if (prevents && prepares) return `Their ${played} does two jobs: it stops ${stop}, and it prepares ${prep}${does?.develops ? `, freeing their ${does.develops.piece} on ${does.develops.from}` : does ? `, to ${does.verb}` : ''}.`;
  const theirWouldDo = threatDid && !threatDid.castle && !capWords ? threatDid.verb.replace(/^(hit|take) the /, '$1 their ') : null;
  if (prevents?.mate) return `Their ${played} stops ${stop.replace(/[+#]$/, '')}, which was mate.`;
  if (prevents && theirWouldDo) return `Their ${played} stops ${stop}, which would ${theirWouldDo}.`;
  if (prevents) return rotateStem([`Their ${played} stops ${stop}.`, `The point of their ${played}: it rules out ${stop}.`], key);
  if (does?.castle) return rotateStem([`Their ${played} clears the way to castle.`, `${theyPlay} first, so they can castle next.`], key);
  if (does?.develops) return rotateStem([`${theyPlay} first, to free their ${does.develops.piece} on ${does.develops.from} for ${prep}.`, `Their ${played} frees their ${does.develops.piece} on ${does.develops.from} to come out with ${prep}.`], key);
  if (does) return rotateStem([`Their ${played} prepares ${prep}, to ${does.verb}.`, `${theyPlay} first, so that ${prep} can ${does.verb}.`], key);
  return rotateStem([`Their ${played} prepares ${prep}.`, `${theyPlay} first, so that ${prep} comes next.`], key);
}

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** A stopped CAPTURE, said once by what it takes (prod Learn audit
 *  2026-11-09: "stops your queen taking on e1, check, which would take their
 *  rook on e1" named the capture twice). Null when the stopped move is not a
 *  capture of the piece `whatTheStopDid` read on its square. */
function stoppedCapture(san: string, did: PreparedPoint | null, mover: 'your' | 'their', victims: 'your' | 'their'): string | null {
  const took = did && !did.castle ? /^take the (\w+) on ([a-h][1-8])$/.exec(did.verb) : null;
  const cap = /^([NBRQK])?[a-h]?[1-8]?x([a-h][1-8])/.exec(san.replace(/^…/, ''));
  if (!took || !cap || cap[2] !== took[2]) return null;
  const piece = PIECE_NAME[(cap[1] ?? 'P').toLowerCase()] ?? 'piece';
  const check = /\+$/.test(san) ? ', with check' : '';
  return `${mover} ${piece} taking ${victims} ${took[1]} on ${took[2]}${check}`;
}

const TIMES = ['', 'once', 'twice', 'three times', 'four times', 'five times'];
const COUNT = ['none', 'one', 'two', 'three', 'four', 'five'];

/**
 * Why the move the student took away no longer works, COUNTED on the board
 * (census #12 — "you still don't allow d5: three defenders on that square to
 * only two attackers"). The stopped move is played on the board after the
 * student's move: when what lands there is simply lost by exchange count, say
 * so — a pawn break by the count of who covers the square, a piece by "it would
 * just be taken". Null when the stopped move is a capture or check (the engine
 * reason is not a count) or when the count does not explain it.
 */
export function stopReason(fenAfter: string, stoppedUci: string, mover: 'w' | 'b'): string | null {
  const opp: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
  let c: Chess;
  let m;
  try {
    c = new Chess(fenAfter);
    if (c.turn() !== opp) return null;
  } catch { return null; }
  try {
    m = c.move({ from: stoppedUci.slice(0, 2), to: stoppedUci.slice(2, 4), promotion: stoppedUci.slice(4, 5) || undefined });
  } catch {
    // ILLEGAL NOW — a king cannot step onto a covered square (Learn walk
    // 2026-10-01: "a6 — now …Kb7 doesn't work." with no reason). The reason
    // is the piece that covers it.
    const to = stoppedUci.slice(2, 4);
    if (c.get(stoppedUci.slice(0, 2) as Square)?.type !== 'k') return null;
    const by = c.attackers(to as Square, mover)[0];
    const pc = by ? c.get(by) : null;
    return pc ? `your ${PIECE_NAME[pc.type]} on ${by} covers ${to}` : null;
  }
  if (!m || m.captured || c.inCheck()) return null;
  if (legalSeeGainFor(c.fen(), m.to, mover) <= 0) return null;
  const mine = c.attackers(m.to, mover).length;
  const theirs = c.attackers(m.to, opp).length;
  if (m.piece === 'p') {
    if (mine > theirs && theirs > 0 && mine <= 5) {
      return `you cover ${m.to} ${TIMES[mine]} to their ${COUNT[theirs]}`;
    }
    return `the pawn would just be lost on ${m.to}`;
  }
  return `the ${PIECE_NAME[m.piece]} would just be taken on ${m.to}`;
}

interface PreparedPoint {
  verb: string;
  castle: boolean;
  /** A minor piece leaving home: the pawn move FREED it. Said as "to free
   *  your bishop on c1 for Bd2" — the verb form ("so that Bd2 can bring the
   *  bishop into the game") named the bishop twice (prod walk 2026-10-18). */
  develops?: { piece: string; from: string };
}

/** What a STOPPED move would have done, read on the board before the move
 *  (the mover passing): a capture that wins what it takes is that capture —
 *  "…Bd5+ stops Rxh8, which would take your rook on h8", never what the
 *  rook would hit from h8 afterwards (hard-chat audit 2026-11-08) — else what
 *  the move does once played. */
function whatTheStopDid(fenBefore: string, stopUci: string, side: 'w' | 'b'): PreparedPoint | null {
  const again = nullMoveFen(fenBefore);
  if (again) {
    try {
      const m = new Chess(again).move({ from: stopUci.slice(0, 2), to: stopUci.slice(2, 4), promotion: stopUci.slice(4, 5) || undefined });
      if (m?.captured && m.captured !== 'k' && legalSeeGainFor(again, m.to, side) > 0) {
        return { verb: `take the ${PIECE_NAME[m.captured]} on ${m.to}`, castle: false };
      }
    } catch { /* read it as a move */ }
  }
  return whatItDoes(fenBefore, stopUci, side);
}

/** Test seam for the stopped-capture reader. */
export const whatTheStopDidForTest = whatTheStopDid;

/** What the prepared move DOES once played, read off the board where the mover
 *  moves again (the opponent passes): castle; hit an enemy piece or pawn the
 *  moved piece did not hit before (the most valuable one); or put a rook or
 *  queen on a file with no pawn of its own side. Null when none is true — the
 *  line then names the move alone rather than inventing a reason. */
export function whatItDoes(fenAfter: string, prepUci: string, mover: 'w' | 'b'): PreparedPoint | null {
  const again = nullMoveFen(fenAfter);
  if (!again) return null;
  let board: Chess; let m;
  try { board = new Chess(again); m = board.move({ from: prepUci.slice(0, 2), to: prepUci.slice(2, 4), promotion: prepUci.slice(4, 5) || undefined }); } catch { return null; }
  if (!m) return null;
  if (m.isKingsideCastle() || m.isQueensideCastle()) return { verb: 'castle', castle: true };
  const opp: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
  const hits = (b: Chess, from: string): string[] => {
    try {
      // The mover to move: the board itself when it is already their turn (the
      // board BEFORE the prepared move), a pass by the other side when it is
      // not (the board after it). Flipping both read the board before as the
      // opponent's turn, so the piece "hit nothing" there and every target it
      // already had was new: "…dxc6 first, so that …Bd7 can hit their pawn on
      // f5" — the bishop on c8 hit f5 the moment the d-pawn left (task 172).
      const probe = b.turn() === mover ? b : new Chess(nullMoveFen(b.fen()) ?? b.fen());
      if (probe.turn() !== mover) return [];
      return probe.moves({ square: from as never, verbose: true }).filter((x) => x.captured).map((x) => x.to);
    } catch { return []; }
  };
  const before = new Set(hits(new Chess(again), m.from));
  const now = hits(board, m.to).filter((sq) => !before.has(sq));
  const targets: Array<{ sq: string; type: string }> = [];
  for (const sq of now) {
    const p = board.get(sq as never);
    // A HIT IS A THREAT, or it is not a reason. "c4 first, so that Qb3 can hit
    // their pawn on b7" (run D walk 2026-09-30) named a pawn the c8-bishop
    // guards — true geometry, no purpose. Only a target that is loose, or worth
    // more than the piece hitting it, counts — or a pawn lever.
    if (!p || p.color !== opp || p.type === 'k') continue;
    const guarded = board.isAttacked(sq as never, opp);
    // A pawn hitting a pawn is a lever — that IS a purpose ("f4 hits e5").
    if (m.piece === 'p' || !guarded || (MATERIAL_VALUE[p.type] ?? 0) > (MATERIAL_VALUE[m.piece] ?? 0)) targets.push({ sq, type: p.type });
  }
  targets.sort((a, b) => (MATERIAL_VALUE[b.type] ?? 0) - (MATERIAL_VALUE[a.type] ?? 0));
  // A MATE IT SETS UP is the point before any hit (Colle 22.Qg3: Bh6 hits
  // nothing loose — it threatens Qxg7 mate). Only a mate the prepared move
  // creates: one already on the board before it is not its doing.
  const mateOn = (fen: string | null): string | null => {
    if (!fen) return null;
    try {
      const b = new Chess(fen);
      if (b.turn() !== mover) return null;
      for (const x of b.moves({ verbose: true })) {
        b.move(x);
        const mate = b.isCheckmate();
        b.undo();
        if (mate) return x.to;
      }
    } catch { /* none */ }
    return null;
  };
  const mateSq = mateOn(nullMoveFen(board.fen()));
  if (mateSq && !mateOn(again)) return { verb: `threaten mate on ${mateSq}`, castle: false };
  if (targets.length) return { verb: `hit the ${PIECE_NAME[targets[0].type]} on ${targets[0].sq}`, castle: false };
  // DEVELOPMENT IS A JOB (Review audit 2026-10-15: "…e5 prepares …Bd6" was
  // dropped as reasonless 13 student moves out of 13, so a good move's point
  // in the opening was never said). A minor piece leaving its starting square
  // joins the game — the follow-up is what the pawn move freed.
  if ((m.piece === 'n' || m.piece === 'b') && isOnHomeSquare(m.piece, mover, m.from)) {
    return { verb: `bring the ${PIECE_NAME[m.piece]} into the game`, castle: false, develops: { piece: PIECE_NAME[m.piece], from: m.from } };
  }
  if (m.piece === 'r' || m.piece === 'q') {
    const file = m.to[0];
    const cells = board.board().flat().filter((c) => c && c.type === 'p' && c.square[0] === file) as Array<{ color: 'w' | 'b' }>;
    if (!cells.some((c) => c.color === mover) && m.from[0] !== file) {
      return { verb: `take the ${cells.length ? 'half-open' : 'open'} ${file}-file`, castle: false };
    }
  }
  return null;
}

/** SQUARE DENIAL: of the moves they would play after a pass, the first whose
 *  landing square this move now covers and did not before — "Bf5 stops the
 *  knight landing on e4", "f3 takes g4 away", "d6 shuts the door on e5". */
function denied(
  fenBefore: string, fenAfter: string, passFen: string, playedUci: string, mover: 'w' | 'b', reads: IntentReads,
): MoveIntent['prevents'] {
  const covered = (fen: string, sq: string): boolean => { try { return new Chess(fen).isAttacked(sq as never, mover); } catch { return false; } };
  for (const line of reads.passBefore) {
    const t = firstMove(line);
    if (!t || t === playedUci) continue;
    const to = t.slice(2, 4);
    const tSan = sanOf(passFen, t);
    if (!tSan || tSan.includes('x')) continue; // a capture is not a square they wanted
    if (covered(fenBefore, to) || !covered(fenAfter, to)) continue;
    // Covering the square is not denying it: the landing must now lose
    // material, and the engine must not still rate it near their best.
    if (safeLanding(fenAfter, uciToMove(t))) continue;
    const theirBestNow = reads.after[0] ? valueFor(reads.after[0], mover === 'w' ? 'b' : 'w') : null;
    const tNow = valueOfMove(reads.after, t, mover === 'w' ? 'b' : 'w');
    if (tNow !== null && theirBestNow !== null && tNow > theirBestNow - GONE_CP) continue;
    return { uci: t, san: tSan, threatCp: 0 };
  }
  return null;
}

const uciToMove = (uci: string): { from: string; to: string; promotion?: string } => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });

/** Moving `m` from `fen` lands safely: the opponent wins nothing by taking. */
function safeLanding(fen: string, m: { from: string; to: string; promotion?: string }): boolean {
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: m.from, to: m.to, promotion: m.promotion });
    if (!mv) return false;
    return standsSafe(c.fen(), mv.to, c.turn());
  } catch { return false; }
}

/**
 * What a move UNLOCKS: this side's quiet moves that were illegal before the
 * move, or legal but losing material, and are legal and safe after it — with
 * this side to move again (a pass by the opponent). Board geometry and exchange
 * counting only; no engine. "e6 opens d6 for the bishop", "Qd2 makes Bh6 safe",
 * "h3 makes g4 safe". The moved piece's own continuations are not unlocks.
 */
/** Where the rook lands when `m` castles, else null. */
/** The squares a move passes through and lands on (not its start). */
function pathOf(uci: string): string[] {
  const f0 = uci.charCodeAt(0); const r0 = Number(uci[1]);
  const f1 = uci.charCodeAt(2); const r1 = Number(uci[3]);
  const df = Math.sign(f1 - f0); const dr = Math.sign(r1 - r0);
  const straight = f0 === f1 || r0 === r1 || Math.abs(f1 - f0) === Math.abs(r1 - r0);
  if (!straight) return [uci.slice(2, 4)];
  const out: string[] = [];
  for (let f = f0 + df, r = r0 + dr; ; f += df, r += dr) {
    out.push(`${String.fromCharCode(f)}${r}`);
    if (f === f1 && r === r1) break;
  }
  return out;
}

function castledRookSquare(m: { color: 'w' | 'b'; isKingsideCastle: () => boolean; isQueensideCastle: () => boolean }): string | null {
  const rank = m.color === 'w' ? '1' : '8';
  if (m.isKingsideCastle()) return `f${rank}`;
  if (m.isQueensideCastle()) return `d${rank}`;
  return null;
}

export function unlockedMoves(fenBefore: string, playedSan: string): IntentMove[] {
  let fenAfter: string;
  let movedTo: string;
  let castledRook: string | null = null;
  try {
    const c = new Chess(fenBefore);
    const m = c.move(playedSan);
    if (!m) return [];
    movedTo = m.to;
    castledRook = castledRookSquare(m);
    fenAfter = c.fen();
  } catch { return []; }
  const again = nullMoveFen(fenAfter);
  if (!again) return [];
  const before = new Map<string, { from: string; to: string; promotion?: string }>();
  try {
    for (const b of new Chess(fenBefore).moves({ verbose: true })) before.set(`${b.from}${b.to}${b.promotion ?? ''}`, b);
  } catch { return []; }
  const out: IntentMove[] = [];
  let now: ReturnType<Chess['moves']>;
  try { now = new Chess(again).moves({ verbose: true }); } catch { return []; }
  for (const u of now as Array<{ from: string; to: string; promotion?: string; san: string; captured?: string }>) {
    if (u.from === movedTo || u.from === castledRook || u.captured || /[+#]/.test(u.san)) continue;
    const key = `${u.from}${u.to}${u.promotion ?? ''}`;
    if (!safeLanding(again, u)) continue;
    const b = before.get(key);
    if (!b || !safeLanding(fenBefore, b)) out.push({ uci: key, san: u.san });
  }
  return out;
}

/** THE RULE BEHIND WHAT A MOVE PREPARES, said once a game (unify-the-coach B1):
 *  the purpose and its "why" are one statement, so they live together here.
 *  The mover is read off the intent's own seat; a seat-relative reason is never
 *  said of the opponent's move (`ruleForPurpose`). */
export function intentRule(
  intent: MoveIntent,
  fenWherePlayed: string,
  studentColor: 'white' | 'black',
  taught: ReadonlySet<string>,
): { text: string; keys: string[] } | null {
  if (!intent.prepares) return null;
  const mover = intent.about === 'student' ? studentColor : studentColor === 'white' ? 'black' : 'white';
  return ruleForPurpose(fenWherePlayed, intent.prepares.san, mover, taught, intent.about);
}


/** PREVENTION, CLOSED — one rule for every surface (A-plan P2, unified
 *  2026-10-17). Their quiet move prepared `prep.uci` on the board `prep.fen`;
 *  the student's move from that same board took exactly that move away.
 *  Compared on the board (placement, turn, castling, en passant), never on the
 *  clocks. */
export function preventsNamedIdea(prep: { uci: string; fen: string } | null, fenBefore: string, stoppedUci: string): boolean {
  if (!prep) return false;
  const key = (f: string): string => f.split(' ').slice(0, 4).join(' ');
  return key(prep.fen) === key(fenBefore) && prep.uci.slice(0, 4) === stoppedUci.slice(0, 4);
}

/** The tie-back said after the stop is named. */
export const STOPPED_THEIR_IDEA = 'That was the idea behind their last move.';

/** What a prevented threat was worth, landed now (it is already stopped). */
export function preventStakes(prevents: { threatCp: number } | null | undefined): { points: number; plies: number } | undefined {
  return prevents && prevents.threatCp > 0 ? { points: prevents.threatCp / 100, plies: 0 } : undefined;
}

/** The wording alone, for tests of the stems. */
export const phraseIntentForTest = phrase;

/** After `threat` (from `passFen`, the opponent to move), does the moved piece
 *  newly attack `left` — the square the mover's piece just left? */
function hitsSquareLeft(passFen: string, threat: string, left: string): boolean {
  try {
    const c = new Chess(passFen);
    const side = c.turn();
    const before = c.attackers(left as Square, side);
    const mv = c.move({ from: threat.slice(0, 2), to: threat.slice(2, 4), promotion: threat[4] });
    if (!mv) return false;
    return c.attackers(left as Square, side).includes(mv.to) && !before.includes(mv.from);
  } catch { return false; }
}
