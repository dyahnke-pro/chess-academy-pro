import { describe, expect, it } from 'vitest';
import { Chess, Chess as ChessJs } from 'chess.js';
import { davidEvidence, davidSlips, davidNow } from './__fixtures__/davidRecord';
import type { CapabilityEvidenceRecord } from './capabilityEvidence';
import { GREY_BOOST } from './studentMomentBoost';
import type { WeaknessSignal } from './weaknessSignal';
import { EMPTY_STUDENT_RECORD as EMPTY_RECORD, studentRecordFrom } from './studentRecord';
import {
  recordTermFor, threatVisibility, threatVoice, THREAT_VOICE,
  recordTermForThreat, skillForThreat, threatInputFor, THREAT_SKILL,
  type ThreatSighting,
} from './learnRecordTerms';

// David's real record (data drop 2026-10-19), shared expansion.
const david = studentRecordFrom([], davidEvidence, davidSlips, davidNow);

// Real positions from David's own games (chesscom ids noted), every one legal.
/** chesscom-1001055178, 3…Bxf3: the bishop that just took hits his rook on h1,
 *  unguarded since g3 — one move, in plain sight. */
const SIMPLE: ThreatSighting = {
  fenBefore: 'rn1qkbnr/ppp1pppp/8/3p4/3P2b1/5NP1/PPP1PP1P/RNBQKB1R b KQkq - 0 3',
  opponentSan: 'Bxf3', attacker: 'f3', targets: ['h1'],
};
/** chesscom-1002136978, 10.Nxc6: the knight leaves d4 and the QUEEN on d1 now
 *  hits his knight on d6 — the attacker is not the piece that moved. */
const DISCOVERED: ThreatSighting = {
  fenBefore: 'r1bq1rk1/pp1pppbp/2nn2p1/8/3N4/1BP5/PP3PPP/RNBQR1K1 w - - 4 10',
  opponentSan: 'Nxc6', attacker: 'd1', targets: ['d6'],
};
/** chesscom-1002984876, 3…Bg4: the bishop pins his f3 knight to the queen. */
const PIN: ThreatSighting = {
  fenBefore: 'rnbqkbnr/ppp2ppp/3p4/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3',
  opponentSan: 'Bg4', attacker: 'g4', targets: ['f3'],
};
/** chesscom-1005776142, 13.Bb4: the bishop hits his rook on f8 from four
 *  squares away. */
const LONG: ThreatSighting = {
  fenBefore: 'r1bq1rk1/ppp2pbp/6p1/8/3p1P2/2BPP2P/PP1N2P1/R2QK2R w KQ - 0 13',
  opponentSan: 'Bb4', attacker: 'b4', targets: ['f8'],
};
/** chesscom-1013773584, 30…Re3: hits the d3 bishop with a mate in the air. */
const MATE: ThreatSighting = {
  fenBefore: '2k5/1p1n4/8/p2p4/6RP/3B1rp1/PPP5/1K3R2 b - - 2 30',
  opponentSan: 'Re3', attacker: 'e3', targets: ['d3'],
};

describe('real positions are legal', () => {
  it.each([SIMPLE, DISCOVERED, PIN, LONG, MATE])('$opponentSan', (t) => {
    expect(new Chess(t.fenBefore).move(t.opponentSan)).toBeTruthy();
  });
});

describe('recordTermFor — David\'s record', () => {
  it('king-stuck-center: held 18 of the last 20 → GREEN, and green raises nothing', () => {
    const term = recordTermFor('king-stuck-center', david);
    expect(term.state).toBe('green');
    expect(term.raise).toBe(0);
    expect(term.reason).toBe('green: held 18 of the last 20');
  });
  it('missed-opponents-threat: held 11 of the last 20 → RED, and red raises (the old streak said proven)', () => {
    const term = recordTermFor('missed-opponents-threat', david);
    expect(term.state).toBe('red');
    expect(term.raise).toBeGreaterThanOrEqual(GREY_BOOST);
  });
  it('a red skill with a spine hole raises by the hole\'s weight, above grey', () => {
    const hole: WeaknessSignal = {
      clusterId: 'hung-material', bucket: 'tactical', label: 'Hung material',
      openCount: 4, severity: 70, lifecycleStatus: 'persistent', trend: 'worsening',
      puzzleThemes: [], total: 12, capabilityTag: 'hung-material', proven: false,
    };
    const withHole = { ...david, weaknesses: [hole] };
    expect(recordTermFor('hung-material', withHole).raise).toBeGreaterThan(GREY_BOOST);
  });
  it('an empty record is GREY and grey raises (teach it)', () => {
    const term = recordTermFor('missed-opponents-threat', EMPTY_RECORD);
    expect(term.state).toBe('grey');
    expect(term.raise).toBe(GREY_BOOST);
  });
});

describe('threatVisibility — named rules on real boards', () => {
  it('the moved piece hitting a loose piece is SIMPLE', () => {
    expect(threatVisibility(SIMPLE)).toEqual({ visibility: 'simple', rule: 'direct-hit' });
  });
  it.each([
    [DISCOVERED, 'discovered'],
    [PIN, 'line-geometry'],
    [LONG, 'long-line'],
    [MATE, 'mate-pattern'],
  ] as const)('%# is hidden by %s', (t, rule) => {
    expect(threatVisibility(t)).toEqual({ visibility: 'hidden', rule });
  });
  it('a check always speaks (3.Bb5+ against the Philidor)', () => {
    const t: ThreatSighting = { fenBefore: fenAfterMoves(['e4', 'e5', 'Nf3', 'd6']), opponentSan: 'Bb5+', attacker: 'b5', targets: ['e8'] };
    expect(threatVisibility(t)).toEqual({ visibility: 'hidden', rule: 'check' });
  });
  it('a direct hit that also threatens mate in one speaks (3.Qh5 eyeing f7)', () => {
    const t: ThreatSighting = { fenBefore: fenAfterMoves(['e4', 'e5', 'Bc4', 'Nc6']), opponentSan: 'Qh5', attacker: 'h5', targets: ['f7'] };
    expect(threatVisibility(t)).toEqual({ visibility: 'hidden', rule: 'mate-pattern' });
  });
  it('no attacker yet (a threat two moves out) is hidden', () => {
    expect(threatVisibility({ ...SIMPLE, attacker: null }).rule).toBe('not-on-board-yet');
  });
  it('an unreadable move is hidden, never trusted plain', () => {
    expect(threatVisibility({ ...SIMPLE, opponentSan: 'Qh8' }).rule).toBe('unreadable');
  });
});

describe('the voice — David\'s table on his record', () => {
  const voiceFor = (record: typeof david, t: ThreatSighting): ReturnType<typeof threatVoice> =>
    threatVoice(recordTermFor('missed-opponents-threat', record).state, threatVisibility(t).visibility);
  // His forks: held 18 of the last 20 parries (green); threat-seeing as a
  // whole: 11 of 20 (red).
  const forkVoice = (t: ThreatSighting): ReturnType<typeof threatVoice> =>
    threatVoice(recordTermForThreat('fork', david).state, threatVisibility(t).visibility);
  it('a simple threat on his GREEN fork record goes QUIET', () => {
    expect(forkVoice(SIMPLE)).toEqual({ voice: 'quiet', decidedBy: 'visibility' });
  });
  it('a hidden threat on a green record speaks SHORT', () => {
    expect(forkVoice(DISCOVERED).voice).toBe('short');
    expect(forkVoice(PIN).voice).toBe('short');
  });
  it('a simple threat on his RED threat-seeing record speaks FULL', () => {
    expect(voiceFor(david, SIMPLE)).toEqual({ voice: 'full', decidedBy: 'record' });
  });
  it('the same simple threat for an empty record speaks FULL', () => {
    expect(voiceFor(EMPTY_RECORD, SIMPLE)).toEqual({ voice: 'full', decidedBy: 'record' });
  });
  it('red and grey never go quiet', () => {
    for (const s of ['red', 'grey'] as const) for (const v of ['simple', 'hidden'] as const) expect(THREAT_VOICE[s][v]).toBe('full');
  });
});

// ─── The lead's three answers (2026-10-19) ──────────────────────────────────

const fenAfterMoves = (sans: string[]): string => { const c = new ChessJs(); for (const s of sans) c.move(s); return c.fen(); };
/** The fork trick, 5…d5: the pawn that just moved hits the bishop on c4 and
 *  the knight on e4 — a direct double hit, in plain sight. */
const FORK_TRICK = { fenBefore: fenAfterMoves(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Nc3', 'Nxe4', 'Nxe4']), opponentSan: 'd5' };
const forkHole: WeaknessSignal = {
  clusterId: 'analysis:tactic:fork', bucket: 'tactical', label: 'Missed forks',
  openCount: 3, severity: 40, puzzleThemes: [], total: 9, capabilityTag: null, proven: false,
};

describe('each threat reads its own skill', () => {
  it('every pattern names a heat tag; forks carry the fork motif', () => {
    expect(skillForThreat('fork')).toEqual({ tag: 'missed-opponents-threat', motif: 'fork', motifTag: 'missed-their-fork' });
    expect(skillForThreat('hanging').motif).toBe('hanging_piece');
    expect(Object.keys(THREAT_SKILL).length).toBeGreaterThan(12);
  });
  it('his forks (held 18 of the last 20) with no open fork hole read green, though threat-seeing is red', () => {
    expect(recordTermFor('missed-opponents-threat', david).state).toBe('red');
    expect(recordTermForThreat('fork', david).state).toBe('green');
  });
  it('an open fork hole keeps the fork loud though the fork record is green', () => {
    const term = recordTermForThreat('fork', { ...david, weaknesses: [forkHole] });
    expect(term.state).toBe('red');
    expect(term.raise).toBeGreaterThan(0);
  });
  it('the direct double hit is SIMPLE geometry — the record decides, not the shape', () => {
    const after = new ChessJs(FORK_TRICK.fenBefore);
    after.move(FORK_TRICK.opponentSan);
    expect(after.attackers('c4', 'b')).toContain('d5');
    expect(after.attackers('e4', 'b')).toContain('d5');
    const input = threatInputFor({ kind: 'tactic', tactic: { type: 'fork', squares: ['d5', 'c4', 'e4'] } }, FORK_TRICK);
    expect(threatVisibility(input.sighting).visibility).toBe('simple');
    const voice = (r: typeof david): string => threatVoice(recordTermForThreat(input.pattern, r).state, threatVisibility(input.sighting).visibility).voice;
    expect(voice(david)).toBe('quiet');
    expect(voice({ ...david, weaknesses: [forkHole] })).toBe('full');
  });
});

describe('threatInputFor — one call per producer', () => {
  const SCANDI = { fenBefore: fenAfterMoves(['e4', 'd5', 'exd5', 'Qxd5']), opponentSan: 'Nc3' };
  it('cheaper-hit: Nc3 hitting the queen on d5 is simple', () => {
    const i = threatInputFor({ kind: 'cheaper-hit', hit: { sq: 'd5', bySq: 'c3' } }, SCANDI);
    expect(i.pattern).toBe('cheaper-hit');
    expect(threatVisibility(i.sighting)).toEqual({ visibility: 'simple', rule: 'direct-hit' });
  });
  it('hanging: the attacker is found on the board (the piece that just moved)', () => {
    const i = threatInputFor({ kind: 'hanging', square: 'h1' }, SIMPLE);
    expect(i.sighting.attacker).toBe('f3');
    expect(threatVisibility(i.sighting).visibility).toBe('simple');
  });
  it('soon: no attacker yet reads hidden', () => {
    const i = threatInputFor({ kind: 'soon', threat: { type: 'fork', description: '' } }, SIMPLE);
    expect(i.pattern).toBe('fork');
    expect(threatVisibility(i.sighting)).toEqual({ visibility: 'hidden', rule: 'not-on-board-yet' });
  });
  it('trapped: always hidden', () => {
    const i = threatInputFor({ kind: 'trapped', trapped: { square: 'h1', attackerSquare: 'f3' } }, SIMPLE);
    expect(i.pattern).toBe('trapped_piece');
    expect(threatVisibility(i.sighting)).toEqual({ visibility: 'hidden', rule: 'trapped' });
  });
  it('tactic: a pin from the detector reads hidden', () => {
    const i = threatInputFor({ kind: 'tactic', tactic: { type: 'pin', squares: ['g4', 'f3', 'd1'] } }, PIN);
    expect(threatVisibility(i.sighting).visibility).toBe('hidden');
  });
  it('king-pawn: Ng5 hitting f7 beside the king', () => {
    const KP = { fenBefore: fenAfterMoves(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6']), opponentSan: 'Ng5' };
    const i = threatInputFor({ kind: 'king-pawn', pawnSquare: 'f7' }, KP);
    expect(i.sighting.attacker).toBe('g5');
    // The knight that just moved hits a pawn guarded once, attacked twice.
    expect(threatVisibility(i.sighting)).toEqual({ visibility: 'simple', rule: 'direct-hit' });
  });
});

// A record built row by row: `n` answers on the general skill or a motif,
// one per game, in order.
const rowsOf = (tag: CapabilityEvidenceRecord['tag'], outcomes: ('held' | 'broken')[], from = 0): CapabilityEvidenceRecord[] =>
  outcomes.map((outcome, i) => ({
    id: `${tag}-${from + i}`, tag, outcome, fen: `8/8/8/8/8/8/8/K6k w - - 0 ${from + i + 1}`, playedSan: 'Kb1',
    posedImportance: 90, recordedAt: from + i, origin: 'learn', prompted: false, sourceGameId: `g${from + i}`,
  }));
const held = (k: number): 'held'[] => Array.from({ length: k }, () => 'held' as const);

describe('the record is not the UI — a quiet threat he walks into counts against green', () => {
  const nineteen = rowsOf('missed-opponents-threat', ['broken', ...held(19)]);
  it('at 19 of 20 a skill is green; three fresh misses drop it to 17 of the last 20 (short)', () => {
    expect(recordTermFor('missed-opponents-threat', studentRecordFrom([], nineteen, [], davidNow)).state).toBe('green');
    const after = studentRecordFrom([], [...nineteen, ...rowsOf('missed-opponents-threat', ['broken', 'broken', 'broken'], 20)], [], davidNow);
    expect(recordTermFor('missed-opponents-threat', after).state).toBe('short');
    expect(recordTermFor('missed-opponents-threat', after).raise).toBeGreaterThan(0);
  });
  it('a quiet threat he meets (held, unprompted) keeps it green', () => {
    const after = studentRecordFrom([], [...nineteen, ...rowsOf('missed-opponents-threat', ['held'], 20)], [], davidNow);
    expect(recordTermFor('missed-opponents-threat', after).state).toBe('green');
  });
});

describe('the motif reads its OWN record once the board has asked it', () => {
  const base = rowsOf('missed-opponents-threat', held(20));
  const withRows = (rows: CapabilityEvidenceRecord[]): typeof david => studentRecordFrom([], [...base, ...rows], [], davidNow);
  it('forks he let land turn forks red though threat-seeing is green', () => {
    const r = withRows(rowsOf('missed-their-fork', ['broken', 'broken', 'broken', ...held(5)], 100));
    expect(recordTermFor('missed-opponents-threat', r).state).toBe('green');
    expect(recordTermForThreat('fork', r).state).toBe('red');
  });
  it('forks parried 8 times turn forks green on their own', () => {
    const r = studentRecordFrom([], rowsOf('missed-their-fork', held(8)), [], davidNow);
    expect(recordTermForThreat('fork', r)).toMatchObject({ state: 'green', raise: 0 });
  });
  it('fewer than 8 parries is not proof yet: forks fall back to threat-seeing', () => {
    const r = withRows(rowsOf('missed-their-fork', held(3), 100));
    expect(recordTermForThreat('fork', r)).toEqual(recordTermFor('missed-opponents-threat', r));
  });
  it('for an empty record a parried fork stays grey and speaks', () => {
    const r = studentRecordFrom([], rowsOf('missed-their-fork', ['held']), [], davidNow);
    expect(recordTermForThreat('fork', r).state).toBe('grey');
  });
});
