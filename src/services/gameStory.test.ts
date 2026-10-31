/**
 * THE GAME'S STORY — the say-once ledger (WO-STORY-MATRIX-01 P1-8a).
 *
 * Fails on the code before it: `learnMemory.rewind` only lowered a ply count,
 * `standingFactMemory` had no rewind at all (a takeback across a full-move
 * boundary forgot the WHOLE game instead), and a line was marked said when it
 * was computed, before the door decided whether it spoke.
 */
import { describe, it, expect } from 'vitest';
import { createStoryStore, keysUnder, STORY_KEY } from './gameStory';
import { createLearnMemory } from './learnMemory';

const B10 = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const B10_LATER_CLOCKS = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 9';
const OTHER = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('rewind takes back what the undone plies said', () => {
  it('a claim said at ply 10 is forgotten by rewind(8); one said at ply 8 stays', () => {
    const s = createStoryStore('g1');
    s.commit(8, { claims: ['student-king-centre'], sentences: ['yourkingisstillinthecentre'] });
    s.commit(10, { claims: ['def:pin'], sentences: ['claim:def:pin'] });
    expect(s.current().said.get('def:pin')).toBe(10);
    s.rewind(8);
    expect(s.current().said.has('def:pin')).toBe(false);
    expect(s.current().sentences.has('claim:def:pin')).toBe(false);
    expect(s.current().said.get('student-king-centre')).toBe(8);
    expect(s.current().sentences.has('yourkingisstillinthecentre')).toBe(true);
    // …and replaying the ply says it again, at its new ply.
    s.commit(9, { claims: ['def:pin'] });
    expect(s.current().said.get('def:pin')).toBe(9);
  });

  it('a key keeps the ply it was FIRST said: said again later, a rewind past the repeat keeps it', () => {
    const s = createStoryStore('g1');
    s.commit(5, { claims: ['file-d'] });
    s.commit(12, { claims: ['file-d'] });
    s.rewind(8);
    expect(s.current().said.get('file-d')).toBe(5);
  });

  it('through the game memory: a takeback forgets what was said after the board it returns to, and keeps the game', () => {
    let plies = 0;
    const mem = createLearnMemory({ livePlies: () => plies });
    plies = 8; mem.observe();
    mem.story.commit(8, { claims: ['bishop-pair'] });
    plies = 10; mem.observe();
    mem.story.commit(10, { claims: ['def:fork'] });
    const id = mem.gameId;
    mem.rewind(8);
    plies = 8;
    expect(mem.observe(), 'a takeback is not a new game').toBe(false);
    expect(mem.gameId).toBe(id);
    expect(mem.story.current().said.has('def:fork')).toBe(false);
    expect(mem.story.current().said.has('bishop-pair')).toBe(true);
  });

  it('a scenario JUMP keeps everything said — a new board, never a takeback', () => {
    let plies = 30;
    const mem = createLearnMemory({ livePlies: () => plies });
    mem.observe();
    mem.story.commit(30, { claims: ['def:pin'] });
    mem.jump(0);
    plies = 0;
    expect(mem.observe()).toBe(false);
    plies = 2; mem.observe();
    // A takeback on the new board never reaches what was said before the jump.
    mem.rewind(1);
    expect(mem.story.current().said.has('def:pin')).toBe(true);
  });
});

describe('newGame is the one reset door', () => {
  it('learnMemory.newGame() renews the story — said, sentences, offers, ply — under the new id', () => {
    let plies = 0;
    const mem = createLearnMemory({ livePlies: () => plies });
    plies = 14; mem.observe();
    mem.story.commit(14, { claims: ['def:pin'], sentences: ['claim:def:pin'] });
    mem.story.offer(B10, { text: 'Remember — a pin freezes the piece in front.', claims: ['def:skewer'] });
    const first = mem.gameId;
    mem.newGame();
    expect(mem.gameId).not.toBe(first);
    expect(mem.story.current().gameId).toBe(mem.gameId);
    expect(mem.story.current().said.size).toBe(0);
    expect(mem.story.current().sentences.size).toBe(0);
    expect(mem.story.current().ply).toBe(0);
    expect(mem.story.heard(B10).has('def:skewer')).toBe(false);
  });

  it('the board going backwards renews it through the same door (observe → newGame)', () => {
    let plies = 0;
    let fired = 0;
    const mem = createLearnMemory({ livePlies: () => plies, onNewGame: () => { fired += 1; } });
    plies = 14; mem.observe();
    mem.story.commit(14, { claims: ['def:pin'] });
    plies = 1;
    expect(mem.observe()).toBe(true);
    expect(fired).toBe(1);
    expect(mem.story.current().said.has('def:pin')).toBe(false);
    expect(mem.story.current().ply).toBe(1);
  });
});

describe('writes happen at the door: offered is heard for the turn, kept is the game\'s', () => {
  it('an offer is heard on its board for the rest of the turn, not on another board, and not by the game', () => {
    const s = createStoryStore('g1');
    s.offer(B10, { text: 'Remember — a pin freezes the piece in front.', claims: ['def:pin'] });
    expect(s.heard(B10).has('def:pin')).toBe(true);
    // The same position with the clocks moved on is the same turn.
    expect(s.heard(B10_LATER_CLOCKS).has('def:pin')).toBe(true);
    expect(s.heard(OTHER).has('def:pin')).toBe(false);
    expect(s.heard(null).has('def:pin')).toBe(false);
    expect(s.current().said.has('def:pin')).toBe(false);
  });

  it('commitKept writes the offers whose line the door kept — and only those', () => {
    const s = createStoryStore('g1');
    s.offer(B10, { text: 'Remember — a pin freezes the piece in front.', claims: ['def:pin'] });
    s.offer(B10, { text: 'Your king is still in the centre.', claims: ['student-king-centre'] });
    s.offer(B10, { text: 'Ask it before every move: what does this piece guard right now?', sentences: ['claim:method:what-it-guarded'] });
    // The door kept the pin line (with the definition riding it) and dropped the rest.
    s.commitKept(11, B10, [{ text: 'Watch out — their bishop on g4 pins your knight on f3 to your queen. Remember — a pin freezes the piece in front.' }]);
    expect(s.current().said.get('def:pin')).toBe(11);
    expect(s.current().said.has('student-king-centre')).toBe(false);
    expect(s.current().sentences.has('claim:method:what-it-guarded')).toBe(false);
  });

  it('a door that trimmed the line still counts it (the offer contains the kept text)', () => {
    const s = createStoryStore('g1');
    s.offer(B10, { text: 'Their bishop on b2 is the piece doing the most work. Trading it off takes the sting out.', claims: ['piece-quality-once:best:middlegame'] });
    s.commitKept(11, B10, [{ text: 'Their bishop on b2 is the piece doing the most work.' }]);
    expect(s.current().said.has('piece-quality-once:best:middlegame')).toBe(true);
  });

  it('a new board starts a new turn: the old offers are gone, never committed', () => {
    const s = createStoryStore('g1');
    s.offer(B10, { text: 'a', claims: ['k1'] });
    s.offer(OTHER, { text: 'b', claims: ['k2'] });
    expect(s.heard(B10).has('k1')).toBe(false);
    s.commitKept(3, B10, [{ text: 'a' }]);
    expect(s.current().said.has('k1')).toBe(false);
  });

  it('heard carries the sentence keys too (the door\'s priorKeys)', () => {
    const s = createStoryStore('g1');
    s.commit(3, { sentences: ['claim:method:blunder-check'] });
    s.offer(B10, { text: 'q', sentences: ['claim:method:answer-danger'] });
    const h = s.heard(B10);
    expect([...h.sentences].sort()).toEqual(['claim:method:answer-danger', 'claim:method:blunder-check']);
  });
});

describe('namespaces read back in their own vocabulary', () => {
  it('keysUnder strips one prefix and ignores the rest', () => {
    const keys = [STORY_KEY.principle('develop-knights'), STORY_KEY.fundamental('hung-piece'), 'principle-like', STORY_KEY.principle('castle-early')];
    expect([...keysUnder(keys, STORY_KEY.principle(''))].sort()).toEqual(['castle-early', 'develop-knights']);
    expect([...keysUnder(keys, STORY_KEY.fundamental(''))]).toEqual(['hung-piece']);
  });
});
