import { describe, it, expect, beforeAll } from 'vitest';
import { loadPlayerGamesForLive, resolvePlayerIdFromAsk } from './playerGames';
import proGameReferencesData from '../../../public/data/pro-game-references.json';
import { __setProGameReferenceCache } from '../../services/proGameReferenceData';
import type { ProGameReference } from '../../types';

const REFS = proGameReferencesData as unknown as ProGameReference[];
const SAMPLE = REFS[0];

// The source reads the lazy-loaded cache synchronously; prime it with the
// real shipped asset (no fetch in vitest).
beforeAll(() => __setProGameReferenceCache(REFS));

describe('loadPlayerGamesForLive', () => {
  it('returns null when no opening can be resolved', () => {
    expect(loadPlayerGamesForLive({ openingName: null, moveHistory: [] })).toBeNull();
  });

  it('scopes to a single pro opening via proOpeningId', () => {
    const ctx = loadPlayerGamesForLive({
      openingName: null,
      moveHistory: [],
      proOpeningId: SAMPLE.proOpeningId,
    });
    expect(ctx).not.toBeNull();
    expect(ctx!.playerId).toBe(SAMPLE.playerId);
    expect(ctx!.games.length).toBeGreaterThan(0);
    expect(ctx!.games.length).toBeLessThanOrEqual(4);
    expect(ctx!.totalAvailable).toBeGreaterThanOrEqual(ctx!.games.length);
  });

  it('resolves by base openingId from an opening name', () => {
    // Caro-Kann is a Naroditsky pilot opening.
    const ctx = loadPlayerGamesForLive({
      openingName: 'Caro-Kann Defense',
      moveHistory: [],
    });
    expect(ctx).not.toBeNull();
    expect(ctx!.openingId).toContain('caro');
    expect(ctx!.games.every((g) => g.pgnPrefix.length > 0)).toBe(true);
  });

  it('never surfaces a game where the student side lost', () => {
    const ctx = loadPlayerGamesForLive({
      openingName: null,
      moveHistory: [],
      proOpeningId: SAMPLE.proOpeningId,
    });
    for (const g of ctx!.games) {
      const lost =
        (g.studentSide === 'white' && g.result === '0-1') ||
        (g.studentSide === 'black' && g.result === '1-0');
      expect(lost).toBe(false);
    }
  });

  it('ranks higher-rated opponents first', () => {
    const ctx = loadPlayerGamesForLive({
      openingName: null,
      moveHistory: [],
      proOpeningId: SAMPLE.proOpeningId,
    });
    const ratings = ctx!.games.map((g) => g.opponentRating ?? 0);
    const sorted = [...ratings].sort((a, b) => b - a);
    expect(ratings).toEqual(sorted);
  });
});

describe('resolvePlayerIdFromAsk (Bug 1, David 2026-07-10)', () => {
  it.each([
    ['how does GothamChess play this line', 'gothamchess'],
    ['how does Gotham play the Caro', 'gothamchess'],
    ['what does Levy do here', 'gothamchess'],
    ['how does Naroditsky handle this', 'naroditsky'],
    ['how does Danya play it', 'naroditsky'],
    ['what does Magnus play here', 'carlsen'],
    ['how does Hikaru meet this', 'hikaru'],
  ])('resolves "%s" -> %s', (ask, id) => expect(resolvePlayerIdFromAsk(ask)).toBe(id));

  it('returns null when no known pro is named', () => {
    expect(resolvePlayerIdFromAsk('how do I play this line')).toBeNull();
    expect(resolvePlayerIdFromAsk('what is the best move')).toBeNull();
  });
});

describe('loadPlayerGamesForLive — named-player scoping (Bug 1)', () => {
  it('scopes games to the named player', () => {
    const ctx = loadPlayerGamesForLive({
      openingName: null, moveHistory: [],
      proOpeningId: SAMPLE.proOpeningId, askedPlayerId: SAMPLE.playerId,
    });
    expect(ctx).not.toBeNull();
    expect(ctx!.playerId).toBe(SAMPLE.playerId);
    expect(ctx!.games.length).toBeGreaterThan(0);
  });

  it('returns an HONEST empty context for a named player with no games in the line', () => {
    // A pro who has no games in SAMPLE's opening → empty, but NAMED so the
    // coach can say so honestly instead of showing another pro's games.
    const ctx = loadPlayerGamesForLive({
      openingName: null, moveHistory: [],
      proOpeningId: SAMPLE.proOpeningId, askedPlayerId: '__no_such_pro__',
    });
    expect(ctx).not.toBeNull();
    expect(ctx!.games).toHaveLength(0);
    expect(ctx!.totalAvailable).toBe(0);
    expect(ctx!.requestedPlayerName).toBeTruthy();
  });
});
