import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { logMisconception } from './misconceptionService';
import { auditBucketPipeline, type BucketAuditCode } from './bucketPipelineAudit';
import type { MisconceptionTagRecord, MistakePuzzle } from '../types';

// Black to move; 'a6' is a legal (quiet) played move, 'd5' a legal best.
const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

/** A minimal, schema-valid mistakePuzzle whose position key (fen + playerMoveSan)
 *  matches a capture — i.e. the Option-B drill "delivery" landed. */
function mkPuzzle(fen: string, playerMoveSan: string): MistakePuzzle {
  return {
    id: `mp-${playerMoveSan}-${Math.random().toString(36).slice(2, 8)}`,
    fen,
    playerMove: 'a7a6',
    playerMoveSan,
    bestMove: 'd7d5',
    bestMoveSan: 'd5',
    moves: 'd7d5',
    cpLoss: 150,
    classification: 'mistake',
    gamePhase: 'opening',
    moveNumber: 1,
    sourceGameId: 'g1',
    sourceMode: 'coach-capture',
    playerColor: 'black',
    promptText: 'Find the best move.',
    narration: { intro: '', explanation: '', outro: '' } as MistakePuzzle['narration'],
    createdAt: new Date().toISOString(),
    opponentName: null,
    gameDate: null,
    openingName: 'Vienna Game',
    evalBefore: null,
    srsInterval: 0,
    srsEaseFactor: 2.5,
    srsRepetitions: 0,
    srsDueDate: new Date().toISOString(),
    srsLastReview: null,
    status: 'unsolved',
    attempts: 0,
    successes: 0,
  };
}

async function clearStores(): Promise<void> {
  await Promise.all([
    db.misconceptionTags.clear(),
    db.mistakePuzzles.clear(),
    db.openingWeakSpots.clear(),
    db.classifiedTactics.clear(),
    db.games.clear(),
  ]);
}

function codes(report: Awaited<ReturnType<typeof auditBucketPipeline>>): BucketAuditCode[] {
  return report.violations.map((v) => v.code);
}

beforeEach(clearStores);

describe('auditBucketPipeline — clean delivery', () => {
  it('a counted slip with a matching drill passes with zero violations', async () => {
    await logMisconception({
      tag: 'missed-tactic',
      source: 'discussion-practice',
      fen: FEN,
      playedSan: 'a6',
      bestSan: 'd5',
      cpLoss: 142,
      gamePhase: 'opening',
    });
    await db.mistakePuzzles.add(mkPuzzle(FEN, 'a6'));

    const report = await auditBucketPipeline();

    expect(report.ok).toBe(true);
    expect(report.violations).toHaveLength(0);
    expect(report.delivery.captured).toBe(1);
    expect(report.delivery.countedCaptured).toBe(1);
    expect(report.delivery.withDrill).toBe(1);
    expect(report.delivery.inProfile).toBe(1);
    expect(report.delivery.dropped).toBe(0);
    expect(report.captures[0].bucket).toBe('tactical');
    const tactical = report.buckets.find((b) => b.bucket === 'tactical');
    expect(tactical?.openCount).toBe(1);
  });
});

describe('auditBucketPipeline — DELIVERY violations', () => {
  it('COUNTED_NO_DRILL — counted slip with a legal move + best, but no drill', async () => {
    await logMisconception({
      tag: 'missed-tactic',
      source: 'discussion-practice',
      fen: FEN,
      playedSan: 'a6',
      bestSan: 'd5',
      cpLoss: 142,
      gamePhase: 'opening',
    });
    // No mistakePuzzle seeded — the Option-B dual-write "dropped".
    const report = await auditBucketPipeline();
    expect(codes(report)).toContain('COUNTED_NO_DRILL');
    expect(report.delivery.dropped).toBe(1);
    expect(report.ok).toBe(false);
  });

  it('UNKNOWN_TAG — a hallucinated tag that slipped into the store', async () => {
    const rec: MisconceptionTagRecord = {
      id: 'bad-1',
      tag: 'totally-made-up',
      source: 'discussion-practice',
      createdAt: Date.now(),
      fen: FEN,
      status: 'open',
      masteryHits: 0,
      dueAt: Date.now(),
      counted: true,
    };
    await db.misconceptionTags.add(rec);
    const report = await auditBucketPipeline();
    expect(codes(report)).toContain('UNKNOWN_TAG');
    expect(report.ok).toBe(false);
  });

  it("OTHER_NO_LABEL — an 'other' capture with no free-text label", async () => {
    const rec: MisconceptionTagRecord = {
      id: 'other-1',
      tag: 'other',
      source: 'game-review',
      createdAt: Date.now(),
      fen: FEN,
      gamePhase: 'middlegame',
      status: 'open',
      masteryHits: 0,
      dueAt: Date.now(),
      counted: true,
    };
    await db.misconceptionTags.add(rec);
    const report = await auditBucketPipeline();
    expect(codes(report)).toContain('OTHER_NO_LABEL');
  });
});

describe('auditBucketPipeline — ORGANIZATION violations', () => {
  it('SRS_LEVEL_OOB — masteryHits outside the valid range', async () => {
    await db.misconceptionTags.add({
      id: 'srs-1',
      tag: 'hung-material',
      source: 'auto-analysis',
      createdAt: Date.now(),
      fen: FEN,
      status: 'open',
      masteryHits: 99,
      dueAt: Date.now(),
      counted: true,
    });
    const report = await auditBucketPipeline();
    expect(codes(report)).toContain('SRS_LEVEL_OOB');
    expect(report.organization.srsConsistent).toBe(false);
  });

  it('NEVER_GRADUATES — a capture parked far beyond the longest interval', async () => {
    const now = Date.now();
    await db.misconceptionTags.add({
      id: 'grad-1',
      tag: 'hung-material',
      source: 'auto-analysis',
      createdAt: now,
      fen: FEN,
      status: 'improving',
      masteryHits: 5,
      dueAt: now + 400 * 24 * 60 * 60 * 1000, // ~400 days out — out of the loop
      counted: true,
    });
    const report = await auditBucketPipeline(now);
    expect(codes(report)).toContain('NEVER_GRADUATES');
  });
});
