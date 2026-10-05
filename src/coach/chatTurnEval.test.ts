import { describe, it, expect } from 'vitest';
import { scoreChatTurnEval, CHAT_TURN_SERVE_BAR, type ChatTurnEvalCase } from './chatTurnEval';
import { CHAT_TURN_EVAL_CASES } from './chatTurnEval.corpus';
import { ALL_CHAT_KINDS } from './chatTurn';

const c = (text: string, expect: ChatTurnEvalCase['expect'], probe: ChatTurnEvalCase['probe'] = 'plain'): ChatTurnEvalCase => ({ text, expect, probe });

describe('scoreChatTurnEval', () => {
  it('counts a reading right when it is any accepted kind, and a failed read as wrong', () => {
    const s = scoreChatTurnEval([
      { case: c('best move?', ['best-move', 'what-should-i-play']), kind: 'what-should-i-play' },
      { case: c('whose turn', ['whose-turn']), kind: 'last-move' },
      { case: c('¿quién gana?', ['position-assessment'], 'language'), kind: null },
    ]);
    expect(s.correct).toBe(1);
    expect(s.misses.map((m) => m.text)).toEqual(['whose turn', '¿quién gana?']);
    expect(s.byProbe.language).toEqual({ total: 1, correct: 0 });
    expect(s.passes).toBe(false);
  });

  it('passes only at the bar, and never on an empty run', () => {
    const right = Array.from({ length: 19 }, () => ({ case: c('x', ['plan']), kind: 'plan' as const }));
    expect(scoreChatTurnEval([...right, { case: c('y', ['plan']), kind: 'tactics' }]).passes).toBe(0.95 >= CHAT_TURN_SERVE_BAR);
    expect(scoreChatTurnEval([]).passes).toBe(false);
  });
});

describe('the held-out corpus', () => {
  it('only expects kinds that exist', () => {
    for (const k of CHAT_TURN_EVAL_CASES.flatMap((x) => x.expect)) expect(ALL_CHAT_KINDS).toContain(k);
  });
  it('has no duplicate phrasing', () => {
    const texts = CHAT_TURN_EVAL_CASES.map((x) => x.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });
});
