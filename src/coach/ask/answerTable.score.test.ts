import { describe, expect, it } from 'vitest';
import { REAL_QUESTIONS } from './realQuestions.test.fixture';
import { KIND_LANES, laneForKind, steerForKind } from './answerTable';
import { readQuestion, type AskMoment } from './readQuestion';
import { fastPathLane, firingLanes } from '../chatTurn';
import { isMoveCommand } from '../../services/coachSessionRouter';
import { fuzzyMatchOpening } from '../../services/openingFuzzyMatcher';

const START = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const BOARD = new Set(['play', 'learn', 'puzzle', 'review', 'opening']);
const nameOpening = (t: string) => {
  const c = fuzzyMatchOpening(t).candidates[0];
  return c ? { name: c.canonicalName, score: c.score } : null;
};
const NON_LATIN = /[฀-๿]/;

describe('answer table against the 258 (shadow)', () => {
  it('measures wrong-topic lanes today vs with the table', () => {
    let todayOnTopic = 0, tableOnTopic = 0, askBack = 0, n = 0, steerOn = 0, steerAsk = 0;
    const srows: string[] = [];
    const rows: string[] = [];
    for (const r of REAL_QUESTIONS) {
      if (NON_LATIN.test(r.q)) continue;
      n += 1;
      const moment: AskMoment = { screen: r.screen as AskMoment['screen'], hasBoard: BOARD.has(r.screen), lastCoachLine: r.screen === 'home' ? undefined : 'x' };
      const opts = { fen: moment.hasBoard ? START : undefined, routedCommand: isMoveCommand(r.q) };
      const today = fastPathLane(r.q, opts);
      const truth = KIND_LANES[r.kind];
      if (truth.has(today)) todayOnTopic += 1;
      const reading = readQuestion(r.q, moment, { nameOpening });
      const kind = reading.kind;
      const st = steerForKind(reading, today, firingLanes(r.q, opts), moment);
      const steered = st.action === 'keep' ? today : st.action === 'rewrite' ? fastPathLane(st.ask, opts) : null;
      if (steered === null) steerAsk += 1; else if (truth.has(steered)) steerOn += 1;
      if (steered !== today) srows.push(`${today.padEnd(20)} → ${String(steered).padEnd(20)} (${r.kind}) ${r.q.slice(0, 60)}`);
      const v = laneForKind(kind, today, firingLanes(r.q, opts));
      if (v.lane === null) askBack += 1;
      else if (truth.has(v.lane)) tableOnTopic += 1;
      if (v.lane !== today) rows.push(`${today.padEnd(20)} → ${String(v.lane).padEnd(20)} (${r.kind}) ${r.q.slice(0, 60)}`);
    }
    console.log(`\nON-TOPIC LANE: today ${todayOnTopic}/${n}, with table ${tableOnTopic}/${n}, ask-back ${askBack}`);
    console.log(`STEERED: on-topic ${steerOn}/${n}, ask-back ${steerAsk}, wrong ${n - steerOn - steerAsk}\n` + srows.join('\n'));
    expect(n).toBeGreaterThan(0);
  }, 60_000);
});
