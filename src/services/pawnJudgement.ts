// pawnJudgement — the batch-6 PAWN-STRUCTURE judgements (teach-brief §2, the
// structure acts): a second weakness, the key pawn, fixing their pawns on your
// bishop's colour, a capture that seals your weakness, en passant as a
// structural choice, named formations, the break that trades off your weak
// pawn, not repairing their structure, and the mirrored-square asymmetry.
//
// Every read is a board fact computed with chess.js + the shared outpost /
// position-reading computers, said from the student's seat (you / they), and
// carries the squares it rests on as its proof. Silent when the board does not
// show it — never a guess. Pure.
import type { Color, Square } from 'chess.js';
import { noPawnCanChallenge } from './outpost';
import { findWeakPawns, pressureCount, capturesWinMaterial, legalSeeGainFor } from './positionReadingService';
import { squaresProof, legalLineProof } from './proof';
import { costStakes } from './factStakes';
import { andList } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import {
  type StructureRead, board, play, piecesOf, other, fwd, fileIdx, rankNum, sqAt, shade,
  without, withTurn, scope, pawnAttacks, bare, sqOn,
} from './structureJudgementKit';

const fileName = (sq: string): string => sq[0];
const fullmove = (fen: string): number => Number(fen.split(' ')[5] ?? '1') || 1;

/** SECOND WEAKNESS — their weak pawn holds today, and a second weak pawn sits
 *  on the other wing: two weaknesses far apart are more than their pieces can
 *  guard. Board read; past the opening only. */
export function secondWeakness(fen: string, student: Color): StructureRead | null {
  const c = board(fen);
  if (!c || fullmove(fen) < 12) return null;
  const enemy = other(student);
  const w = findWeakPawns(fen, enemy);
  const weak = [...new Set([...w.isolated, ...w.backward])];
  for (const p1 of weak) {
    const pc = pressureCount(fen, p1);
    if (!pc || pc.attackers < 1 || pc.verdict === 'winnable') continue;
    const p2 = weak.find((q) => q !== p1 && Math.abs(fileIdx(q) - fileIdx(p1)) >= 3);
    if (!p2) continue;
    const text = rotateStem([
      `Don't rush their ${p1} pawn: it holds for now. Their ${p2} pawn on the other wing is a second weakness, and their pieces can't guard both.`,
      `Their ${p1} pawn is defended enough today. Open a second front against ${p2}: two weaknesses far apart are too many to hold.`,
    ], stemKeyOf(fen));
    const proof = squaresProof(`their ${p1} pawn is attacked and still held, and ${p2} is weak on the other wing`, [p1, ...pc.attackerSquares, ...pc.defenderSquares, p2]);
    if (!proof) return null;
    return { act: 'second-weakness', text, squares: [p1, p2], proof, key: `second-weakness:${[p1, p2].sort().join('')}` };
  }
  return null;
}

/** THE KEY PAWN — their pawn P guards Q; Q holds today only because of P, so
 *  if P drops, Q goes with it. Proven by taking P off the board and counting
 *  the exchange on Q again. */
export function keyPawn(fen: string, student: Color): StructureRead | null {
  const c = board(fen);
  if (!c) return null;
  const enemy = other(student);
  for (const p of piecesOf(c, enemy, 'p')) {
    if (c.attackers(p, student).length === 0) continue;
    for (const q of pawnAttacks(p, enemy)) {
      const qp = c.get(q);
      if (!qp || qp.type !== 'p' || qp.color !== enemy) continue;
      const qAttackers = c.attackers(q, student);
      if (qAttackers.length === 0) continue;
      const pawnGuards = c.attackers(q, enemy).filter((s) => c.get(s)?.type === 'p');
      if (pawnGuards.length !== 1 || pawnGuards[0] !== p) continue;
      if (capturesWinMaterial(fen, q, student)) continue;
      const noP = without(fen, p);
      const asIf = noP ? withTurn(noP, student) : null;
      if (!asIf || !capturesWinMaterial(asIf, q, student)) continue;
      const proof = squaresProof(`${p} is the only pawn guarding ${q}; with ${p} gone, ${q} falls to your pieces`, [p, q, ...qAttackers]);
      if (!proof) continue;
      return {
        act: 'key-pawn', squares: [p, q], proof, key: `key-pawn:${p}>${q}`,
        text: `Their ${p} pawn is the key pawn: it guards ${q}, and if ${p} drops, ${q} goes with it.`,
      };
    }
  }
  return null;
}

/** FIX THEIR PAWNS ON YOUR BISHOP'S COLOUR — the student's push stops an
 *  enemy pawn in its tracks on a square of the colour their bishop attacks. */
export function fixOnBishopColour(fenBefore: string, san: string, student: Color): StructureRead | null {
  const r = play(fenBefore, san);
  if (!r || r.mv.color !== student || r.mv.piece !== 'p' || r.mv.captured) return null;
  const enemy = other(student);
  const y = sqAt(fileIdx(r.mv.to), rankNum(r.mv.to) + fwd(student));
  const yp = y ? r.after.get(y) : null;
  if (!y || !yp || yp.type !== 'p' || yp.color !== enemy) return null;
  // Frozen: it cannot step forward, and it has nothing to take its way out.
  if (pawnAttacks(y, enemy).some((s) => r.after.get(s)?.color === student)) return null;
  const myBishop = piecesOf(r.after, student, 'b').find((b) => shade(b) === shade(y));
  if (!myBishop) return null;
  const theirsGone = !piecesOf(r.after, enemy, 'b').some((b) => shade(b) === shade(y));
  const proof = squaresProof(`your ${r.mv.to} pawn blocks ${y}, a ${shade(y)} square your bishop on ${myBishop} works on`, [r.mv.to, y, myBishop]);
  if (!proof) return null;
  return {
    act: 'fix-on-bishop-colour', squares: [r.mv.to, y, myBishop], proof, key: `fix-colour:${y}`,
    text: `${bare(san)} freezes their ${y} pawn on a ${shade(y)} square, where your bishop can go after it${theirsGone ? ', and they have no bishop of that colour to guard it' : ''}.`,
  };
}

/** THEIR CAPTURE SEALED YOUR WEAKNESS — their pawn lands right in front of
 *  your weak pawn on a file it was open on, so their rooks can no longer hit
 *  it from the front. Read on THEIR move. */
export function recaptureSealed(fenBefore: string, san: string, student: Color): StructureRead | null {
  const before = board(fenBefore);
  const r = play(fenBefore, san);
  if (!before || !r) return null;
  const enemy = other(student);
  if (r.mv.color !== enemy || r.mv.piece !== 'p' || !r.mv.captured) return null;
  const x = r.mv.to;
  const s = sqAt(fileIdx(x), rankNum(x) - fwd(student));
  const sp = s ? r.after.get(s) : null;
  if (!s || !sp || sp.type !== 'p' || sp.color !== student) return null;
  const w = findWeakPawns(r.after.fen(), student);
  if (!w.isolated.includes(s) && !w.backward.includes(s)) return null;
  // The file was open in front of it before: no pawn of theirs stood on it.
  if (piecesOf(before, enemy, 'p').some((p) => p[0] === x[0])) return null;
  const proof = squaresProof(`their pawn on ${x} stands in front of your weak ${s} pawn`, [x, s]);
  if (!proof) return null;
  return {
    act: 'recapture-sealed-weakness', squares: [x, s], proof, key: `sealed:${s}`,
    text: `Their pawn on ${x} walls your weak ${s} pawn off the ${fileName(x)}-file: their rooks can't hit it from the front any more.`,
  };
}

/** EN PASSANT AS A STRUCTURAL CHOICE — declining it keeps the clamp your pawn
 *  holds (said when the engine agrees); taking it when it cost gave the clamp
 *  up. Read on the student's move. */
export function enPassantStructure(
  fenBefore: string, san: string, student: Color, cpLoss: number, bestSan: string | null,
): StructureRead | null {
  const c = board(fenBefore);
  if (!c || c.turn() !== student || (fenBefore.split(' ')[3] ?? '-') === '-') return null;
  const eps = c.moves({ verbose: true }).filter((m) => m.isEnPassant());
  if (eps.length === 0) return null;
  const r = play(fenBefore, san);
  if (!r) return null;
  const took = r.mv.isEnPassant();
  const shutBy = (sq: string): Square[] => pawnAttacks(sq, student).filter((t) => r.after.get(t)?.color !== student);
  if (!took) {
    if (cpLoss > 30) return null;
    if (bestSan && eps.some((m) => bare(m.san) === bare(bestSan))) return null;
    const cap = eps.find((m) => m.from !== r.mv.from);
    if (!cap) return null;
    const shut = shutBy(cap.from);
    if (shut.length === 0) return null;
    const proof = squaresProof(`your ${cap.from} pawn covers ${andList(shut)}`, [cap.from, ...shut]);
    if (!proof) return null;
    return {
      act: 'en-passant-structure', squares: [cap.from, ...shut], proof, key: `ep-keep:${cap.from}`,
      text: `Not taking en passant keeps your ${cap.from} pawn where it is: it keeps ${andList(shut)} shut to their pieces.`,
    };
  }
  if (cpLoss < 50 || !bestSan || bare(bestSan) === bare(san)) return null;
  const nowCovers = new Set(pawnAttacks(r.mv.to, student));
  const lost = pawnAttacks(r.mv.from, student).filter((t) => !nowCovers.has(t) && r.after.get(t)?.color !== student);
  if (lost.length === 0) return null;
  const proof = legalLineProof(fenBefore, [bestSan]);
  if (!proof) return null;
  return {
    act: 'en-passant-structure', squares: [r.mv.from, ...lost], proof, key: `ep-took:${r.mv.from}`, stakes: costStakes(cpLoss) ?? undefined,
    text: `Taking en passant gave up the clamp: your pawn on ${r.mv.from} kept ${andList(lost)} shut. ${bare(bestSan)} kept it.`,
  };
}

/** A NAMED FORMATION the student's pawn move just built — the triangle, the
 *  chain, the phalanx — and what it is for. Said the move it first appears. */
export function formation(fenBefore: string, san: string, student: Color): StructureRead | null {
  const before = board(fenBefore);
  const r = play(fenBefore, san);
  if (!before || !r || r.mv.color !== student || r.mv.piece !== 'p') return null;
  const own = (c: typeof before, sq: Square | null): boolean => !!sq && c.get(sq)?.type === 'p' && c.get(sq)?.color === student;
  const x = r.mv.to;
  const back = (sq: string, df: number): Square | null => sqAt(fileIdx(sq) + df, rankNum(sq) - fwd(student));
  const byFile = (a: string[]): string[] => [...a].sort();

  // TRIANGLE: an apex backed diagonally from both sides.
  const apexes = [x, sqAt(fileIdx(x) - 1, rankNum(x) + fwd(student)), sqAt(fileIdx(x) + 1, rankNum(x) + fwd(student))];
  for (const a of apexes) {
    if (!a || !own(r.after, a)) continue;
    const l = back(a, -1); const rr = back(a, 1);
    if (!l || !rr || !own(r.after, l) || !own(r.after, rr)) continue;
    if (own(before, a) && own(before, l) && own(before, rr)) continue;
    const sqs = byFile([a, l, rr]);
    const proof = squaresProof(`${a} is guarded by your pawns on ${l} and ${rr}`, sqs);
    if (!proof) continue;
    return {
      act: 'formation', squares: sqs, proof, key: `formation:triangle:${sqs.join('')}`,
      text: `${sqs[0]}, ${sqs[1]} and ${sqs[2]} make a triangle: ${a} is backed from both sides, so it can lead the expansion.`,
    };
  }

  // CHAIN: three pawns on one diagonal, each guarding the next.
  for (const df of [-1, 1]) {
    for (const head of [x, sqAt(fileIdx(x) - df, rankNum(x) + fwd(student))]) {
      if (!head || !own(r.after, head)) continue;
      const mid = back(head, df); const base = mid ? back(mid, df) : null;
      if (!mid || !base || !own(r.after, mid) || !own(r.after, base)) continue;
      if (![head, mid, base].includes(x)) continue;
      if (own(before, head) && own(before, mid) && own(before, base)) continue;
      const proof = squaresProof(`${base} guards ${mid}, which guards ${head}`, [base, mid, head]);
      if (!proof) continue;
      return {
        act: 'formation', squares: [base, mid, head], proof, key: `formation:chain:${base}${head}`,
        text: `${base}, ${mid} and ${head} form a chain: ${base} is its base, the one pawn nothing else guards, so that is the pawn to look after.`,
      };
    }
  }

  // PHALANX: two central pawns side by side in their half or beyond.
  const rel = student === 'w' ? rankNum(x) : 9 - rankNum(x);
  if (rel >= 4 && fileIdx(x) >= 2 && fileIdx(x) <= 5) {
    for (const df of [-1, 1]) {
      const n = sqAt(fileIdx(x) + df, rankNum(x));
      if (!n || !own(r.after, n) || fileIdx(n) < 2 || fileIdx(n) > 5) continue;
      if (own(before, n) && own(before, x)) continue;
      const pair = byFile([x, n]);
      const cover = byFile([...new Set([...pawnAttacks(pair[0], student), ...pawnAttacks(pair[1], student)])]);
      const proof = squaresProof(`${pair[0]} and ${pair[1]} cover ${andList(cover)}`, [...pair, ...cover]);
      if (!proof) continue;
      return {
        act: 'formation', squares: [...pair], proof, key: `formation:phalanx:${pair.join('')}`,
        text: `${pair[0]} and ${pair[1]} stand side by side: together they cover ${andList(cover)}, and either can advance with the other's support.`,
      };
    }
  }
  return null;
}

/** A BREAK THAT TRADES OFF YOUR WEAK PAWN — the weak pawn steps forward into
 *  contact with theirs, so it can be exchanged instead of defended forever. */
export function breakTradesWeakPawn(fenBefore: string, san: string, student: Color, cpLoss: number): StructureRead | null {
  if (cpLoss > 40) return null;
  const r = play(fenBefore, san);
  if (!r || r.mv.color !== student || r.mv.piece !== 'p' || r.mv.captured) return null;
  const w = findWeakPawns(fenBefore, student);
  if (!w.isolated.includes(r.mv.from) && !w.backward.includes(r.mv.from)) return null;
  const enemy = other(student);
  const contact = [
    ...pawnAttacks(r.mv.to, student).filter((s) => r.after.get(s)?.type === 'p' && r.after.get(s)?.color === enemy),
    ...r.after.attackers(r.mv.to, enemy).filter((s) => r.after.get(s)?.type === 'p'),
  ];
  if (contact.length === 0) return null;
  const e = contact[0];
  const proof = squaresProof(`your pawn on ${r.mv.to} meets their pawn on ${e}`, [r.mv.from, r.mv.to, e]);
  if (!proof) return null;
  return {
    act: 'break-trades-weak-pawn', squares: [r.mv.from, r.mv.to, e], proof, key: `break-weak:${r.mv.from}`,
    text: `${bare(san)} is the direct way to get rid of your weak ${r.mv.from} pawn: it meets their pawn on ${e} and can be traded off.`,
    ...(cpLoss <= 20 ? { held: { tag: 'mistimed-pawn-break' as const, posedImportance: 60 } } : {}),
  };
}

/** DON'T REPAIR THEIR STRUCTURE — a pawn the student could take is the one
 *  burying their own bishop; leaving it (with the engine's agreement) keeps
 *  the bishop buried. */
export function dontRepair(
  fenBefore: string, san: string, student: Color, cpLoss: number, bestSan: string | null,
): StructureRead | null {
  if (cpLoss > 30) return null;
  const c = board(fenBefore);
  const r = play(fenBefore, san);
  if (!c || !r || c.turn() !== student) return null;
  const enemy = other(student);
  const bestTo = bestSan ? play(fenBefore, bestSan) : null;
  const targets = [...new Set(c.moves({ verbose: true }).filter((m) => m.captured === 'p').map((m) => m.to))];
  for (const p of targets) {
    if (r.mv.to === p && r.mv.captured) continue;
    if (bestTo && bestTo.mv.to === p && bestTo.mv.captured) continue;
    if (legalSeeGainFor(fenBefore, p, student) < 1) continue;
    const noP = without(fenBefore, p);
    const nb = noP ? board(noP) : null;
    if (!nb) continue;
    for (const b of piecesOf(c, enemy, 'b')) {
      if (shade(b) !== shade(p)) continue;
      if (scope(nb, b) - scope(c, b) < 3) continue;
      const proof = squaresProof(`their ${p} pawn blocks their own bishop on ${b}`, [p, b]);
      if (!proof) continue;
      return {
        act: 'dont-repair', squares: [p, b], proof, key: `dont-repair:${p}`,
        text: `Leaving their ${p} pawn alone is right: it buries their own bishop on ${b}, and taking it would set that bishop free.`,
        held: { tag: 'greedy-pawn-grab', posedImportance: 60 },
      };
    }
  }
  return null;
}

/** THE MIRRORED-SQUARE ASYMMETRY — in a near-symmetric structure, a pawn of
 *  yours can still guard your central square, while no pawn of theirs can ever
 *  guard its mirror: a lasting hole for them that you do not have. */
export function mirroredAsymmetry(fen: string, student: Color): StructureRead | null {
  const c = board(fen);
  if (!c) return null;
  const enemy = other(student);
  const mine = piecesOf(c, student, 'p');
  const theirs = piecesOf(c, enemy, 'p');
  if (mine.length !== theirs.length || mine.length < 4) return null;
  const myFiles = new Set(mine.map((s) => s[0]));
  const theirFiles = new Set(theirs.map((s) => s[0]));
  const diff = 'abcdefgh'.split('').filter((f) => myFiles.has(f) !== theirFiles.has(f)).length;
  if (diff > 2) return null;
  const myRank = student === 'w' ? 4 : 5;
  for (const f of [3, 4, 2, 5]) {
    const m = sqOn(f, myRank);
    const m2 = sqOn(f, 9 - myRank);
    if (c.get(m)?.type === 'p' || c.get(m2)?.type === 'p') continue;
    if (noPawnCanChallenge(c, m, enemy)) continue;          // no pawn of yours can guard m
    if (!noPawnCanChallenge(c, m2, student)) continue;      // a pawn of theirs still can guard m2
    const guards = mine
      .filter((p) => Math.abs(fileIdx(p) - f) === 1 && (student === 'w' ? rankNum(p) < myRank : rankNum(p) > myRank))
      .sort((a, b) => Math.abs(rankNum(a) - myRank) - Math.abs(rankNum(b) - myRank));
    if (guards.length === 0) continue;
    const guard = guards[0];
    const proof = squaresProof(`your ${guard} pawn can still guard ${m}; no pawn of theirs can reach a square that guards ${m2}`, [guard, m, m2]);
    if (!proof) continue;
    return {
      act: 'mirrored-asymmetry', squares: [guard, m, m2], proof, key: `mirror:${m}`,
      text: `Your ${guard[0]}-pawn can still guard ${m}; they can never guard ${m2} the same way, so that square stays a hole for them.`,
    };
  }
  return null;
}

/** CHOOSING BETWEEN PAWN MOVES — the formation half (missed computers,
 *  2026-10-08). The student pushed a pawn that built nothing, and the engine's
 *  own move was a different pawn push that builds a named formation (the same
 *  `formation` computer reads it). Said only when the choice cost something,
 *  with the engine's move as the proof. */
export function formationChoice(
  fenBefore: string, san: string, student: Color, bestSan: string | null, cpLoss: number,
): StructureRead | null {
  if (!bestSan || cpLoss < 50 || bare(bestSan) === bare(san)) return null;
  const played = play(fenBefore, san);
  const best = play(fenBefore, bestSan);
  if (!played || !best || played.mv.piece !== 'p' || best.mv.piece !== 'p') return null;
  if (played.mv.color !== student) return null;
  if (formation(fenBefore, san, student)) return null;
  const built = formation(fenBefore, bestSan, student);
  if (!built) return null;
  const kind = built.key.split(':')[1] ?? 'formation';
  const proof = legalLineProof(fenBefore, [bestSan]);
  if (!proof) return null;
  return {
    act: 'formation', squares: built.squares, proof, key: `formation-choice:${built.key}`, stakes: costStakes(cpLoss) ?? undefined,
    text: `Of the pawn moves, ${bare(bestSan)} was the one: it makes a ${kind} of ${andList(built.squares)}, and ${bare(san)} builds nothing.`,
  };
}
