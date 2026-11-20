// David's 202-board test, its five evidence boards, read from recorded engine
// reads (`__fixtures__/danyaBoards5.reads.json`, built by
// `RECORD_READS=… npx tsx scripts/board-read-stored.ts in5.jsonl out.jsonl`).
// A read the fixture lacks throws, naming its FEN.
import { describe, it, expect, beforeAll } from 'vitest';
import reads from './__fixtures__/danyaBoards5.reads.json';
import { fixtureReader, readDanyaBoard, readKey, type DanyaRead, type Reads } from '../test/danyaBoardRead';

const BOARDS: Record<string, string> = {
  underpromotion: '8/8/1KP5/3r4/8/8/8/k7 w - - 0 1',
  gun: 'r4rk1/p3nqp1/Ppn1p2p/1B1pPp2/1P1P1P2/5N2/3Q2PP/R4RK1 w - - 0 20',
  opera: '1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17',
  blunder: '4k3/7p/4PN2/p7/P6K/7P/1p4P1/8 b - - 0 48',
  desperado: 'rnq2rk1/1pn3bp/p2p2p1/2pPp1PP/P1P1Pp2/2N2N2/1P1B1P2/R2QK2R b KQ - 0 16',
};
const R = reads as unknown as Reads;
const got: Record<string, DanyaRead> = {};

beforeAll(async () => {
  for (const [name, fen] of Object.entries(BOARDS)) got[name] = await readDanyaBoard(fen, R[readKey(fen)] ?? [], fixtureReader(R));
}, 120_000);

const allFacts = (b: string): string => got[b].facts.map((f) => f.text).join('\n');
const sentences = (t: string): string[] => t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 20);
const noRepeat = (t: string): void => { const s = sentences(t); expect(s.length, `repeated sentence in: ${t}`).toBe(new Set(s).size); };

describe('board 1 — the Saavedra (a-guide-to-underpromotion#0)', () => {
  it('says c7, the rook checks, the king escapes to b5, queening allows …Rc4 stalemate, c8=R', () => {
    const t = got.underpromotion.read;
    expect(t).toMatch(/\bc7\b/);
    expect(t).toMatch(/rook[^.]*check|check[^.]*rook/i);
    expect(t).toMatch(/\bb5\b/);
    expect(t).toMatch(/Rc4[^.]*stalemate|stalemate[^.]*Rc4/i);
    expect(t).toMatch(/c8=R|rook/);
  });
  it('says no passer twice, no bare "Kxc7", no "pawn on c7"', () => {
    const t = got.underpromotion.read;
    expect((t.match(/passed pawn|passer/gi) ?? []).length).toBeLessThanOrEqual(1);
    expect(t).not.toMatch(/After Kxc7 only the kings/);
    expect(t).not.toMatch(/pawn on c7/);
    noRepeat(t);
  });
});

describe('board 2 — Alekhine\'s gun (alekhines-gun2#0)', () => {
  it('names Rac1 and the doubled rooks on the c-file', () => {
    const t = got.gun.read;
    expect(t).toMatch(/Rac1/);
    expect(t).toMatch(/doubl|line up|battery/i);
    expect(t).toMatch(/c-file/);
  });
  it('never Rfc1, no reason twice, no "your knight on e7/b8"', () => {
    const t = got.gun.read;
    expect(t).not.toMatch(/Rfc1/);
    noRepeat(t);
    expect(allFacts('gun')).not.toMatch(/your knight on (e7|b8)/);
  });
});

describe('board 3 — the Opera game finish (beginner-chess-strategy#4)', () => {
  it('reads the finished game: the rook-and-bishop mate, White far behind in material', () => {
    const t = got.opera.read;
    expect(t.length).toBeGreaterThan(0);
    expect(t).toMatch(/rook[^.]*bishop[^.]*mate|mate[^.]*rook[^.]*bishop/i);
    expect(t).toMatch(/behind|down/i);
  });
});

describe('board 4 — a grandmaster\'s blunder (blunders-a-grandmasters-perspective#0)', () => {
  it('names …Kd8 as the move and says …Ke7 throws the win', () => {
    const t = got.blunder.read;
    expect(t).toMatch(/Kd8/);
    expect(t).toMatch(/Ke7[^.]*(draw|level|throws|win)/i);
    expect(t).not.toMatch(/Kf8 (is|was) the move|the move is …?Kf8/i);
    expect(t).not.toMatch(/Kd8 looks natural/);
  });
  it('no colour complex in a knight ending', () => {
    expect(allFacts('blunder')).not.toMatch(/light squares are weak/);
  });
});

describe('board 5 — desperado defence (desperado-defense#0)', () => {
  it('says why …Qg4 fails, no h6 plan, no try without its reason', () => {
    const t = got.desperado.read;
    expect(t).toMatch(/Qg4[^.]*(trap|Rh4)|(trap|Rh4)[^.]*Qg4/i);
    expect(allFacts('desperado')).not.toMatch(/\bh6\b[^.]*(plan|break)|break with h6/i);
    expect(t).not.toMatch(/\b(?:[KQRBN][a-h]?x?[a-h][1-8]|[a-h]x?[a-h]?[1-8])[+#]?\??,? (?:is|was) tempting\.?$/m);
  });
});
