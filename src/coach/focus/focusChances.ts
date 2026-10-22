/**
 * THE FOCUS CHANCES — when the board POSES a focus, and how a move ANSWERED it
 * (WO-LEARN-FOCUS-01, `docs/LEARN-FOCUS.md` §5).
 *
 * Pure: chess.js, the app's existing computers and the engine lines handed
 * in. Nothing here is a new judge of chess:
 *   - loose pieces read the pin-aware exchange counter (`legalSeeGainFor`);
 *   - their tactics and their mate threats are the threat-answer computer the
 *     record already writes (`newThreatsAtTurn` + `threatAnswerOutcome`);
 *   - castling in time is the record's own posed question (`skillQuestions`)
 *     scored by the record's own scoring (`capabilityOutcomes`);
 *   - your shot and your mate are the engine's own line, measured by
 *     `pvGain` and its mate score.
 * A chance the board cannot prove is not posed: a shot needs an engine read,
 * and with none it is simply not asked about.
 */
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import type { MisconceptionTagId } from '../../data/misconceptionTags';
import { asIfToMove, legalSeeGainFor } from '../../services/positionReadingService';
import { newThreatsAtTurn, threatAnswerOutcome } from '../../services/threatAnswerEvidence';
import { THREAT_SKILL, type ThreatPattern } from '../../services/learnRecordTerms';
import { mateThreatsAgainst } from '../../services/threatOut';
import { skillQuestions } from '../../services/skillQuestions';
import { capabilityOutcomes } from '../../services/capabilityEvidence';
import { pvGain } from '../../services/tacticGeometry';
import { MATERIAL_VALUE } from '../../services/pieceValues';
import type { FocusId, FocusSeat } from './focusCard';

/** One engine line, White's point of view (the `AnalysisLine` shape). */
export interface ReadLine {
  moves: readonly string[];
  evaluation: number;
  mate: number | null;
}

/** The board the user is about to move from. */
export interface FocusBoard {
  fen: string;
  /** The user's previous turn, so a motif already standing then is not posed again. */
  prevFen: string | null;
  student: Color;
  /** The engine's lines at `fen`, or null when no read has landed. */
  lines: readonly ReadLine[] | null;
}

export type ChanceKind =
  /** loose · defend: a piece of yours is attacked and can be won. */
  | 'save'
  /** loose · defend: your move left a piece of yours to be won (judged on the move). */
  | 'leave'
  /** loose · exploit: a piece of theirs can be won. */
  | 'take'
  /** tactics · exploit: a forcing line wins material. */
  | 'shot'
  /** tactics · defend: their fork, pin, skewer or discovery stands. */
  | 'motif'
  /** kings · defend: they threaten mate. */
  | 'mate-threat'
  /** kings · defend: castling is ready and the game is under way. */
  | 'castle'
  /** kings · exploit: you have a forced mate. */
  | 'mate-for-you';

export const CHANCE_FOCUS: Record<ChanceKind, { focus: FocusId; seat: FocusSeat }> = {
  save: { focus: 'loose-pieces', seat: 'defend' },
  leave: { focus: 'loose-pieces', seat: 'defend' },
  take: { focus: 'loose-pieces', seat: 'exploit' },
  shot: { focus: 'tactics', seat: 'exploit' },
  motif: { focus: 'tactics', seat: 'defend' },
  'mate-threat': { focus: 'kings', seat: 'defend' },
  castle: { focus: 'kings', seat: 'defend' },
  'mate-for-you': { focus: 'kings', seat: 'exploit' },
};

export interface FocusChance {
  focus: FocusId;
  seat: FocusSeat;
  kind: ChanceKind;
  /** The record tag the answer is written under. */
  tag: MisconceptionTagId;
  /** Stable for one question on one board: kind + its squares. */
  key: string;
  /** The squares the question is about (the piece, the attacker, the target). */
  squares: string[];
  /** The piece in question, when there is one. */
  piece?: { type: PieceSymbol; square: string };
  /** What threatens it / what it can be won by. */
  attacker?: { type: PieceSymbol; square: string };
  /** Attackers and defenders of the piece that can LEGALLY take on its
   *  square, and the defenders that cannot because they are pinned to their
   *  own king (`legalCounts`) — said out loud, never counted. */
  counts?: { attackers: number; defenders: number; pinned: ReadonlyArray<{ type: PieceSymbol; square: string }> };
  /** The engine's answer, when known (for the second-miss show), UCI. */
  answerUci: string | null;
  /** Their motif, for `motif` / `mate-threat`. */
  pattern?: ThreatPattern;
  targets?: string[];
  /** The pieces on `targets`, nearest the attacker first — what a pin, a
   *  skewer or a fork is said with ("pins your knight on c3 to your rook on
   *  c1"), read off the board when the chance is posed. */
  targetPieces?: Array<{ type: PieceSymbol; square: string }>;
  /** Material the answer wins (pawns), or the mate's length in moves. */
  gain?: number;
  mateIn?: number;
  /** The engine's first move as SAN, for a conclusion said once the moment is past. */
  answerSan?: string;
}

/** A move the user played, with what the engine said about the board it left. */
export interface FocusMove {
  fenBefore: string;
  san: string;
  fenAfter: string;
  student: Color;
  /** The move's cost against the engine's best (cp, ≥ 0), or null when unknown. */
  cpLoss: number | null;
  /** The engine's lines at `fenBefore`. */
  lines: readonly ReadLine[] | null;
}

export type ChanceVerdict = 'found' | 'missed' | 'exempt';

/** At least this much (pawns) must be winnable for a piece to be loose: a
 *  minor for a pawn and up. A lone pawn is not "a loose piece". */
export const LOOSE_GAIN = 2;
/** With no engine read, only a whole piece is trusted on the count alone. */
const LOOSE_GAIN_UNREAD = 3;
/** A move within this of the best (cp) answered the question another way. */
const SAME_AS_BEST_CP = 60;
/** A move this costly (cp) missed it. */
const MISSED_CP = 150;
/** A shot must win at least this much (pawns) by force. */
const SHOT_GAIN = 2;
/** …and be clearly better than the next move (cp) — the board is asking. */
const SHOT_MARGIN_CP = 150;
/** A forced mate this short (moves) is a question at club level. */
const MATE_FOR_YOU_MAX = 4;
/** A deciding blunder: at least a rook lost by force… */
const DECIDING_GAIN = 5;
/** …costing at least this much (cp) when the engine knows… */
const DECIDING_CP = 300;
/** …from a position that was not already lost (cp, the user's view). */
const ALREADY_LOST_CP = -300;

const TARGET_PIECES: ReadonlySet<PieceSymbol> = new Set(['n', 'b', 'r', 'q']);
const TACTIC_DEFEND: ReadonlySet<ThreatPattern> = new Set<ThreatPattern>(['fork', 'pin', 'skewer', 'discovery', 'double_check']);
const MATE_THREAT: ReadonlySet<ThreatPattern> = new Set<ThreatPattern>(['mate_threat', 'back_rank']);

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

function board(fen: string): Chess | null {
  try { return new Chess(fen); } catch { return null; }
}

/** A line's value for `side`, cp (a mate is ±100 000). */
function pov(l: ReadLine, side: Color): number {
  const v = l.mate !== null ? Math.sign(l.mate) * 100000 : l.evaluation;
  return side === 'w' ? v : -v;
}

function uciOf(c: Chess, san: string): string | null {
  try {
    const m = new Chess(c.fen()).move(san);
    return `${m.from}${m.to}${m.promotion ?? ''}`;
  } catch { return null; }
}

function sanOfUci(fen: string, uci: string | undefined): string | null {
  if (!uci) return null;
  try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return null; }
}

/** The move's cost from the read, when the read covers it. */
export function cpLossFromLines(fenBefore: string, san: string, lines: readonly ReadLine[] | null): number | null {
  if (!lines || lines.length === 0) return null;
  const c = board(fenBefore);
  if (!c) return null;
  const side = c.turn();
  const uci = uciOf(c, san);
  const best = Math.max(...lines.map((l) => pov(l, side)));
  const line = lines.find((l) => l.moves[0] === uci);
  return line ? Math.max(0, best - pov(line, side)) : null;
}

/** The squares of `side`'s pieces worth naming (no pawns, no king). */
function piecesOf(c: Chess, side: Color): Array<{ type: PieceSymbol; square: Square }> {
  const out: Array<{ type: PieceSymbol; square: Square }> = [];
  for (const row of c.board()) for (const cell of row) if (cell && cell.color === side && TARGET_PIECES.has(cell.type)) out.push({ type: cell.type, square: cell.square });
  return out;
}

/**
 * WHO CAN REALLY TAKE ON THE SQUARE. A defender pinned to its own king looks
 * like a defender to `attackers()` and is not one: on 26…Rf5 of the
 * 2026-10-21 audit game the knight on f4 read "attacked twice and defended
 * twice" with the e3 bishop pinned by the e8 rook — the knight was lost, and
 * the clue contradicted itself. Attackers are the owner's opponent's legal
 * captures on the square; defenders are the owner's legal recaptures after
 * the cheapest of them; the geometric defenders that cannot recapture are the
 * pinned ones. When a turn cannot be flipped (a king in check) the board's own
 * count stands, with no pin named.
 */
export function legalCounts(fen: string, square: Square, owner: Color): { attackers: number; defenders: number; pinned: Array<{ type: PieceSymbol; square: string }> } {
  const c = board(fen);
  if (!c) return { attackers: 0, defenders: 0, pinned: [] };
  const foe = other(owner);
  const geometric = { attackers: c.attackers(square, foe).length, defenders: c.attackers(square, owner) };
  const fallback = { attackers: geometric.attackers, defenders: geometric.defenders.length, pinned: [] };
  const foeFen = asIfToMove(fen, foe);
  const foeBoard = foeFen ? board(foeFen) : null;
  if (!foeBoard) return fallback;
  const captures = foeBoard.moves({ verbose: true }).filter((m) => m.to === square && m.captured);
  if (captures.length === 0) return { attackers: 0, defenders: geometric.defenders.length, pinned: [] };
  const first = [...captures].sort((a, b) => MATERIAL_VALUE[a.piece] - MATERIAL_VALUE[b.piece])[0];
  const after = board(foeBoard.fen());
  if (!after) return fallback;
  after.move(first);
  const recaptures = new Set(after.moves({ verbose: true }).filter((m) => m.to === square).map((m) => m.from as string));
  const pinned: Array<{ type: PieceSymbol; square: string }> = [];
  for (const sq of geometric.defenders) {
    if (recaptures.has(sq)) continue;
    const p = c.get(sq);
    if (p && p.type !== 'k') pinned.push({ type: p.type, square: sq });
  }
  return { attackers: new Set(captures.map((m) => m.from)).size, defenders: recaptures.size, pinned };
}

function cheapestAttacker(c: Chess, square: Square, by: Color): { type: PieceSymbol; square: string } | null {
  let best: { type: PieceSymbol; square: string } | null = null;
  for (const sq of c.attackers(square, by)) {
    const p = c.get(sq);
    if (p && (!best || MATERIAL_VALUE[p.type] < MATERIAL_VALUE[best.type])) best = { type: p.type, square: sq };
  }
  return best;
}

/** Squares the opponent's standing motifs already hit — those are a tactic
 *  question, never a loose-piece one. */
function motifTargets(fen: string, prevFen: string | null): Set<string> {
  const out = new Set<string>();
  for (const t of newThreatsAtTurn(fen, prevFen)) {
    if (TACTIC_DEFEND.has(t.pattern) || MATE_THREAT.has(t.pattern)) for (const s of t.targets) out.add(s);
  }
  return out;
}

/** The engine's best line, for `side`. */
function bestLine(lines: readonly ReadLine[] | null, side: Color): { line: ReadLine; value: number; second: number | null } | null {
  if (!lines || lines.length === 0) return null;
  const sorted = [...lines].sort((a, b) => pov(b, side) - pov(a, side));
  return { line: sorted[0], value: pov(sorted[0], side), second: sorted.length > 1 ? pov(sorted[1], side) : null };
}

// ─── loose pieces ────────────────────────────────────────────────────────────

function saveChances(b: FocusBoard, c: Chess): FocusChance[] {
  const foe = other(b.student);
  const skip = motifTargets(b.fen, b.prevFen);
  const out: FocusChance[] = [];
  for (const p of piecesOf(c, b.student)) {
    if (skip.has(p.square)) continue;
    const gain = legalSeeGainFor(b.fen, p.square, foe);
    if (gain < (b.lines ? LOOSE_GAIN : LOOSE_GAIN_UNREAD)) continue;
    const attacker = cheapestAttacker(c, p.square, foe);
    if (!attacker) continue;
    const best = bestLine(b.lines, b.student);
    out.push({
      ...CHANCE_FOCUS.save, kind: 'save', tag: 'missed-opponents-threat',
      key: `save:${p.square}`, squares: [p.square, attacker.square],
      piece: p, attacker,
      counts: legalCounts(b.fen, p.square, b.student),
      answerUci: best?.line.moves[0] ?? safeMoveFor(b.fen, p.square, b.student),
      gain,
    });
  }
  return out;
}

/**
 * HOW A MOVE ANSWERED A LOOSE PIECE, on net material. A save is any move after
 * which the piece cannot be won at a profit COUNTING WHAT THE MOVE ITSELF TOOK:
 * the 2026-10-21 audit game marked Nf4xd5 (…cxd5) and Rh1xh4 (…Rxh4) as
 * misses because the recapture was read and the capture before it was not.
 * Both were even trades — a correct answer, said as a trade, never as "safe".
 *   - `safe`   the piece cannot be won where it now stands;
 *   - `traded` the piece can be taken, but the move took at least as much
 *              first — with the piece itself, or elsewhere when that wins
 *              material outright (`net` > 0 when the trade wins material);
 *   - `open`   the question still stands: the piece can still be won where it
 *              stood, and the move answered elsewhere — a check (the opponent
 *              cannot take while in check, so a legal count reads the piece as
 *              safe for one move) or material taken on another square that
 *              only breaks even. The
 *              2026-10-21 prod game scored one rook on c1, attacked by a bishop,
 *              "found" three moves running (Nf6+, gxf6, Bxg6) before it fell;
 *              one decision, judged on the move that answers it;
 *   - `lost`   the opponent still wins material on it.
 */
export function saveAnswer(fenBefore: string, san: string, square: string, side: Color): { how: 'safe' | 'traded' | 'open' | 'lost'; to: string; net: number } | null {
  let played;
  try { played = new Chess(fenBefore).move(san); } catch { return null; }
  const after = played.after;
  const to = played.from === square ? played.to : square;
  const foe = other(side);
  const see = legalSeeGainFor(after, to as Square, foe);
  if (see < LOOSE_GAIN) {
    const c = board(after);
    if (c && checkHidesCapture(c, to as Square, side)) return c.attackers(to as Square, foe).length > 0 ? { how: 'open', to, net: 0 } : { how: 'safe', to, net: 0 };
    return { how: 'safe', to, net: 0 };
  }
  const won = played.captured ? MATERIAL_VALUE[played.captured] : 0;
  const net = won - see;
  if (net <= -LOOSE_GAIN) return { how: 'lost', to, net };
  // Material taken on another square answers the question only when it WINS
  // outright: prod record game 1 (tonight's build) took back a3 and played
  // dxe5, winning a queen while its own queen hung to a knight, and heard
  // nothing. A capture that merely breaks even (the c1 rook's gxf6) leaves it open.
  return { how: to === square && net < LOOSE_GAIN ? 'open' : 'traded', to, net };
}

/** A check hides a capture from a legal count unless taking the piece IS the
 *  answer to the check (it is the only checker). */
function checkHidesCapture(after: Chess, to: Square, side: Color): boolean {
  if (!after.inCheck()) return false;
  const king = piecesOfKing(after, other(side));
  const checkers = king ? after.attackers(king as Square, side) : [];
  return !(checkers.length === 1 && checkers[0] === to);
}

function safeMoveFor(fen: string, square: string, side: Color): string | null {
  const c = board(fen);
  if (!c) return null;
  for (const m of c.moves({ verbose: true })) {
    if (saveAnswer(fen, m.san, square, side)?.how === 'safe') return `${m.from}${m.to}${m.promotion ?? ''}`;
  }
  return null;
}

function takeChances(b: FocusBoard, c: Chess): FocusChance[] {
  const foe = other(b.student);
  const best = bestLine(b.lines, b.student);
  const out: FocusChance[] = [];
  for (const p of piecesOf(c, foe)) {
    const gain = legalSeeGainFor(b.fen, p.square, b.student);
    if (gain < (b.lines ? LOOSE_GAIN : LOOSE_GAIN_UNREAD)) continue;
    // With a read, the engine must agree the capture is (nearly) best: a
    // capture that walks into something worse is bait, not a loose piece.
    let answerUci: string | null = null;
    if (best && b.lines) {
      const capture = b.lines.find((l) => l.moves[0]?.slice(2, 4) === p.square && best.value - pov(l, b.student) <= SAME_AS_BEST_CP);
      if (!capture) continue;
      answerUci = capture.moves[0] ?? null;
    } else {
      const capturer = cheapestAttacker(c, p.square, b.student);
      answerUci = capturer ? `${capturer.square}${p.square}` : null;
    }
    const attacker = cheapestAttacker(c, p.square, b.student);
    out.push({
      ...CHANCE_FOCUS.take, kind: 'take', tag: 'missed-tactic',
      key: `take:${p.square}`, squares: [p.square, ...(attacker ? [attacker.square] : [])],
      piece: p, ...(attacker ? { attacker } : {}),
      counts: legalCounts(b.fen, p.square, foe),
      answerUci, gain,
      ...(answerUci ? { answerSan: sanOfUci(b.fen, answerUci) ?? undefined } : {}),
    });
  }
  return out;
}

/**
 * Did the move LEAVE a piece of the user's to be won that was safe before?
 * The 'leave' miss of loose pieces — judged on the move, never asked before it.
 */
export function leftLoose(m: FocusMove): FocusChance | null {
  const before = board(m.fenBefore);
  const after = board(m.fenAfter);
  if (!before || !after) return null;
  let played;
  try { played = new Chess(m.fenBefore).move(m.san); } catch { return null; }
  const foe = other(m.student);
  if (m.cpLoss !== null && m.cpLoss < MISSED_CP) return null;
  for (const p of piecesOf(after, m.student)) {
    const gain = legalSeeGainFor(m.fenAfter, p.square, foe);
    if (gain < (m.cpLoss !== null ? LOOSE_GAIN : LOOSE_GAIN_UNREAD)) continue;
    const was = p.square === played.to ? played.from : p.square;
    if (legalSeeGainFor(m.fenBefore, was, foe) >= LOOSE_GAIN) continue;  // it was already loose: a 'save' question
    // A capture worth at least as much is a trade, not a piece left loose.
    if (m.cpLoss === null && played.captured && MATERIAL_VALUE[played.captured] >= MATERIAL_VALUE[p.type]) continue;
    const attacker = cheapestAttacker(after, p.square, foe);
    if (!attacker) continue;
    const best = bestLine(m.lines, m.student);
    return {
      ...CHANCE_FOCUS.leave, kind: 'leave', tag: 'hung-material',
      key: `leave:${p.square}`, squares: [p.square, attacker.square],
      piece: p, attacker,
      counts: legalCounts(m.fenAfter, p.square, m.student),
      answerUci: best?.line.moves[0] ?? null, gain,
    };
  }
  return null;
}

// ─── tactics ─────────────────────────────────────────────────────────────────

function shotChances(b: FocusBoard, c: Chess): FocusChance[] {
  const best = bestLine(b.lines, b.student);
  if (!best) return [];
  const first = best.line.moves[0];
  const san = sanOfUci(b.fen, first);
  if (!san || !/[x+]/.test(san)) return [];
  if (best.line.mate !== null) return [];                         // a mate is the kings' question
  if (best.second !== null && best.value - best.second < SHOT_MARGIN_CP) return [];
  const gain = pvGain(b.fen, best.line.moves, b.student, 6);
  if (gain === null || gain < SHOT_GAIN || gain >= 100) return [];
  // A plain capture of a loose piece is the loose-pieces question.
  const to = first.slice(2, 4) as Square;
  const victim = c.get(to);
  if (victim && victim.color !== b.student && legalSeeGainFor(b.fen, to, b.student) >= LOOSE_GAIN) return [];
  return [{
    ...CHANCE_FOCUS.shot, kind: 'shot', tag: 'missed-tactic',
    key: `shot:${first}`, squares: [first.slice(0, 2), to],
    answerUci: first, answerSan: san, gain,
  }];
}

/**
 * Their motifs that are a QUESTION at this turn — the ONE reading of "the
 * board poses their tactic", shared by the chance computer and the coach's
 * steering (`scorers/focus`), so the coach never steers toward a "motif" the
 * focus would not ask about. Posed only when the record's own scorer would
 * score it: a motif that wins nothing, or that no reply parries, is no
 * question. Prod tactics game 1 posed "their discovered attack" at a turn
 * where it won nothing (19…Ke7) — an announced game would have asked "What
 * does their last move threaten?" about a non-threat. threatAnswerOutcome's
 * null cases do not depend on which reply is played, so any legal reply is
 * the probe.
 */
export function posedMotifs(fen: string, prevFen: string | null, patterns: ReadonlySet<ThreatPattern>): ReturnType<typeof newThreatsAtTurn> {
  const c = board(fen);
  const probe = c?.moves()[0];
  if (!probe) return [];
  return newThreatsAtTurn(fen, prevFen).filter((t) => patterns.has(t.pattern) && !!THREAT_SKILL[t.pattern].motifTag
    && !!threatAnswerOutcome({ fen, playedSan: probe, pattern: t.pattern, targets: [...t.targets] }));
}

/** The motif's targets as pieces, nearest the attacker first. */
function targetPiecesOf(c: Chess | null, attacker: string, targets: readonly string[]): Array<{ type: PieceSymbol; square: string }> {
  if (!c) return [];
  const dist = (sq: string): number => Math.max(Math.abs(sq.charCodeAt(0) - attacker.charCodeAt(0)), Math.abs(Number(sq[1]) - Number(attacker[1])));
  return targets
    .map((sq) => ({ sq, p: c.get(sq as Square) }))
    .filter((x): x is { sq: string; p: NonNullable<typeof x.p> } => !!x.p)
    .sort((a, b) => dist(a.sq) - dist(b.sq))
    .map((x) => ({ type: x.p.type, square: x.sq }));
}

export const TACTIC_PATTERNS = TACTIC_DEFEND;
export const MATE_PATTERNS_FOCUS = MATE_THREAT;

function motifChances(b: FocusBoard, patterns: ReadonlySet<ThreatPattern>, kind: 'motif' | 'mate-threat'): FocusChance[] {
  const best = bestLine(b.lines, b.student);
  const out: FocusChance[] = [];
  for (const t of posedMotifs(b.fen, b.prevFen, patterns)) {
    const tag = THREAT_SKILL[t.pattern].motifTag;
    if (!tag) continue;
    const c = board(b.fen);
    const attacker = c?.get(t.attacker as Square);
    out.push({
      ...CHANCE_FOCUS[kind], kind, tag,
      key: `${kind}:${t.pattern}:${t.attacker}:${[...t.targets].sort().join(',')}`,
      squares: [t.attacker, ...t.targets],
      ...(attacker ? { attacker: { type: attacker.type, square: t.attacker } } : {}),
      pattern: t.pattern, targets: [...t.targets],
      targetPieces: targetPiecesOf(c, t.attacker, t.targets),
      answerUci: best?.line.moves[0] ?? null,
    });
  }
  return out;
}

// ─── kings ───────────────────────────────────────────────────────────────────

function castleChances(b: FocusBoard): FocusChance[] {
  if (!skillQuestions(b.fen).some((q) => q.tag === 'king-stuck-center')) return [];
  const c = board(b.fen);
  if (!c) return [];
  const castle = c.moves({ verbose: true }).find((m) => m.san === 'O-O') ?? c.moves({ verbose: true }).find((m) => m.san === 'O-O-O');
  const king = piecesOfKing(c, b.student);
  return [{
    ...CHANCE_FOCUS.castle, kind: 'castle', tag: 'king-stuck-center',
    key: 'castle', squares: king ? [king] : [],
    answerUci: castle ? `${castle.from}${castle.to}` : null,
  }];
}

function piecesOfKing(c: Chess, side: Color): string | null {
  for (const row of c.board()) for (const cell of row) if (cell && cell.color === side && cell.type === 'k') return cell.square;
  return null;
}

function mateForYouChances(b: FocusBoard): FocusChance[] {
  const best = bestLine(b.lines, b.student);
  if (!best || best.line.mate === null) return [];
  const mate = b.student === 'w' ? best.line.mate : -best.line.mate;
  if (mate <= 0 || mate > MATE_FOR_YOU_MAX) return [];
  const first = best.line.moves[0];
  const c = board(b.fen);
  const theirKing = c ? piecesOfKing(c, other(b.student)) : null;
  return [{
    ...CHANCE_FOCUS['mate-for-you'], kind: 'mate-for-you', tag: 'missed-tactic',
    key: `mate-for-you:${first}`, squares: theirKing ? [theirKing] : [],
    answerUci: first, answerSan: sanOfUci(b.fen, first) ?? undefined, mateIn: mate,
  }];
}

/** Every chance the board poses for `focus`, the user to move. */
export function chancesAt(b: FocusBoard, focus: FocusId): FocusChance[] {
  const c = board(b.fen);
  if (!c || c.turn() !== b.student || c.isGameOver()) return [];
  // A check is its own question: answer it first.
  if (c.inCheck()) return [];
  switch (focus) {
    case 'loose-pieces': return [...takeChances(b, c), ...saveChances(b, c)];
    case 'tactics': return [...shotChances(b, c), ...motifChances(b, TACTIC_DEFEND, 'motif')];
    case 'kings': return [...mateForYouChances(b), ...motifChances(b, MATE_THREAT, 'mate-threat'), ...castleChances(b)];
  }
}

/** How the move answered a chance posed on the board it was played from. */
export function judgeChance(ch: FocusChance, m: FocusMove): ChanceVerdict {
  const cpLoss = m.cpLoss ?? cpLossFromLines(m.fenBefore, m.san, m.lines);
  let played;
  try { played = new Chess(m.fenBefore).move(m.san); } catch { return 'exempt'; }
  const uci = `${played.from}${played.to}${played.promotion ?? ''}`;
  const near = cpLoss !== null && cpLoss <= SAME_AS_BEST_CP;
  const costly = cpLoss !== null && cpLoss >= MISSED_CP;
  switch (ch.kind) {
    case 'save': {
      const answer = saveAnswer(m.fenBefore, m.san, ch.piece?.square ?? '', m.student);
      if (!answer || answer.how === 'open') return 'exempt';
      if (answer.how !== 'lost') return 'found';
      return near ? 'exempt' : cpLoss === null || costly ? 'missed' : 'exempt';
    }
    case 'take': {
      if (played.to === ch.piece?.square && played.captured) return 'found';
      if (near) return 'exempt';
      // With no read, only a quiet move that ignored a whole free piece is a miss.
      if (cpLoss === null) return !played.captured && !played.san.includes('+') ? 'missed' : 'exempt';
      return costly ? 'missed' : 'exempt';
    }
    case 'shot':
    case 'mate-for-you':
      if (uci === ch.answerUci || near) return 'found';
      return costly ? 'missed' : 'exempt';
    case 'motif':
    case 'mate-threat': {
      if (!ch.pattern || !ch.targets) return 'exempt';
      const v = threatAnswerOutcome({ fen: m.fenBefore, playedSan: m.san, pattern: ch.pattern, targets: ch.targets, engine: { evalBeforeCp: null, cpLoss } });
      return !v ? 'exempt' : v.outcome === 'held' ? 'found' : 'missed';
    }
    case 'castle': {
      // A FIND is castling, nothing else: prod kings game 2 credited "your
      // king is tucked away" on …Nf6 with the king still on e8, because any
      // near-best move read as held. A move that leaves the question open is
      // exempt (nothing recorded, nothing said); a miss is the record's own
      // verdict that delaying cost.
      if (played.san === 'O-O' || played.san === 'O-O-O') return 'found';
      if (cpLoss === null) return 'exempt';
      const o = capabilityOutcomes({ fenBefore: m.fenBefore, playedSan: m.san, moverColor: m.student === 'w' ? 'white' : 'black', cpLoss, ...(ch.answerUci ? { bestSan: sanOfUci(m.fenBefore, ch.answerUci) ?? undefined } : {}) })
        .find((x) => x.tag === 'king-stuck-center');
      return o?.outcome === 'broken' ? 'missed' : 'exempt';
    }
    case 'leave': {
      // Judged on the move that answers it: the miss itself, or the retry
      // after Try again. Returning 'missed' for every move (as this once did)
      // called the engine's own best retry a second miss on prod game 2 and
      // showed the answer to someone who had just found it.
      if (near) return 'found';
      return leftLoose(m) ? 'missed' : 'found';
    }
  }
}

/** A deciding blunder (`docs/LEARN-FOCUS.md` §9): at least a rook lost by
 *  force, or a mate in one allowed, from a position that was not already lost. */
export function decidingBlunder(m: FocusMove): { kind: 'material' | 'mate'; squares: string[] } | null {
  const after = board(m.fenAfter);
  if (!after || after.isGameOver()) return null;
  const cpLoss = m.cpLoss ?? cpLossFromLines(m.fenBefore, m.san, m.lines);
  if (cpLoss !== null && cpLoss < DECIDING_CP) return null;
  const best = bestLine(m.lines, m.student);
  if (best && best.value <= ALREADY_LOST_CP) return null;
  const foe = other(m.student);
  const mates = mateThreatsAgainst(m.fenAfter, m.student).moves;
  if (mates.length > 0) return { kind: 'mate', squares: [mates[0].to] };
  // Losing material "decides the game" only with the ENGINE's read in hand: a
  // capture count cannot see the follow-up (prod game 3, 28.Qxb5 …Rxb5 was
  // the engine's best move and was called game-deciding before any read
  // existed). With a read, a move it does not list is worse than every move it
  // does, and the net exchange count below decides; with no read at all there
  // is no claim. A mate in one, above, is proven on the board itself.
  if (cpLoss === null && (!m.lines || m.lines.length === 0)) return null;
  // On NET material: what the move itself took is counted first. The prod
  // audit's 26.Rxd8+ (…Nxd8, an even rook trade and the engine's best move)
  // was told "That one decides the game" because the d8 rook could be taken
  // back and the rook it had just taken was not counted.
  let won = 0;
  try { const played = new Chess(m.fenBefore).move(m.san); won = played.captured ? MATERIAL_VALUE[played.captured] : 0; } catch { return null; }
  for (const p of piecesOf(after, m.student)) {
    if (legalSeeGainFor(m.fenAfter, p.square, foe) - won >= DECIDING_GAIN) return { kind: 'material', squares: [p.square] };
  }
  return null;
}
