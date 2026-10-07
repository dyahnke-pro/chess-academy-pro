/**
 * WO-MATERIAL-01 — every spoken material read is SETTLED. Each case is a board
 * mid-recapture that the old private counter called a piece won.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewMoveBriefing } from './reviewMoveBriefing';

const QGD_TO_BG5 = 'd4 Nf6 c4 e6 Nc3 d5 Bg5 Be7 Nf3 O-O e3 h6';
const fenAfter = (sans: string): string => {
  const c = new Chess();
  for (const m of sans.split(' ')) c.move(m);
  return c.fen();
};

import { NO_PREV_CAPTURE } from './pvPlayback';

describe('material sites read the settled count', () => {
  it('review briefing: Bxf6 with …Bxf6 coming is not "you\'re up a piece"', () => {
    const text = buildReviewMoveBriefing({
      fenBefore: fenAfter(QGD_TO_BG5), san: 'Bxf6', prev: NO_PREV_CAPTURE, moverIsStudent: true,
      studentColorWB: 'w', evalBeforeWhiteCp: 20, evalAfterWhiteCp: 170,
    }) ?? '';
    expect(text).not.toMatch(/up a piece/);
  });
});

import { assemblePositionalAnswer, assembleTradeAnswer, assembleEndgameOutlookAnswer } from './groundedAnswer';
import { lastMoveFromHistory } from './material';

describe('chat material reads are settled', () => {
  const hist = `${QGD_TO_BG5} Bxf6`.split(' ');
  const fen = fenAfter(hist.join(' '));
  const last = lastMoveFromHistory(hist, fen);

  it('"what\'s the material?" mid-recapture names the settled count', () => {
    const a = assemblePositionalAnswer(fen, 'black', 'material', 'what is the material', null, last);
    expect(a?.facts).toMatch(/Material is even once the trade on f6 is finished/);
    expect(a?.facts).not.toMatch(/You're down 3/);
  });

  it('trade answer mid-recapture is neither ahead nor behind', () => {
    const a = assembleTradeAnswer({ fen, piece: 'any', studentColor: 'black', trade: null, bestEvalCp: null, tradeEvalCp: null, tradeMateIn: null, bestSan: null, settled: null, lastMove: last });
    expect(a?.facts).not.toMatch(/behind in material/);
  });

  it('endgame outlook mid-recapture is not "down a piece"', () => {
    const a = assembleEndgameOutlookAnswer(fen, 'black', last);
    expect(a?.facts ?? '').not.toMatch(/you're down/i);
  });

  it('a history that does not end on the board gives no last move', () => {
    expect(lastMoveFromHistory(hist, new Chess().fen())).toBeNull();
  });
});

import { detectBehaviors } from './danyaBehaviors';

describe('Learn behaviour lane reads the settled count', () => {
  it('Bxf6 with the recapture pending is not "You\'re down material"', () => {
    // Student Black; White's Bxf6 took a knight and Black retakes next.
    const hist = `${QGD_TO_BG5} Bxf6`.split(' ');
    const fen = fenAfter(hist.join(' '));
    const hits = detectBehaviors({ fen, studentColor: 'black', lastMove: lastMoveFromHistory(hist, fen) });
    expect(hits.map((h) => h.fact).join(' ')).not.toMatch(/down material/);
  });
});

import { assessPositionalEdge } from './reviewPositionalAssessment';

describe('who\'s-better reasons read the settled count', () => {
  it('after Bxf6 (recapture pending) the white student is not "up a piece"', () => {
    const fen = fenAfter(`${QGD_TO_BG5} Bxf6`);
    const a = assessPositionalEdge(fen, 'w', 180, { to: 'f6', captured: 'n' });
    expect(a.reasons.join(' ')).not.toMatch(/up a piece|up a knight/);
  });
});
