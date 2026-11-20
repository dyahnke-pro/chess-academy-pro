/**
 * WHAT CANNOT WAIT ON THIS BOARD (one-board-read build, 2026-10-08).
 *
 * Before any plan, assessment or "what are they doing?" answer, a coach checks
 * three things in this order: can I win something right now, is something of
 * mine about to be taken, and is a pawn about to queen. The plan lane checked
 * only the second; the opponent-move lane checked none, and called …d2 "a
 * quiet move" with the pawn hitting a rook and a bishop and one step from
 * promoting (live replay, 2026-10-08). This is the one read every board
 * answer leads with. It reuses the shared threat computer (`computeMustDefend`,
 * pin-aware, exchange-checked) — no second board scan.
 */
import { renderUrgency } from './teachingSentence';
import { capturedSquare } from '../utils/capturedSquare';
import { Chess, type Square } from 'chess.js';
import { computeMustDefend, flipSideToMove, mateThreatsAgainst } from './threatOut';
import { takingTheAttackerAnswers } from './positionReadingService';
import { andList } from '../utils/andList';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

interface BoardUrgency {
  /** The student is the side to move. */
  myMove: boolean;
  /** Their biggest piece the student wins right now (student to move only).
   *  `guarded`: something of theirs guards it — it falls in the trades, it is
   *  not free (prod Review 2026-10-29: "their pawn on g6 is free to take" with
   *  f7 guarding it; it fell to an x-ray behind the capture). */
  win: { square: string; piece: string; value: number; guarded: boolean } | null;
  /** The student's pieces the opponent wins next move, biggest first. */
  save: Array<{ square: string; piece: string; value: number; attacker: string | null }>;
  /** Their piece attacking the student's biggest stake, when taking it is safe and answers the threat. */
  takeAttacker: { square: string; piece: string } | null;
  /** An opponent pawn that promotes on its next move. */
  promotion: { from: string; to: string } | null;
  /** THEIR MATE THREAT, read first (WO-DANYA-READS-01 group 1): the moves
   *  that would mate the student if it were the opponent's turn — the one
   *  null-move read (`mateThreatsAgainst`), student to move only. A board
   *  fact, exact, so it leads whatever the engine plays. */
  mate: string[];
}

function promotingPawn(fen: string, them: 'w' | 'b'): { from: string; to: string } | null {
  let probe: Chess;
  try {
    const c = new Chess(fen);
    probe = c.turn() === them ? c : new Chess(flipSideToMove(fen) ?? '');
  } catch { return null; }
  const mv = probe.moves({ verbose: true }).find((m) => m.piece === 'p' && !!m.promotion);
  return mv ? { from: mv.from, to: mv.to } : null;
}

/**
 * @param bestUci REQUIRED — the engine's best move for the student on this
 *   board, or null when no engine read exists. "First, X — that comes before
 *   any plan" is a PRIORITY claim, and priority is the engine's to say: on
 *   Danya's article boards the board-only read said "save your pawn on c3
 *   first" where the engine's best was the king walk (Kg6, the race), 42 times
 *   in 209 boards (WO-DANYA-READS-01 step 1). With a read, a "take first" or
 *   "save first" stands only when the best move does it.
 */
export function readBoardUrgency(fen: string, studentColor: 'white' | 'black', bestUci: string | null): BoardUrgency | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const me: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  const myMove = chess.turn() === me;
  // What THEY must defend is what the student wins — real only when it is the
  // student's move (otherwise they simply move it away first).
  const theirs = myMove ? computeMustDefend(fen, them).pieces : [];
  const win = theirs[0] ? { square: theirs[0].square, piece: theirs[0].piece, value: theirs[0].value, guarded: theirs[0].defenders > 0 } : null;
  const save = computeMustDefend(fen, me).pieces.map((p) => ({ square: p.square, piece: p.piece, value: p.value, attacker: p.attackerSquare }));
  // THE ONE CHECK the threat answer and Learn's warning already run: when the
  // attacker can be taken without losing material, taking it IS the answer.
  const att = myMove ? save[0]?.attacker ?? null : null;
  const attPiece = att ? chess.get(att as Square) : null;
  const takeAttacker = att && attPiece && attPiece.color === them && takingTheAttackerAnswers(fen, att as Square, me)
    ? { square: att, piece: attPiece.type }
    : null;
  const promotion = promotingPawn(fen, them);
  const mate = myMove ? [...new Set(mateThreatsAgainst(fen, me).moves.map((m) => m.san))] : [];
  if (!myMove || !bestUci || bestUci.length < 4) return { myMove, win, save, promotion, takeAttacker, mate };
  // THE ENGINE ORDERS THE PRIORITIES (see the parameter). The best move takes
  // the piece, or it is not the first thing; it deals with the attacked piece
  // (moves it, takes the attacker, or leaves it no longer losable), or that is
  // not the first thing either.
  const to = bestUci.slice(2, 4);
  const from = bestUci.slice(0, 2);
  let after: string | null = null;
  let forcing = false;
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: from as Square, to: to as Square, promotion: bestUci[4] ?? 'q' });
    forcing = !!mv.captured || c.inCheck();
    after = c.fen();
  } catch { after = null; }
  const stillLosable = after ? new Set(computeMustDefend(after, me).pieces.map((p) => p.square)) : null;
  // Answered: the piece moves, its attacker is taken, or a QUIET move leaves it
  // safe. A check or capture elsewhere is the engine playing something else
  // first (miracle-on-the-chess-board#0: Bxf2+ with the knight "to save").
  const answered = (p: { square: string; attacker: string | null }): boolean =>
    p.square === from || (p.attacker !== null && p.attacker === to)
    || (!forcing && stillLosable !== null && !stillLosable.has(p.square));
  return {
    myMove,
    win: win && win.square === to ? win : null,
    save: save.filter(answered),
    promotion,
    takeAttacker: takeAttacker && takeAttacker.square === to ? takeAttacker : null,
    mate,
  };
}

/** The one sentence that comes before any plan, or null when nothing is urgent.
 *  THE BIGGER STAKE LEADS: taking their queen beats saving your rook, but
 *  saving your queen beats grabbing a knight (a Colle walk: the plan must say
 *  "your queen on g4 can be taken" first, not "take the knight"). */
export function urgencyLead(u: BoardUrgency | null): string | null {
  if (!u) return null;
  const parts: string[] = [];
  // THEIR THREAT FIRST: a mate threat comes before anything you could take
  // or save (WO-DANYA-READS-01 group 1: "Your rook on d1 is hanging" was
  // said with …Qxd1 mate on the board).
  if (u.mate.length > 0) {
    const mates = u.mate.map((m) => m.replace(/#$/, ''));
    parts.push(renderUrgency({ kind: 'mate', mates }));
  }
  const biggestSave = u.save[0]?.value ?? 0;
  const winLeads = !!u.win && u.win.value >= biggestSave;
  if (u.win && winLeads) {
    parts.push(renderUrgency({ kind: 'win', piece: NAME[u.win.piece], square: u.win.square }));
  }
  if (u.save.length > 0 && !winLeads) {
    const named = andList(u.save.map((p) => `${NAME[p.piece]} on ${p.square}`));
    if (u.takeAttacker) {
      const hit = u.save.filter((p) => p.attacker === u.takeAttacker?.square).map((p) => `${NAME[p.piece]} on ${p.square}`);
      parts.push(renderUrgency({ kind: 'take-attacker', piece: NAME[u.takeAttacker.piece], square: u.takeAttacker.square, hits: andList(hit.length ? hit : [named]) }));
    } else {
      parts.push(renderUrgency({ kind: 'save', named }));
    }
  }
  if (u.promotion && !winLeads) {
    parts.push(renderUrgency({ kind: 'promotion', from: u.promotion.from, to: u.promotion.to }));
  }
  return parts.length ? parts.join(' ') : null;
}

/** For "what is their move doing?": the threats their pawn or piece now makes. */
export function threatsAgainst(u: BoardUrgency | null, fromSquare: string, fen: string): string | null {
  if (!u) return null;
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const piece = chess.get(fromSquare as Square);
  if (!piece) return null;
  const probeFen = chess.turn() === piece.color ? fen : flipSideToMove(fen);
  if (!probeFen) return null;
  const hits = new Chess(probeFen).moves({ square: fromSquare as Square, verbose: true })
    .filter((m) => m.captured && m.captured !== 'k')
    .map((m) => `${NAME[m.captured as string]} on ${capturedSquare(m)}`);
  const uniq = [...new Set(hits)];
  const promotes = u.promotion?.from === fromSquare;
  if (uniq.length === 0 && !promotes) return null;
  const attack = uniq.length ? `it attacks your ${andList(uniq)}` : '';
  const queen = promotes ? `${attack ? ' and ' : 'it '}threatens to promote` : '';
  return `${attack}${queen}`;
}
