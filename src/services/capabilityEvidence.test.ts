import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import {
  capabilitiesShown,
  recordCapabilityEvidence,
  getCapabilityProfile,
  capabilityProven,
  PROVEN_MIN_IMPORTANCE,
  HEAT_MAP_REPEAT_WINDOW_MS,
  resetHeatMapReportForTests,
  capabilitiesPosed,
} from './capabilityEvidence';
import { HOLD_MIN_POSED } from './holdRate';
import { logAppAudit } from './appAuditor';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { MOVE_FUNDAMENTAL_TAG, leadingFundamentals } from './moveFundamentals';
import { capabilityPliesFromAnnotations } from './autoAnalyzeGame';

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
    // `promotion` joined them 2026-09-19 (a promotion is a thing DONE, not a
    // habit neglected). Pinned as an exact list on purpose: a new fundamental
    // quietly mapping to null means a capability the board can pose that the
    // student model can never file, and that should cost someone a red test.
    expect(nulls.sort()).toEqual(['center', 'luft', 'promotion']);
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
    const wrote = await recordCapabilityEvidence({
      fenBefore: AFTER_1E4_E5, playedSan: 'Nf3', moverColor: 'white',
      cpLoss: 0, origin: 'play', prompted: false,
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
    await recordCapabilityEvidence({
      fenBefore: AFTER_1E4_E5, playedSan: 'Nf3', moverColor: 'white',
      cpLoss: 0, origin: 'play', prompted: false,
    });
    const profile = await getCapabilityProfile();
    // A capability the student has never been asked about must not appear at
    // all. Reading a missing tag as either mastery or a hole is the absent-≠-
    // silent violation this whole model exists to avoid.
    expect(profile.has('botched-conversion')).toBe(false);
  });

  // 🔴 THIS USED TO ASSERT "a mistake writes nothing at all", and that was the
  // right contract for as long as this module recorded only the POSITIVE half.
  // It is deleted rather than annotated (the correction rule): with only `held`
  // ever written, `CapabilityOutcome` declared a `broken` member that could not
  // exist, and BOTH readers guarded on `broken > 0` — unreachable code
  // describing an impossible state. The same computer answers both directions:
  // the board posed it, and they either answered it cleanly or they did not.
  it('a mistake writes a BROKEN row — the negative half of the same computer', async () => {
    // A slip breaks ONLY the skill it is filed under (2026-10-18): the posed
    // skill it was about is broken, every other posed skill is left alone.
    const posed = capabilitiesPosed(AFTER_1E4_E5, 'Nf3', 'white');
    expect(posed.length).toBeGreaterThan(0);
    const wrote = await recordCapabilityEvidence({
      fenBefore: AFTER_1E4_E5, playedSan: 'Nf3', moverColor: 'white',
      cpLoss: 400, origin: 'play', prompted: false, slipTag: posed[0].tag,
    });
    expect(wrote).toBe(1);
    const rows = await db.capabilityEvidence.toArray();
    expect(rows.map((r) => [r.tag, r.outcome])).toEqual([[posed[0].tag, 'broken']]);

    const profile = await getCapabilityProfile();
    expect([...profile.values()].some((e) => e.broken > 0)).toBe(true);
  });

  it('a PROMPTED find counts as neither — the coach cannot inflate its own model', async () => {
    // Told-then-found is not evidence they can do it unaided. The row is still
    // written (it happened), but the profile skips it, so the tag stays GREY
    // and the ranker keeps teaching it.
    const wrote = await recordCapabilityEvidence({
      fenBefore: AFTER_1E4_E5, playedSan: 'Nf3', moverColor: 'white',
      cpLoss: 0, origin: 'learn', prompted: true,
    });
    expect(wrote).toBeGreaterThan(0);
    expect(await db.capabilityEvidence.count()).toBeGreaterThan(0);

    const profile = await getCapabilityProfile();
    expect([...profile.values()].every((e) => e.held === 0 && e.broken === 0)).toBe(true);
  });

  it('alsoPosed (the insight computer) files rows in BOTH directions', async () => {
    const posed = [{ tag: 'tempo-handed' as MisconceptionTagId, posedImportance: 80 }];
    await recordCapabilityEvidence({
      fenBefore: AFTER_1E4_E5, playedSan: 'Nf3', moverColor: 'white',
      cpLoss: 0, origin: 'drill', prompted: false, alsoPosed: posed,
    });
    await recordCapabilityEvidence({
      fenBefore: AFTER_1E4_E5, playedSan: 'Nf3', moverColor: 'white',
      cpLoss: 300, origin: 'drill', prompted: false, alsoPosed: posed, slipTag: 'tempo-handed',
    });
    const rows = (await db.capabilityEvidence.toArray()).filter((r) => r.tag === 'tempo-handed');
    expect(rows.map((r) => r.outcome).sort()).toEqual(['broken', 'held']);
  });

  it('NEGATIVE CONTROL: a costly move about ANOTHER skill breaks nothing it was not about', async () => {
    const posed = [{ tag: 'tempo-handed' as MisconceptionTagId, posedImportance: 80 }];
    await recordCapabilityEvidence({
      fenBefore: AFTER_1E4_E5, playedSan: 'Nf3', moverColor: 'white',
      cpLoss: 300, origin: 'drill', prompted: false, alsoPosed: posed, slipTag: 'hung-material',
    });
    expect((await db.capabilityEvidence.toArray()).filter((r) => r.tag === 'tempo-handed')).toHaveLength(0);
  });

  it('never throws into the caller, whatever it is handed', async () => {
    await expect(recordCapabilityEvidence({
      fenBefore: 'not a fen', playedSan: '??', moverColor: 'white',
      cpLoss: null, origin: 'review', prompted: false,
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
  // The ONE builder for the positive half lives beside the sweep it feeds
  // (`autoAnalyzeGame.capabilityPliesFromAnnotations`, C1 2026-09-22) — the
  // component-shaped copy is gone, because two mirrors of one filter drift.
  // It reads the game's ANNOTATIONS, the shape the record path actually has.
  const annotated = (sans: string[], flaggedPly: number | null) => {
    const c = new Chess();
    const fens = [c.fen()];
    const annotations = sans.map((san, i) => {
      c.move(san);
      fens.push(c.fen());
      return {
        moveNumber: Math.floor(i / 2) + 1, color: i % 2 === 0 ? 'white' : 'black', san,
        classification: i === flaggedPly ? 'blunder' : 'good',
        evaluation: i === flaggedPly ? -250 : 20, bestMove: null, bestMoveEval: 20, comment: null,
      };
    });
    return { fens, annotations: annotations as unknown as Parameters<typeof capabilityPliesFromAnnotations>[0] };
  };

  it('capabilityPliesFromAnnotations keeps the good moves the blunder builder throws away', () => {
    const { fens, annotations } = annotated(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6'], 6);
    const plies = capabilityPliesFromAnnotations(annotations, 'white', fens);
    // White played 4 moves; one was flagged a blunder, so 3 survive — each
    // with the board it was played ON and Stockfish's own cost.
    expect(plies.map((p) => p.playedSan)).toEqual(['e4', 'Nf3', 'Bc4']);
    expect(plies[0].fenBefore).toBe(fens[0]);
    expect(plies[1].fenBefore).toBe(fens[2]);
    expect(plies.every((p) => p.cpLoss === 0 && p.prompted === false)).toBe(true);
  });

  it('a prompted ply (the coach announced the moment first) is filed PROMPTED, by 1-based ply', () => {
    const { fens, annotations } = annotated(['e4', 'e5', 'Nf3', 'Nc6'], null);
    const plies = capabilityPliesFromAnnotations(annotations, 'white', fens, [3]);
    expect(plies.map((p) => [p.playedSan, p.prompted])).toEqual([['e4', false], ['Nf3', true]]);
  });

  // THE REAL PATH: the sweep hands BOTH sets to ONE `autoAnalyzeBlunders`
  // call, so the positive half rides the service the negative half already
  // used. Asserting through the recorder alone would not prove the wire.
  it('autoAnalyzeBlunders records the positive half from the same call', async () => {
    vi.resetModules();
    vi.doMock('./discussionPractice', () => ({
      captureMisconception: vi.fn(() => Promise.resolve({ logged: false, classification: null })),
    }));
    const { autoAnalyzeBlunders, capabilityPliesFromAnnotations: build } = await import('./autoAnalyzeGame');
    const { fens, annotations } = annotated(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'], null);

    const res = await autoAnalyzeBlunders([], {
      learned: true,
      capabilityPlies: build(annotations, 'white', fens),
      playerColor: 'white',
    });
    expect(res.capabilitiesHeld, 'the one-call path recorded NOTHING').toBeGreaterThan(0);
    expect(await db.capabilityEvidence.count()).toBe(res.capabilitiesHeld);
    vi.doUnmock('./discussionPractice');
  }, 20_000);

  it('driving those plies through the recorder writes real held rows', async () => {
    const { fens, annotations } = annotated(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'], null);

    let wrote = 0;
    for (const ply of capabilityPliesFromAnnotations(annotations, 'white', fens)) {
      wrote += await recordCapabilityEvidence({
        fenBefore: ply.fenBefore, playedSan: ply.playedSan,
        moverColor: 'white', cpLoss: ply.cpLoss, origin: 'review', prompted: false,
      });
    }
    expect(wrote, 'a whole clean opening demonstrated NOTHING — the wire is dead').toBeGreaterThan(0);

    const profile = await getCapabilityProfile();
    expect(profile.size).toBeGreaterThan(0);
    for (const [, entry] of profile) expect(entry.broken).toBe(0);
  });
});

/**
 * THE BAR — a recent clean streak across distinct games.
 *
 * Both halves were measured on real games (2026-09-20) before being changed:
 * three holds are reachable INSIDE ONE GAME (6 of 6 game-seats did it), and a
 * tag proven that way flipped four games later; and the old lifetime
 * `broken === 0` meant one slip ever barred green forever, so the heat map
 * could never say the one thing it exists to say.
 */
describe('the green bar — the hold rate over the last 20 times posed', () => {
  // Rows are written DIRECTLY here, because what is under test is the streak
  // walk, and the fixture board's own `posedImportance` is not the variable.
  // The end-to-end door (board → posed → row) is proven by the tests above.
  const TAG = 'hung-material' as MisconceptionTagId;
  let clock = 0;
  const row = (o: { outcome: 'held' | 'broken'; game: string; imp?: number; prompted?: boolean }) =>
    db.capabilityEvidence.add({
      id: `r${++clock}`,
      tag: TAG,
      outcome: o.outcome,
      fen: AFTER_1E4_E5,
      playedSan: 'Nf3',
      posedImportance: o.imp ?? PROVEN_MIN_IMPORTANCE,
      recordedAt: clock,
      origin: 'play',
      prompted: o.prompted ?? false,
      sourceGameId: o.game,
    });
  const entry = async () => (await getCapabilityProfile()).get(TAG);

  beforeEach(() => { clock = 0; });

  // THE ONE GREEN (2026-10-20): the hold rate over the last 20 times posed,
  // at least 8 posed, slips included. A held streak decides nothing.
  const many = async (n: number, outcome: 'held' | 'broken', imp?: number): Promise<void> => {
    for (let i = 0; i < n; i++) await row({ outcome, game: `game-${clock}`, ...(imp !== undefined ? { imp } : {}) });
  };

  it('fewer than 8 posed is not proven, however clean', async () => {
    await many(HOLD_MIN_POSED - 1, 'held');
    expect(capabilityProven(await entry())).toBe(false);
    await many(1, 'held');
    expect(capabilityProven(await entry())).toBe(true);
  });

  it('a long clean STREAK with a miss-heavy window is not proven (the old bar said it was)', async () => {
    await many(9, 'broken');
    await many(11, 'held');
    const e = await entry();
    expect(e!.heldStreak).toBe(11);
    expect(e!.streakGames).toBeGreaterThanOrEqual(2);   // the old bar: proven
    expect(e!.hold).toMatchObject({ posed: 20, held: 11 });
    expect(capabilityProven(e)).toBe(false);
  });

  it('the profile reads the SLIPS too — open misses keep a skill unproven', async () => {
    await many(12, 'held');
    expect(capabilityProven(await entry())).toBe(true);
    for (let i = 0; i < 4; i++) {
      await db.misconceptionTags.add({
        id: `slip-${i}`, tag: TAG, source: 'auto-analysis', createdAt: 0, playedAt: 1_000 + i,
        fen: `8/8/8/8/8/8/8/K6k w - - 0 ${i + 1}`, sourceGameId: `slip-game-${i}`, status: 'open',
      } as never);
    }
    expect((await entry())!.hold).toMatchObject({ posed: 16, held: 12, missed: 4 });
    expect(capabilityProven(await entry())).toBe(false);
  });

  it('a hold below the asking floor is not one of the times posed', async () => {
    await many(20, 'held', 30);
    expect((await entry())!.hold.posed).toBe(0);
    expect(capabilityProven(await entry())).toBe(false);
  });

  it('GREEN IS RECOVERABLE — old misses age out of the last 20', async () => {
    await many(6, 'broken');
    await many(20, 'held');
    const e = await entry();
    expect(e!.broken).toBe(6);
    expect(capabilityProven(e)).toBe(true);
  });

  it('a PROMPTED row is neither held nor missed', async () => {
    await many(8, 'held');
    await row({ outcome: 'broken', game: 'game-P', prompted: true });
    expect((await entry())!.hold.posed).toBe(8);
    expect(capabilityProven(await entry())).toBe(true);
  });

  it('GREY is never proven', () => {
    expect(capabilityProven(undefined)).toBe(false);
  });
});

describe('the heat-map row — once per change, not once per read (walk 2026-10-03)', () => {
  const heatRows = (): number => vi.mocked(logAppAudit).mock.calls
    .filter((c) => (c[0] as { kind: string }).kind === 'capability-heat-map').length;

  it('16 reads of an unchanged profile write ONE row; a change writes another; the window re-opens', async () => {
    resetHeatMapReportForTests();
    vi.mocked(logAppAudit).mockClear();
    const nowSpy = vi.spyOn(Date, 'now');
    let now = 1_000_000;
    nowSpy.mockImplementation(() => now);
    try {
      await recordCapabilityEvidence({ fenBefore: AFTER_1E4_E5, playedSan: 'Nf3', moverColor: 'white', cpLoss: 0, origin: 'play', prompted: false });
      for (let i = 0; i < 16; i += 1) await getCapabilityProfile();
      expect(heatRows()).toBe(1);

      // New evidence changes the map — that is the signal, it always emits.
      await recordCapabilityEvidence({ fenBefore: AFTER_1E4_E5, playedSan: 'Nf3', moverColor: 'white', cpLoss: 0, origin: 'drill', prompted: false });
      await getCapabilityProfile();
      expect(heatRows()).toBe(2);

      // Same map again after the window: still trendable over time.
      now += HEAT_MAP_REPEAT_WINDOW_MS;
      await getCapabilityProfile();
      expect(heatRows()).toBe(3);
    } finally {
      nowSpy.mockRestore();
    }
  });
});
