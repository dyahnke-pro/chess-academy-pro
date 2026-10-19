// PRACTICAL IDEAS A STRONG PLAYER NAMES OUT LOUD (Scotch Gambit speedrun,
// video Y-a6cV08zDM, read 2026-10-19). Each is a board fact a computer can
// prove, used both ways — to teach the idea when the student finds it, and to
// warn when it is played against them or missed:
//   · giving a gambit pawn back on your own terms;
//   · one move that guards two loose pieces at once (a "defensive fork");
//   · two of their pieces a knight's jump apart (the fork pattern to scan for);
//   · a mate threat whose every defence loses something else;
//   · the queen trade: safe a piece up, no shortcut with only a pawn or two.
// Pure. Names squares, never the student's next move.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { play, piecesOf, type StructureRead } from './structureJudgementKit';
import { squaresProof } from './proof';
import { legalSeeGainFor, legalSeeGainOn, landingIsSafe, asIfToMove } from './positionReadingService';
import { MATERIAL_VALUE, materialBalance } from './pieceValues';
import { andList } from '../utils/andList';

/** A move the engine counts as sound. */
const SOUND_CP = 50;
/** Through this move number a returned pawn is a gambit's pawn. */
const GAMBIT_MOVES = 15;
/** A move that cost something real. */
const COSTLY_CP = 100;

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const boardOf = (fen: string): Chess | null => { try { return new Chess(fen); } catch { return null; } };
const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const valueOf = (t: PieceSymbol): number => MATERIAL_VALUE[t] ?? 0;
/** Material for `side`, from that side's chair, in pawns. */
const balanceFor = (fen: string, side: Color): number => (side === 'w' ? 1 : -1) * materialBalance(fen);

function withProof(act: StructureRead['act'], text: string, squares: string[], key: string): StructureRead | null {
  const proof = squaresProof(text, squares);
  return proof ? { act, text, squares, proof, key } : null;
}

// ── 1. GIVE THE PAWN BACK ON YOUR OWN TERMS ───────────────────────────────

/** Student pawns the opponent can win outright. */
const loosePawns = (c: Chess, student: Color): Square[] =>
  piecesOf(c, student, 'p').filter((s) => legalSeeGainFor(c.fen(), s, other(student)) > 0);

/** A pawn up, the student pushes a pawn into a square where they can take it
 *  back — returning the extra pawn on their terms instead of defending it. */
export function givePawnBack(fenBefore: string, san: string, student: Color, cpLoss: number): StructureRead | null {
  if (cpLoss >= SOUND_CP) return null;
  // A gambit pawn is an opening matter; later, a pawn push that drops a pawn
  // is a breakthrough or a mistake, not "giving it back".
  if (Number(fenBefore.split(' ')[5] ?? 99) > GAMBIT_MOVES) return null;
  if (balanceFor(fenBefore, student) < 1) return null;
  const before = boardOf(fenBefore);
  const r = play(fenBefore, san);
  if (!before || !r || r.mv.piece !== 'p' || r.mv.captured || r.after.inCheck()) return null;
  if (!loosePawns(r.after, student).includes(r.mv.to)) return null;
  const text = `You hand the extra pawn back on your own terms: on ${r.mv.to} it costs them a move to take, and your pieces are no longer tied to guarding it. Against a gambit you can hold the pawn, ignore the attack, or give it back where it suits you.`;
  return withProof('pawn-back', text, [r.mv.to], `pawn-back:${r.mv.to}`);
}

// ── 2. ONE MOVE GUARDS BOTH ───────────────────────────────────────────────

/** Student pieces (not pawns, not the king) the opponent can win outright. */
function loosePieces(fen: string, student: Color): Square[] {
  const c = boardOf(fen);
  if (!c) return [];
  return piecesOf(c, student).filter((s) => {
    const p = c.get(s);
    return !!p && p.type !== 'p' && p.type !== 'k' && legalSeeGainFor(fen, s, other(student)) > 0;
  });
}

const describe = (c: Chess, squares: readonly Square[]): string =>
  andList(squares.map((s) => { const p = c.get(s); return p ? `${NAME[p.type]} on ${s}` : s; }));

/** Two of the student's pieces were loose; the move, without moving either,
 *  leaves neither winnable. */
export function defendsBoth(fenBefore: string, san: string, student: Color, cpLoss: number): StructureRead | null {
  if (cpLoss >= SOUND_CP) return null;
  const loose = loosePieces(fenBefore, student);
  if (loose.length < 2) return null;
  const before = boardOf(fenBefore);
  const r = play(fenBefore, san);
  if (!before || !r || r.mv.captured || r.after.inCheck() || loose.includes(r.mv.from)) return null;
  const fen = r.after.fen();
  if (loose.some((s) => r.after.get(s)?.color !== student || legalSeeGainFor(fen, s, other(student)) > 0)) return null;
  const guardsBoth = loose.every((s) => r.after.attackers(s, student).includes(r.mv.to));
  const how = guardsBoth ? `your ${NAME[r.mv.piece]} on ${r.mv.to} now guards them together` : `after it neither can be taken for free`;
  const text = `One move covers both: your ${describe(before, loose)} were both loose, and ${how}. When two things are hit, look for the square that defends them at once before you move either.`;
  return withProof('defends-both', text, [...loose, r.mv.to], `defends-both:${[...loose].sort().join(',')}`);
}

/** The catch side: two pieces were loose, a single move guarded both, and the
 *  student's move left one to be taken. Learn hears the idea; Review may name the move. */
export function missedDefendsBoth(fenBefore: string, san: string, student: Color, cpLoss: number): StructureRead | null {
  if (cpLoss < COSTLY_CP) return null;
  const loose = loosePieces(fenBefore, student);
  if (loose.length < 2) return null;
  const before = boardOf(fenBefore);
  const r = play(fenBefore, san);
  if (!before || !r) return null;
  if (!loosePieces(r.after.fen(), student).some((s) => loose.includes(s))) return null;
  const cover = before.moves({ verbose: true }).find((m) => {
    if (m.captured || m.san.includes('+') || loose.includes(m.from)) return false;
    const c = new Chess(fenBefore);
    c.move(m.san);
    const f = c.fen();
    return loose.every((s) => legalSeeGainFor(f, s, other(student)) === 0);
  });
  if (!cover || cover.san === r.mv.san) return null;
  const pieces = describe(before, loose);
  const text = `Your ${pieces} were both loose, and one move guarded them together — ${cover.san} covered both.`;
  const held = `Your ${pieces} were both loose, and one move guarded them together. When two things are hit, look for the square that defends them at once.`;
  const read = withProof('missed-defends-both', text, [...loose, cover.to], `missed-defends-both:${[...loose].sort().join(',')}`);
  const heldProof = squaresProof(held, loose);
  return read && heldProof ? { ...read, heldForm: { text: held, squares: [...loose], proof: heldProof } } : read;
}

// ── 3. A KNIGHT'S JUMP APART ──────────────────────────────────────────────

/** Squares a knight on `from` hits. */
function knightHits(from: Square): Square[] {
  const f = from.charCodeAt(0) - 97;
  const r = Number(from[1]) - 1;
  const out: Square[] = [];
  for (const [df, dr] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) {
    const nf = f + df; const nr = r + dr;
    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) out.push(`${String.fromCharCode(97 + nf)}${nr + 1}` as Square);
  }
  return out;
}

/** A safe knight landing on the board `c` (student to move) that hits two
 *  enemy pieces worth more than a knight (or the king and a major). */
function knightForks(c: Chess, student: Color): { to: Square; targets: Square[] }[] {
  const them = other(student);
  const out: { to: Square; targets: Square[] }[] = [];
  for (const m of c.moves({ verbose: true })) {
    if (m.piece !== 'n' || m.color !== student) continue;
    const hit = knightHits(m.to).flatMap((s) => { const p = c.get(s); return p && p.color === them && p.type !== 'p' ? [{ s, t: p.type }] : []; });
    // A target is worth forking when it outranks the knight, is the king, or
    // stands unguarded (queen and loose bishop: the bishop falls).
    const bigHits = hit.filter((h) => h.t === 'k' || valueOf(h.t) > 3 || c.attackers(h.s, them).length === 0);
    const big = bigHits.map((h) => h.s);
    if (big.length < 2 || !bigHits.some((h) => ['q', 'r', 'k'].includes(h.t))) continue;
    const after = new Chess(c.fen());
    after.move(m.san);
    if (!landingIsSafe(after.fen(), m.to)) continue;
    out.push({ to: m.to, targets: big.sort() });
  }
  return out;
}

/** Their move left two of their big pieces a knight's jump from one square the
 *  student's knight reaches safely. Says the pattern, never the square. */
export function knightJumpApart(fenBefore: string, san: string, student: Color): StructureRead | null {
  const r = play(fenBefore, san);
  if (!r || r.mv.color === student || r.after.inCheck()) return null;
  const now = knightForks(r.after, student);
  if (now.length === 0) return null;
  const was = boardOf(asIfToMove(fenBefore, student) ?? '');
  const before = new Set(was ? knightForks(was, student).map((f) => f.targets.join(',')) : []);
  const fresh = now.find((f) => !before.has(f.targets.join(',')));
  if (!fresh) return null;
  const text = `Their ${describe(r.after, fresh.targets)} now stand a knight's jump apart — that is the pattern to scan for: one square your knight can reach hits both.`;
  return withProof('knight-jump-apart', text, fresh.targets, `knight-jump-apart:${fresh.targets.join(',')}`);
}

// ── 4. THE MATE THREAT THAT WINS SOMETHING ELSE ───────────────────────────

const mateMove = (c: Chess): string | null => c.moves().find((m) => m.endsWith('#')) ?? null;

/** The most `side` (to move on `c`) wins by a capture right now, in pawns. */
function bestCapture(c: Chess, side: Color): number {
  let best = 0;
  for (const s of piecesOf(c, other(side))) {
    if (c.get(s)?.type === 'k') continue;
    best = Math.max(best, legalSeeGainOn(c, s));
  }
  return best;
}

/** After the defence `c` (attacker `side` to move): does a quiet move attack
 *  their queen so that every answer still drops at least a minor piece? */
function queenTrapAfter(c: Chess, side: Color): boolean {
  const q = piecesOf(c, other(side), 'q')[0] as Square | undefined;
  if (!q) return false;
  // A queen with three or more safe squares is not trapped by one quiet move;
  // checking that first keeps the search off every ordinary position.
  const asDefender = boardOf(asIfToMove(c.fen(), other(side)) ?? '');
  if (!asDefender) return false;
  const safe = asDefender.moves({ square: q, verbose: true }).filter((m) => {
    const x = new Chess(asDefender.fen());
    x.move(m.san);
    return legalSeeGainFor(x.fen(), m.to, side) < 3;
  });
  if (safe.length > 2) return false;
  for (const m of c.moves({ verbose: true })) {
    if (m.captured || m.san.includes('+')) continue;
    const a = new Chess(c.fen());
    a.move(m.san);
    if (!a.attackers(q, side).length) continue;
    const replies = a.moves({ verbose: true });
    if (replies.length === 0) continue;
    const base = balanceFor(c.fen(), side);
    const allLose = replies.every((rep) => {
      const b = new Chess(a.fen());
      b.move(rep.san);
      return !!mateMove(b) || balanceFor(b.fen(), side) + bestCapture(b, side) - base >= 3;
    });
    if (allLose) return true;
  }
  return false;
}

interface SecondBlow { mateSq: Square; trap: boolean; defences: number }

/** On `after` (defender to move), `attacker` threatens mate in one; every
 *  defence that stops it loses at least a minor piece. */
function secondBlow(after: Chess, attacker: Color): SecondBlow | null {
  if (after.inCheck() || after.isGameOver()) return null;
  const asIf = boardOf(asIfToMove(after.fen(), attacker) ?? '');
  const mate = asIf ? mateMove(asIf) : null;
  if (!asIf || !mate) return null;
  const mateSq = asIf.move(mate).to;
  let defences = 0;
  let traps = 0;
  const base = balanceFor(after.fen(), attacker);
  for (const d of after.moves({ verbose: true })) {
    const c = new Chess(after.fen());
    c.move(d.san);
    if (mateMove(c)) continue; // this reply does not stop it
    defences++;
    // Net over the defence and the best capture after it: a defence that
    // takes something first must still come out three points behind.
    if (balanceFor(c.fen(), attacker) + bestCapture(c, attacker) - base >= 3) continue;
    if (queenTrapAfter(c, attacker)) { traps++; continue; }
    return null; // one defence costs nothing extra
  }
  if (defences === 0) return null; // the mate is unstoppable — another lane says that
  return { mateSq, trap: traps === defences, defences };
}

/** The student's quiet move threatens mate, and every defence loses something else. */
export function mateThreatWinsMore(fenBefore: string, san: string, student: Color, cpLoss: number): StructureRead | null {
  if (cpLoss >= SOUND_CP) return null;
  const before = boardOf(fenBefore);
  if (!before || mateMove(before)) return null;
  const r = play(fenBefore, san);
  if (!r || r.mv.color !== student || r.mv.san.includes('+')) return null;
  const blow = secondBlow(r.after, student);
  if (!blow) return null;
  const tail = blow.trap ? 'whatever stops it leaves their queen with nowhere to go' : 'whatever stops it drops a piece';
  const text = `${r.mv.san} threatens mate on ${blow.mateSq} — and ${tail}. One threat doing two jobs: don't hunt only the mate or only the material, line them up.`;
  return withProof('mate-threat-wins-more', text, [r.mv.to, blow.mateSq], `mate-threat-wins-more:${blow.mateSq}`);
}

/** The same idea against the student: their move threatens mate, and every
 *  defence costs the student something. */
export function mateThreatCostsYou(fenBefore: string, san: string, student: Color): StructureRead | null {
  const before = boardOf(fenBefore);
  if (!before || mateMove(before)) return null;
  const r = play(fenBefore, san);
  if (!r || r.mv.color === student || r.mv.san.includes('+')) return null;
  const blow = secondBlow(r.after, other(student));
  if (!blow) return null;
  const tail = blow.trap ? 'every defence leaves your queen short of squares' : 'every defence drops a piece';
  const text = `${r.mv.san} threatens mate on ${blow.mateSq}, and ${tail} — stop the mate first, then pick the defence that gives up the least.`;
  return withProof('mate-threat-costs-you', text, [r.mv.to, blow.mateSq], `mate-threat-costs-you:${blow.mateSq}`);
}

// ── 5. THE QUEEN TRADE ────────────────────────────────────────────────────

type QueenTrade = 'made' | 'offered' | null;

/** Did the student's move trade queens, or offer the trade? */
function queenTrade(before: Chess, r: NonNullable<ReturnType<typeof play>>, student: Color): QueenTrade {
  const them = other(student);
  const theirQ = piecesOf(r.after, them, 'q');
  const myQ = piecesOf(r.after, student, 'q');
  if (r.mv.captured === 'q') {
    // A recapture that clears the board of queens, or a queen take they can take back.
    if (theirQ.length === 0 && myQ.length === 0 && piecesOf(before, student, 'q').length === 0) return 'made';
    if (r.mv.piece === 'q' && r.after.attackers(r.mv.to, them).length > 0) return 'made';
    return null;
  }
  if (r.mv.piece !== 'q' || theirQ.length !== 1) return null;
  const mine = r.mv.to;
  const facing = r.after.attackers(mine, them).includes(theirQ[0]);
  const guarded = r.after.attackers(mine, student).length > 0;
  return facing && guarded && legalSeeGainFor(r.after.fen(), mine, them) === 0 ? 'offered' : null;
}

/** Only kings and pawns left once both queens are off? */
function pawnEndingAfterTrade(fen: string): boolean {
  return !/[nbrNBR]/.test(fen.split(' ')[0] ?? '');
}

/** The queen trade, judged by how far ahead the student is. */
export function queenTradeRead(fenBefore: string, san: string, student: Color, cpLoss: number): StructureRead | null {
  const before = boardOf(fenBefore);
  const r = play(fenBefore, san);
  if (!before || !r || r.mv.color !== student) return null;
  const kind = queenTrade(before, r, student);
  if (!kind) return null;
  // The lead with the queens set aside — the trade removes one each.
  const up = balanceFor(fenBefore, student) - 9 * (piecesOf(before, student, 'q').length - piecesOf(before, other(student), 'q').length);
  const verb = kind === 'made' ? 'Trading' : 'Offering to trade';
  if (up >= 3 && cpLoss < SOUND_CP) {
    const text = `${verb} queens a piece up is the safe road: with the queens off nothing of theirs can threaten your king, and the extra piece wins the ending.`;
    return withProof('queen-trade-ahead', text, [r.mv.to], 'queen-trade');
  }
  if (up >= 1 && up < 3 && cpLoss >= COSTLY_CP && !pawnEndingAfterTrade(r.after.fen())) {
    const text = `Only a pawn or two up, the queen trade is no shortcut — it cost you here. A piece up, trade queens freely; with a pawn or two, keep them on unless the trade leads to a won pawn ending.`;
    return withProof('queen-trade-early', text, [r.mv.to], 'queen-trade');
  }
  return null;
}
