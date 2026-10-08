// squareJudgement — the batch-6 SQUARE, FILE and PIECE judgements: restriction
// (their long bishop staring at a wall), a piece in front of its own pawn, the
// semi-outpost, the masked weakness, a square valued for safety and route,
// file entry squares covered, not plugging your own open file, squares your
// unmoved pawns leave open, the mutual-restriction ledger, and a file the
// exchange opens for the defender.
//
// Board facts only (chess.js + outpost + position reading), said from the
// student's seat, each carrying the squares or the line it rests on. Silent
// when the board does not show it. Pure.
import type { Color, Square } from 'chess.js';
import { isOutpost, noPawnCanChallenge, relativeRank } from './outpost';
import { squaresProof, legalLineProof } from './proof';
import { costStakes } from './factStakes';
import { andList } from '../utils/andList';
import {
  type StructureRead, PIECE_NOUN, board, play, piecesOf, other, fwd, fileIdx, rankNum, sqAt,
  withTurn, scope, pawnAttacks, uciToSans, bare, sqOn,
} from './structureJudgementKit';

/** The first square holding a piece along a ray, or null. */
function firstOnRay(c: ReturnType<typeof board> & object, from: string, df: number, dr: number): Square | null {
  for (let k = 1; k < 8; k++) {
    const s = sqAt(fileIdx(from) + df * k, rankNum(from) + dr * k);
    if (!s) return null;
    if (c.get(s)) return s;
  }
  return null;
}

const isPawnOf = (c: NonNullable<ReturnType<typeof board>>, sq: string | null, color: Color): boolean =>
  !!sq && c.get(sq as Square)?.type === 'p' && c.get(sq as Square)?.color === color;

/** RESTRICTION — their fianchettoed bishop's long diagonal ends on a pawn of
 *  yours that another pawn guards: the bishop is staring at a wall. */
export function restriction(fen: string, student: Color): StructureRead | null {
  const c = board(fen);
  if (!c) return null;
  const enemy = other(student);
  const homes: [string, number, number][] = enemy === 'w'
    ? [['g2', -1, 1], ['b2', 1, 1]]
    : [['g7', -1, -1], ['b7', 1, -1]];
  for (const [home, df, dr] of homes) {
    const b = c.get(home as Square);
    if (!b || b.type !== 'b' || b.color !== enemy) continue;
    const wall = firstOnRay(c, home, df, dr);
    if (!wall || !isPawnOf(c, wall, student)) continue;
    // The wall must stand in the centre or beyond the bishop's first step.
    if (Math.max(Math.abs(fileIdx(wall) - fileIdx(home)), Math.abs(rankNum(wall) - rankNum(home))) < 2) continue;
    const guards = c.attackers(wall, student).filter((s) => c.get(s)?.type === 'p');
    if (guards.length === 0 || scope(c, home as Square) > 5) continue;
    const chain = [guards[0], wall];
    const g2 = c.attackers(guards[0], student).find((s) => c.get(s)?.type === 'p');
    if (g2) chain.unshift(g2);
    const proof = squaresProof(`their bishop on ${home} runs into your ${wall} pawn, guarded by ${guards[0]}`, [home, ...chain]);
    if (!proof) continue;
    return {
      act: 'restriction', squares: [home, ...chain], proof, key: `restrict:${home}`,
      text: `Your ${andList(chain)} pawns leave their bishop on ${home} staring at a wall: its long diagonal ends on ${wall}.`,
    };
  }
  return null;
}

/** A PIECE IN FRONT OF ITS OWN PAWN — their minor piece blocks a pawn, so that
 *  pawn can never come up to support the pawn diagonally ahead of it. */
export function pieceBlocksOwnPawn(fen: string, student: Color): StructureRead | null {
  const c = board(fen);
  if (!c) return null;
  const enemy = other(student);
  for (const w of piecesOf(c, enemy, 'p')) {
    const f = sqAt(fileIdx(w), rankNum(w) + fwd(enemy));
    const blocker = f ? c.get(f) : null;
    if (!f || !blocker || blocker.color !== enemy || (blocker.type !== 'n' && blocker.type !== 'b')) continue;
    for (const df of [-1, 1]) {
      const q = sqAt(fileIdx(w) + df, rankNum(w) + 2 * fwd(enemy));
      if (!q || !isPawnOf(c, q, enemy)) continue;
      if (c.attackers(q, enemy).some((s) => c.get(s)?.type === 'p')) continue;
      // Nothing else can ever back it up: no other pawn of theirs behind it on a neighbouring file.
      const otherSupport = piecesOf(c, enemy, 'p').some((p) => p !== w && Math.abs(fileIdx(p) - fileIdx(q)) === 1
        && (enemy === 'w' ? rankNum(p) < rankNum(q) : rankNum(p) > rankNum(q)));
      if (otherSupport) continue;
      const proof = squaresProof(`their ${PIECE_NOUN[blocker.type]} on ${f} blocks the ${w} pawn, the only pawn that could support ${q}`, [f, w, q]);
      if (!proof) continue;
      return {
        act: 'piece-blocks-own-pawn', squares: [f, w, q], proof, key: `clog:${f}>${q}`,
        text: `Their ${PIECE_NOUN[blocker.type]} on ${f} sits in front of their own ${w} pawn, so no pawn can ever come up to back up ${q}.`,
      };
    }
  }
  return null;
}

/** THE SEMI-OUTPOST — the student's knight lands on a supported square no
 *  enemy pawn hits today; a pawn of theirs could one day challenge it, but
 *  only by a push that costs. */
export function semiOutpost(fenBefore: string, san: string, student: Color, cpLoss: number): StructureRead | null {
  if (cpLoss > 30) return null;
  const r = play(fenBefore, san);
  if (!r || r.mv.color !== student || r.mv.piece !== 'n') return null;
  const x = r.mv.to;
  const c = r.after;
  const enemy = other(student);
  const rel = relativeRank(x, student);
  if (rel < 4 || rel > 6) return null;
  if (!c.attackers(x, student).some((s) => c.get(s)?.type === 'p')) return null;
  if (c.attackers(x, enemy).some((s) => c.get(s)?.type === 'p')) return null;
  if (noPawnCanChallenge(c, x, student)) return null; // a true outpost — another lane's
  const a0 = rankNum(x) + fwd(student);
  const challengers: { from: string; at: Square }[] = [];
  for (const p of piecesOf(c, enemy, 'p')) {
    if (Math.abs(fileIdx(p) - fileIdx(x)) !== 1) continue;
    const at = sqAt(fileIdx(p), a0);
    if (!at || at === p) continue;
    const ahead = enemy === 'w' ? rankNum(p) < a0 : rankNum(p) > a0;
    if (!ahead) continue;
    challengers.push({ from: p, at });
  }
  if (challengers.length === 0) return null;
  // Every challenge must cost: a square on the pawn's path is occupied or
  // covered by a pawn of yours.
  const costs = (ch: { from: string; at: Square }): boolean => {
    for (let rr = rankNum(ch.from) + fwd(enemy); enemy === 'w' ? rr <= rankNum(ch.at) : rr >= rankNum(ch.at); rr += fwd(enemy)) {
      const s = sqOn(fileIdx(ch.from), rr);
      if (c.get(s)) return true;
      if (c.attackers(s, student).some((q) => c.get(q)?.type === 'p')) return true;
    }
    return false;
  };
  if (!challengers.every(costs)) return null;
  const ch = challengers[0];
  const proof = squaresProof(`no pawn of theirs hits ${x} now; their ${ch.from} pawn would need to reach ${ch.at}`, [x, ch.from, ch.at]);
  if (!proof) return null;
  return {
    act: 'semi-outpost', squares: [x, ch.from, ch.at], proof, key: `semi-outpost:${x}`,
    text: `Their ${ch.from[0]}-pawn could one day reach ${ch.at}, but for now ${x} is a fine post for your knight.`,
    held: { tag: 'misplaced-piece', posedImportance: 60 },
  };
}

/** THE MASKED WEAKNESS — their minor piece covers holes in their own camp; a
 *  pawn push of yours can chase it, and the holes come back. */
export function maskedWeakness(fen: string, student: Color): StructureRead | null {
  const c = board(fen);
  if (!c) return null;
  const enemy = other(student);
  const asMe = withTurn(fen, student);
  const me = asMe ? board(asMe) : null;
  if (!me) return null;
  for (const s of [...piecesOf(c, enemy, 'n'), ...piecesOf(c, enemy, 'b')]) {
    const holes: Square[] = [];
    for (let f = 0; f < 8; f++) for (let r = 1; r <= 8; r++) {
      const h = sqOn(f, r);
      if (h === s || c.get(h)?.type === 'p') continue;
      if (!isOutpost(c, h, student, false)) continue;
      if (c.attackers(h, enemy).includes(s)) holes.push(h);
    }
    if (holes.length < 2) continue;
    const push = me.moves({ verbose: true }).find((m) => m.piece === 'p' && !m.captured
      && pawnAttacks(m.to, student).includes(s)
      && !c.attackers(m.to, enemy).some((q) => c.get(q)?.type === 'p'));
    if (!push) continue;
    holes.sort();
    const noun = PIECE_NOUN[c.get(s)?.type ?? 'n'];
    const proof = squaresProof(`their ${noun} on ${s} covers ${andList(holes)}, squares no pawn of theirs can guard`, [s, ...holes, push.to]);
    if (!proof) continue;
    return {
      act: 'masked-weakness', squares: [s, ...holes], proof, key: `masked:${s}`,
      text: `Their weak ${andList(holes)} hide behind the ${noun} on ${s}; chase it with ${push.san} and those squares open up again.`,
    };
  }
  return null;
}

/** A SQUARE VALUED FOR SAFETY AND ROUTE — the student's quiet piece move goes
 *  where nothing of theirs can hit it, and the engine's line moves it on from
 *  there next. */
export function safeSquareRoute(fenBefore: string, san: string, student: Color, bestUci: readonly string[], cpLoss: number): StructureRead | null {
  if (cpLoss > 20) return null;
  const r = play(fenBefore, san);
  if (!r || r.mv.color !== student || r.mv.captured || /[+#]/.test(r.mv.san)) return null;
  if (!['q', 'r', 'b', 'n'].includes(r.mv.piece)) return null;
  const pv = uciToSans(fenBefore, bestUci);
  if (pv.length < 3 || bare(pv[0]) !== bare(san)) return null;
  const next = play(r.after.fen(), pv[1]);
  const on = next ? play(next.after.fen(), pv[2]) : null;
  if (!on || on.mv.from !== r.mv.to) return null;
  const x = r.mv.to;
  const enemy = other(student);
  if (r.after.attackers(x, enemy).length > 0) return null;
  for (const p of piecesOf(r.after, enemy, 'p')) {
    const t = sqAt(fileIdx(p), rankNum(p) + fwd(enemy));
    if (t && !r.after.get(t) && pawnAttacks(t, enemy).includes(x)) return null;
  }
  const proof = legalLineProof(fenBefore, pv.slice(0, 3));
  if (!proof) return null;
  return {
    act: 'safe-square-route', squares: [x, on.mv.to], proof, key: `safe-route:${x}`,
    text: `Your ${PIECE_NOUN[r.mv.piece]} on ${x} is safe there, since nothing of theirs can hit it, and it can swing to ${on.mv.to} next.`,
  };
}

/** FILE ENTRY SQUARES — their pawn can open a file by capturing; every square
 *  their rooks could use on it is already covered by your pieces. */
export function fileEntryCovered(fen: string, student: Color): StructureRead | null {
  const c = board(fen);
  if (!c) return null;
  const enemy = other(student);
  if (piecesOf(c, enemy, 'r').length === 0) return null;
  for (const e of piecesOf(c, enemy, 'p')) {
    const f = e[0];
    if (!pawnAttacks(e, enemy).some((s) => c.get(s)?.color === student && c.get(s)?.type !== 'k')) continue;
    const pawnsOnFile = [...piecesOf(c, enemy, 'p'), ...piecesOf(c, student, 'p')].filter((p) => p[0] === f && p !== e);
    if (pawnsOnFile.length > 0) continue;
    const entries: Square[] = [];
    for (const rel of [2, 3, 4]) {
      const s = sqOn(fileIdx(e), student === 'w' ? rel : 9 - rel);
      if (!c.get(s)) entries.push(s);
    }
    if (entries.length < 2) continue;
    if (!entries.every((s) => c.attackers(s, student).some((q) => c.get(q)?.type !== 'k'))) continue;
    const guards = [...new Set(entries.flatMap((s) => c.attackers(s, student)))];
    const proof = squaresProof(`if their ${e} pawn captures, the ${f}-file opens; ${andList(entries)} are each covered by your pieces`, [e, ...entries, ...guards]);
    if (!proof) continue;
    return {
      act: 'file-entry-covered', squares: [e, ...entries], proof, key: `file-entry:${f}`,
      text: `Let them open the ${f}-file: every square their rooks could use there, ${andList(entries)}, is covered.`,
    };
  }
  return null;
}

/** DON'T PLUG YOUR OWN OPEN FILE — the student's piece stepped in front of its
 *  own rook on a file with none of its pawns, and it cost. */
export function dontPlugFile(fenBefore: string, san: string, student: Color, cpLoss: number, bestSan: string | null): StructureRead | null {
  if (cpLoss < 40 || !bestSan) return null;
  const r = play(fenBefore, san);
  if (!r || r.mv.color !== student || r.mv.piece === 'p' || r.mv.piece === 'r' || r.mv.piece === 'k') return null;
  if (bare(bestSan) === bare(san)) return null;
  const x = r.mv.to;
  const f = x[0];
  if (piecesOf(r.after, student, 'p').some((p) => p[0] === f)) return null;
  // Walk back toward the student's own side: the first piece is your rook.
  const back = -fwd(student);
  let rook: Square | null = null;
  for (let k = 1; k < 8; k++) {
    const s = sqAt(fileIdx(x), rankNum(x) + back * k);
    if (!s) break;
    const p = r.after.get(s);
    if (!p) continue;
    if (p.type === 'r' && p.color === student) rook = s;
    break;
  }
  if (!rook) return null;
  const best = play(fenBefore, bestSan);
  if (!best || (best.mv.to[0] === f && best.mv.piece !== 'r')) return null;
  const proof = legalLineProof(fenBefore, [bestSan]);
  if (!proof) return null;
  return {
    act: 'dont-plug-file', squares: [x, rook], proof, key: `plug:${f}`, stakes: costStakes(cpLoss) ?? undefined,
    text: `${bare(san)} plugs your own rook's ${f}-file; ${bare(bestSan)} keeps it open.`,
  };
}

/** SQUARES YOUR UNMOVED PAWNS LEAVE OPEN — their piece lands on a square no
 *  pawn of yours covers, only because a pawn of yours is still at home. Read
 *  on THEIR move. */
export function unmovedUnits(fenBefore: string, san: string, student: Color): StructureRead | null {
  const r = play(fenBefore, san);
  const enemy = other(student);
  if (!r || r.mv.color !== enemy || (r.mv.piece !== 'n' && r.mv.piece !== 'b')) return null;
  const x = r.mv.to;
  const rel = relativeRank(x, student);
  if (rel < 3 || rel > 5) return null;
  const c = r.after;
  if (c.attackers(x, student).some((s) => c.get(s)?.type === 'p')) return null;
  for (const p of piecesOf(c, student, 'p')) {
    if (relativeRank(p, student) !== 2) continue;
    const one = sqAt(fileIdx(p), rankNum(p) + fwd(student));
    const two = sqAt(fileIdx(p), rankNum(p) + 2 * fwd(student));
    for (const t of [one, two]) {
      if (!t || c.get(t)) break;
      if (!pawnAttacks(t, student).includes(x)) continue;
      const proof = squaresProof(`your ${p} pawn is still at home; from ${t} it would cover ${x}`, [x, p, t]);
      if (!proof) continue;
      return {
        act: 'unmoved-units', squares: [x, p, t], proof, key: `unmoved:${x}`,
        text: `Their ${PIECE_NOUN[r.mv.piece]} reaches ${x} because your ${p[0]}-pawn hasn't moved: on ${t} it would cover that square.`,
      };
    }
  }
  return null;
}

/** Squares a knight on `sq` can go to: not its own pieces, not hit by an enemy pawn. */
function knightExits(c: NonNullable<ReturnType<typeof board>>, sq: string): number {
  const p = c.get(sq as Square);
  if (!p) return 0;
  const them = other(p.color);
  let n = 0;
  for (const [df, dr] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) {
    const t = sqAt(fileIdx(sq) + df, rankNum(sq) + dr);
    if (!t || c.get(t)?.color === p.color) continue;
    if (c.attackers(t, them).some((s) => c.get(s)?.type === 'p')) continue;
    n++;
  }
  return n;
}

/** THE MUTUAL-RESTRICTION LEDGER — a rim knight that blocks a bishop: the
 *  bishop is shut, the knight is stuck. Said for either seat. */
export function mutualRestriction(fen: string, student: Color): StructureRead | null {
  const c = board(fen);
  if (!c) return null;
  for (const knightSide of [other(student), student]) {
    const bishopSide = other(knightSide);
    for (const k of piecesOf(c, knightSide, 'n')) {
      if (k[0] !== 'a' && k[0] !== 'h') continue;
      if (knightExits(c, k) > 1) continue;
      for (const b of piecesOf(c, bishopSide, 'b')) {
        const df = Math.sign(fileIdx(k) - fileIdx(b));
        const dr = Math.sign(rankNum(k) - rankNum(b));
        if (Math.abs(fileIdx(k) - fileIdx(b)) !== Math.abs(rankNum(k) - rankNum(b)) || df === 0) continue;
        if (firstOnRay(c, b, df, dr) !== k) continue;
        const theirs = knightSide !== student;
        const text = theirs
          ? `Their knight on ${k} blocks your bishop on ${b}, a fair price: the knight is stuck on the rim.`
          : `Your knight on ${k} blocks their bishop on ${b}: a stuck knight for a shut-in bishop is a fair trade.`;
        const proof = squaresProof(`the knight on ${k} stands on the bishop's diagonal from ${b} and has few safe squares`, [k, b]);
        if (!proof) continue;
        return { act: 'mutual-restriction', squares: [k, b], proof, key: `mutual:${k}:${b}`, text };
      }
    }
  }
  return null;
}

/** A FILE OPENED FOR THE DEFENDER — the student's capture is answered by a pawn
 *  recapture that clears a file their rook already stands on. */
export function fileOpenedForDefender(fenBefore: string, san: string, student: Color, reply: string | null, cpLoss: number): StructureRead | null {
  if (!reply || cpLoss < 30) return null;
  const r = play(fenBefore, san);
  if (!r || r.mv.color !== student || !r.mv.captured) return null;
  const rep = play(r.after.fen(), reply.replace(/^…/, ''));
  if (!rep || rep.mv.piece !== 'p' || rep.mv.to !== r.mv.to || rep.mv.from[0] === r.mv.to[0]) return null;
  const enemy = other(student);
  const f = rep.mv.from[0];
  if (piecesOf(rep.after, enemy, 'p').some((p) => p[0] === f)) return null;
  if ([...piecesOf(rep.after, student, 'r'), ...piecesOf(rep.after, student, 'q')].some((p) => p[0] === f)) return null;
  const rook = piecesOf(rep.after, enemy, 'r').find((p) => p[0] === f);
  if (!rook) return null;
  const proof = legalLineProof(fenBefore, [san, reply.replace(/^…/, '')]);
  if (!proof) return null;
  return {
    act: 'file-opened-for-defender', squares: [r.mv.to, rook], proof, key: `opened-for-them:${f}`, stakes: costStakes(cpLoss) ?? undefined,
    text: `After their ${f}-pawn takes back on ${r.mv.to}, their rook on ${rook} owns the ${f}-file.`,
  };
}
