// The opening story on REAL lines (chess.js-validated), with REAL master counts
// (the fixture is the live masters explorer, built by
// scripts/build-opening-story-fixture.mjs — never authored).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { openingStoryAt, prefetchOpeningStory, BEAT_ORDER, type StoryFact } from './openingStory';
import { setOpeningIdentity } from './openingIdentity';
import type { MovesAt } from './mastersPlanRead';
import type { LocalDbMove } from './masterPlayLookup';
import type { MasterPlayResult } from './masterPlayTypes';

const fixture = JSON.parse(readFileSync('src/services/__fixtures__/opening-story-masters.json', 'utf8')) as { positions: Record<string, LocalDbMove[]> };
const key = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');
const movesAt: MovesAt = (fen) => fixture.positions[key(fen)] ?? null;

const NAJDORF = 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7 g4 b5'.split(' ');
const SMITH_MORRA = 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6 O-O Nf6 Qe2 Be7 Rd1 e5 Be3'.split(' ');
const LARSEN = 'b3 e5 Bb2 Nc6 e3 d5 Bb5 Bd6 f4 Qh4+ g3 Qe7 Nf3 f6'.split(' ');

const story = (line: string[], plies: number, student: 'w' | 'b'): StoryFact[] => openingStoryAt({ history: line.slice(0, plies), student, namesStudentMoves: false, movesAt });
const beat = (facts: StoryFact[], b: StoryFact['beat']): StoryFact | undefined => facts.find((f) => f.beat === b);

beforeAll(() => { setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8'))); });

describe('openingStory — Najdorf, English Attack (student Black)', () => {
  it('names the families at the student\'s fork, by name, never by move', () => {
    const f = beat(story(NAJDORF, 9, 'b'), 'fork');
    expect(f?.text).toMatch(/^A real crossroads: from here master games split into the Najdorf, the Classical and the Dragon/);
    expect(f?.text).not.toMatch(/\ba6\b|Nc6|g6/);
  });
  it('explains the branch chosen against the main alternative, by what each road allows', () => {
    // What each road ALLOWS, never "a different kind of position" (lead 2026-10-20).
    expect(beat(story(NAJDORF, 10, 'b'), 'branch-choice')?.text).toBe('You chose the Najdorf: …a6 takes b5 away from their knights on d4 and c3, and their bishop on f1.');
  });
  it('the road not taken is never described alone (prod 2026-10-20: "The Moscow is a position built around a locked centre.")', () => {
    // 3.d4: White's road has no computed aim and no reason — no beat, not half a comparison.
    expect(beat(story(NAJDORF, 5, 'w'), 'branch-choice')).toBeUndefined();
  });
  it('their fork is not named by family: after Nc3 a6, White\'s choice is theirs', () => {
    expect(beat(story(NAJDORF, 10, 'b'), 'fork')).toBeUndefined();
  });
  it('the identity never names the student\'s reply before it is played, and drops a clause the board made false', () => {
    // 6.Be3: "the usual answer is …e5" is the student's next move — the line waits.
    expect(beat(story(NAJDORF, 11, 'b'), 'identity')).toBeUndefined();
    // 7.Nb3: their knight left d4, so "…e5 putting the question to their knight on d4" is no longer true.
    expect(beat(story(NAJDORF, 13, 'b'), 'identity')?.text ?? '').not.toMatch(/knight on d4/);
  });
  it('Scandinavian as Black: the trade is said only once you have taken back (OS-3 review)', () => {
    const SCAN = 'e4 d5 exd5 Qxd5 Nc3 Qa5'.split(' ');
    expect(beat(story(SCAN, 3, 'b'), 'identity')).toBeUndefined(); // …Qxd5 still to come
    expect(beat(story(SCAN, 5, 'b'), 'identity')?.text).toMatch(/you take back with the queen\. The queen is out early, so they gain time hitting it with the knight to c3/);
    expect(beat(story(SCAN, 6, 'b'), 'identity')).toBeUndefined(); // the queen left d5
  });
  it('Modern as Black: "you put the bishop on g7" waits for …Bg7', () => {
    const MOD = 'e4 g6 d4 Bg7 Nc3'.split(' ');
    expect(beat(story(MOD, 3, 'b'), 'identity')).toBeUndefined();
    expect(beat(story(MOD, 5, 'b'), 'identity')?.text).toMatch(/You put the bishop on g7/);
  });
  it('Alekhine as Black: their e5 is a prediction, never held on the student\'s own legal …e5', () => {
    expect(beat(story('e4 Nf6 Nc3'.split(' '), 3, 'b'), 'identity')?.text).toMatch(/they almost always answer with the pawn to e5/);
    expect(beat(story('e4 Nf6 Nc3'.split(' '), 3, 'b'), 'identity')?.text ?? '').not.toMatch(/locks the centre/); // not locked on this board
  });
  it('the student\'s own move is read one ply back, after the coach\'s reply (OS-3 review: these beats never fired in Learn)', () => {
    // 12…e5 13.Nb3: the cost of …e5 is said over the board after the reply.
    expect(beat(story(NAJDORF, 13, 'b'), 'structure-cost')?.text).toMatch(/That's the price of …e5/);
    // 14…Be6 15.f3: …Be6 pays it.
    expect(beat(story(NAJDORF, 15, 'b'), 'structure-paid')?.text).toBe('…Be6 pays that price: your bishop now guards d5.');
  });
  it('a one-ply beat stays offered until heard: the race is still there two moves after castling', () => {
    expect(beat(story(NAJDORF, 21, 'b'), 'character')?.text).toMatch(/Kings on opposite wings/);
  });
  it('…e5 names its built-in cost, and …Be6 pays it', () => {
    expect(beat(story(NAJDORF, 12, 'b'), 'structure-cost')?.text).toBe("That's the price of …e5: no pawn of yours can cover d5 again, and their knight on c3 is one move from it; from there it would hit your knight on f6. Keeping d5 guarded is part of this structure from here.");
    expect(beat(story(NAJDORF, 14, 'b'), 'structure-paid')?.text).toBe('…Be6 pays that price: your bishop now guards d5.');
  });
  it('before the race arrives, master games say their king goes to the other wing', () => {
    const c = beat(story(NAJDORF, 18, 'b'), 'character');
    expect(c?.text).toBe('Master games from here almost always put their king on the other wing — expect opposite-side castling, which makes it a race of pawn storms.');
    expect(c?.holdWhilePlayable).toBeUndefined();
  });
  it('the story is told in the baseline order: identity before cost', () => {
    const beats = story(NAJDORF, 12, 'b').map((f) => f.beat);
    expect([...beats].sort((a, b) => BEAT_ORDER[a] - BEAT_ORDER[b])).toEqual(beats);
  });
  it('master games race in the English Attack and never agree on …d5 — no key break is invented', () => {
    for (let n = 12; n <= NAJDORF.length; n += 1) expect(beat(story(NAJDORF, n, 'b'), 'key-break')).toBeUndefined();
  });
  it('opposite-side castling announces the race under the plan arc\'s king-attack aim', () => {
    const c = beat(story(NAJDORF, 19, 'b'), 'character');
    expect(c?.text).toMatch(/^Kings on opposite wings: this is a race\. Your pawns can storm the queenside/);
    expect(c?.aim).toBe('plan-aim:king-attack');
  });
});

describe('openingStory — Smith-Morra (student White)', () => {
  it('a hole their move gives away is a consequence, and the knight jump to it is held', () => {
    const c = beat(story(SMITH_MORRA, 18, 'w'), 'consequence');
    expect(c?.text).toBe('…e5 has a cost for them: no pawn of theirs can cover d5 again, and your knight on c3 is one move from it; from there it would hit their bishop on e7 and knight on f6.');
    expect(c?.holdWhilePlayable).toEqual([{ from: 'c3', to: 'd5' }]);
  });
});

describe('openingStory — Smith-Morra key move', () => {
  it('a key move the student can play right now is never said as an idea (the bishop to c4 is development)', () => {
    for (const n of [6, 7, 8, 9]) expect(beat(story(SMITH_MORRA, n, 'w'), 'key-break')).toBeUndefined();
  });
  it('a piece route that still needs preparing is the key idea: the rook to d1, behind the queen', () => {
    const k = beat(story(SMITH_MORRA, 14, 'w'), 'key-break');
    expect(k?.text).toBe('The key piece in this structure is your rook on f1: master games from here almost always bring it to d1.');
    expect(k?.holdWhilePlayable).toEqual([{ from: 'f1', to: 'd1' }]);
  });
});

describe('openingStory — past the masters horizon', () => {
  it('when master games thin out in the middlegame, the board plan takes over under the plan thread\'s aim key', () => {
    const h = beat(story(SMITH_MORRA, 19, 'w'), 'horizon-plan');
    expect(h?.text).toBe('The master games run out here, so the board sets the plan: seize the open c-file.');
    expect(h?.aim).toBe('plan-aim:file:c');
    expect(beat(story(SMITH_MORRA, 19, 'w'), 'key-break')).toBeUndefined();
  });
  it('past the horizon in the opening, the plan is development: no structural plan (1.b3 line)', () => {
    expect(beat(story(LARSEN, LARSEN.length, 'w'), 'horizon-plan')).toBeUndefined();
  });
  it('unknown is never the horizon: no masters data in memory says nothing', () => {
    const facts = openingStoryAt({ history: LARSEN, student: 'w', namesStudentMoves: false, movesAt: () => null });
    expect(beat(facts, 'horizon-plan')).toBeUndefined();
  });
});

describe('prefetchOpeningStory', () => {
  it('looks up the book two plies ahead and the plan tree, through the given lookup', async () => {
    const seen = new Set<string>();
    const lookup = async (fen: string): Promise<MasterPlayResult> => {
      seen.add(key(fen));
      const moves = (movesAt(fen) ?? []).map((m) => ({ san: m.san, games: m.games, white: 0, draws: 0, black: 0, whitePct: 0, drawPct: 0, blackPct: 0 }));
      return { fen, totalGames: moves.reduce((n, m) => n + m.games, 0), source: moves.length ? 'lichess-live' : 'none', moves };
    };
    await prefetchOpeningStory('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'test', lookup);
    expect(seen.size).toBeGreaterThan(3);
    expect(seen.size).toBeLessThanOrEqual(120);
  });
});
