import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { famousTrapLine, famousOutcome, famousTrapRead, famousTrapsAt, type FamousTrap } from './famousTraps';
import data from '../data/famous-traps.json';
const allFamousTraps = (): FamousTrap[] => (data as { traps: FamousTrap[] }).traps;

const boardOf = (line: string): string => { const c = new Chess(); for (const m of line.split(' ')) c.move(m); return c.fen().split(' ').slice(0, 4).join(' '); };
const trap = (p: Partial<FamousTrap> & { line: string; slip: string; punish: string[] }): FamousTrap => {
  const c = new Chess(); for (const m of p.line.split(' ')) c.move(m);
  return { order: 0, name: 'Test Trap', source: 'test', board: boardOf(p.line), by: c.turn(), endCp: 300, mate: false, ...p };
};

describe('famousOutcome — what the punishment wins, never more', () => {
  it('names the material the line wins when the engine holds it', () => {
    const t = trap({ name: "Noah's Ark Trap", line: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 d4 b5 Bb3 Nxd4 Nxd4 exd4', slip: 'Qxd4', punish: ['c5', 'Qd5', 'Be6', 'Qc6+', 'Bd7', 'Qd5', 'c4', 'Qxa8', 'Qxa8'], endCp: 320 });
    // Qxd4 took a pawn, then the line wins the queen for a rook… the ledger names it.
    expect(famousOutcome(t, 'you').verb).toBe('win');
  });
  it('a famous trap the engine refutes is still named, and said as level', () => {
    const t = trap({ line: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 d3 Qh4+ g3 Nxg3 Nf3 Qh5 Nxd5', slip: 'Nxh1', punish: ['Nxc7+', 'Kd8', 'Nxa8'], endCp: 0 });
    expect(famousOutcome(t, 'you').words).toBe('the engine finds a defence and it stays level');
  });
  it('a line that wins material the engine does not hold says the standing, never the piece', () => {
    const t = trap({ line: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5', slip: 'Nxd5', punish: ['Nxf7', 'Kxf7', 'Qf3+', 'Ke6', 'Nc3'], endCp: 61 });
    const o = famousOutcome(t, 'they');
    expect(o.verb).toBe('stand');
    expect(o.words).toBe('they are a little better');
  });
  it('a mate is mate', () => {
    const t = trap({ line: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5', slip: 'axb4', punish: ['Nd3#'], mate: true, endCp: 0 });
    expect(famousOutcome(t, 'you').verb).toBe('mate');
  });
});

describe('famousTrapLine — the trap by its name, from the slipper\'s seat', () => {
  const kieninger = trap({ name: 'Kieninger Trap', line: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5', slip: 'axb4', punish: ['Nd3#'], mate: true, endCp: 0 });
  it('their slip: "This is the X: if they play S, …"', () => {
    expect(famousTrapLine({ trap: kieninger, slipBy: 'opponent' })?.text).toBe('This is the Kieninger Trap: if they play axb4, …Nd3 leads to mate.');
  });
  it('the student\'s own slip is "Watch out"', () => {
    expect(famousTrapLine({ trap: kieninger, slipBy: 'student' })?.text).toBe('Watch out: this is the Kieninger Trap. axb4 allows …Nd3, and it is mate.');
  });
  it('one move away names the move first', () => {
    expect(famousTrapLine({ trap: kieninger, slipBy: 'opponent', before: { san: 'Ngxe5', color: 'b' } })?.text).toBe('This is the Kieninger Trap: after …Ngxe5, if they play axb4, …Nd3 leads to mate.');
  });
  it('a possessive name takes no "the"', () => {
    expect(famousTrapLine({ trap: { ...kieninger, name: "Légal's Mate" }, slipBy: 'opponent' })?.text).toMatch(/^This is Légal's Mate:/);
    expect(famousTrapLine({ trap: { ...kieninger, name: "Noah's Ark Trap" }, slipBy: 'opponent' })?.text).toMatch(/^This is the Noah's Ark Trap:/);
  });
});

describe('the index — every entry is a legal slip from its board', () => {
  it('each slip and its punishment play on the board', () => {
    expect(allFamousTraps().length).toBeGreaterThan(20);
    for (const t of allFamousTraps()) {
      const c = new Chess(`${t.board} 0 1`);
      expect(() => { c.move(t.slip); for (const s of t.punish) c.move(s); }, `${t.name}: ${t.slip} ${t.punish.join(' ')}`).not.toThrow();
      // A slip found by the engine in a long line loses something; a trap's
      // own known move is kept whatever the engine finds (and said as that).
      expect(t.mate || t.endCp >= 50 || t.source.startsWith('famous-trap-lines'), `${t.name}: a famous slip loses something`).toBe(true);
    }
  });
});

describe('famousTrapRead — at a move of the taught line', () => {
  it('the Kieninger: the move before the slip names it, one move away and on offer', () => {
    const line = 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3'.split(' ');
    const c = new Chess(); for (const m of line) c.move(m);
    const r = famousTrapRead({ fenBefore: c.fen(), san: 'Ngxe5', mover: 'b', student: 'b' });
    expect(famousTrapsAt(boardOf([...line, 'Ngxe5'].join(' '))).length).toBeGreaterThan(0);
    expect(r?.text).toMatch(/^This is the Kieninger Trap: if they play axb4, …Nd3 leads to mate\.$/);
  });
});
