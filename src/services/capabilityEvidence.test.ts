import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import {
  capabilitiesShown,
  recordCapabilitiesShown,
  getCapabilityProfile,
} from './capabilityEvidence';
import { MOVE_FUNDAMENTAL_TAG, leadingFundamentals } from './moveFundamentals';

vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn(() => Promise.resolve()) }));

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
});

// A REAL board, not a fixture: after 1.e4 e5, Nf3 is the developing move every
// beginner is taught, and `leadingFundamentals` rates development live here.
const AFTER_1E4_E5 = (() => {
  const c = new Chess();
  c.move('e4'); c.move('e5');
  return c.fen();
})();

describe('capabilitiesShown — both halves computed', () => {
  it('a developing move on a board that ASKS for development is evidence', () => {
    const shown = capabilitiesShown(AFTER_1E4_E5, 'Nf3', 'white', 0);
    expect(shown.length, 'no capability came out of a textbook developing move').toBeGreaterThan(0);
    expect(shown.map((s) => s.tag)).toContain('neglected-development');
    // The board half is real, not assumed.
    for (const s of shown) expect(s.posedImportance).toBeGreaterThanOrEqual(45);
  });

  it('a MISTAKE demonstrates nothing, even when it serves a fundamental', () => {
    // Same move, same board — only the cost changes.
    expect(capabilitiesShown(AFTER_1E4_E5, 'Nf3', 'white', 0).length).toBeGreaterThan(0);
    expect(capabilitiesShown(AFTER_1E4_E5, 'Nf3', 'white', 250)).toEqual([]);
  });

  it('records nothing for a fundamental with no tag — an honest null, not a guess', () => {
    // `center` and `luft` map to null on purpose: no tag names them, and filing
    // centre evidence under `space-conceded` would be a lie.
    const nulls = Object.entries(MOVE_FUNDAMENTAL_TAG).filter(([, t]) => t === null).map(([k]) => k);
    expect(nulls.sort()).toEqual(['center', 'luft']);
    for (const s of capabilitiesShown(AFTER_1E4_E5, 'Nf3', 'white', 0)) {
      expect(nulls).not.toContain(s.tag);
    }
  });

  it('never returns the same tag twice for one move', () => {
    const shown = capabilitiesShown(AFTER_1E4_E5, 'Nf3', 'white', 0);
    expect(new Set(shown.map((s) => s.tag)).size).toBe(shown.length);
  });
});

describe('the record FIRES — a wire that does not fire is not a wire', () => {
  it('writes a real held row and reads it back in the profile', async () => {
    const wrote = await recordCapabilitiesShown({
      fenBefore: AFTER_1E4_E5, playedSan: 'Nf3', moverColor: 'white',
      cpLoss: 0, origin: 'play',
    });
    expect(wrote, 'nothing was written — the positive half is still dead').toBeGreaterThan(0);

    const rows = await db.capabilityEvidence.toArray();
    expect(rows).toHaveLength(wrote);
    expect(rows[0].outcome).toBe('held');
    expect(rows[0].origin).toBe('play');
    expect(rows[0].fen).toBe(AFTER_1E4_E5);

    const profile = await getCapabilityProfile();
    expect(profile.get('neglected-development')?.held).toBeGreaterThan(0);
  });

  it('ABSENT means UNKNOWN — never held, never broken', async () => {
    await recordCapabilitiesShown({
      fenBefore: AFTER_1E4_E5, playedSan: 'Nf3', moverColor: 'white',
      cpLoss: 0, origin: 'play',
    });
    const profile = await getCapabilityProfile();
    // A capability the student has never been asked about must not appear at
    // all. Reading a missing tag as either mastery or a hole is the absent-≠-
    // silent violation this whole model exists to avoid.
    expect(profile.has('botched-conversion')).toBe(false);
  });

  it('a mistake writes nothing at all', async () => {
    const wrote = await recordCapabilitiesShown({
      fenBefore: AFTER_1E4_E5, playedSan: 'Nf3', moverColor: 'white',
      cpLoss: 400, origin: 'play',
    });
    expect(wrote).toBe(0);
    expect(await db.capabilityEvidence.count()).toBe(0);
  });

  it('never throws into the caller, whatever it is handed', async () => {
    await expect(recordCapabilitiesShown({
      fenBefore: 'not a fen', playedSan: '??', moverColor: 'white',
      cpLoss: null, origin: 'review',
    })).resolves.toBe(0);
  });
});

describe('the positive and negative halves share ONE vocabulary', () => {
  it('every tag a capability can be recorded under is a real misconception tag', () => {
    // The join is MOVE_FUNDAMENTAL_TAG, the same Record the negative half uses.
    // If the positive half ever grew its own tag list, this is where it shows.
    const funds = leadingFundamentals(AFTER_1E4_E5, 'Nf3', 'white');
    expect(funds.length).toBeGreaterThan(0);
    for (const f of funds) {
      expect(Object.prototype.hasOwnProperty.call(MOVE_FUNDAMENTAL_TAG, f.id)).toBe(true);
    }
  });
});

// ─── THE WIRE ────────────────────────────────────────────────────────────────
// The service passing its own tests proves nothing about whether any surface
// calls it. This drives the REAL selector out of the review capture over a REAL
// game and asserts held rows land in the store.
describe('the review capture actually feeds it — a real game, real rows', () => {
  // 20s: this is the first import of a React component file from a service
  // test, and it drags the component tree in cold. `buildCapabilityPlies`
  // deliberately lives beside `buildBlunders` — it is the MIRROR of that
  // function's filter, and separating them is how the pair drifts — so the
  // import cost is paid here rather than moved somewhere less obvious.
  it('buildCapabilityPlies keeps the good moves buildBlunders throws away', async () => {
    const { buildCapabilityPlies } = await import('../components/Coach/GameReviewWeaknessCapture');
    const c = new Chess();
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6'];
    const moves = sans.map((san, i) => {
      const before = c.fen();
      c.move(san);
      return {
        san, fen: c.fen(), moveNumber: Math.floor(i / 2) + 1,
        classification: i === 6 ? 'blunder' : 'good',
        evaluation: 20, preMoveEval: 20, bestMove: null, pv: null,
        _before: before,
      };
    }) as unknown as Parameters<typeof buildCapabilityPlies>[0];

    const plies = buildCapabilityPlies(moves, 'white');
    // White played 4 moves; one was flagged a blunder, so 3 survive.
    expect(plies.map((p) => p.playedSan)).toEqual(['e4', 'Nf3', 'Bc4']);
  }, 20_000);

  // THE REAL PATH, after the ceiling fix: the component hands BOTH sets to ONE
  // `autoAnalyzeBlunders` call, so the positive half rides the service the
  // negative half already used. Asserting through the recorder alone would no
  // longer prove the production wire.
  it('autoAnalyzeBlunders records the positive half from the same call', async () => {
    vi.resetModules();
    vi.doMock('./discussionPractice', () => ({
      captureMisconception: vi.fn(() => Promise.resolve({ logged: false, classification: null })),
    }));
    const { autoAnalyzeBlunders } = await import('./autoAnalyzeGame');
    const { buildCapabilityPlies } = await import('../components/Coach/GameReviewWeaknessCapture');

    const c = new Chess();
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'];
    const moves = sans.map((san) => {
      c.move(san);
      return { san, fen: c.fen(), moveNumber: 1, classification: 'good',
               evaluation: 20, preMoveEval: 20, bestMove: null, pv: null };
    }) as unknown as Parameters<typeof buildCapabilityPlies>[0];

    const res = await autoAnalyzeBlunders([], {
      learned: true,
      capabilityPlies: buildCapabilityPlies(moves, 'white'),
      playerColor: 'white',
    });
    expect(res.capabilitiesHeld, 'the one-call path recorded NOTHING').toBeGreaterThan(0);
    expect(await db.capabilityEvidence.count()).toBe(res.capabilitiesHeld);
    vi.doUnmock('./discussionPractice');
  }, 20_000);

  it('driving those plies through the recorder writes real held rows', async () => {
    const { buildCapabilityPlies } = await import('../components/Coach/GameReviewWeaknessCapture');
    const c = new Chess();
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'];
    const moves = sans.map((san) => {
      c.move(san);
      return {
        san, fen: c.fen(), moveNumber: 1, classification: 'good',
        evaluation: 20, preMoveEval: 20, bestMove: null, pv: null,
      };
    }) as unknown as Parameters<typeof buildCapabilityPlies>[0];

    let wrote = 0;
    for (const ply of buildCapabilityPlies(moves, 'white')) {
      wrote += await recordCapabilitiesShown({
        fenBefore: ply.fenBefore, playedSan: ply.playedSan,
        moverColor: 'white', cpLoss: ply.cpLoss, origin: 'review',
      });
    }
    expect(wrote, 'a whole clean opening demonstrated NOTHING — the wire is dead').toBeGreaterThan(0);

    const profile = await getCapabilityProfile();
    expect(profile.size).toBeGreaterThan(0);
    for (const [, entry] of profile) expect(entry.broken).toBe(0);
  });
});
