// A GAMBIT'S IDEA AND ITS VERDICT, said apart (fix 4, 2026-11-13). The
// writers teach a gambit in two halves: what is given and what comes back
// for it ("sacrifices another pawn in return for faster development after
// Nxc3"), and, separately, whether it pays ("Black does not get compensation
// for the lost material"). The app said neither: `compensation` speaks only
// when the engine already calls the side down material level or better, so a
// dubious gambit was silent and a sound one said its verdict with no line.
//
// Read off the engine's reply fan after the move (`after`, the opponent to
// move): the acceptance line is the highest line that starts with a capture
// and leaves the mover down material once its trades settle. The idea is that
// line to its first quiet point and what the board then shows for the
// material (the one list, `compensationReasons`); the verdict is the line's
// own number from the mover's seat — sound when it is level or better, honest
// when it is not.
//
// Pure: chess.js, the material count, the exchange ledger and the reads.
import { Chess, type Square } from 'chess.js';
import { signedLegalSeeFor } from './positionReadingService';
import type { AnalysisLine } from '../types';
import { quietBalance } from './material';
import { materialBalance } from './pieceValues';
import { computeExchangeLedger, materialGainWords } from './exchangeLedger';
import { compensationReasons } from './compensation';
import { evalBand, evalBandWords } from './evalBand';
import { lineSeatAt, lineShape } from '../utils/andList';
import { countWords } from '../utils/countWords';

export interface GambitIdea {
  /** The move's predicate: "offers a pawn: if they play dxc3 and you answer Nxc3, you're a piece ahead in development". */
  clause: string;
  /** The engine's verdict on the gambit, its own sentence. */
  verdict: string;
  /** Sound: the line holds level or better for the side that gave material. */
  sound: boolean;
  /** The acceptance line to its quiet point, SAN, the capture first. */
  sans: string[];
  /** The square the material is taken on. */
  captureSquare: string;
  squares: string[];
}

const LINE_PLIES = 8;
const QUIET_PLIES = 6;
/** A gambit is level or better within half a pawn. */
const SOUND_CP = -50;
/** Past this the giver is clearly worse: no gambit, a mistake. */
const CLEARLY_LOST_CP = 150;

function sansOf(fen: string, uci: readonly string[], max: number): string[] {
  const out: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of uci.slice(0, max)) out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
  } catch { /* the playable prefix */ }
  return out;
}

const fenAfterLine = (fen: string, sans: readonly string[]): string | null => {
  try { const c = new Chess(fen); for (const s of sans) c.move(s); return c.fen(); } catch { return null; }
};

const forcing = (san: string | undefined): boolean => !!san && /x|\+|#/.test(san);

export function gambitIdea(
  fenBefore: string,
  san: string,
  after: readonly AnalysisLine[],
  studentWB: 'w' | 'b',
): GambitIdea | null {
  let fenAfter: string;
  let mover: 'w' | 'b';
  let played: { to: string; piece: string };
  try {
    const c = new Chess(fenBefore);
    mover = c.turn();
    // A move out of check gives nothing away of its own choosing.
    if (c.inCheck()) return null;
    const m = c.move(san);
    played = { to: m.to, piece: m.piece };
    fenAfter = c.fen();
  } catch { return null; }
  const pov = (whiteCp: number): number => (mover === 'w' ? whiteCp : -whiteCp);
  const startQuiet = pov(quietBalance(fenBefore));
  const startRaw = pov(materialBalance(fenBefore));
  const capture = /x/.test(san);
  const takerColor: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
  for (const l of after) {
    if (l.mate !== null && l.mate !== undefined) continue;
    const sans = sansOf(fenAfter, l.moves, LINE_PLIES);
    if (!/x/.test(sans[0] ?? '')) continue;
    // The first quiet point after the mover's own reply: the material the
    // gambit settles on, before the next trade begins.
    let k = 0;
    for (let n = 2; n <= Math.min(QUIET_PLIES, sans.length); n += 2) {
      if (!forcing(sans[n])) { k = n; break; }
    }
    if (k === 0) continue;
    // THE GIFT IS THIS MOVE'S (bench read 2026-11-13: Kh1 "offers a knight"
    // that was already hanging, O-O "offers" a pawn already loose): the piece
    // taken stood there before the move and could not be won then.
    let capSq = ''; let capType = '';
    try { const cm = new Chess(fenAfter).move(sans[0]); capSq = cm.to; capType = cm.captured ?? ''; } catch { continue; }
    if (capSq !== played.to && new Chess(fenBefore).get(capSq as Square)?.color === mover && signedLegalSeeFor(fenBefore, capSq as Square, takerColor) > 0) continue;
    const prefix = sans.slice(0, k);
    const fenPoint = fenAfterLine(fenAfter, prefix);
    if (!fenPoint) continue;
    // What is given: the material on the board (e6 …fxe6 gives the e-pawn,
    // not also the d5-pawn White chose not to take), or, when the trades left
    // it even, the take-back the move gave up (c3 …dxc3 Nxc3: the d4-pawn is
    // no longer White's to win back).
    const raw = Math.round(startRaw - pov(materialBalance(fenPoint)));
    // When the trades leave the count even, the one gift left is a take-back
    // given up: the pawn just pushed is taken (c3 …dxc3 Nxc3: the d4-pawn is
    // no longer White's to win back) — a pawn, never more. A piece traded for
    // a piece (Bxc6 …bxc6) gives nothing.
    const down = raw >= 1 ? raw
      : played.piece === 'p' && capSq === played.to && capType === 'p' ? Math.min(1, Math.round(startQuiet - pov(quietBalance(fenPoint)))) : 0;
    if (down < 1) continue;
    // What is given, by piece where the ledger names it ("a knight for a
    // pawn"), else by count.
    const ledger = computeExchangeLedger(fenBefore, [san, ...prefix], mover === 'w' ? 'b' : 'w');
    const pieceWords = ledger && ledger.netPawns >= 1 ? materialGainWords(ledger) : null;
    const given = pieceWords && !/^(a|two|three) pawns?$/.test(pieceWords) ? pieceWords : countWords(down);
    const { reasons, squares } = compensationReasons(new Chess(fenPoint), mover, studentWB, 1);
    const seat = lineSeatAt(fenAfter, studentWB);
    const shape = lineShape(prefix, seat, fenAfter, 'first');
    const why = reasons.length === 0 ? '' : `, ${reasons.length === 1 ? reasons[0] : `${reasons.slice(0, -1).join(', ')} and ${reasons.at(-1)}`}`;
    // A capture or a check gives the material; any other move leaves it to take.
    const verb = capture || /\+/.test(san) ? 'gives' : 'offers';
    const taker0 = seat === 'you' ? 'you' : 'they';
    const clause = reasons.length > 0
      ? `${verb} ${given}: if ${shape}${why}`
      : `${verb} ${given}, and ${taker0} can take with ${prefix[0]}`;
    const cp = pov(l.evaluation);
    // Material given for a clearly lost position is a mistake, not a gambit:
    // what the move allows is said instead (bench 2026-11-13, Bxe6+?? "gives
    // a pawn … they're winning").
    if (cp < -CLEARLY_LOST_CP) return null;
    const sound = cp >= SOUND_CP;
    const giver = mover === studentWB ? 'you' : 'they';
    const taker = giver === 'you' ? 'they' : 'you';
    const band = evalBand(cp);
    const verdict = sound
      ? (band === 'level' ? 'The engine calls it about level, so the material is paid for.' : `The engine likes it: ${giver === 'you' ? "you're" : "they're"} ${evalBandWords(band, 'better')} even ${countWords(down)} down.`)
      : `The engine says it does not ${band === 'slightly' ? 'quite ' : ''}pay: ${taker === 'you' ? "you're" : "they're"} ${evalBandWords(band, 'better')}.`;
    const sq = [...new Set([...squares, ...prefix.map((s) => /([a-h][1-8])(?:=[QRBN])?[+#]?$/.exec(s)?.[1]).filter((x): x is string => !!x)])];
    return { clause, verdict, sound, sans: prefix, squares: [...new Set([capSq, ...sq])], captureSquare: capSq };
  }
  return null;
}
