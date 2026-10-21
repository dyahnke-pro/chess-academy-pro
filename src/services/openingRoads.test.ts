// Why this road and not the other — on REAL master counts (the live-explorer
// fixture built by scripts/build-opening-story-fixture.mjs).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { roadReason, deniedSquares, invitedAttack, spokenRoads, spokenRoad } from './openingRoads';
import type { MovesAt } from './mastersPlanRead';
import type { LocalDbMove } from './masterPlayLookup';

const fixture = JSON.parse(readFileSync('src/services/__fixtures__/opening-story-masters.json', 'utf8')) as { positions: Record<string, LocalDbMove[]> };
const movesAt: MovesAt = (fen) => fixture.positions[fen.split(' ').slice(0, 4).join(' ')] ?? null;
const FORK = 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3'.split(' ');
const fenOf = (sans: readonly string[]): string => { const c = new Chess(); sans.forEach((m) => c.move(m)); return c.fen(); };

describe('roadReason — what each road allows', () => {
  it('the Najdorf over the Classical: what …a6 takes away, and how masters meet the other road', () => {
    expect(roadReason({ prefix: FORK, chosenSan: 'a6', chosenName: 'Sicilian Defense: Najdorf Variation', altSan: 'Nc6', altName: 'Sicilian Defense: Classical Variation', student: 'b', movesAt })?.text)
      .toMatch(/^…a6 takes b5 away from their knights on d4 and c3, and their bishop on f1\./);
  });
  it('the road not taken is never described (lead 2026-10-20: "the Giuoco Piano is mostly met by the Classical")', () => {
    expect(roadReason({ prefix: FORK, chosenSan: 'a6', chosenName: 'Sicilian Defense: Najdorf Variation', altSan: 'Nc6', altName: 'Sicilian Defense: Classical Variation', student: 'b', movesAt })?.text).not.toMatch(/other main road|mostly met by/);
  });
  it('the Two Knights over the Giuoco Piano: each move\'s own job, and the attack the road invites', () => {
    const k = (sans: string[]): string => fenOf(sans).split(' ').slice(0, 4).join(' ');
    const ITALIAN = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'];
    const db: Record<string, LocalDbMove[]> = {
      [k(ITALIAN)]: [{ san: 'Bc5', games: 25481 }, { san: 'Nf6', games: 21370 }] as LocalDbMove[],
      [k([...ITALIAN, 'Nf6'])]: [{ san: 'd3', games: 15960 }, { san: 'Ng5', games: 3454 }, { san: 'd4', games: 1691 }] as LocalDbMove[],
    };
    const at: MovesAt = (fen) => db[fen.split(' ').slice(0, 4).join(' ')] ?? null;
    expect(roadReason({ prefix: ITALIAN, chosenSan: 'Nf6', chosenName: 'Italian Game: Two Knights Defense', altSan: 'Bc5', altName: 'Italian Game: Giuoco Piano', student: 'b', movesAt: at })?.text)
      .toBe('…Nf6 attacks their pawn on e4, where …Bc5 brings your bishop out; it invites Ng5, which joins their bishop on c4 against your pawn on f7.');
    expect(invitedAttack([...ITALIAN, 'Nf6'], 'b', () => [{ san: 'd3', games: 100 }] as LocalDbMove[])).toBeNull();
  });
  it('a score gap of under three points is not said (Najdorf 47.4 vs Classical 47.1)', () => {
    expect(roadReason({ prefix: FORK, chosenSan: 'a6', chosenName: 'Sicilian Defense: Najdorf Variation', altSan: 'Nc6', altName: 'Sicilian Defense: Classical Variation', student: 'b', movesAt })?.text).not.toMatch(/master games/);
  });
  it('a real score gap closes the reason (Najdorf 47.4 vs Dragon 41.9 for Black)', () => {
    expect(roadReason({ prefix: FORK, chosenSan: 'a6', chosenName: 'Sicilian Defense: Najdorf Variation', altSan: 'g6', altName: 'Sicilian Defense: Dragon Variation', student: 'b', movesAt })?.text)
      .toMatch(/In master games your road has held up better\.$/);
  });
  it('the alternative\'s reply is dropped when masters answer the chosen move the same way (both 2…d6 and 2…Nc6 meet d4)', () => {
    const r = roadReason({ prefix: ['e4', 'c5', 'Nf3'], chosenSan: 'd6', chosenName: 'Sicilian Defense: Modern Variation', altSan: 'Nc6', altName: 'Sicilian Defense: Old Sicilian', student: 'b', movesAt });
    expect(r?.text).toBe('…d6 takes e5 away from their knight on f3.');
  });
  it('no reason computed → null, never filler or a bare score', () => {
    // …e6 takes away no square a piece of theirs could use, and with no masters
    // data the alternative's answer is unknown: nothing is said.
    expect(roadReason({ prefix: ['e4', 'c5', 'Nf3'], chosenSan: 'e6', chosenName: 'Sicilian Defense: French Variation', altSan: 'Qa5', altName: 'Sicilian Defense', student: 'b', movesAt: () => null })).toBeNull();
  });
});

describe('the pieces', () => {
  it('only a pawn move takes squares away', () => {
    expect(deniedSquares(fenOf(FORK), 'a6', 'b').map((d) => d.square)).toEqual(['b5']);
    expect(deniedSquares(fenOf(FORK), 'Nc6', 'b')).toEqual([]);
  });
  it('a square another pawn already covers is not "taken away" (French …c6: d5 is the e6 pawn\'s already)', () => {
    expect(deniedSquares(fenOf(['e4', 'e6', 'd4', 'd5', 'Nc3']), 'c6', 'b').map((d) => d.square)).toEqual(['b5']);
  });
});

// Review tape 2026-10-21 (King's Indian, 5.Nf3): "A real crossroads: from here
// master games split into the Normal Variation, Rare Defenses, the Normal
// Variation, Standard Development and the Sämisch Variation" — two roads' sub-
// names read as five roads, one named twice.
describe('roads as said', () => {
  const KID = "King's Indian Defense";
  it('roads sharing a variation are counted under it, never listed by sub-name', () => {
    const said = spokenRoads([`${KID}: Normal Variation, Rare Defenses`, `${KID}: Normal Variation, Standard Development`, `${KID}: Sämisch Variation`]);
    expect(said).toEqual(['two lines of the Normal Variation', 'the Sämisch Variation']);
    expect(said.join(' ')).not.toMatch(/,/);
  });
  it('the part every road shares is dropped: inside one variation its lines are named', () => {
    expect(spokenRoads(['Sicilian Defense: Najdorf Variation, English Attack', 'Sicilian Defense: Najdorf Variation, Opocensky Variation', 'Sicilian Defense: Najdorf Variation, Adams Attack']))
      .toEqual(['the English Attack', 'the Opocensky Variation', 'the Adams Attack']);
  });
  it('distinct variations keep their names', () => {
    expect(spokenRoads(['Sicilian Defense: Najdorf Variation', 'Sicilian Defense: Dragon Variation'])).toEqual(['the Najdorf Variation', 'the Dragon Variation']);
  });
  it('a road chosen over the same variation has no name that tells them apart', () => {
    expect(spokenRoad(`${KID}: Normal Variation, Rare Defenses`, `${KID}: Normal Variation, Standard Development`)).toBeNull();
    expect(spokenRoad(`${KID}: Normal Variation, Rare Defenses`, `${KID}: Sämisch Variation`)).toBe('the Normal Variation');
  });
  it('the other road is named by its move when the names cannot tell them apart', () => {
    const k = (sans: string[]): string => fenOf(sans).split(' ').slice(0, 4).join(' ');
    const KIDP = ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'];
    const db: Record<string, LocalDbMove[]> = {
      [k(KIDP)]: [{ san: 'f3', games: 9000, white: 3000, draws: 3000, black: 3000 }, { san: 'Be2', games: 6000, white: 2700, draws: 2400, black: 900 }] as LocalDbMove[],
    };
    const at: MovesAt = (fen) => db[fen.split(' ').slice(0, 4).join(' ')] ?? null;
    // Two names that share their variation (the naming is under test, so the
    // pair is chosen to share "Normal Variation"): the other road is its move.
    const r = roadReason({ prefix: KIDP, chosenSan: 'f3', chosenName: `${KID}: Normal Variation, Rare Defenses`, altSan: 'Be2', altName: `${KID}: Normal Variation, Standard Development`, student: 'w', movesAt: at });
    expect(r?.text ?? '').not.toMatch(/Standard Development|Rare Defenses/);
    expect(r?.text).toMatch(/In master games Be2 has held up a little better\.$/);
  });
  // Review tape 2026-10-21: "Knight to f3 brings your knight out, where bishop
  // to e2 brings your bishop out." — two roads described, no reason between them.
  it('two moves that only bring a piece out are no reason to choose one', () => {
    const KIDP = ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'];
    expect(roadReason({ prefix: KIDP, chosenSan: 'Nf3', chosenName: `${KID}: Normal Variation, Rare Defenses`, altSan: 'Be2', altName: `${KID}: Normal Variation, Standard Development`, student: 'w', movesAt: () => null })).toBeNull();
  });
});
