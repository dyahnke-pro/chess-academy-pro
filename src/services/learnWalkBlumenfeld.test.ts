// Learn hand-walk, fresh Blumenfeld game (lichess e1zhfnut, Black at 1599,
// 2026-09-26). Flags: audit-reports/hand-walk-learn-blumenfeld-2026-09-26.md.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { spokenUpcoming } from './liveTacticsContext';

const GAME = 'd4 Nf6 c4 e6 Nf3 c5 d5 b5 b3 Bb7 Nbd2 exd5 cxb5 d6 Bb2 Be7 e3 O-O Bd3 Nbd7 O-O Qc7 Re1 Ne5 Nxe5 dxe5 Rc1 e4 Be2 Qd7 Nf1 Rac8 a4 Qf5 Ng3 Qg6 Be5 Rfd8 a5 Bd6 Bxd6 Rxd6 a6 Ba8 Nh5 Nxh5 Bxh5 Qg5 Qg4 Qxg4 Bxg4 Rc7 Rc2 d4 Rec1 d3 Rxc5 Rxc5 Rxc5 g6 Rc8+ Kg7 Rxa8 d2 Rc8 d1=Q+ Bxd1 Rxd1#'.split(' ');
function fenAt(ply: number): string {
  const c = new Chess();
  for (const m of GAME.slice(0, ply)) c.move(m);
  return c.fen();
}
function play(fen: string, sans: string[]): string {
  const c = new Chess(fen);
  for (const m of sans) c.move(m);
  return c.fen();
}

describe('F9 — a future tactic is said with the moves that build it', () => {
  // After 9.e3: "Watch out — moving from a4 to b5 reveals their rook on a1
  // attacking your rook on a8", with no piece on a4 — a four-ply engine line
  // (…a6 a4 …O-O axb5) said as if it stood on the board.
  const root = fenAt(17);
  const line = ['a6', 'a4', 'O-O', 'axb5'];
  const desc = 'Moving from a4 to b5 reveals rook on a1 attacking rook on a8';
  it('a line longer than one move each is not said at all', () => {
    expect(spokenUpcoming(line, desc, root, root, 'b')).toBeNull();
  });
  it('a one-move threat names its move and seats the pieces where it lands', () => {
    const r = fenAt(27); // after 14.Rc1, Black to move
    const s = spokenUpcoming(['e4'], 'Pawn on e4 forks bishop on d3 and knight on f3', play(r, ['e4']), r, 'b');
    expect(s).toMatch(/^if you play e4, /);
    expect(s).toMatch(/your pawn on e4/);
    expect(s).toMatch(/their bishop on d3/);
  });
  it('a reply line names both moves, the student first when it is their turn', () => {
    const r = fenAt(27);
    const s = spokenUpcoming(['e4', 'Be2'], 'Bishop on e2 x', play(r, ['e4', 'Be2']), r, 'b');
    expect(s).toMatch(/^if you play e4 and they answer Be2, /);
  });
});

describe('F19 — a centre square holding your own pawn is defended, not "hit"', () => {
  it('Qf5 is not said to take aim at d5, e4 and e5 (Black pawns)', async () => {
    const { computeMoveFundamentals } = await import('./moveFundamentals');
    const funds = computeMoveFundamentals(fenAt(33), 'Qf5', 'black');
    const centre = funds.find((f) => f.id === 'center');
    expect(centre?.led ?? '').not.toMatch(/d5|e4|e5/);
  });
});

describe('F25 — "no need to react" never beside a best move that reacts', () => {
  it('Nh5 is not a bluff when the best reply is to take it', async () => {
    const { detectBluff } = await import('./bluffDetector');
    const before = fenAt(44); // after 22…Ba8, White to play Nh5
    expect(detectBluff(before, 'Nh5', null)).not.toBeNull(); // the bluff geometry holds…
    expect(detectBluff(before, 'Nh5', 'Nxh5')).toBeNull();   // …but the engine answers it
  });
});

describe('F17 — the tempo verdict names the kick they PLAYED', () => {
  it('after …Qf5 Ng3 the verdict names Ng3, not a hypothetical g4', async () => {
    const { attributePrinciples } = await import('./principleAttribution');
    const { renderFundamentalVerdict } = await import('./principleVoice');
    const attrs = attributePrinciples({
      historySans: GAME.slice(0, 34), // …Qf5
      bestSan: 'Qe6',
      classification: 'mistake',
      replySan: 'Ng3',
    });
    const tempo = attrs.find((a) => a.id === 'tempo-handed');
    expect(tempo, attrs.map((a) => a.id).join(',')).toBeDefined();
    if (!tempo) return;
    expect(tempo.evidence.moves).toEqual(['Ng3']);
    const line = renderFundamentalVerdict([tempo], { ply: 34, seen: new Set(), replySan: 'Ng3' });
    expect(line).toMatch(/Ng3/);
    expect(line).not.toMatch(/they get g4/);
  });
});

describe('F16/F23/F31 — a grade says what the move cost, and whether they took it', () => {
  it('…Qd7 names what it let them do, and that Nf1 missed it', async () => {
    const { callInaccuracyDetailed } = await import('./inaccuracyCall');
    const v = callInaccuracyDetailed({
      fenBefore: fenAt(29), playedSan: 'Qd7', bestSan: 'Rad8',
      bestLineUci: ['a8d8', 'd2f1', 'f6d7', 'a2a4', 'c7b8', 'f1g3'],
      cpLoss: 374, side: 'student', moverColor: 'black',
      replyLineUci: ['b2f6', 'e7f6', 'd2e4', 'f6b2', 'c1c2', 'd7e7'],
      replySan: 'Nf1',
    });
    const said = v.call?.said ?? '';
    expect(said).toMatch(/Qd7 was a blunder — it let them /);
    expect(said).toMatch(/they missed it/);
    expect(said).not.toMatch(/their king/);
  });
  it('with no reply line the grade stands alone, naming no cost it cannot prove', async () => {
    const { callInaccuracyDetailed } = await import('./inaccuracyCall');
    const v = callInaccuracyDetailed({
      fenBefore: fenAt(29), playedSan: 'Qd7', bestSan: 'Rad8', bestLineUci: [],
      cpLoss: 374, side: 'student', moverColor: 'black', replyLineUci: [], replySan: null,
    });
    expect(v.call?.said).toBe('Qd7 was a blunder.');
  });
});

describe('F4 / F13 — repeats and a false minority', () => {
  it('doubled b-pawns are not a majority, so …a6 is not a minority attack', async () => {
    const { findMinorityAttack } = await import('./positionReadingService');
    expect(findMinorityAttack(fenAt(13), 'b')).toBeNull(); // after 7.cxb5
  });
  it('the pawn-break lesson is said once; the next square gets a stem', async () => {
    const { buildPositionalRead } = await import('./positionalRead');
    const said = new Set<string>(['student-break-c5']);
    const seen: string[] = [];
    for (let i = 0; i < 12; i++) {
      const o = buildPositionalRead(fenAt(21), 'black', said);
      if (!o) break;
      if (o.kind === 'lever') seen.push(o.text);
    }
    expect(seen.length).toBeGreaterThan(0);
    for (const t of seen) expect(t).not.toMatch(/where the play comes from/);
  });
});

describe('F30 — a tactic is defined once a game, then named as a fact', () => {
  it('the concept carries its instance apart from the definition', async () => {
    const { renderTacticConcept, definitionKey } = await import('./conceptEngine');
    const c = renderTacticConcept({ type: 'battery', involvedSquares: ['c1', 'c2', 'c5'], description: 'Rook on c1 and rook on c2 form a battery on the file' }, fenAt(53));
    expect(c?.full).toMatch(/a battery stacks two pieces/);
    expect(c?.instance).toBe('Rook on c1 and rook on c2 form a battery on the file');
    expect(definitionKey('battery')).toBe('def:battery');
  });
});

describe('F2 — a principle never restates the move it explains', () => {
  it('…c5 is explained by what it challenges', async () => {
    const { computeMoveFundamentals, principleOnceLine } = await import('./moveFundamentals');
    const centre = computeMoveFundamentals(fenAt(5), 'c5', 'black').find((f) => f.id === 'center');
    expect(centre?.imperative).toMatch(/challenge their pawn on d4/);
    for (let k = 0; k < 4; k++) expect(principleOnceLine('c5', centre ?? { imperative: '' }, k)).not.toMatch(/c5.*pawn to c5/);
  });
});

describe('F14 / F36 — a forced reply gets no plan reason', () => {
  it('the recapture …dxe5 and the check escape …Kg7 are forced', async () => {
    const { isForcedReply, strategicWhyImperative, principleLine } = await import('./moveFundamentals');
    expect(isForcedReply(fenAt(25), 'dxe5')).toBe(true);
    expect(strategicWhyImperative(fenAt(25), 'dxe5', 'black')).toBeNull();
    expect(isForcedReply(fenAt(61), 'Kg7')).toBe(true);
    expect(principleLine(fenAt(61), 'Kg7', 'black', new Set(), 0)).toBeNull();
    expect(isForcedReply(fenAt(5), 'c5')).toBe(false);
  });
});

describe('F10 — a break is not "ready now" while a minor is still at home', () => {
  it('after 10.Bd3 (Nb8 unmoved) the pawn-break behaviour stays silent', async () => {
    const { detectBehaviors } = await import('./danyaBehaviors');
    const hits = detectBehaviors({ fen: fenAt(19), studentColor: 'black', studentLastTo: 'g8' });
    expect(hits.find((h) => h.id === 'pawn-break')).toBeUndefined();
  });
});

describe('F35 — down material with a passer is not told to avoid trades', () => {
  it('after 31.Rxa8 (Black passer on d3) the down-material advice yields', async () => {
    const { detectBehaviors } = await import('./danyaBehaviors');
    const hits = detectBehaviors({ fen: fenAt(63), studentColor: 'black', studentLastTo: 'g7' });
    expect(hits.find((h) => h.id === 'material')).toBeUndefined();
  });
});

describe('F18 / F32 — the price of a move is one cost, never a want-list', () => {
  it('only a cost clause counts', async () => {
    const { isCostClause } = await import('./lookaheadPlan');
    expect(isCostClause('win a pawn')).toBe(true);
    expect(isCostClause('take your queen on d7')).toBe(true);
    expect(isCostClause('walk the rook round to h5, by way of c5')).toBe(false);
    expect(isCostClause('trade off the knight')).toBe(false);
  });
  it('after …d3 Rxc5 the backward look says one cost or nothing', async () => {
    const { whatItAllowed } = await import('./concessionBeat');
    const said = whatItAllowed({
      fenAfter: fenAt(56), opponentPv: ['c2c5', 'c7c5', 'c1c5', 'd6d8', 'c5c8', 'd8c8'],
      studentColor: 'black', cpLoss: 250,
    });
    if (said) {
      expect(said.line).toMatch(/^That let them (win|take|mate|checkmate|trap|pull the pawns)/);
      expect(said.line.split(',').length).toBeLessThanOrEqual(2);
    }
  });
});
