import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildOpeningMoveDetail } from './reviewStrategicOrientation';
import { __setHisPlayDbForTests, __resetHisPlayDbForTests } from './hisPlayLookup';

// THE STUDENT'S RECORD IS THEIRS ALONE (the wiring map, 2026-10-30): Review's
// opening detail read another player's games and told the student "This is
// your bread-and-butter — you play it almost every time here, and it's scored
// well for you at 58%". Those are not the student's games. Nothing may say
// "you play" or "for you" off a record that is not the student's.
describe('buildOpeningMoveDetail never borrows another player\'s record as the student\'s', () => {
  afterEach(() => __resetHisPlayDbForTests());

  it('1.e4 at the start, where his games play e4 most: no "your" record', () => {
    __setHisPlayDbForTests(JSON.parse(readFileSync('public/data/danya-play-db.json', 'utf8')));
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const line = buildOpeningMoveDetail(start, 'e4', true) ?? '';
    expect(line).not.toMatch(/\byou (almost )?(always )?play\b|\bfor you\b|\byour (bread|main choice|usual|regular)\b|\bone of your\b/i);
  });

  it('a departure from his most-played move is not "a departure from your usual"', () => {
    __setHisPlayDbForTests(JSON.parse(readFileSync('public/data/danya-play-db.json', 'utf8')));
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const line = buildOpeningMoveDetail(start, 'd4', true) ?? '';
    expect(line).not.toMatch(/your usual|you almost always play|you went your own way/i);
  });
});
