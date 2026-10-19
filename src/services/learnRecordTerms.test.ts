import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import fixture from './__fixtures__/davidRecord.recordTerms.json';
import type { MisconceptionTagRecord } from '../types';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { summariseEvidence, type CapabilityEvidenceRecord } from './capabilityEvidence';
import { GREY_BOOST } from './studentMomentBoost';
import type { WeaknessSignal } from './weaknessSignal';
import {
  buildStudentRecord, EMPTY_RECORD, recordTermFor, threatVisibility, threatVoice, THREAT_VOICE,
  type ThreatSighting,
} from './learnRecordTerms';

// David's real record (data drop 2026-10-19, sliced by
// scripts/extract-record-terms-fixture.mjs): every evidence row and slip for
// the two skills these tests name.
type EvidenceTuple = [number, string, string, number, number, number, number];
type SlipTuple = [number, string, number, number | null, string | null];
const tags = fixture.tags as MisconceptionTagId[];
const game = (i: number): string | undefined => (i < 0 ? undefined : fixture.games[i]);
const evidence = (fixture.evidence as EvidenceTuple[]).map(([t, o, origin, prompted, imp, g, at], i) => ({
  id: `e${i}`, tag: tags[t], outcome: o === 'h' ? 'held' : 'broken', origin, prompted: prompted === 1,
  posedImportance: imp, sourceGameId: game(g), recordedAt: at, fen: '', playedSan: '',
})) as unknown as CapabilityEvidenceRecord[];
const slips = (fixture.slips as SlipTuple[]).map(([t, source, g, dueAt, grade], i) => ({
  id: `s${i}`, tag: tags[t], source, sourceGameId: game(g), dueAt: dueAt ?? undefined, grade: grade ?? undefined,
})) as unknown as MisconceptionTagRecord[];
const now = Date.parse(fixture.exportedAt);
const david = buildStudentRecord(summariseEvidence(evidence), slips, [], now);

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
  it('missed-opponents-threat is GREEN, and green raises nothing', () => {
    const term = recordTermFor('missed-opponents-threat', david);
    expect(term.state).toBe('green');
    expect(term.raise).toBe(0);
    expect(term.reason).toMatch(/^green: proven/);
  });
  it('a RED skill gets a raise (king-stuck-center)', () => {
    const term = recordTermFor('king-stuck-center', david);
    expect(term.state).toBe('red');
    expect(term.raise).toBeGreaterThan(0);
  });
  it('a red skill with a spine hole raises by the hole\'s weight, above grey', () => {
    const hole: WeaknessSignal = {
      clusterId: 'king-stuck-center', bucket: 'opening', label: 'Left the king in the center',
      openCount: 4, severity: 70, lifecycleStatus: 'persistent', trend: 'worsening',
      puzzleThemes: [], total: 12, capabilityTag: 'king-stuck-center', proven: false,
    };
    const withHole = { ...david, signals: [hole] };
    expect(recordTermFor('king-stuck-center', withHole).raise).toBeGreaterThan(GREY_BOOST);
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
  it('a simple one-move threat for David goes QUIET', () => {
    expect(voiceFor(david, SIMPLE)).toEqual({ voice: 'quiet', decidedBy: 'visibility' });
  });
  it('a hidden threat for David speaks SHORT', () => {
    expect(voiceFor(david, DISCOVERED).voice).toBe('short');
    expect(voiceFor(david, PIN).voice).toBe('short');
  });
  it('the same simple threat for an empty record speaks FULL', () => {
    expect(voiceFor(EMPTY_RECORD, SIMPLE)).toEqual({ voice: 'full', decidedBy: 'record' });
  });
  it('red and grey never go quiet', () => {
    for (const s of ['red', 'grey'] as const) for (const v of ['simple', 'hidden'] as const) expect(THREAT_VOICE[s][v]).toBe('full');
  });
});
