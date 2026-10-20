// decisiveReason — THE reason for a move, not A reason (David 2026-10-17: a
// commentator could not say why an engine played an odd pawn move — "do we just
// give 'A' reason or can we find 'The' reason?").
//
// A reason is THE reason when its stake ACCOUNTS FOR THE ENGINE'S GAP between
// the move and the next-best. Every candidate is computed (G0), each by a
// computer that already teaches it:
//   material — the two lines settle different material, each cut where its
//              trades finish and only as deep as forcing play carries it
//              (`heardHorizon`: a check, a capture or an answer to check earns
//              another ply; a quiet move ends the line);
//   stops    — the move takes away the reply they would play after a pass
//              (`moveIntent.prevents`, its threat measured by the engine);
//   prepares — the move makes a follow-up possible (`moveIntent.prepares`).
// When none covers the gap, the answer is A reason — one true thing the move
// does — said as exactly that. When the gap is tiny, several moves are about
// equal and no move has a "the reason" at all.
//
// Pure: the engine reads are handed in (`IntentReads`); no engine call here.
import { Chess } from 'chess.js';
import type { AnalysisLine } from '../types';
import { moveIntent, DEFAULT_INTENT, nullMoveFen, type IntentReads, THREAT_CP } from './moveIntent';
import { heardHorizon, heardProofCut, describeProofResult, settledNetForLine, netPieceWords } from './exchangeLedger';
import { lineSeatAt, lineShape } from '../utils/andList';
import { bestMoveReason } from './deliberation';
import { costWords } from './engineConstants';
import { openSentence } from '../utils/openSentence';
import type { MisconceptionTagId } from '../data/misconceptionTags';

export type ReasonKind = 'the' | 'a' | 'close';
export type ReasonSource = 'material' | 'stops' | 'prepares' | 'description';

export interface DecisiveReason {
  kind: ReasonKind;
  /** Which computer gave the reason; null when nothing could be said. */
  source: ReasonSource | null;
  text: string;
  /** Engine gap between the move and the next-best, mover POV (cp, ≥ 0). */
  gapCp: number;
  /** What the chosen reason is worth (cp); null for a description. */
  stakeCp: number | null;
  nextBestSan: string | null;
  /** "Anything else, like X, gives up N." — the gap said on its own, for a
   *  surface that already speaks the reason's text from its own computer. */
  tail: string | null;
  /** The reason alone, without the gap tail — for a surface that states the
   *  gap its own way (the critical-moment count). */
  core: string | null;
  /** Whether the reason is about the move itself, or about the next-best
   *  failing (a surface that already lists failed alternatives skips those). */
  about: 'move' | 'alternative' | null;
  /** The moves that prove it, from `fenBefore`, for the board. */
  line: { fen: string; sans: string[] } | null;
  squares: string[];
}

/** Below this the best two moves are about equal: there is no single reason. */
export const CLOSE_GAP_CP = 40;
/** A reason must account for this share of the gap to be THE reason. */
export const COVERS_SHARE = 0.6;

const MATE_CP = 100_000;
/** A gap this large is decisive; when forcing play cannot show it, the whole
 *  engine line is read for it. */
/** A mate this short is the reason itself; a longer one is too when the
 *  forcing line reaches it, and otherwise gives way to the concrete win. */
export const SHORT_MATE = 3;
export const DEEP_GAP_CP = 300;
const squareOf = (san: string): string | null => /([a-h][1-8])(?:=[QRBN])?[+#]?$/.exec(san)?.[1] ?? null;

function moverValue(l: AnalysisLine, mover: 'w' | 'b'): number {
  const white = l.mate != null ? (l.mate > 0 ? MATE_CP - Math.abs(l.mate) : -(MATE_CP - Math.abs(l.mate))) : l.evaluation;
  return mover === 'w' ? white : -white;
}

function sansOf(fen: string, uci: readonly string[]): string[] {
  const out: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of uci) out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined }).san);
  } catch { /* the playable prefix */ }
  return out;
}

/** The material a line settles on for `mover` (cp), read only as deep as the
 *  line stays forcing; a line that mates is worth a mate. */
function lineMaterial(fen: string, uci: readonly string[], mover: 'w' | 'b', l: AnalysisLine): number {
  if (l.mate != null) return l.mate > 0 === (mover === 'w') ? MATE_CP : -MATE_CP;
  const sans = sansOf(fen, uci);
  const heard = sans.slice(0, heardHorizon(fen, sans));
  return (settledNetForLine(fen, heard, mover) ?? 0) * 100;
}

/** WHAT A LINE WINS OR LOSES, BY PIECE — never a point count (Learn audit
 *  2026-10-18, V3: "anything else, like gxf3, leaves them 4 points down").
 *  Read off the line's own settled ledger from `mover`'s seat; `gain` says
 *  which side of it to name. Falls back to plain "material" — a reason, not
 *  a statistic — when the ledger has no clean piece name. */
function pieceWords(fen: string, uci: readonly string[], mover: 'w' | 'b', gain: boolean): string {
  try {
    const p = heardProofCut(fen, sansOf(fen, uci), mover);
    const l = p?.ledger;
    if (l) {
      const w = gain ? netPieceWords(l.studentWon, l.opponentWon) : netPieceWords(l.opponentWon, l.studentWon);
      if (w) return w;
    }
  } catch { /* fall through */ }
  return 'material';
}
const heardSans = (fen: string, uci: readonly string[]): string[] => { const sans = sansOf(fen, uci); return sans.slice(0, heardHorizon(fen, sans)); };

/** A line cut where it proves its point, worded from the student's seat ("you
 *  win a pawn" / "they win a knight"). `side` says whether it must prove FOR the
 *  mover (a win, or the mover mating) or AGAINST it (a loss, or the mover mated). */
function seatProof(fen: string, sans: readonly string[], mover: 'w' | 'b', studentWB: 'w' | 'b', side: 'for' | 'against'): { text: string; sans: string[]; end: string } | null {
  const p = heardProofCut(fen, sans, studentWB);
  if (!p) return null;
  const line = p.sans.slice(0, p.plies);
  let end: string;
  if (p.mate) {
    // The line starts with the mover's move: an odd length is the mover mating.
    if ((line.length % 2 === 1) !== (side === 'for')) return null;
    end = "and it's mate";
  } else {
    if (!p.ledger) return null;
    const moverNet = studentWB === mover ? p.ledger.netPawns : -p.ledger.netPawns;
    if (side === 'for' ? moverNet <= 0 : moverNet >= 0) return null;
    end = describeProofResult(p.ledger);
  }
  // Each move with its mover (OS-8 gap 7): the line starts with the side to move on `fen`.
  return { text: `${lineShape(line, lineSeatAt(fen, studentWB))} — ${end}`, sans: line, end };
}

const LATER_WORDS: Record<number, string> = { 1: 'a move', 2: 'two moves', 3: 'three moves', 4: 'four moves', 5: 'five moves', 6: 'six moves' };
/** "lands three moves later with Bxg4" — where a forced line pays off, said
 *  after the result so the move it starts from is never named twice. */
function landsWith(line: readonly string[], mover: 'w' | 'b'): string {
  // The mover's own last capture is where it pays off — not the recapture
  // that follows it ("lands with Bxg4", never "…Bxg4" taking back).
  const own = line.map((san, i) => ({ san, i })).filter((x) => x.i % 2 === 0);
  const pay = [...own].reverse().find((x) => /x|#/.test(x.san)) ?? own[own.length - 1];
  const at = pay?.i ?? 0;
  const later = Math.ceil(at / 2);
  return later === 0 ? `it is ${dot(line[0], mover)} itself` : `it lands ${LATER_WORDS[later] ?? `${later} moves`} later with ${dot(line[at], mover)}`;
}

const dot = (san: string, side: 'w' | 'b'): string => (side === 'b' ? `…${san}` : san);
const movesWord = (n: number): string => `${n} move${n === 1 ? '' : 's'}`;

export function decisiveReason(input: {
  fenBefore: string;
  /** The move to explain (usually the engine's best). */
  san: string;
  reads: IntentReads;
  seat: 'student' | 'opponent';
  opponentLastSan: string | null;
  /** The student's own record shows calculation PROVEN (heat map green on
   *  `calculation-depth`): a forced mate is then posed as a visualization
   *  test — "can you see it?" — with the line on the board, never answered in
   *  the voice. Grey or red: the mate is stated (grey teaches). */
  asksToSee?: boolean;
  /** REQUIRED (OS-10): may the reason name the move the explained move
   *  PREPARES? Learn, before the student's next move, says it by its piece
   *  ("to free your bishop on f1"), never by the move ("for Be2") — LEARN
   *  NAMES NO MOVE UNASKED (David's record, 2026-10-19, 1.e4). Review, chat
   *  and the Why button name it. */
  namesPreparedMove: boolean;
}): DecisiveReason | null {
  const { fenBefore, san, reads, seat } = input;
  let mover: 'w' | 'b';
  let uci: string;
  try {
    const c = new Chess(fenBefore);
    mover = c.turn();
    const m = c.move(san);
    uci = `${m.from}${m.to}${m.promotion ?? ''}`;
  } catch { return null; }
  const lines = [...reads.before].filter((l) => l.moves.length > 0).sort((a, b) => a.rank - b.rank);
  const own = lines.find((l) => l.moves[0] === uci);
  const next = lines.find((l) => l.moves[0] !== uci);
  // NOT ONE OF THE ENGINE'S MOVES: there is no gap for a reason to account for,
  // and the honest answer says that and names what it prefers (asked for —
  // the chat surface; Learn reads only the move the student played as best).
  if (!own && next) {
    const bestSan = sansOf(fenBefore, [lines[0].moves[0]])[0];
    if (!bestSan) return null;
    return { kind: 'a', source: null, text: `${dot(san, mover)} isn't one of the engine's choices here — it prefers ${dot(bestSan, mover)}.`, gapCp: 0, stakeCp: null, nextBestSan: bestSan, tail: null, core: null, about: null, line: null, squares: [] };
  }
  if (!own || !next) return null;
  const nextBestSan = sansOf(fenBefore, [next.moves[0]])[0] ?? null;
  const gapCp = Math.max(0, moverValue(own, mover) - moverValue(next, mover));
  const played = dot(san, mover);
  const whose = seat === 'student' ? 'your' : 'their';
  // Every line is worded from the STUDENT's seat, whoever moves.
  const studentWB: 'w' | 'b' = seat === 'student' ? mover : mover === 'w' ? 'b' : 'w';

  type Cand = { source: ReasonSource; stake: number; text: string; line: DecisiveReason['line']; squares: string[]; /** The reason is about the next-best, which it names. */ alt: boolean };
  const cands: Cand[] = [];

  // MATE FIRST — a forced mate is the reason, either way round.
  const mateOf = (l: AnalysisLine): number | null => (l.mate == null ? null : (l.mate > 0) === (mover === 'w') ? Math.abs(l.mate) : -Math.abs(l.mate));
  const ownMate = mateOf(own);
  const nextMate = mateOf(next);
  // A LONG MATE IS NOT THE REASON A STUDENT CAN SEE (escalating walk
  // 2026-10-17: "Qxf5 starts a forced mate in 10" where Qxf5 takes a free
  // rook). A mate leads when it is short; past that the concrete win leads and
  // the mate is only the fallback.
  // Long = past the FORCING line: a mate the heard proof reaches (every move a
  // check or capture the student can follow) is the reason however many moves
  // it takes; one that runs past it gives way to the win the student can see.
  const heardMate = ownMate !== null && ownMate > 0
    ? !!heardProofCut(fenBefore, sansOf(fenBefore, own.moves), seat === 'student' ? mover : mover === 'w' ? 'b' : 'w')?.mate
    : false;
  const longMate = ownMate !== null && ownMate > SHORT_MATE && !heardMate;
  if (ownMate !== null && ownMate > 0 && !longMate && !(nextMate !== null && nextMate > 0)) {
    const asks = input.asksToSee && seat === 'student' && ownMate > 1;
    cands.push({ source: 'material', stake: MATE_CP, text: ownMate === 1 ? `${played} is mate.` : asks ? `${played} starts a forced mate in ${movesWord(ownMate)} — can you see how it goes? The line is on the board when you want it.` : `${played} starts a forced mate in ${movesWord(ownMate)}.`, line: { fen: fenBefore, sans: sansOf(fenBefore, own.moves).slice(0, 2 * ownMate - 1) }, squares: [], alt: false });
  } else if (nextMate !== null && nextMate < 0 && nextBestSan) {
    const n = -nextMate;
    cands.push({ source: 'material', stake: MATE_CP, text: `The natural alternative, ${dot(nextBestSan, mover)}, walks into a forced mate${n > 1 ? ` in ${movesWord(n)}` : ''}.`, line: { fen: fenBefore, sans: sansOf(fenBefore, next.moves).slice(0, 2 * n) }, squares: [], alt: true });
  } else {
    // MATERIAL — the difference the two lines settle on, not either alone: a
    // pawn both lines win is not why one beats the other.
    const matOwn = lineMaterial(fenBefore, own.moves, mover, own);
    const matNext = lineMaterial(fenBefore, next.moves, mover, next);
    const matStake = matOwn - matNext;
    // AN ALTERNATIVE "FAILS" ONLY WHEN THE ENGINE SAYS SO (Black walk
    // 2026-10-19, move 26: "the natural alternative, …Kf8, fails … you come
    // out ahead, winning a rook and a pawn for a bishop" — …Kf8 was 0.45 off
    // best). A forced win is proved by its own line; a loss pinned on the
    // OTHER move needs the eval gap to carry the material it names, or the
    // count is a mid-line artifact of a shallow line.
    const altTrusted = gapCp >= COVERS_SHARE * Math.min(matStake, MATE_CP / 2);
    // A RECAPTURE: the trade they started finishes here; the reason is taking
    // back, and the cost is what any other move leaves them holding.
    const recapture = !!input.opponentLastSan && /x/.test(input.opponentLastSan) && /x/.test(san)
      && squareOf(input.opponentLastSan) === squareOf(san);
    // The seat leads the sentence: "Their Nxd4 takes back" was spoken "their
    // knight takes d4 takes back" (prod walk 2026-10-18) — a capture cannot
    // also be the verb.
    if (recapture && matStake > 0 && altTrusted && nextBestSan) {
      cands.push({ source: 'material', stake: matStake, text: `${seat === 'student' ? 'You take' : 'They take'} back with ${played} — anything else, like ${dot(nextBestSan, mover)}, loses ${pieceWords(fenBefore, next.moves, mover, false)} in the line that follows.`, line: { fen: fenBefore, sans: heardSans(fenBefore, next.moves) }, squares: [squareOf(san) ?? ''].filter(Boolean), alt: true });
    } else if (matStake > 0) {
      const win = matOwn > 0 ? seatProof(fenBefore, sansOf(fenBefore, own.moves), mover, studentWB, 'for') : null;
      const loss = !win && matNext < 0 && altTrusted ? seatProof(fenBefore, sansOf(fenBefore, next.moves), mover, studentWB, 'against') : null;
      if (win) cands.push({ source: 'material', stake: matStake, text: win.sans.length <= 1 ? `${openSentence(win.text)}.` : win.end === "and it's mate" ? `${played} starts a forced mate — ${landsWith(win.sans, mover)}.` : `${played} wins by force: ${win.end} — ${landsWith(win.sans, mover)}.`, line: { fen: fenBefore, sans: win.sans }, squares: [], alt: false });
      else if (loss && nextBestSan) cands.push({ source: 'material', stake: matStake, text: `The natural alternative, ${dot(nextBestSan, mover)}, fails: ${loss.text}.`, line: { fen: fenBefore, sans: loss.sans }, squares: [], alt: true });
      // No short proof, but the count is the reason: say the count, never let a
      // smaller reason stand in for it.
      else if (matOwn > 0) cands.push({ source: 'material', stake: matStake, text: `${played} comes out of the trades that follow ahead — it wins ${pieceWords(fenBefore, own.moves, mover, true)}.`, line: { fen: fenBefore, sans: heardSans(fenBefore, own.moves) }, squares: [], alt: false });
      else if (nextBestSan && altTrusted) cands.push({ source: 'material', stake: matStake, text: `The natural alternative, ${dot(nextBestSan, mover)}, comes out of the trades that follow behind — it loses ${pieceWords(fenBefore, next.moves, mover, false)}.`, line: { fen: fenBefore, sans: heardSans(fenBefore, next.moves) }, squares: [], alt: true });
    }
    // PAST THE FORCING HORIZON: a big gap the heard line cannot show is read on
    // the engine's whole line — the material it ends on, said as further down
    // the line, never as forced.
    if (!cands.length && gapCp >= DEEP_GAP_CP && nextBestSan) {
      const nextSans = sansOf(fenBefore, next.moves);
      const ownFull = (settledNetForLine(fenBefore, sansOf(fenBefore, own.moves), mover) ?? 0) * 100;
      const nextFull = (settledNetForLine(fenBefore, nextSans, mover) ?? 0) * 100;
      if (ownFull - nextFull > 0 && nextFull < 0) cands.push({ source: 'material', stake: ownFull - nextFull, text: (() => { const w = pieceWords(fenBefore, next.moves, mover, false); return `The natural alternative, ${dot(nextBestSan, mover)}, loses ${w === 'material' ? 'material further down the line' : `${w} further down the line`}.`; })(), line: { fen: fenBefore, sans: nextSans }, squares: [], alt: true });
    }
  }

  if (!cands.length && longMate && ownMate !== null && !(nextMate !== null && nextMate > 0)) {
    cands.push({ source: 'material', stake: MATE_CP, text: `${played} starts a forced mate in ${movesWord(ownMate)}.`, line: { fen: fenBefore, sans: sansOf(fenBefore, own.moves).slice(0, 2 * ownMate - 1) }, squares: [], alt: false });
  }

  // STOPS / PREPARES — the pass read, worded by the computer that owns it.
  // Each carries its evidence as a line the board can show: the threat played
  // as if the mover had passed, or the follow-up played as if the other side
  // had — the move the reason names, from the board it is true on.
  const mi = moveIntent(fenBefore, san, reads, seat, { ...DEFAULT_INTENT, holdPrepared: !input.namesPreparedMove });
  const shown = (fen: string | null, moveSan: string): DecisiveReason['line'] => {
    if (!fen) return null;
    try { new Chess(fen).move(moveSan); return { fen, sans: [moveSan] }; } catch { return null; }
  };
  const fenAfter = (() => { try { const c = new Chess(fenBefore); c.move(san); return c.fen(); } catch { return null; } })();
  if (mi?.prevents && mi.prevents.threatCp >= THREAT_CP) cands.push({ source: 'stops', stake: Math.min(MATE_CP - 1, mi.prevents.threatCp), text: mi.text, line: shown(nullMoveFen(fenBefore), mi.prevents.san), squares: mi.squares, alt: false });
  else if (mi?.prepares) cands.push({ source: 'prepares', stake: mi.prepares.gainCp, text: mi.text, line: fenAfter ? shown(nullMoveFen(fenAfter), mi.prepares.san) : null, squares: mi.squares, alt: false });

  // Among the reasons that account for the gap, the most concrete speaks: a
  // count beats a stopped move beats a prepared one. Otherwise the largest.
  const PRIORITY: Record<ReasonSource, number> = { material: 0, stops: 1, prepares: 2, description: 3 };
  cands.sort((a, b) => b.stake - a.stake);
  // Behind a long mate the gap is the mate's, which no count can cover: the
  // forced win the student can see covers it, and the mate is said after.
  const mateText = (c: { text: string }): boolean => /forced mate|\bis mate\./.test(c.text);
  const covering = longMate && cands.some((c) => c.source === 'material' && !mateText(c))
    ? cands.filter((c) => c.source === 'material' && !mateText(c))
    : cands.filter((c) => c.stake >= COVERS_SHARE * gapCp).sort((a, b) => PRIORITY[a.source] - PRIORITY[b.source]);
  const top = covering.at(0) ?? cands.at(0);
  // The board description is worded for the MOVER ("pushes your passed pawn"),
  // so it speaks only for the student's own move — never re-pronouned.
  const description = seat === 'student' ? bestMoveReason(fenBefore, san, mover, { mateIn: null, opponentLastSan: input.opponentLastSan }) : null;
  const base = { gapCp, nextBestSan, tail: null as string | null, core: null as string | null, about: null as DecisiveReason['about'] };

  if (gapCp < CLOSE_GAP_CP) {
    const alt = nextBestSan ? `${dot(nextBestSan, mover)} is about as good` : 'other moves are about as good';
    // Close moves differ by nothing a line proves, so what the move DOES is the
    // honest thing to say; a material count here would contradict "about as good".
    const quiet = top && top.source !== 'material' ? top : undefined;
    // A STOPPED THREAT IS THE REASON EVEN WHEN SEVERAL MOVES SHARE IT (contract
    // board 2026-10-17: f5/g6/h6 all stop Re8 mate, and the answer said "it
    // fights for e4"). It outranks a board description; a mere preparation
    // does not.
    const stops = quiet?.source === 'stops' ? quiet : undefined;
    const what = stops ? stops.text : description ? `One thing it does: ${played} ${description}.` : quiet?.text ?? null;
    const src: ReasonSource | null = stops ? 'stops' : description ? 'description' : quiet?.source ?? null;
    const useQuiet = !!stops || !description;
    // TWO PLANS, ABOUT EQUAL (David 2026-10-18, the close call: "name both
    // plans and what each commits to"). When the board teacher says what the
    // played move does AND what the equal alternative does, and they differ,
    // that difference is the decision a strong player weighs — said as two
    // plans, never as "no reason". The alternative is read by the SAME
    // computer from the same seat.
    const altDescription = seat === 'student' && description && nextBestSan && !stops
      ? bestMoveReason(fenBefore, nextBestSan, mover, { mateIn: null, opponentLastSan: input.opponentLastSan })
      : null;
    if (altDescription && description && twoPlans(description, altDescription) && nextBestSan) {
      // `core` is the contrast alone — chat leads with its own "X and Y are
      // about equally good", so the core must not say it twice.
      const contrast = `${played} ${description}; ${dot(nextBestSan, mover)} ${altDescription}. The choice is which job you want done.`;
      return { ...base, kind: 'close', source: 'description', stakeCp: null, core: contrast, text: `Two plans here, about equal: ${contrast}`, line: null, squares: [] };
    }
    // A shared reason is still a reason: said first, the equal move after.
    // The reason LEADS; the equal move follows (prod walk 2026-10-19: "why is
    // that move best?" opened "There is no single reason here", answering a
    // why with a no before saying what the move does).
    const closeText = stops ? `${what} ${openSentence(alt)}.` : what ? `${what} It isn't the only good move — ${alt}.` : `It isn't the only good move here — ${alt}.`;
    return { ...base, kind: 'close', source: src, stakeCp: null, core: what, text: closeText, line: useQuiet ? quiet?.line ?? null : null, squares: useQuiet ? quiet?.squares ?? [] : [] };
  }
  if (top && (top.stake >= COVERS_SHARE * gapCp || covering.includes(top))) {
    const asksMate = longMate && covering.includes(top) && !mateText(top) && input.asksToSee && seat === 'student';
    const tail = longMate && covering.includes(top) && !mateText(top)
      ? asksMate
        ? ` And there's a forced mate in ${movesWord(ownMate)} after it — can you see it? The line is on the board when you want it.`
        : ` And the engine sees a forced mate in ${movesWord(ownMate)} after it.`
      : nextBestSan && !top.alt
        ? mateText(top) ? ` Anything else, like ${dot(nextBestSan, mover)}, lets the mate go.` : ` Anything else, like ${dot(nextBestSan, mover)}, gives up ${costWords(gapCp)}.`
        : '';
    // Their move, said as theirs ("Their …Bxf7 wins by force", never a bare
    // "…Bxf7 wins" the student must work out the owner of).
    const core = seat !== 'opponent' ? top.text
      : top.text.startsWith('…') ? `Their ${top.text}`
        : top.text.startsWith(`${san} `) ? `Their ${played}${top.text.slice(san.length)}`
          : top.text;
    const mateLine = asksMate && ownMate !== null ? { fen: fenBefore, sans: sansOf(fenBefore, own.moves).slice(0, 2 * ownMate - 1) } : null;
    return { ...base, kind: 'the', source: top.source, stakeCp: top.stake, text: `${core}${tail}`, tail: tail.trim() || null, core, about: top.alt ? 'alternative' : 'move', line: mateLine && ownMate !== null && mateLine.sans.length >= 2 * ownMate - 1 ? mateLine : top.line, squares: top.squares };
  }
  // NOTHING ACCOUNTS FOR THE GAP: the engine's edge lies past what forcing play
  // shows. Say so, and give the one true thing the move does — marked as one.
  const one = top?.text ?? (description ? `One thing ${whose} ${played} does: it ${description}.` : null);
  return { ...base, kind: 'a', source: top?.source ?? (description ? 'description' : null), stakeCp: top?.stake ?? null, text: `No single reason shows in the next few moves${nextBestSan ? ` — anything else, like ${dot(nextBestSan, mover)}, gives up ${costWords(gapCp)}, for reasons further down the line` : ''}.${one ? ` ${one}` : ''}`, line: top?.line ?? null, squares: top?.squares ?? [] };
}

/** TWO DIFFERENT PLANS, not two words for one: the first action differs
 *  ("prepares to fianchetto" against "opens the diagonal"; never "develops"
 *  against "develops"), and neither is a tactic — a fork or a pin between two
 *  equal moves wins nothing, so it is not a plan to choose between. */
const TACTIC_WORDS = /\b(?:forks?|pins?|skewers?|x-ray|check|mates?|wins?)\b/i;
export function twoPlans(a: string, b: string): boolean {
  if (a === b || TACTIC_WORDS.test(a) || TACTIC_WORDS.test(b)) return false;
  const verb = (t: string): string => t.trim().split(/[\s,;—-]+/)[0]?.toLowerCase() ?? '';
  return verb(a) !== verb(b);
}

/** IS THIS A MOMENT WITH A REASON TO WAIT FOR? A real decision: the best and
 *  the next-best are at least `CLOSE_GAP_CP` apart for the side to move. The
 *  Learn reply waits on the reason only here; a quiet move replies at once. */
export function reasonEarned(lines: readonly AnalysisLine[] | undefined, mover: 'w' | 'b'): boolean {
  const ls = [...(lines ?? [])].filter((l) => l.moves.length > 0).sort((a, b) => a.rank - b.rank);
  if (ls.length < 2) return false;
  return moverValue(ls[0], mover) - moverValue(ls[1], mover) >= CLOSE_GAP_CP;
}

/** How long past its own think-time a Learn reply may wait on the reason. Past
 *  it the reply plays and the reason follows the move it is about. */
export const REASON_WAIT_CEILING_MS = 2500;

// ── BOTH WAYS (David 2026-10-17: "All wiring needs to go both ways") ─────────
// The computer that TEACHES the reason also says what the position POSED, so a
// student who finds the decisive move is credited with that skill and one who
// misses it is caught on it — one vocabulary in both directions. Held as a
// Record so a new reason source fails to compile until it names its skill.

/** The skill each kind of decisive reason tests. A description poses nothing:
 *  "one thing it does" is not a question the board asked. */
const REASON_TAG: Record<ReasonSource, { move: MisconceptionTagId; alternative: MisconceptionTagId } | null> = {
  // A forced win or mate for the move is a tactic found; the natural move
  // failing is a line calculated past its first move.
  material: { move: 'missed-tactic', alternative: 'calculation-depth' },
  stops: { move: 'missed-opponents-threat', alternative: 'missed-opponents-threat' },
  prepares: { move: 'no-plan', alternative: 'no-plan' },
  description: null,
};

/** How live the question was: the gap the reason accounts for, scaled to the
 *  0-100 posed-importance the evidence store reads. */
export function reasonImportance(gapCp: number): number {
  return gapCp >= 300 ? 90 : gapCp >= 150 ? 75 : 60;
}

/** What THE reason posed, for the record — null for A reason or a close call. */
export function reasonPosed(r: DecisiveReason | null): { tag: MisconceptionTagId; posedImportance: number } | null {
  if (!r || r.kind !== 'the' || !r.source) return null;
  const tags = REASON_TAG[r.source];
  if (!tags) return null;
  return { tag: r.about === 'alternative' ? tags.alternative : tags.move, posedImportance: reasonImportance(r.gapCp) };
}

