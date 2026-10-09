// chatTurnAnswers — the computed answers for the ONE-CHAT kinds that have no
// lane in today's routing (the lesson's board questions asked in chat):
// is a piece loose, how many attack / defend it, why is it a target, what
// about my <piece>. Every sentence is built from chess.js and the app's own
// loose / SEE computers (G0 — no model decides a fact); you / they wording.
//
// The target is what the turn names (a piece or a square), else the piece or
// square the conversation was last about ("and how many defend it?").
import { Chess, type Color, type Move, type Square } from 'chess.js';
import type { ConversationState, ResolvedChatTurn } from './chatTurn';
import { findLoosePieces } from '../services/loosePieces';
import { findHangingBySee, captureRead } from '../services/positionReadingService';
import { PIECE_NAMES } from '../types/tacticTypes';
import { andList, orList } from '../utils/andList';
import { computeMustDefend } from '../services/threatOut';
import { moveWhy } from '../services/deliberation';
import { describeMoveGeometry, toObserverSeat, assembleThreatAnswer } from '../services/groundedAnswer';
import { MATERIAL_VALUE } from '../services/pieceValues';
import { isPinnedPiece } from '../services/nextPlans';
import { readPosition } from '../services/positionalRead';

const name = (t: string): string => PIECE_NAMES[t] ?? 'piece';

function target(turn: ResolvedChatTurn, memory: ConversationState, ask?: string): Square | null {
  for (const r of turn.referents) {
    if (r.type === 'piece') return r.square as Square;
    if (r.type === 'square') return r.square as Square;
  }
  // THE LAST PIECE CARRIES OVER ONLY WHEN THE SENTENCE POINTS BACK ("and is
  // it safe?", "what about that one?"). "Are any of my pieces hanging?" asks
  // about all of them — live replay 2026-10-09 answered it about the bishop
  // the previous question had named.
  if (ask !== undefined) {
    const t = ask.toLowerCase();
    if (/\b(?:any|all|anything|everything|pieces|none)\b/.test(t)) return null;
    if (!/\b(?:it|its|that|this|him|her|one|same)\b/.test(t)) return null;
  }
  return (memory.lastPiece?.square ?? memory.lastSquare ?? null) as Square | null;
}

/** "your knight on c6" / "their bishop on b5" from the student's seat. */
function owned(chess: Chess, sq: Square, student: Color): string {
  const p = chess.get(sq);
  if (!p) return `the empty square ${sq}`;
  return `${p.color === student ? 'your' : 'their'} ${name(p.type)} on ${sq}`;
}

function listOf(chess: Chess, squares: readonly Square[]): string {
  return andList(squares.map((s) => `${name(chess.get(s)?.type ?? 'p')} on ${s}`));
}

const capFirst = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const count = (n: number): string => ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][n] ?? String(n);

export function answerIsLoose(chess: Chess, sq: Square | null, student: Color, seat: 'me' | 'them' | null = null): string {
  if (sq) {
    const p = chess.get(sq);
    if (!p) return `There is no piece on ${sq}.`;
    const loose = findLoosePieces(chess, p.color).find((l) => l.square === sq);
    const enemy: Color = p.color === 'w' ? 'b' : 'w';
    // WHOSE MOVE IT IS decides what "loose" means for the student (hand walk
    // 2026-10-09: "right now it can be won" on the student's own turn — they
    // cannot take until you have moved).
    const yours = p.color === student;
    const yourTurn = chess.turn() === p.color;
    const after = yours && yourTurn ? ' It is your move, so you can still save it.' : '';
    if (!loose) {
      // Guarded is not safe when the exchange still loses it (a pawn hitting a
      // guarded bishop): the safety door plays the real captures.
      let gain: number | null = 0;
      try { gain = captureRead(chess.fen(), sq, enemy); } catch { gain = 0; }
      if (gain !== null && gain > 0 && chess.attackers(sq, enemy).length > 0) {
        return `${capFirst(owned(chess, sq, student))} is guarded, but the trade still loses material: the ${listOf(chess, chess.attackers(sq, enemy))} can take it.${after}`;
      }
      return `${capFirst(owned(chess, sq, student))} is guarded.`;
    }
    return loose.attacked
      ? `${capFirst(owned(chess, sq, student))} is loose and attacked by the ${listOf(chess, loose.attackers)}.${after}`
      : `${capFirst(owned(chess, sq, student))} is loose — nothing guards it, though nothing attacks it yet.`;
  }
  // No piece named: the side the turn asked about ("their pieces"), else yours.
  const side: Color = seat === 'them' ? (student === 'w' ? 'b' : 'w') : student;
  const whose = side === student ? 'your' : 'their';
  const list = findLoosePieces(chess, side).filter((l) => l.type !== 'k');
  if (list.length === 0) return `Nothing of ${whose === 'your' ? 'yours' : 'theirs'} is loose.`;
  return `Loose: ${whose} ${andList(list.map((l) => `${name(l.type)} on ${l.square}`))}.`;
}

/** Attackers come from the side that does NOT own the target; defenders from
 *  the side that does. An empty square: the student's side defends it. */
function sides(chess: Chess, sq: Square, student: Color): { owner: Color; enemy: Color } {
  const owner = chess.get(sq)?.color ?? student;
  return { owner, enemy: owner === 'w' ? 'b' : 'w' };
}

export function answerCount(chess: Chess, sq: Square | null, student: Color, which: 'attackers' | 'defenders'): string | null {
  if (!sq) return null;
  // AN EMPTY SQUARE HAS NO ATTACKER AND DEFENDER — IT HAS TWO SIDES (live
  // replay 2026-10-08: "who controls e5?" named Black's three pieces and left
  // out White's knight on f3). Count both and say who holds it.
  if (!chess.get(sq)) return answerControl(chess, sq, student);
  const { owner, enemy } = sides(chess, sq, student);
  const by = chess.attackers(sq, which === 'attackers' ? enemy : owner).filter((s) => s !== sq);
  const subject = owned(chess, sq, student);
  const verb = which === 'attackers' ? 'attack' : 'defend';
  if (by.length === 0) return `Nothing ${verb}s ${subject}.`;
  const whose = (which === 'attackers' ? enemy : owner) === student ? 'your' : 'their';
  return `${count(by.length)} ${by.length === 1 ? (which === 'attackers' ? 'attacks' : 'defends') : verb} ${subject}: ${whose} ${listOf(chess, by)}.`;
}

export function answerControl(chess: Chess, sq: Square, student: Color): string {
  const enemy: Color = student === 'w' ? 'b' : 'w';
  const mine = chess.attackers(sq, student);
  const theirs = chess.attackers(sq, enemy);
  const side = (list: Square[], whose: string): string =>
    list.length === 0 ? `${whose === 'your' ? 'you have' : 'they have'} nothing on it` : `${whose} ${listOf(chess, list)}`;
  const verdict = mine.length === theirs.length
    ? (mine.length === 0 ? 'Nobody controls it yet.' : 'Control is even.')
    : mine.length > theirs.length ? 'You control it.' : 'They control it.';
  return `On ${sq}: ${side(mine, 'your')} against ${side(theirs, 'their')}. ${verdict}`;
}

export function answerWhyTarget(chess: Chess, sq: Square | null, student: Color): string | null {
  if (!sq) return null;
  const p = chess.get(sq);
  if (!p) return `There is no piece on ${sq}.`;
  const { owner, enemy } = sides(chess, sq, student);
  const attackers = chess.attackers(sq, enemy);
  const defenders = chess.attackers(sq, owner).filter((s) => s !== sq);
  const subject = capFirst(owned(chess, sq, student));
  if (attackers.length === 0 && defenders.length === 0) return `${subject} is not attacked yet, but nothing guards it — one attack and it is in trouble.`;
  if (attackers.length === 0) return `${subject} is not a target right now: nothing attacks it.`;
  const hanging = findHangingBySee(chess.fen()).some((h) => h.square === sq);
  if (defenders.length === 0) return `${subject} is attacked by the ${listOf(chess, attackers)} and nothing guards it.`;
  if (hanging) return `${subject} is attacked ${attackers.length} time${attackers.length === 1 ? '' : 's'} and defended ${defenders.length} — the trade wins material for the attacker.`;
  return `${subject} is attacked ${attackers.length} time${attackers.length === 1 ? '' : 's'} and defended ${defenders.length} time${defenders.length === 1 ? '' : 's'}, so taking it does not win material yet.`;
}

export function answerAboutPiece(chess: Chess, sq: Square | null, student: Color): string | null {
  if (!sq) return null;
  const p = chess.get(sq);
  if (!p) return `There is no piece on ${sq}.`;
  // Its squares, read with its own side to move (a null move when it is not).
  const parts = chess.fen().split(' ');
  parts[1] = p.color;
  parts[3] = '-';
  let moves = 0;
  try { moves = new Chess(parts.join(' ')).moves({ square: sq, verbose: true }).length; } catch { moves = 0; }
  const safety = answerIsLoose(chess, sq, student);
  // A move count is filler ("It has 1 legal move", hand walks 2026-10-09);
  // only a piece that cannot move at all is worth saying, and never a pawn
  // (a blocked pawn is the structure, not news).
  const scope = moves === 0 && p.type !== 'p' ? 'It cannot move at all.' : '';
  // WHAT THE PIECE DOES (live replay 2026-10-09: "what is my bishop on c4
  // aiming at?" got only "guarded, no legal move"): what it hits, what it
  // guards, a pin, and what the coach's positional read says about it — the
  // same computers the narration speaks from, read for this one square.
  const own = p.color;
  const enemy: Color = own === 'w' ? 'b' : 'w';
  const hits: string[] = [];
  const guards: string[] = [];
  for (const row of chess.board()) for (const q of row) {
    if (!q || q.square === sq) continue;
    // A piece "attacks" a square when it is among that square's attackers —
    // pins and turn aside, the line is what it eyes.
    if (!chess.attackers(q.square, own).includes(sq)) continue;
    if (q.color === enemy && q.type !== 'k') hits.push(`${name(q.type)} on ${q.square}`);
    if (q.color === own && q.type !== 'k') guards.push(`${name(q.type)} on ${q.square}`);
  }
  const enemyKing = chess.board().flat().find((q) => q && q.type === 'k' && q.color === enemy);
  const checksKingLine = enemyKing && chess.attackers(enemyKing.square, own).includes(sq);
  const whose = own === student ? 'their' : 'your';
  const mine = own === student ? 'your' : 'their';
  const lines: string[] = [];
  if (hits.length) lines.push(`It attacks ${whose} ${andList(hits)}.`);
  if (checksKingLine) lines.push(`It gives check.`);
  if (guards.length) lines.push(`It guards ${mine} ${andList(guards)}.`);
  if (p.type !== 'k' && isPinnedPiece(chess, sq, own)) lines.push(`It is pinned to ${mine} king.`);
  try {
    for (const o of readPosition(chess.fen(), student === 'w' ? 'white' : 'black')) {
      if ((o.squares ?? []).includes(sq)) lines.push(o.text);
    }
  } catch { /* the read is a bonus, never a blocker */ }
  return [...lines, safety, scope].filter(Boolean).join(' ');
}

/** The computed answer for a direct kind; null when the turn names nothing
 *  to answer about (the caller then serves today's route). */
export function directAnswer(turn: ResolvedChatTurn, fen: string, memory: ConversationState, student: Color, ask?: string, history: readonly string[] = [], lastCoachLine: string | null = null): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const sq = target(turn, memory, ask);
  switch (turn.kind) {
    case 'is-piece-loose': return answerIsLoose(chess, sq, student, turn.seat);
    case 'count-attackers': return answerCount(chess, sq, student, 'attackers');
    case 'count-defenders': return answerCount(chess, sq, student, 'defenders');
    case 'why-is-it-a-target': return answerWhyTarget(chess, sq, student);
    case 'what-about-piece': return answerAboutPiece(chess, sq, student);
    case 'defend-piece': return answerDefend(chess, sq, student);
    case 'win-piece': return answerWin(chess, sq, student);
    case 'attack-piece': return answerAttack(chess, sq, student);
    case 'material-change': return answerMaterialChange(history, student);
    case 'explain-last': return answerExplainLast(chess, lastCoachLine, student, history);
    case 'threats': return assembleThreatAnswer(fen, ask ?? null, student === 'w' ? 'white' : 'black', turn.seat === 'me' ? 'me' : 'opponent')?.facts ?? null;
    default: return null;
  }
}

/**
 * HOW TO SAVE A PIECE — "how do I defend it?" (hand walk 2026-10-09: the
 * question got the plan). Every legal move after which the piece stands safe,
 * read by the safety door on the board after the move, grouped the way a
 * player thinks: take the attacker, move it, guard it, block the line. No
 * piece named and none in memory: the student's piece most in danger.
 */
export function answerDefend(chess: Chess, sq: Square | null, student: Color): string | null {
  const enemy: Color = student === 'w' ? 'b' : 'w';
  let square = sq;
  if (!square || chess.get(square)?.color !== student) {
    const md = computeMustDefend(chess.fen(), student);
    square = (md.pieces[0]?.square as Square | undefined) ?? null;
    if (!square) return 'Nothing of yours is under attack right now, so there is nothing to defend.';
  }
  const p = chess.get(square);
  if (!p) return `There is no piece on ${square}.`;
  const subject = owned(chess, square, student);
  if (chess.turn() !== student) return `It is their move, so ${subject} has to wait — see what they play first.`;
  let now: number | null = 0;
  try { now = captureRead(chess.fen(), square, enemy); } catch { now = 0; }
  if (now === 0 && chess.attackers(square, enemy).length === 0) return `${capFirst(subject)} is not attacked, so it needs no defending yet.`;
  const attackers = new Set<string>(chess.attackers(square, enemy));
  const take: string[] = []; const away: string[] = []; const guard: string[] = []; const block: string[] = []; const other: string[] = [];
  for (const m of chess.moves({ verbose: true })) {
    const after = new Chess(chess.fen());
    after.move(m.san);
    const at = (m.from === square ? m.to : square);
    let gain: number | null;
    try { gain = captureRead(after.fen(), at, enemy); } catch { gain = null; }
    if (gain !== 0) continue;
    // The move must not leave something else of yours hanging instead.
    if (computeMustDefend(after.fen(), student).net > 0) continue;
    if (m.captured && attackers.has(m.to)) take.push(m.san);
    else if (m.from === square) away.push(m.san);
    else if (after.attackers(square, student).length > chess.attackers(square, student).length) guard.push(m.san);
    else if ([...attackers].some((a) => between(a as Square, square).includes(m.to))) block.push(m.san);
    else other.push(m.san);
  }
  const ways: string[] = [];
  if (take.length) ways.push(`take the attacker with ${orList(take)}`);
  if (away.length) ways.push(`move it: ${orList(away)}`);
  if (guard.length) ways.push(`guard it with ${orList(guard)}`);
  if (block.length) ways.push(`block the attack with ${orList(block)}`);
  if (other.length) ways.push(`make the capture fail with ${orList(other)}`);
  if (ways.length === 0) return `${capFirst(subject)} cannot be saved without losing something else.`;
  return `To save ${subject}, ${ways.length === 1 ? ways[0] : `${ways.slice(0, -1).join('; ')}; or ${ways[ways.length - 1]}`}.`;
}

/** The squares strictly between two squares on a line (empty when not on one). */
function between(a: Square, b: Square): string[] {
  const fa = a.charCodeAt(0); const ra = Number(a[1]);
  const fb = b.charCodeAt(0); const rb = Number(b[1]);
  const df = Math.sign(fb - fa); const dr = Math.sign(rb - ra);
  const n = Math.max(Math.abs(fb - fa), Math.abs(rb - ra));
  if (!(fa === fb || ra === rb || Math.abs(fb - fa) === Math.abs(rb - ra))) return [];
  const out: string[] = [];
  for (let i = 1; i < n; i += 1) out.push(`${String.fromCharCode(fa + df * i)}${ra + dr * i}`);
  return out;
}

/**
 * CAN I WIN IT — "can I win the pawn back?" (pass 1, 2026-10-09: answered
 * "nothing of theirs is loose" while e3 or e4 opened the f1 bishop onto c4).
 * Now: the captures that win it, read by the safety door. Not now: the moves
 * that bring a piece of yours onto it, read on the board after the move. A
 * board fact, never a promise — they get a move to answer.
 */
export function answerWin(chess: Chess, sq: Square | null, student: Color): string | null {
  if (!sq) return null;
  const p = chess.get(sq);
  const enemy: Color = student === 'w' ? 'b' : 'w';
  if (!p || p.color !== enemy) return null;
  const subject = owned(chess, sq, student);
  if (chess.turn() !== student) return `It is their move first, so ${subject} can be protected before you can take it.`;
  let gain: number | null = 0;
  try { gain = captureRead(chess.fen(), sq, student); } catch { gain = null; }
  const takes = chess.moves({ verbose: true }).filter((m) => m.to === sq && m.captured);
  if (gain !== null && gain > 0 && takes.length) {
    return `Yes — ${subject} can be taken now: ${orList(takes.map((m) => m.san))}.`;
  }
  // Not now: which of your moves bring a new attacker onto it.
  const before = new Set<string>(chess.attackers(sq, student));
  const setups: string[] = [];
  const via = new Set<string>();
  for (const m of chess.moves({ verbose: true })) {
    if (m.to === sq) continue;
    const after = new Chess(chess.fen());
    after.move(m.san);
    // Read the square as if it were your move again.
    const asIf = after.fen().split(' ');
    asIf[1] = student; asIf[3] = '-';
    let b: Chess;
    try { b = new Chess(asIf.join(' ')); } catch { continue; }
    if (b.inCheck()) continue;
    const added = b.attackers(sq, student).filter((a) => !before.has(a));
    if (added.length === 0) continue;
    let g: number | null = 0;
    try { g = captureRead(b.fen(), sq, student); } catch { g = null; }
    if (g === null || g <= 0) continue;
    setups.push(m.san);
    for (const a of added) via.add(`${name(b.get(a)?.type ?? 'p')} on ${a}`);
  }
  if (setups.length === 0) return `Not right now — nothing of yours can win ${subject}, and no single move sets it up.`;
  return `Not this move — nothing of yours takes ${subject} safely yet. ${orList(setups)} brings your ${orList([...via])} onto it, and then it can be taken unless they protect it.`;
}

/**
 * HOW TO ATTACK IT — "can I attack the b7 pawn?" (pass 2: read as the pawn
 * move b7). The pieces of yours already on it, then every move that brings a
 * new one onto it, grouped by the piece that arrives. Board facts only.
 */
export function answerAttack(chess: Chess, sq: Square | null, student: Color): string | null {
  if (!sq) return null;
  const p = chess.get(sq);
  const enemy: Color = student === 'w' ? 'b' : 'w';
  if (!p || p.color !== enemy) return null;
  const subject = owned(chess, sq, student);
  const already = chess.attackers(sq, student);
  const lead = already.length ? `Your ${listOf(chess, already)} already ${already.length === 1 ? 'attacks' : 'attack'} ${subject}.` : '';
  if (chess.turn() !== student) return lead || `It is their move first — ask again on your turn.`;
  const before = new Set<string>(already);
  const byPiece = new Map<string, string[]>();
  for (const m of chess.moves({ verbose: true })) {
    if (m.to === sq) continue;
    const after = new Chess(chess.fen());
    after.move(m.san);
    const asIf = after.fen().split(' ');
    asIf[1] = student; asIf[3] = '-';
    let b: Chess;
    try { b = new Chess(asIf.join(' ')); } catch { continue; }
    const added = b.attackers(sq, student).filter((a) => !before.has(a));
    if (added.length === 0) continue;
    // Never offer a move that hands the arriving piece over for nothing.
    let safe: number | null = 0;
    try { safe = captureRead(after.fen(), m.to, enemy); } catch { safe = null; }
    if (safe !== 0) continue;
    const key = `${name(m.piece)} on ${m.from}`;
    byPiece.set(key, [...(byPiece.get(key) ?? []), m.san]);
  }
  if (byPiece.size === 0) return lead || `Nothing of yours can get at ${subject} safely in one move.`;
  const ways = [...byPiece.entries()].map(([who, sans]) => `${orList(sans)} brings your ${who} onto it`);
  return `${lead ? `${lead} ` : ''}To attack ${subject}: ${ways.join('; ')}.`;
}


/**
 * WHAT DID I JUST LOSE — "did I just lose a pawn?" (pass 3: 3.d4?? exf3 took
 * the knight and the answer was about a safe d4 pawn). The captures on the
 * last two plies, read off the game record, both directions, so a trade is
 * said as a trade. A board fact: what was taken, by what, where.
 */
export function answerMaterialChange(history: readonly string[], student: Color): string | null {
  if (history.length === 0) return null;
  const replay = new Chess();
  const moves: Move[] = [];
  try { for (const san of history) moves.push(replay.move(san)); } catch { return null; }
  const recent = moves.slice(-2);
  const lost = recent.filter((m) => m.captured && m.color !== student);
  const won = recent.filter((m) => m.captured && m.color === student);
  if (lost.length === 0 && won.length === 0) return 'No — nothing was taken on the last moves.';
  // The taker is named in WORDS, never SAN: the chat spells a SAN out with
  // its square, so "on c4 with dxc4" read "on c4 with d-pawn takes on c4
  // (dxc4)" (walk 5).
  const taker = (m: Move): string => (m.piece === 'p' ? `${m.from[0]}-pawn` : name(m.piece));
  const say = (m: (typeof moves)[number], whose: string): string => `${whose} ${name(m.captured ?? 'p')} on ${m.to} with ${m.color === student ? 'your' : 'their'} ${taker(m)}`;
  const lostV = lost.reduce((n, m) => n + (MATERIAL_VALUE[m.captured ?? 'p'] ?? 0), 0);
  const wonV = won.reduce((n, m) => n + (MATERIAL_VALUE[m.captured ?? 'p'] ?? 0), 0);
  if (lost.length && !won.length) return `Yes — they took your ${lost.map((m) => say(m, '').trim()).join(' and ')}.`;
  if (won.length && !lost.length) return `No — you took their ${won.map((m) => say(m, '').trim()).join(' and ')}.`;
  const verdict = lostV === wonV ? 'an even trade' : lostV > wonV ? 'you came out behind' : 'you came out ahead';
  return `It was a trade: they took your ${lost.map((m) => say(m, '').trim()).join(' and ')}, and you took their ${won.map((m) => say(m, '').trim()).join(' and ')} — ${verdict}.`;
}

const LINE_SAN = /(?<![A-Za-z0-9])(?:…|\.\.\.)?((?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8]|[a-h][1-8])(?:=[QRBN])?[+#]?|O-O-O|O-O)(?![A-Za-z0-9])/g;

/**
 * WHAT THE COACH MEANT — "stop what?" after "h3 first, to stop …Bg4" (hand
 * walk 2026-10-09). The moves the coach's last line named, each explained on
 * the board: a move of yours by what it does, a move of theirs by what it
 * would do to you. Null when the line names no move this board can explain.
 */
export function answerExplainLast(chess: Chess, line: string | null, student: Color, history: readonly string[] = []): string | null {
  if (!line) return null;
  const fen = chess.fen();
  const mover: 'white' | 'black' = student === 'w' ? 'white' : 'black';
  const them: 'white' | 'black' = mover === 'white' ? 'black' : 'white';
  const flipped = (() => {
    const p = fen.split(' ');
    p[1] = p[1] === 'w' ? 'b' : 'w';
    p[3] = '-';
    try { const c = new Chess(p.join(' ')); return c.inCheck() ? null : c.fen(); } catch { return null; }
  })();
  const seen = new Set<string>();
  const parts: string[] = [];
  const last = history.length ? history[history.length - 1] : null;
  for (const m of line.matchAll(LINE_SAN)) {
    const san = m[1];
    if (seen.has(san)) continue;
    seen.add(san);
    // Theirs only when it is THEIR move on this board (a square that is also
    // a legal move of yours stays yours).
    let mine: Move | null = null;
    try { mine = new Chess(fen).move(san); } catch { mine = null; }
    if (mine && chess.turn() === student) {
      const why = moveWhy(fen, mine.san, student, last);
      if (why) parts.push(`${mine.san} ${why}.`);
      continue;
    }
    if (!flipped) continue;
    let theirs: Move | null = null;
    try { theirs = new Chess(flipped).move(san); } catch { theirs = null; }
    if (!theirs) continue;
    const geo = describeMoveGeometry(flipped, theirs.san, them);
    if (geo) parts.push(`If they get …${theirs.san} in, it ${toObserverSeat(geo)}.`);
  }
  return parts.length ? parts.join(' ') : null;
}
