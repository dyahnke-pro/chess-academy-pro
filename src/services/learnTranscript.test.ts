import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { logAppAudit } from './appAuditor';
import { startLearnTranscript, stopLearnTranscript, learnTranscriptFor, noteLearnEntry } from './learnTranscript';
import { buildLearnGameRecord } from './learnGameRecord';

describe('a Learn game keeps its own transcript (David 2026-10-19: full observability)', () => {
  beforeEach(async () => { stopLearnTranscript(); await db.delete(); await db.open(); });

  it('keeps every spoken line and decision of the open game, with the seat', () => {
    startLearnTranscript('teach-x', 'white');
    void logAppAudit({ kind: 'coach-narration-spoken', category: 'narration', source: 'test', summary: 'short', narrationText: 'Your knight on f3 eyes e5.' });
    noteLearnEntry({ kind: 'learn-takeback', source: 'test', summary: 'took back 2 ply' });
    const t = learnTranscriptFor('teach-x');
    expect(t?.seat).toBe('white');
    expect(t?.entries.map((e) => e.summary)).toEqual(expect.arrayContaining(['Your knight on f3 eyes e5.', 'took back 2 ply']));
  });

  it('a background row never enters it, and nothing is kept with no game open', () => {
    void logAppAudit({ kind: 'coach-narration-spoken', category: 'narration', source: 'test', summary: 'before the game' });
    startLearnTranscript('teach-y', 'black');
    void logAppAudit({ kind: 'memory-snapshot', category: 'subsystem', source: 'test', summary: 'heap' });
    const summaries = learnTranscriptFor('teach-y')?.entries.map((e) => e.summary) ?? [];
    expect(summaries.some((s) => s.includes('before the game') || s === 'heap')).toBe(false);
  });

  it('the saved game record carries it', () => {
    startLearnTranscript('teach-z', 'black');
    noteLearnEntry({ kind: 'coach-narration-spoken', source: 'test', summary: 'They castle.' });
    const rec = buildLearnGameRecord({
      gameId: 'teach-z', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 *', plyCount: 10, playerColor: 'black', playerName: 'P', rating: 1400,
      sans: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'], ending: { kind: 'draw' }, liveGrades: [], promptedPlies: [],
    } as Parameters<typeof buildLearnGameRecord>[0]);
    expect(rec?.coachTranscript?.seat).toBe('black');
    expect(rec?.coachTranscript?.entries.some((e) => e.summary === 'They castle.')).toBe(true);
  });
});

describe('a taken-back move stays on the record, marked (David 2026-10-19)', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });
  it('the mistake row and the evidence rows carry takenBack', async () => {
    const { logMisconception } = await import('./misconceptionService');
    const { recordCapabilityEvidence } = await import('./capabilityEvidence');
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    const row = await logMisconception({ tag: 'hung-material', source: 'discussion-practice', fen, playedSan: 'Ng5', bestSan: 'Bb5', cpLoss: 150, sourceGameId: 'teach-t', takenBack: true });
    expect(row?.takenBack).toBe(true);
    await recordCapabilityEvidence({ fenBefore: fen, playedSan: 'Bb5', moverColor: 'white', cpLoss: 0, origin: 'learn', prompted: false, sourceGameId: 'teach-t', takenBack: true, alsoPosed: [{ tag: 'hung-material', posedImportance: 90 }] });
    const ev = await db.capabilityEvidence.toArray();
    expect(ev.length).toBeGreaterThan(0);
    expect(ev.every((r) => r.takenBack === true)).toBe(true);
  });
});
