import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { detectBadHabits, detectBadHabitsFromGame, buildProfileContext, buildReviewSegments, buildReviewCitations } from './coachFeatureService';
import { explainBestMoveGrounded, describeSacrifice } from './groundedAnswer';
import type { ReviewMoveInput } from './coachFeatureService';
import { buildUserProfile, buildBadHabit } from '../test/factories';
import type { UserProfile } from '../types';

// Mock puzzleService (getThemeSkills)
vi.mock('./puzzleService', () => ({
  getThemeSkills: vi.fn(),
}));

import { getThemeSkills } from './puzzleService';
const getThemeSkillsMock = vi.mocked(getThemeSkills);

describe('explainBestMoveGrounded — GROUNDED best-move explanation (no LLM, chess.js truth)', () => {
  it('explains a winning capture the player missed', () => {
    // White Rd1 can win the undefended black bishop on d4; the player instead
    // shuffled the king (Kf1). best = Rxd4 (d1d4).
    const r = explainBestMoveGrounded('4k3/8/8/8/3b4/8/8/3RK3 w - - 0 1', 'Kf1', 'd1d4', 'white');
    expect(r).toBe('It wins the bishop on d4.');
  });

  it('plays out the punishment when the played move hangs a piece', () => {
    // White Bf1; the player played Bb5 (f1-b5 diagonal) — attacked by the a6
    // pawn, undefended. best = Ke2 (e1e2), a quiet move (no capture/check).
    // GROUNDED punishment: Black's cheapest attacker (the a6 pawn) takes it.
    const r = explainBestMoveGrounded('4k3/8/p7/8/8/8/8/4KB2 w - - 0 1', 'Bb5', 'e1e2', 'white');
    expect(r).toBe('Your move let Black play axb5, winning the bishop.');
  });

  it('reports check when the punishing capture lands with check', () => {
    // Black to move plays Qe5 (d6-e5), hanging the queen on the open e-file.
    // White's Rxe5+ takes it for free AND checks the black king on e8.
    // best = Kf8 (e8f8), a quiet king move (no capture/check) → no merit clause.
    const r = explainBestMoveGrounded('4k3/8/3q4/8/8/8/8/4R1K1 b - - 0 1', 'Qe5', 'e8f8', 'black');
    expect(r).toBe('Your move let White play Rxe5+, winning the queen with check.');
  });

  it('names the quiet POSITIONAL purpose of a developing best move (David 2026-07-10: WHY on every wrong move)', () => {
    // Quiet position, best move Nf3 neither captures nor checks — but it DOES
    // fight for the centre. The review must still say WHY it's best, grounded in
    // board geometry (the central squares it now eyes), never generic filler.
    const r = explainBestMoveGrounded('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'a3', 'g1f3', 'white');
    expect(r).toBe('It develops the knight to f3, eyeing d4 and e5.');
  });

  it('never claims a "win" on an even recapture (exchange, not a free piece)', () => {
    // Rxd4 but the bishop is defended by the queen on d8 → recapturable, and
    // rook(5) > bishop(3), so it is NOT a win. The rich geometry would say
    // "attacks the queen on d4→d8" but that clause is EXCLUDED (the rook itself
    // hangs to that queen), so no merit clause; played move hangs nothing → null.
    const r = explainBestMoveGrounded('3qk3/8/8/8/3b4/8/8/3RK3 w - - 0 1', 'Kf1', 'd1d4', 'white');
    expect(r).toBeNull();
  });

  it('names the RICH reason (fork) when the best move forks — engine-reasoning form', () => {
    // White Nb5; the player shuffled the king (Ke1-e2), best = Nc7+ forking the
    // e8-king and the a8-rook. The merit clause is the fork, not a bare capture.
    const r = explainBestMoveGrounded('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', 'Ke2', 'b5c7', 'white');
    expect(r).toBe('It forks the king on e8 and the rook on a8.');
  });
});

describe('describeSacrifice — a move that gives NET material (decoy/deflection sac)', () => {
  it('names a quiet piece sacrifice (bishop offered to a pawn, no immediate recapture value)', () => {
    // White Bf3 plays Bd5; the e6 pawn can take it (exd5) for a clean piece.
    // The bishop captured nothing, so net material handed over = 3 ≥ 2 → a sac.
    const r = describeSacrifice('4k3/8/4p3/8/8/5B2/8/4K3 w - - 0 1', 'Bd5');
    expect(r).toBe('sacrifices the bishop on d5');
  });

  it('is NOT a sacrifice on an even trade (knight takes knight, recaptured by a pawn)', () => {
    // Ne3xd5 wins a knight (3) but c6xd5 wins it straight back (3) → net 0.
    const r = describeSacrifice('2k5/8/2p5/3n4/8/4N3/8/4K3 w - - 0 1', 'Nxd5');
    expect(r).toBeNull();
  });
});

describe('coachFeatureService', () => {
  let profile: UserProfile;

  beforeEach(async () => {
    await db.delete();
    await db.open();
    vi.clearAllMocks();
    getThemeSkillsMock.mockResolvedValue([]);

    profile = buildUserProfile({ id: 'test-profile' });
    await db.profiles.put(profile);
  });

  describe('detectBadHabits', () => {
    it('creates a new bad habit when theme accuracy is below 40% with 5+ attempts', async () => {
      getThemeSkillsMock.mockResolvedValue([
        { theme: 'fork', accuracy: 0.3, attempts: 10 },
      ]);

      const habits = await detectBadHabits(profile);
      const forkHabit = habits.find((h) => h.id === 'weak-fork');
      expect(forkHabit).toBeDefined();
      expect(forkHabit?.isResolved).toBe(false);
      expect(forkHabit?.description).toContain('fork');
      expect(forkHabit?.description).toContain('30%');
    });

    it('increments occurrences for existing weak theme habits', async () => {
      const existingHabit = buildBadHabit({
        id: 'weak-fork',
        description: 'Struggling with fork puzzles',
        occurrences: 2,
      });
      profile = buildUserProfile({ id: 'test-profile', badHabits: [existingHabit] });
      await db.profiles.put(profile);

      getThemeSkillsMock.mockResolvedValue([
        { theme: 'fork', accuracy: 0.35, attempts: 10 },
      ]);

      const habits = await detectBadHabits(profile);
      const forkHabit = habits.find((h) => h.id === 'weak-fork');
      expect(forkHabit?.occurrences).toBe(3);
    });

    it('resolves habit when accuracy reaches 60%', async () => {
      const existingHabit = buildBadHabit({
        id: 'weak-fork',
        description: 'Struggling with fork puzzles',
        occurrences: 3,
        isResolved: false,
      });
      profile = buildUserProfile({ id: 'test-profile', badHabits: [existingHabit] });
      await db.profiles.put(profile);

      getThemeSkillsMock.mockResolvedValue([
        { theme: 'fork', accuracy: 0.65, attempts: 10 },
      ]);

      const habits = await detectBadHabits(profile);
      const forkHabit = habits.find((h) => h.id === 'weak-fork');
      expect(forkHabit?.isResolved).toBe(true);
    });

    it('does not create habit when accuracy is above 40%', async () => {
      getThemeSkillsMock.mockResolvedValue([
        { theme: 'fork', accuracy: 0.5, attempts: 10 },
      ]);

      const habits = await detectBadHabits(profile);
      expect(habits.find((h) => h.id === 'weak-fork')).toBeUndefined();
    });

    it('does not create habit when attempts are below 5', async () => {
      getThemeSkillsMock.mockResolvedValue([
        { theme: 'fork', accuracy: 0.2, attempts: 3 },
      ]);

      const habits = await detectBadHabits(profile);
      expect(habits.find((h) => h.id === 'weak-fork')).toBeUndefined();
    });
  });

  describe('detectBadHabitsFromGame', () => {
    it('detects time-pressure habit when 2+ blunders in last 10 moves', async () => {
      const moves = Array.from({ length: 30 }, (_, i) => ({
        classification: i >= 22 ? (i % 3 === 0 ? 'blunder' : 'good') : 'good',
        san: `move${i}`,
      }));
      // Ensure at least 2 blunders in last 10
      moves[25] = { classification: 'blunder', san: 'blunder1' };
      moves[28] = { classification: 'mistake', san: 'mistake1' };

      const habits = await detectBadHabitsFromGame(moves, profile);
      const timePressure = habits.find((h) => h.id === 'game-time-pressure');
      expect(timePressure).toBeDefined();
      expect(timePressure?.isResolved).toBe(false);
    });

    it('detects calculation habit when 3+ blunders/mistakes total', async () => {
      const moves = [
        { classification: 'blunder', san: 'b1' },
        { classification: 'mistake', san: 'm1' },
        { classification: 'blunder', san: 'b2' },
        { classification: 'good', san: 'g1' },
        { classification: 'good', san: 'g2' },
      ];

      const habits = await detectBadHabitsFromGame(moves, profile);
      const calcHabit = habits.find((h) => h.id === 'game-calculation');
      expect(calcHabit).toBeDefined();
      expect(calcHabit?.description).toContain('2 blunders');
      expect(calcHabit?.description).toContain('1 mistakes');
    });

    it('resolves calculation habit for clean game', async () => {
      const existingHabit = buildBadHabit({
        id: 'game-calculation',
        description: 'Calculation errors',
        isResolved: false,
      });
      profile = buildUserProfile({ id: 'test-profile', badHabits: [existingHabit] });
      await db.profiles.put(profile);

      const moves = [
        { classification: 'good', san: 'g1' },
        { classification: 'good', san: 'g2' },
        { classification: 'good', san: 'g3' },
        { classification: 'inaccuracy', san: 'i1' },
      ];

      const habits = await detectBadHabitsFromGame(moves, profile);
      const calcHabit = habits.find((h) => h.id === 'game-calculation');
      expect(calcHabit?.isResolved).toBe(true);
    });

    it('does not resolve calculation habit if there are mistakes', async () => {
      const existingHabit = buildBadHabit({
        id: 'game-calculation',
        description: 'Calculation errors',
        isResolved: false,
      });
      profile = buildUserProfile({ id: 'test-profile', badHabits: [existingHabit] });
      await db.profiles.put(profile);

      const moves = [
        { classification: 'good', san: 'g1' },
        { classification: 'mistake', san: 'm1' },
      ];

      const habits = await detectBadHabitsFromGame(moves, profile);
      const calcHabit = habits.find((h) => h.id === 'game-calculation');
      expect(calcHabit?.isResolved).toBe(false);
    });

    it('increments time-pressure habit if it already exists', async () => {
      const existingHabit = buildBadHabit({
        id: 'game-time-pressure',
        description: 'Time pressure',
        occurrences: 2,
        isResolved: false,
      });
      profile = buildUserProfile({ id: 'test-profile', badHabits: [existingHabit] });
      await db.profiles.put(profile);

      const moves = Array.from({ length: 10 }, () => ({
        classification: 'blunder',
        san: 'x',
      }));

      const habits = await detectBadHabitsFromGame(moves, profile);
      const timePressure = habits.find((h) => h.id === 'game-time-pressure');
      expect(timePressure?.occurrences).toBe(3);
    });

    it('persists habits to DB', async () => {
      const moves = [
        { classification: 'blunder', san: 'b1' },
        { classification: 'blunder', san: 'b2' },
        { classification: 'blunder', san: 'b3' },
      ];

      await detectBadHabitsFromGame(moves, profile);
      const updated = await db.profiles.get('test-profile');
      expect(updated?.badHabits.length).toBeGreaterThan(0);
    });
  });

  describe('buildProfileContext', () => {
    it('returns valid CoachContext from profile', () => {
      const ctx = buildProfileContext(profile);
      expect(ctx.fen).toBeTruthy();
      expect(ctx.playerProfile.rating).toBe(profile.currentRating);
    });

    it('includes unresolved bad habits as weaknesses', () => {
      const profileWithHabits = buildUserProfile({
        badHabits: [
          buildBadHabit({ description: 'Weak at forks', isResolved: false }),
          buildBadHabit({ description: 'Time pressure', isResolved: true }),
        ],
      });
      const ctx = buildProfileContext(profileWithHabits);
      expect(ctx.playerProfile.weaknesses).toContain('Weak at forks');
      expect(ctx.playerProfile.weaknesses).not.toContain('Time pressure');
    });

    it('sets default values for position fields', () => {
      const ctx = buildProfileContext(profile);
      expect(ctx.lastMoveSan).toBeNull();
      expect(ctx.moveNumber).toBe(0);
      expect(ctx.pgn).toBe('');
      expect(ctx.openingName).toBeNull();
      expect(ctx.stockfishAnalysis).toBeNull();
      expect(ctx.playerMove).toBeNull();
      expect(ctx.moveClassification).toBeNull();
    });
  });

  describe('buildReviewSegments (ship-3 — deterministic narration)', () => {
    // Helper to build a ReviewMoveInput with sensible defaults so the
    // test bodies stay focused on classification + bestMove.
    function move(overrides: Partial<ReviewMoveInput> & { ply: number; san: string }): ReviewMoveInput {
      return {
        isCoachMove: false,
        classification: 'good',
        evaluation: 0,
        preMoveEval: 0,
        bestMove: null,
        fenAfter: '',
        ...overrides,
      };
    }

    it('returns silence for book + good moves (CLAUDE.md voice rule #4)', () => {
      const segments = buildReviewSegments([
        move({ ply: 1, san: 'e4', classification: 'book' }),
        move({ ply: 2, san: 'e5', classification: 'book', isCoachMove: true }),
        move({ ply: 3, san: 'Nf3', classification: 'good' }),
      ]);
      expect(segments).toHaveLength(3);
      expect(segments.every((s) => s.narration === null)).toBe(true);
    });

    it('names the variation as it takes shape (A2 — grounded via detectOpening)', () => {
      // A Najdorf: the walk should announce the line once it's identifiable.
      const sans = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'];
      const segments = buildReviewSegments(
        sans.map((san, i) => move({ ply: i + 1, san, classification: 'book', isCoachMove: i % 2 === 1 })),
        'white',
      );
      const named = segments.filter((s) => s.narration && /Sicilian|Najdorf/i.test(s.narration));
      expect(named.length).toBeGreaterThan(0);
      // announced at most once per distinct name — no spamming the same line.
      const texts = named.map((s) => s.narration);
      expect(new Set(texts).size).toBe(texts.length);
    });

    it('returns templated prose for student mistakes with the best move SAN', () => {
      // Pre-move position: classical Italian. White just played a
      // blunder ("Qh5??"); engine wanted Nf3 instead.
      const segments = buildReviewSegments([
        move({ ply: 1, san: 'e4', classification: 'book' }),
        move({ ply: 2, san: 'e5', classification: 'book', isCoachMove: true }),
        move({
          ply: 3,
          san: 'Qh5',
          classification: 'blunder',
          bestMove: 'g1f3',
          preMoveEval: 25,
          evaluation: -300,
        }),
      ]);
      const blunderSeg = segments[2];
      expect(blunderSeg.narration).not.toBeNull();
      expect(blunderSeg.narration).toMatch(/Nf3/);
      // Should NOT include the played SAN — rule #3 ("don't restate the board")
      expect(blunderSeg.narration).not.toMatch(/Qh5/);
      // Should include the swing magnitude in pawns
      expect(blunderSeg.narration).toMatch(/3\.[0-9] pawns/);
    });

    it('frames opponent mistakes from the student perspective', () => {
      const segments = buildReviewSegments([
        move({ ply: 1, san: 'e4', classification: 'book' }),
        move({
          ply: 2,
          san: 'f6',
          classification: 'mistake',
          isCoachMove: true,
          bestMove: 'e7e5',
          preMoveEval: 25,
          evaluation: 180,
        }),
      ]);
      const seg = segments[1];
      expect(seg.narration).toMatch(/opponent/i);
      expect(seg.narration).toMatch(/e5/);
      // Never frame an opponent move with "you played" (voice rule)
      expect(seg.narration).not.toMatch(/^You /);
    });

    it('never names the played move as the better move (best == played)', () => {
      // David 2026-06-11: the deep best-move search can return the very move
      // that was played while the shallow pass flagged a slip — so the review
      // said "your opponent slipped — <the move they played> was stronger".
      // The played SAN must never be presented as the better alternative.
      const segments = buildReviewSegments([
        move({ ply: 1, san: 'e4', classification: 'book' }),
        // Opponent inaccuracy whose stored bestMove (f7f6) IS the move played.
        move({
          ply: 2,
          san: 'f6',
          classification: 'inaccuracy',
          isCoachMove: true,
          bestMove: 'f7f6',
          preMoveEval: 20,
          evaluation: 80,
        }),
      ]);
      const seg = segments[1];
      // best == played is suppressed: no SAN to present, so bestMoveSan is null
      // and the incoherent "f6 was stronger" never appears.
      expect(seg.bestMoveSan).toBeNull();
      expect(seg.narration ?? '').not.toMatch(/stronger|f6/);
    });

    it('falls back to a generic line when bestMove is missing', () => {
      const segments = buildReviewSegments([
        move({ ply: 1, san: 'e4', classification: 'book' }),
        move({
          ply: 2,
          san: 'e5',
          classification: 'book',
          isCoachMove: true,
        }),
        move({
          ply: 3,
          san: 'Bc4',
          classification: 'inaccuracy',
          bestMove: null,
          preMoveEval: 30,
          evaluation: -10,
        }),
      ]);
      const seg = segments[2];
      expect(seg.narration).not.toBeNull();
      // Generic version still mentions the classification family
      expect(seg.narration?.toLowerCase()).toMatch(/inaccuracy|more precise/);
    });

    it('reconstructs fenBefore / fenAfter per ply via chess.js', () => {
      const segments = buildReviewSegments([
        move({ ply: 1, san: 'e4' }),
        move({ ply: 2, san: 'e5', isCoachMove: true }),
      ]);
      expect(segments).toHaveLength(2);
      expect(segments[0].fenBefore).toContain('rnbqkbnr/pppppppp');
      expect(segments[0].fenAfter).toContain('4P3');
      expect(segments[1].fenBefore).toBe(segments[0].fenAfter);
    });

    it('stops at the first illegal SAN without crashing', () => {
      const segments = buildReviewSegments([
        move({ ply: 1, san: 'e4' }),
        move({ ply: 2, san: 'NOT_A_MOVE', isCoachMove: true }),
        move({ ply: 3, san: 'Nf3' }),
      ]);
      // Only the first move could replay; the chain truncates at the
      // bad SAN. Better one usable ply than refusing the whole review.
      expect(segments).toHaveLength(1);
      expect(segments[0].san).toBe('e4');
    });

    it('narrates BOTH sides — an eventful opponent move gets a framed read (David 2026-07-20)', () => {
      // Student = White; Black (opponent) recaptures on d5. The opponent's own
      // eventful quiet move must be narrated, framed "Your opponent …", not left
      // silent (the both-sides fallback). Board-true via PlyFacts.
      const segments = buildReviewSegments([
        move({ ply: 1, san: 'e4', classification: 'book' }),
        move({ ply: 2, san: 'd5', classification: 'good' }),
        move({ ply: 3, san: 'exd5', classification: 'good' }),
        move({ ply: 4, san: 'Qxd5', classification: 'good' }),  // opening named here
        move({ ply: 5, san: 'Nc3', classification: 'good' }),
        move({ ply: 6, san: 'Qxg2', classification: 'good' }),  // opponent grabs a pawn
      ], 'white');
      const oppSeg = segments.find((s) => s.ply === 6);
      expect(oppSeg?.narration).toBeTruthy();
      // Framed as the opponent (via the opponent target-read/fallback OR the
      // sacrifice beat — both say "Your opponent"); never left silent.
      expect(oppSeg?.narration).toMatch(/your opponent/i);
    });

    it('teaches the Opera Game showcase moves — sac named, mate named, no windfall (David 2026-07-20)', () => {
      const OPERA = ['e4','e5','Nf3','d6','d4','Bg4','dxe5','Bxf3','Qxf3','dxe5','Bc4','Nf6','Qb3','Qe7','Nc3','c6','Bg5','b5','Nxb5','cxb5','Bxb5+','Nbd7','O-O-O','Rd8','Rxd7','Rxd7','Rd1','Qe6','Bxd7+','Nxd7','Qb8+','Nxb8','Rd8#'];
      const cls = (ply: number): string => (ply === 31 ? 'brilliant' : ply === 19 ? 'great' : 'good');
      const segments = buildReviewSegments(
        OPERA.map((san, i) => move({ ply: i + 1, san, classification: cls(i + 1) })),
        'white', 'Philidor Defense',
      );
      const at = (ply: number): string => segments.find((s) => s.ply === ply)?.narration ?? '';
      // Qxf3 recaptures the bishop (even trade) → NO "wins N points" windfall.
      expect(at(9)).not.toMatch(/wins \d+ point/i);
      // Nxb5 is the knight sacrifice — named as a sacrifice, not a "reroute".
      expect(at(19)).toMatch(/sacrifice/i);
      expect(at(19)).not.toMatch(/reroute|journey/i);
      // O-O-O is king safety + rook activation, never a "queenside majority endgame".
      expect(at(23)).not.toMatch(/majority|endgame/i);
      // Qb8+ is THE queen sacrifice (peak register on brilliant).
      expect(at(31)).toMatch(/queen sacrifice/i);
      // The finish names checkmate.
      expect(at(33)).toMatch(/checkmate/i);
    });
  });

  describe('buildReviewCitations (Phase 1c — grounded recap/preview spine)', () => {
    function move(overrides: Partial<ReviewMoveInput> & { ply: number; san: string }): ReviewMoveInput {
      return { isCoachMove: false, classification: 'good', evaluation: 0, preMoveEval: 0, bestMove: null, fenAfter: '', ...overrides };
    }

    it('extracts only the STUDENT\'s flagged moves with grounded squares + suggestion', () => {
      // White student. Qh5 is a white blunder (engine wanted Nf3); the black
      // f6 blunder is the OPPONENT and must be excluded.
      const cites = buildReviewCitations([
        move({ ply: 1, san: 'e4', classification: 'book' }),
        move({ ply: 2, san: 'e5', classification: 'book' }),
        move({ ply: 3, san: 'Qh5', classification: 'blunder', bestMove: 'g1f3', preMoveEval: 25, evaluation: -300 }),
        move({ ply: 4, san: 'f6', classification: 'blunder', preMoveEval: -300, evaluation: 200 }), // opponent — excluded
        move({ ply: 5, san: 'Bc4', classification: 'good' }),
      ], 'white');

      expect(cites).toHaveLength(1);
      const c = cites[0];
      expect(c.ply).toBe(3);
      expect(c.moveNumber).toBe(2);          // ceil(3/2) — White's 2nd move
      expect(c.moverColor).toBe('white');
      expect(c.playedSan).toBe('Qh5');
      expect(c.suggestedSan).toBe('Nf3');    // g1f3 → SAN at the pre-move FEN
      expect(c.classification).toBe('blunder');
      expect(c.playedSquares).toEqual(['d1', 'h5']);
      expect(c.suggestedSquares).toEqual(['g1', 'f3']);
      expect(c.evalSwingCp).toBe(325);       // |25 − (−300)|
      expect(c.fenBefore).toContain(' w ');   // White to move at the cited ply
      // Grounded "why better": Nf3 attacks the e5 pawn (a developing tempo).
      expect(c.whyBetter).not.toBeNull();
      expect(c.whyBetter).toContain('e5');
    });

    it('filters to the BLACK student\'s moves when playerColor is black', () => {
      const moves = [
        move({ ply: 1, san: 'e4', classification: 'book' }),
        move({ ply: 2, san: 'e5', classification: 'book' }),
        move({ ply: 3, san: 'Nf3', classification: 'inaccuracy', bestMove: 'b1c3' }), // white — excluded for black student
        move({ ply: 4, san: 'Qf6', classification: 'mistake', bestMove: 'b8c6', preMoveEval: 30, evaluation: 160 }), // black student
      ];
      const cites = buildReviewCitations(moves, 'black');
      expect(cites).toHaveLength(1);
      expect(cites[0].ply).toBe(4);
      expect(cites[0].moverColor).toBe('black');
      expect(cites[0].playedSan).toBe('Qf6');
      expect(cites[0].suggestedSan).toBe('Nc6');
    });

    it('leaves suggestion fields null when no bestMove is stored (never guesses)', () => {
      const cites = buildReviewCitations([
        move({ ply: 1, san: 'e4', classification: 'book' }),
        move({ ply: 2, san: 'e5', classification: 'book' }),
        move({ ply: 3, san: 'Bc4', classification: 'inaccuracy', bestMove: null, preMoveEval: null, evaluation: null }),
      ], 'white');
      expect(cites).toHaveLength(1);
      expect(cites[0].suggestedSan).toBeNull();
      expect(cites[0].suggestedSquares).toBeNull();
      expect(cites[0].evalSwingCp).toBeNull();
    });

    it('returns empty when the student made no flagged moves', () => {
      const cites = buildReviewCitations([
        move({ ply: 1, san: 'e4', classification: 'book' }),
        move({ ply: 2, san: 'e5', classification: 'good' }),
      ], 'white');
      expect(cites).toEqual([]);
    });
  });
});
