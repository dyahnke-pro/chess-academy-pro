/**
 * THE GAME'S STORY — the say-once ledger (WO-STORY-MATRIX-01 P1-8a).
 *
 * Fails on the code before it: `learnMemory.rewind` only lowered a ply count,
 * `standingFactMemory` had no rewind at all (a takeback across a full-move
 * boundary forgot the WHOLE game instead), and a line was marked said when it
 * was computed, before the door decided whether it spoke.
 */
import { describe, it, expect } from 'vitest';
import {
  createStoryStore, keysUnder, STORY_KEY, threadKey, threadStated, threadVariant, toldBoards, PLAN_GOAL,
  phaseCrossed, openingAt, openingsNamed, noteOpening, identityHeard, openingBreak, switchesSaid, lastVerdict,
  promisesOpen, slipCount, modelGameCited, storyTurn, storyOf, EMPTY_CHARACTER_STATE,
} from './gameStory';
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

describe('the plans are the story\'s (P1-8b): threads keyed by their goal, the plan state checkpointed', () => {
  const PASSER_D = threadKey('student', 'plan-aim:passer:d');
  const STRUCTURE = threadKey('student', PLAN_GOAL.structure);

  it('a thread key is the seat and the plan-aim key — the arc\'s aim ids join it', () => {
    expect(threadKey('student', 'plan-aim:outpost:d5')).toBe('student|plan-aim:outpost:d5');
    expect(threadKey('opponent', 'outpost:d5')).toBe('opponent|plan-aim:outpost:d5');
  });

  it('rewind forgets a plan stated after the board, and its variant goes back to the one before', () => {
    const s = createStoryStore('g1');
    s.commitThreads(9, [{ key: STRUCTURE, kind: 'stated', variant: 'passer-mine' }]);
    s.commitThreads(15, [{ key: STRUCTURE, kind: 'stated', variant: 'iqp-theirs' }, { key: PASSER_D, kind: 'stated' }]);
    expect(threadVariant(s.current(), STRUCTURE)).toBe('iqp-theirs');
    s.rewind(12);
    expect(threadVariant(s.current(), STRUCTURE)).toBe('passer-mine');
    expect(threadStated(s.current(), PASSER_D)).toBeNull();
    s.rewind(8);
    expect(s.current().threads.has(STRUCTURE)).toBe(false);
  });

  it('the plan computers\' state is checkpointed by ply: rewind restores the state at the board', () => {
    const s = createStoryStore('g1');
    const d9 = s.plans();
    d9.thread.methodSaid = true;
    s.setPlans(9, d9);
    const d11 = s.plans();
    d11.thread.howSaid.add('passer:d4');
    s.setPlans(11, d11);
    expect(s.plans().thread.howSaid.has('passer:d4')).toBe(true);
    // plans() hands out a copy: stepping it changes nothing until handed back.
    s.plans().thread.howSaid.add('scratch');
    expect(s.plans().thread.howSaid.has('scratch')).toBe(false);
    s.rewind(10);
    expect(s.plans().thread.methodSaid).toBe(true);
    expect(s.plans().thread.howSaid.has('passer:d4')).toBe(false);
    s.rewind(8);
    expect(s.plans().thread.methodSaid).toBe(false);
  });

  it('a plan line the door KEPT is the thread\'s; one it held is not — and a told line records its board', () => {
    const s = createStoryStore('g1');
    s.offer(B10, { text: 'The plan for you here: the outpost on d5.', thread: { key: threadKey('student', 'outpost:d5'), kind: 'stated', told: true } });
    s.offer(B10, { text: 'Their plan: the c-file.', thread: { key: threadKey('opponent', 'file:c'), kind: 'stated' } });
    s.commitKept(12, B10, [{ text: 'The plan for you here: the outpost on d5.' }]);
    expect(threadStated(s.current(), threadKey('student', 'outpost:d5'))).toBe(12);
    expect(threadStated(s.current(), threadKey('opponent', 'file:c'))).toBeNull();
    expect([...toldBoards(s.current(), 'student')]).toEqual([B10.split(' ').slice(0, 2).join(' ')]);
    expect(toldBoards(s.current(), 'opponent').size).toBe(0);
  });

  it('a wave that hands its door its lines commits the threads of the ones kept', () => {
    const s = createStoryStore('g1');
    s.commitKeptThreads(20, B10, [
      { text: 'Your passed pawn on d5 is the trump here.', thread: { key: STRUCTURE, kind: 'stated', variant: 'passer-mine' } },
      { text: 'A line with no thread.' },
    ], [{ text: 'Your passed pawn on d5 is the trump here.' }]);
    expect(threadVariant(s.current(), STRUCTURE)).toBe('passer-mine');
  });

  it('a kept CoachFact on a thread is a step on it; a fact about the move alone writes nothing', () => {
    const s = createStoryStore('g1');
    s.commitFacts(7, [{ thread: PASSER_D }, { thread: { none: 'local' } }]);
    expect(s.current().threads.get(PASSER_D)?.said).toEqual([{ ply: 7, kind: 'step', variant: null, board: null }]);
    // A step is not a statement of the plan.
    expect(threadStated(s.current(), PASSER_D)).toBeNull();
    expect(s.current().threads.size).toBe(1);
  });

  it('serialize → restore carries the whole story: said, threads and the plan state', () => {
    const a = createStoryStore('g1');
    a.commit(5, { claims: ['def:pin'], sentences: ['claim:def:pin'] });
    a.commitThreads(9, [{ key: STRUCTURE, kind: 'stated', variant: 'passer-race:you' }]);
    const d = a.plans();
    d.thread.methodSaid = true;
    d.thread.whyAsked.add('seizing the c-file');
    a.setPlans(9, d);
    const b = createStoryStore('other');
    b.commitThreads(3, [{ key: PASSER_D, kind: 'stated' }]);
    b.restore(a.serialize());
    expect(b.current().gameId).toBe('g1');
    expect(b.current().said.get('def:pin')).toBe(5);
    expect(threadVariant(b.current(), STRUCTURE)).toBe('passer-race:you');
    expect(threadStated(b.current(), PASSER_D)).toBeNull();
    expect(b.plans().thread.methodSaid).toBe(true);
    expect(b.plans().thread.whyAsked.has('seizing the c-file')).toBe(true);
    // null is the empty story: the walk had said nothing yet.
    b.restore(null);
    expect(b.current().threads.size).toBe(0);
    expect(b.plans().thread.methodSaid).toBe(false);
  });

  it('a new game forgets the threads and the plans', () => {
    const s = createStoryStore('g1');
    s.commitThreads(9, [{ key: STRUCTURE, kind: 'stated', variant: 'iqp-mine' }]);
    const d = s.plans(); d.thread.methodSaid = true; s.setPlans(9, d);
    s.newGame('g2');
    expect(s.current().threads.size).toBe(0);
    expect(s.plans().thread.methodSaid).toBe(false);
  });
});

describe('the events are the story\'s (P1-8c): what happened, at the ply it happened', () => {
  it('rewind drops the events after the board, jump keeps them, newGame forgets them', () => {
    const s = createStoryStore('g1');
    s.note(6, [{ kind: 'opening', stage: 'read', name: 'Italian Game' }]);
    s.note(21, [{ kind: 'phase', edge: 'middlegame' }]);
    s.note(25, [{ kind: 'verdict', word: 'better' }]);
    s.rewind(22);
    expect(phaseCrossed(s.current(), 'middlegame')).toBe(true);
    expect(lastVerdict(s.current()), 'said after the board the takeback returned to').toBeNull();
    s.rewind(20);
    expect(phaseCrossed(s.current(), 'middlegame')).toBe(false);
    expect(openingAt(s.current(), 'read')).toBe('Italian Game');
    s.note(30, [{ kind: 'slip', id: 'loose-piece' }]);
    s.jump(4);
    expect(slipCount(s.current(), 'loose-piece'), 'a scenario jump keeps everything').toBe(1);
    s.newGame('g2');
    expect(s.current().events).toEqual([]);
  });

  it('an event offered with a line is the game\'s only when the door keeps the line', () => {
    const s = createStoryStore('g1');
    s.offer(B10, { text: 'The position has turned sharp.', events: [{ kind: 'character', to: 'tactical' }] });
    s.commitKept(8, B10, [{ text: 'Something else.' }]);
    expect(switchesSaid(s.current()).tactical).toBe(0);
    s.offer(B10, { text: 'The position has turned sharp.', events: [{ kind: 'character', to: 'tactical' }] });
    s.commitKept(8, B10, [{ text: 'The position has turned sharp.' }]);
    expect(switchesSaid(s.current()).tactical).toBe(1);
  });

  it('an opening is recorded once per change at each stage; the names heard keep their order', () => {
    const s = createStoryStore('g1');
    noteOpening(s, 4, 'read', 'Sicilian Defense');
    noteOpening(s, 6, 'read', 'Sicilian Defense');
    noteOpening(s, 8, 'read', 'Sicilian Defense: Najdorf Variation');
    expect(s.current().events.filter((e) => e.kind === 'opening')).toHaveLength(2);
    noteOpening(s, 5, 'named', 'Sicilian Defense');
    noteOpening(s, 9, 'named', 'Sicilian Defense: Najdorf Variation');
    expect(openingsNamed(s.current())).toEqual(['Sicilian Defense', 'Sicilian Defense: Najdorf Variation']);
    expect(openingAt(s.current(), 'queued')).toBeNull();
  });

  it('a promise is open until paid or aged out; made again after that, it opens anew', () => {
    const s = createStoryStore('g1');
    const p = { key: 'break:c4', piece: 'p', square: 'c4', say: 'There is the break.' };
    s.note(8, [{ kind: 'promise', promise: p }]);
    s.note(10, [{ kind: 'promise', promise: { ...p, say: 'a second making, while the first is open' } }]);
    expect(promisesOpen(s.current(), 12, 16).map((q) => [q.ply, q.say])).toEqual([[8, 'There is the break.']]);
    expect(promisesOpen(s.current(), 30, 16), 'older than the window').toEqual([]);
    s.note(14, [{ kind: 'paid', key: 'break:c4' }]);
    expect(promisesOpen(s.current(), 15, 16)).toEqual([]);
    s.note(16, [{ kind: 'promise', promise: p }]);
    expect(promisesOpen(s.current(), 18, 16).map((q) => q.ply)).toEqual([16]);
  });

  it('the identity, the break, the model game and the turn read back', () => {
    const s = createStoryStore('g1');
    expect(identityHeard(s.current())).toBeNull();
    s.note(5, [{ kind: 'identity', claim: 'opening-identity:this-game' }]);
    s.note(7, [{ kind: 'opening-break', san: 'd4', square: 'd4' }]);
    s.note(13, [{ kind: 'model-game', citation: 'Carlsen–Caruana, 2018' }]);
    const thesis = { kind: 'turned' as const, ply: 31, label: '16. Bxf7+', swingPawns: 3, tactic: null, plan: null, chainRoot: null };
    s.note(31, [{ kind: 'turn', thesis }]);
    expect(identityHeard(s.current())).toBe('opening-identity:this-game');
    expect(openingBreak(s.current())).toEqual({ san: 'd4', square: 'd4', ply: 7 });
    expect(modelGameCited(s.current())).toBe(true);
    expect(storyTurn(s.current())).toEqual({ ply: 31, thesis });
  });

  it('the checkpoint carries the events and the character; an older checkpoint reads as the empty story', () => {
    const a = createStoryStore('g1');
    a.note(21, [{ kind: 'phase', edge: 'middlegame' }]);
    a.setPlans(21, { ...a.plans(), character: { current: 'tactical', pending: null } });
    const b = storyOf(a.serialize());
    expect(phaseCrossed(b, 'middlegame')).toBe(true);
    const c = createStoryStore('c');
    c.restore(a.serialize());
    expect(c.plans().character.current).toBe('tactical');
    const v1 = JSON.stringify({ ...JSON.parse(a.serialize()) as object, v: 1 });
    expect(storyOf(v1).events).toEqual([]);
    expect(storyOf(null).events).toEqual([]);
    // A new game forgets the character with the plans.
    c.newGame('c2');
    expect(c.plans().character).toEqual(EMPTY_CHARACTER_STATE);
  });
});
