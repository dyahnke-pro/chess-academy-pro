import { describe, expect, it } from 'vitest';
import { checkCensus, attackLeader, defenderArrival } from './attackReads';
import { readBoardAll } from './boardComputers';
import { registryPosedFacts } from './moveInsight';
import { isProof } from './proof';

// Real game boards from the Danya article set (`__fixtures__/danyaBoards209`),
// with the engine's top lines as recorded (White's view).

// Black to move; White, handed the move, has Qg4+ and Qh5+ — each leaves the
// king on g8 only h8.
const CENSUS = 'r2q1rk1/pb3p1p/1pnppp2/2p5/2PPP3/BPN2Q2/P5PP/R4RK1 b - - 0 1';

// Black to move, a rook up's worth: …Qh3 first, …Nh4 follows (the queen on h3
// covers h4).
const LEAD = '3r1r1k/p5pp/2pbq3/2B1p3/2P1Q3/1PNP1pP1/P2R1PnP/4R1K1 b - - 0 1';
const LEAD_LINES = [{ moves: ['e6h3', 'e1e3', 'g2h4', 'e4f3', 'f8f3', 'g3h4', 'f3e3', 'c5e3'], cp: -655, mate: null }];

// White to move mates in two (Qxh7+ Kf8 Qh8#); Black's queen on b6 needs two
// moves to reach the king.
const ARRIVAL = '2brr1k1/pp2b1pp/1q2p1B1/4Np1Q/8/1P6/PBP2PPP/R2R2K1 w - - 0 1';
const ARRIVAL_LINES = [{ moves: ['h5h7', 'g8f8', 'h7h8'], cp: null, mate: 2 }];

describe('checkCensus — the mating-square census', () => {
  it('every check of theirs leaves the king one square, said to the defender', () => {
    const r = checkCensus(CENSUS, null, 'b');
    expect(r?.attacker).toBe('w');
    expect(r?.king).toBe('g8');
    expect(r?.flight).toBe('h8');
    expect(r?.checks.length).toBeGreaterThanOrEqual(2);
    expect(r?.text).toMatch(/h8/);
    expect(r?.text).toMatch(/your king|Your king/);
  });
  it('the same census, from the attacker\'s seat', () => {
    const r = checkCensus(CENSUS, null, 'w');
    expect(r?.text).toMatch(/their king|you have/);
    expect(r?.text).not.toMatch(/your king/);
  });
  it('the census is exact: after each check the only legal reply is the king to that square', async () => {
    const { Chess } = await import('chess.js');
    const r = checkCensus(CENSUS, null, 'b');
    expect(r).not.toBeNull();
    for (const san of r?.checks ?? []) {
      const c = new Chess(r?.fen);
      c.move(san);
      const replies = c.moves({ verbose: true });
      expect(replies.every((m) => m.piece === 'k' && m.to === r?.flight)).toBe(true);
    }
  });
  it('negative control: the start position, and a check that can be blocked', () => {
    expect(checkCensus('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', null, 'w')).toBeNull();
    // After 1.e4 e5 2.Qh5 Nc6 3.Bc4: Qxf7+ mates, the mate's lesson.
    expect(checkCensus('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1', null, 'w')).toBeNull();
  });
});

describe('attackLeader — which piece leads', () => {
  it('the queen leads and the knight follows, with the board\'s why', () => {
    const r = attackLeader(LEAD, LEAD_LINES, 'b', true);
    expect(r?.leader.san).toBe('Qh3');
    expect(r?.follower.san).toBe('Nh4');
    expect(r?.why.covers).toBe(true);
    expect(r?.text).toMatch(/queen leads the attack/);
    expect(r?.text).toMatch(/covers h4/);
  });
  it('the student\'s own lead is held where the surface may not name it', () => {
    const r = attackLeader(LEAD, LEAD_LINES, 'b', false);
    expect(r?.text).not.toMatch(/Qh3|Nh4/);
    expect(r?.text).toMatch(/queen/);
  });
  it('their lead is named from the defender\'s seat', () => {
    const r = attackLeader(LEAD, LEAD_LINES, 'w', false);
    expect(r?.text).toMatch(/^Their queen leads the attack: Qh3 first/);
  });
  it('negative control: a level line leads nothing', () => {
    expect(attackLeader(LEAD, [{ ...LEAD_LINES[0], cp: 20 }], 'b', true)).toBeNull();
  });
});

describe('defenderArrival — the defender too late', () => {
  it('their queen needs two moves, the mate takes two', () => {
    const r = defenderArrival(ARRIVAL, ARRIVAL_LINES, 'w');
    expect(r?.mateIn).toBe(2);
    expect(r?.nearest.square).toBe('b6');
    expect(r?.nearest.moves).toBe(2);
    expect(r?.text).toMatch(/Their queen on b6 needs two moves|the queen on b6 needs two moves/);
  });
  it('from the defender\'s seat: your help cannot arrive', () => {
    expect(defenderArrival(ARRIVAL, ARRIVAL_LINES, 'b')?.text).toMatch(/Your|your king/);
  });
  it('negative control: a line that does not mate is no race', () => {
    expect(defenderArrival(ARRIVAL, [{ moves: ['h5h7', 'g8f8'], cp: 300, mate: null }], 'w')).toBeNull();
  });
});

describe('the three reads, wired both ways', () => {
  it('the census teaches with its line as proof and files the defender\'s king', () => {
    const [f] = readBoardAll('checkCensus', { fen: CENSUS, lines: null, student: 'b' });
    expect(f?.skill).toBe('weakened-king-safety');
    expect(isProof(f?.proof)).toBe(true);
    expect(registryPosedFacts(CENSUS, 'b', []).some((x) => x.computer === 'checkCensus' && x.skill === 'weakened-king-safety')).toBe(true);
  });
  it('the leader and the race are posed off the record\'s one line', () => {
    expect(registryPosedFacts(LEAD, 'b', LEAD_LINES[0].moves).some((x) => x.computer === 'attackLeader' && x.skill === 'missed-tactic')).toBe(true);
    expect(registryPosedFacts(ARRIVAL, 'w', ARRIVAL_LINES[0].moves).some((x) => x.computer === 'defenderArrival' && x.skill === 'missed-your-mate')).toBe(true);
  });
  it('the opponent\'s race carries the mate line as proof', () => {
    const [f] = readBoardAll('defenderArrival', { fen: ARRIVAL, lines: ARRIVAL_LINES, student: 'b' });
    expect(f?.skill).toBe('missed-their-mate');
    expect(isProof(f?.proof)).toBe(true);
  });
});
