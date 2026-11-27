// THE THREE THREAT COMPUTERS ON REAL GAME BOARDS (rebuilt 2026-11-27): the
// discovered attack (proven against every reply), the answering move (every
// natural answer tried) and your own threat (with the move that carries it
// out) — each teaches through the one registry and files its row in the
// record. Every board is a position from a real game in `model-games.json`.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { discoveredAttacks } from './discoveredAttack';
import { answeringMove } from './answeringMove';
import { ownThreat, standingThreat } from './ownThreat';
import { readBoardAll } from './boardComputers';
import { registryPosedFacts, positionPosed } from './moveInsight';
import { namedShotTags } from './motifNaming';
import { flipSideToMove } from './threatOut';

interface ModelGame { id: string; pgn: string }
const GAMES = JSON.parse(readFileSync(resolve(__dirname, '../data/model-games.json'), 'utf8')) as ModelGame[];

/** The board before ply `ply` (0-based) of a real game, and the move played there. */
function gameBoard(id: string, ply: number): { fen: string; played: string } {
  const g = GAMES.find((x) => x.id === id);
  if (!g) throw new Error(`no game ${id}`);
  const c = new Chess();
  c.loadPgn(g.pgn);
  const sans = c.history();
  const r = new Chess();
  for (const s of sans.slice(0, ply)) r.move(s);
  return { fen: r.fen(), played: sans[ply] };
}

describe('the discovered attack, proven against every reply', () => {
  // Kasparov–Karpov, WCh 1985, 34…Nf2+: the knight leaves e4 with check and
  // uncovers the bishop on g6 at the queen on d3.
  const KK = gameBoard('mg-kasparov-karpov-wch85', 67);

  it('34…Nf2+ uncovers the bishop on g6 at the queen on d3, and every reply loses it', () => {
    expect(KK.played).toBe('Nf2+');
    const d = discoveredAttacks(KK.fen)[0];
    expect(d.san).toBe('Nf2+');
    expect(d.uncovered).toEqual({ square: 'g6', piece: 'b' });
    expect(d.target).toEqual({ square: 'd3', piece: 'q' });
    // The proof: their best defence takes the knight, and the bishop wins the
    // queen with nothing of Black's left hanging.
    expect(d.line).toEqual(['Nf2+', 'Rxf2', 'Bxd3']);
    expect(d.gain).toBeGreaterThanOrEqual(5);
  });

  it('the capture named is the one that leaves nothing hanging: after Kg1, Bxd3 drops the queen on d4 to Rxd4, so Nxd3 is the win', () => {
    const c = new Chess(KK.fen);
    c.move('Nf2+');
    c.move('Kg1');
    const d = discoveredAttacks(KK.fen).find((x) => x.san === 'Nf2+');
    // Kg1 is not their best defence (Rxf2 is): the line says Rxf2.
    expect(d?.line[1]).toBe('Rxf2');
  });

  it('from White\'s seat after 34.Qxd3 it is their discovery, named, and filed as theirs to stop', () => {
    const facts = readBoardAll('discoveredAttack', { fen: KK.fen, student: 'w', namesMoves: false });
    const theirs = facts.find((f) => f.seat === 'opponent');
    // Their move may be named on any surface: it is not the student's to find.
    expect(theirs?.text).toMatch(/Nf2\+/);
    expect(theirs?.text).toMatch(/their bishop on g6 at your queen on d3/);
    expect(theirs?.skill).toBe('missed-their-discovery');
  });

  it('an opening board, and a board where the piece just hangs, have none', () => {
    const c = new Chess();
    for (const m of 'e4 e5 Nf3 Nc6 Bc4 Bc5'.split(' ')) c.move(m);
    expect(discoveredAttacks(c.fen())).toEqual([]);
    // Lichess aZ6oVKX6, 36.Rxe6: the rook takes on e6 and uncovers Qc3 at the
    // queen on f6 — but …Rd1+ comes first and nothing is won by force.
    expect(discoveredAttacks(gameBoard('mg-lichess-aZ6oVKX6', 70).fen).find((d) => d.san === 'Rxe6')).toBeUndefined();
  });

  it('teaches through the registry with its line, and names no move of the student\'s where the surface may not', () => {
    const named = readBoardAll('discoveredAttack', { fen: KK.fen, student: 'b', namesMoves: true }).find((f) => f.seat === 'student');
    expect(named?.text).toMatch(/Nf2\+/);
    expect(named?.text).toMatch(/your bishop on g6 at their queen on d3/);
    expect(named?.lines?.[0]?.sans).toEqual(['Nf2+', 'Rxf2', 'Bxd3']);
    const learn = readBoardAll('discoveredAttack', { fen: KK.fen, student: 'b', namesMoves: false }).find((f) => f.seat === 'student');
    expect(learn?.text).not.toMatch(/Nf2/);
    expect(learn?.text).toMatch(/your bishop on g6 at their queen on d3/);
    expect(learn?.lines).toBeUndefined();
  });

  it('files its row in the record: the board posed "find the discovery"', () => {
    const posed = registryPosedFacts(KK.fen, 'b', []);
    expect(posed.some((f) => f.computer === 'discoveredAttacks' && f.skill === 'missed-your-discovery')).toBe(true);
  });
});

describe('the answering move: every natural answer tried', () => {
  // Caro-Kann Two Knights model game, 17.Bxd2: the knight on d2 hits the queen
  // on f3 — only taking it holds.
  const CARO = gameBoard('mg-caro-two-knights', 32);

  it('only Bxd2 saves the queen on f3; Qg4 runs into Nxg4', () => {
    expect(CARO.played).toBe('Bxd2');
    const a = answeringMove(CARO.fen);
    expect(a?.san).toBe('Bxd2');
    expect(a?.target).toEqual({ square: 'f3', piece: 'q' });
    expect(a?.refuted).toEqual({ san: 'Qg4', win: 'Nxg4' });
  });

  it('once the one answer is played, no threat stands (Capablanca–Marshall, after 8.Bb3)', () => {
    const after = gameBoard('mg-capablanca-marshall', 13).fen;
    expect(answeringMove(after)).toBeNull();
  });

  it('teaches through the registry and files the threat in the record', () => {
    const [f] = readBoardAll('answeringMove', { fen: CARO.fen, student: 'w', namesMoves: true });
    expect(f.text).toMatch(/Bxd2/);
    expect(f.text).toMatch(/your queen on f3/);
    expect(f.skill).toBe('missed-opponents-threat');
    const [learn] = readBoardAll('answeringMove', { fen: CARO.fen, student: 'w', namesMoves: false });
    expect(learn.text).not.toMatch(/Bxd2/);
    expect(registryPosedFacts(CARO.fen, 'w', []).some((x) => x.computer === 'answeringMove' && x.skill === 'missed-opponents-threat')).toBe(true);
  });
});

describe('your own threat, with the move that carries it out', () => {
  // Fischer–Spassky, 6…h6 hits the bishop on g5: hxg5 wins it.
  const FS = gameBoard('mg-fischer-spassky-g6', 11);

  it('6…h6 now threatens hxg5, winning the bishop', () => {
    expect(FS.played).toBe('h6');
    const o = ownThreat(FS.fen, 'h6');
    expect(o?.carry.san).toBe('hxg5');
    expect(o?.won).toEqual({ square: 'g5', piece: 'b' });
  });

  it('a capture they take back is no threat (9.Bxe7: …Qxe7 answers what the bishop hits next)', () => {
    const b = gameBoard('mg-fischer-spassky-g6', 16);
    expect(b.played).toBe('Bxe7');
    expect(ownThreat(b.fen, 'Bxe7')).toBeNull();
  });

  it('teaches through the registry, naming the carrying move only where the surface may', () => {
    const [named] = readBoardAll('ownThreat', { fenBefore: FS.fen, san: 'h6', student: 'b', namesMoves: true });
    expect(named.text).toMatch(/Your move (now threatens|sets up) hxg5/);
    expect(named.text).toMatch(/their bishop on g5/);
    const [learn] = readBoardAll('ownThreat', { fenBefore: FS.fen, san: 'h6', student: 'b', namesMoves: false });
    expect(learn.text).not.toMatch(/hxg5/);
    expect(learn.text).toMatch(/their bishop on g5/);
  });

  it('the follow-through is read off the same computer: the threat stands while the reply ignores it, and is gone once answered', () => {
    const c = new Chess(FS.fen);
    c.move('h6');
    // Stood for Black before White's reply…
    expect(standingThreat(flipSideToMove(c.fen()) ?? '')?.san).toBe('hxg5');
    // …and 7.Bh4 answered it: nothing stands.
    c.move('Bh4');
    expect(standingThreat(c.fen())?.to === 'g5').toBe(false);
  });

  it('files the follow-through in the record: Kasparov–Karpov 1985, 36.Rfd2 threatens Rxd3, …Qe3 ignores it, and the board asks for Rxd3', () => {
    const made = gameBoard('mg-kasparov-karpov-wch85', 70);
    expect(made.played).toBe('Rfd2');
    expect(ownThreat(made.fen, 'Rfd2')?.carry.san).toBe('Rxd3');
    const reply = gameBoard('mg-kasparov-karpov-wch85', 71);
    expect(reply.played).toBe('Qe3');
    const now = gameBoard('mg-kasparov-karpov-wch85', 72);
    const tag = namedShotTags(now.fen, 'Rxd3')[0];
    const posed = positionPosed(now.fen, { lastMove: { fenBefore: reply.fen, san: 'Qe3' } });
    expect(posed.some((p) => p.tag === tag)).toBe(true);
    // The row comes from the follow-through read: without the reply it is not posed.
    expect(positionPosed(now.fen, {}).some((p) => p.tag === tag)).toBe(false);
    // NEGATIVE: Fischer–Spassky, 7.Bh4 answered …h6 — nothing is posed for it.
    const fs = gameBoard('mg-fischer-spassky-g6', 13);
    expect(standingThreat(fs.fen)?.to).not.toBe('g5');
  });
});

