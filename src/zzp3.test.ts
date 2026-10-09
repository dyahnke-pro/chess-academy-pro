import { it } from 'vitest';
import { Chess } from 'chess.js';
import { buildQuestionGrounding } from './coach/questionIntents';
import { readTurnInCode } from './coach/chatTurnCodeReader';
import { illegalNamedMove } from './services/whyNotLegal';
it('p', () => {
  const c = new Chess(); for (const m of ['e4','e5','Nf3','Nc6','Bc4','Bc5']) c.move(m);
  const fen = c.fen();
  for (const q of ['who controls the e5 square?', 'Is that bishop attacks e7?', 'does my bishop attack f7?', 'who controls d5']) {
    const g = buildQuestionGrounding(q, { fen, moveHistory: [], studentColor: 'white' }, 'coach-teach');
    const on = Object.entries(g).filter(([k, v]) => v === true || (typeof v === 'string' && !['currentFen','studentColor','surface'].includes(k))).map(([k, v]) => `${k}=${v}`);
    console.log('P', q, '| code:', JSON.stringify(readTurnInCode(q, { fen, history: [], studentColor: 'white' } as never)), '| illegal:', illegalNamedMove(q, fen, 'white', []), '|', on.join(','));
  }
});
