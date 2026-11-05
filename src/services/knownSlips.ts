// knownSlips — THE KNOWN MISTAKES AND TRAPS, SAID IN REVIEW (David 2026-11-04:
// "it needs to be in review for sure").
//
// The club gem index (`clubGems`) knows, board by board, the moves club players
// under 1600 really play there that the other side punishes — mined offline,
// every move one club players played or the engine's, the punishment played to
// a quiet board and agreed by a second deeper read (G3). Review reads it here,
// through the one board registry (`boardComputers.knownSlip`), and says it on
// the move it belongs to, both seats:
//
//   - REACHED: the game arrives on a board the index holds a slip for, and the
//     side to move plays something else — said on the move that REACHED the
//     board: "A known mistake here: 4.6% of club players under 1600 play f6,
//     and after Bc4 they have the better game."
//   - PLAYED: the side to move played the slip — said on that move, as why it
//     was a mistake: "That was a known trap: …, and after Qxf7# it's mate."
//
// A slip is called a TRAP only when it clears the one trap bar
// (`isWeaponGem`, F04: the punishment wins a piece or mates); every other one
// is "a known mistake". Every number in the sentence is the index's; the words
// only phrase it (G0). Learn is NOT decided (the gems stay off Learn, David
// 2026-10-29), so no Learn file reads this module (gate:
// `gemCrushLines.computed.test.ts`).
//
// PURE but for `loadKnownSlipIndex`, the one read of the index file.
import { Chess } from 'chess.js';
import { clubGemBoards, clubGemForIndex, type ClubGem } from './clubGems';
import { computeExchangeLedger, netPieceWords } from './exchangeLedger';
import { isWeaponGem } from '../data/lessons/punishGems';
import { legalLineProof, type Proof } from './proof';
import { lineSeatAt } from '../utils/andList';
import { rotateStem } from '../utils/rotateStem';
import { mateStakes, type FactStakes } from './factStakes';
import type { FactSeat } from './coachFact';

export type { ClubGem };

/** The index as Review reads it: the known slips at every board, keyed by the
 *  board's first four FEN fields (pieces, side to move, castling, en passant). */
export type KnownSlipIndex = Readonly<Record<string, readonly ClubGem[]>>;

/** THE ONE READ OF THE INDEX FILE for Review — awaited before the walk builds,
 *  so no line is dropped for a file still loading. Null only when the index
 *  cannot be had at all (offline with no copy): there is then nothing to say. */
export async function loadKnownSlipIndex(): Promise<KnownSlipIndex | null> {
  return clubGemBoards();
}

/** The index's board key for a position. */
function boardKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

/** The slips the index holds at this board, or none. */
export function knownSlipsAt(index: KnownSlipIndex | null, fen: string): readonly ClubGem[] {
  return index?.[boardKey(fen)] ?? [];
}

/** Two moves are the same move on this board — by COORDINATES, never by SAN
 *  string (G4.5.2: a check mark or a disambiguation renders one move two ways). */
function sameMove(fen: string, a: string, b: string): boolean {
  try {
    const x = new Chess(fen).move(a.replace(/^…/, ''));
    const y = new Chess(fen).move(b.replace(/^…/, ''));
    return x.from === y.from && x.to === y.to && (x.promotion ?? '') === (y.promotion ?? '');
  } catch {
    return false;
  }
}

export interface KnownSlipContext {
  /** The board the slip is played from (its side to move would play it). */
  fen: string;
  /** The slips the index holds at that board (`knownSlipsAt`). */
  gems: readonly ClubGem[];
  /** The move the game played from that board; null when the game ended there. */
  played: string | null;
  /** Said on the move that PLAYED the slip, or on the move that REACHED its
   *  board when the game went another way. */
  on: 'played' | 'reached';
  student: 'w' | 'b';
  /** The punishing reply the move's own verdict already named (`errorWhy`),
   *  or null — a punishment is said once on a move, so the slip is then only
   *  named as a known one. */
  verdictPunish: string | null;
  /** The alternative the next move's refuted-alternative names (Review's
   *  `refutedFromFan`), or null — when it is this board's slip, the claim is
   *  said there, by the computer that costs it on the student's own move. */
  saidNext: string | null;
  /** How many known slips the game has said before this one — its words
   *  rotate on it (ROTATED, never rolled: one formula is never said three
   *  times a game, the WHY standard's measure 3). */
  told: number;
}

export interface KnownSlipRead {
  /** Its say-once key: one board, one slip — said once a game per position. */
  key: string;
  text: string;
  /** The slip and its punishment, played from the board (an engine line,
   *  exact only for a mate in one). */
  proof: Proof;
  squares: string[];
  stakes: FactStakes | null;
  /** Whose slip it is: the student's own possible (or played) mistake, or the
   *  opponent's. */
  seat: FactSeat;
  /** It names a move the student could still play on the board they move on
   *  next — only a slip of theirs still ahead. */
  namesStudentMove: boolean;
}

/** What the punishment ends in, from the student's seat: "they force mate",
 *  "you win a rook and a knight", "they have the better game". The material is
 *  counted off the line itself through the one ledger (`netPieceWords`), never
 *  named from a point total (nine points is a rook, a knight and a pawn, not
 *  "the queen"); a line that wins no settled material is the index's verdict
 *  at its quiet end — the better game, or a win by force for a trap. */
function outcome(gem: ClubGem, fen: string, line: readonly string[], punisher: 'you' | 'they', student: 'w' | 'b'): string {
  if (gem.mate) return `${punisher} force mate`;
  const ledger = computeExchangeLedger(fen, line, student);
  if (ledger) {
    const took = punisher === 'you' ? ledger.studentWon : ledger.opponentWon;
    const gave = punisher === 'you' ? ledger.opponentWon : ledger.studentWon;
    const net = punisher === 'you' ? ledger.netPawns : -ledger.netPawns;
    const words = net >= 1 ? netPieceWords(took, gave) : null;
    if (words) return `${punisher} win ${words}`;
  }
  return gem.tier === 'known' ? `${punisher} have the better game` : `${punisher} win by force`;
}

/** THE COMPUTER: the known slip at a board, read for the move it belongs to. */
export function knownSlip(ctx: KnownSlipContext): KnownSlipRead | null {
  const { fen, played, on, student } = ctx;
  if (!played || ctx.gems.length === 0) return null;
  let mover: 'w' | 'b';
  try { mover = new Chess(fen).turn(); } catch { return null; }
  const isPlayed = (g: ClubGem): boolean => sameMove(fen, g.slip, played);
  let gem: ClubGem | undefined;
  if (on === 'played') {
    gem = ctx.gems.find(isPlayed);
  } else {
    // The game played one of the board's slips: it is said on that move.
    if (ctx.gems.some(isPlayed)) return null;
    // The slip most worth knowing at the board — the miner's own ranking.
    gem = [...ctx.gems].sort((a, b) => b.juice - a.juice)[0];
    if (gem && ctx.saidNext && sameMove(fen, gem.slip, ctx.saidNext)) return null;
  }
  if (!gem) return null;
  const asGem = clubGemForIndex(gem);
  if (!asGem) return null;
  // The slip and its punishment, played from this board; a line that does not
  // play is no proof, and the slip is not said.
  const exactMate = gem.mate && asGem.punishSeq.length === 1;
  const proof = legalLineProof(fen, [gem.slip, ...asGem.punishSeq], lineSeatAt(fen, student), exactMate);
  const sans = proof?.line?.sans ?? [];
  if (!proof || sans.length < 2) return null;
  const [slipSan, punishSan] = sans;
  const slipBy: FactSeat = mover === student ? 'student' : 'opponent';
  const punisher = slipBy === 'student' ? 'they' : 'you';
  const name = isWeaponGem(asGem) ? 'trap' : 'mistake';
  // What it costs: a mate on the board, or the line's own result.
  const result = exactMate ? `${punishSan} is mate` : `after ${punishSan} ${outcome(gem, fen, sans, punisher, student)}`;
  let afterSlip = '';
  try { const b = new Chess(fen); b.move(slipSan); afterSlip = b.fen(); } catch { return null; }
  const verdictSaidIt = on === 'played' && !!ctx.verdictPunish && sameMove(afterSlip, ctx.verdictPunish, punishSan);
  const share = `${gem.share}% of club players under 1600`;
  // Rotated on how many the game has said (never rolled): one formula is
  // never said three times a game.
  const text = rotateStem(on === 'reached'
    ? [
      `A known ${name} here: ${share} play ${slipSan}, and ${result}.`,
      `${slipSan} is a known ${name} on this board: ${share} play it, and ${result}.`,
      `Here, ${share} play ${slipSan} — a known ${name}: ${result}.`,
    ]
    : verdictSaidIt
      ? [
        `That was a known ${name}: ${share} play ${slipSan} here.`,
        `${slipSan} is a known ${name} at club level: ${share} play it here.`,
        `Here, ${share} play ${slipSan} — a known ${name}.`,
      ]
      : [
        `That was a known ${name}: ${share} play ${slipSan} here, and ${result}.`,
        `${slipSan} is a known ${name} at club level: ${share} play it here, and ${result}.`,
        `Here, ${share} play ${slipSan} — a known ${name}: ${result}.`,
      ], ctx.told);
  const squares: string[] = [];
  try {
    const b = new Chess(fen);
    const s = b.move(slipSan);
    const p = b.move(punishSan);
    squares.push(s.from, s.to, p.to);
  } catch { /* the proof already played it */ }
  const lands = asGem.punishSeq.length + (on === 'reached' ? 1 : 0);
  const stakes: FactStakes | null = gem.mate
    ? mateStakes(punisher === 'you' ? 'you' : 'them', lands, on === 'played')
    : gem.endCp > 0 ? { points: gem.endCp / 100, plies: lands } : null;
  return {
    key: `known-slip:${boardKey(fen)}:${slipSan.replace(/[+#]+$/, '')}`,
    text,
    proof,
    squares: [...new Set(squares)],
    stakes,
    seat: slipBy,
    namesStudentMove: on === 'reached' && slipBy === 'student',
  };
}
