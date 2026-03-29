import { Chess } from 'chess.js';
import type { MistakeClassification, MistakeGamePhase, MistakeNarration } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NarrationParams {
  classification: MistakeClassification;
  gamePhase: MistakeGamePhase;
  playerMoveSan: string;
  bestMoveSan: string;
  cpLoss: number;
  fen: string;
  moves: string; // space-separated UCI continuation
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cpToText(cp: number): string {
  const pawns = (cp / 100).toFixed(1);
  if (cp >= 300) return `about ${pawns} pawns — a serious swing`;
  if (cp >= 150) return `around ${pawns} pawns`;
  return `roughly ${pawns} pawns`;
}

function uciToSan(fen: string, uci: string): string {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const move = chess.move({ from, to, promotion });
    return move.san;
  } catch {
    return uci;
  }
}

// ─── Intro Templates ────────────────────────────────────────────────────────

const INTRO_TEMPLATES: Record<MistakeClassification, string[]> = {
  blunder: [
    'You played {playerMove} here, but that was a blunder costing {cpText}. The right move was {bestMove}.',
    '{playerMove} was a serious mistake — you lost {cpText}. Let\'s see why {bestMove} was the correct play.',
    'Uh oh — {playerMove} dropped {cpText}. {bestMove} was what you needed here.',
  ],
  mistake: [
    'You played {playerMove}, but {bestMove} was significantly better — that cost you {cpText}.',
    '{playerMove} wasn\'t the best here. {bestMove} keeps you in better shape, saving {cpText}.',
    'With {playerMove} you gave up {cpText}. {bestMove} was the stronger option.',
  ],
  inaccuracy: [
    '{playerMove} was okay, but {bestMove} was more precise. The difference is {cpText}.',
    'Slight slip with {playerMove}. {bestMove} would have been a touch better, about {cpText}.',
    'Not a bad move with {playerMove}, but {bestMove} was more accurate — {cpText} difference.',
  ],
  miss: [
    'Your opponent slipped here and you missed it! {bestMove} was the way to punish them.',
    'There was a chance to capitalize with {bestMove}, but you played {playerMove} instead.',
    '{playerMove} let your opponent off the hook. {bestMove} would have won {cpText}.',
  ],
};

const PHASE_CONTEXT: Record<MistakeGamePhase, string[]> = {
  opening: [
    'In the opening, piece development and center control are everything.',
    'Early in the game, every tempo counts. Developing with a threat is ideal.',
    'In the opening, look for moves that develop pieces while fighting for the center.',
  ],
  middlegame: [
    'In the middlegame, always scan for tactical shots before committing to a plan.',
    'Middlegame positions require checking for checks, captures, and threats on every move.',
    'In complex middlegame positions, look for forcing moves first.',
  ],
  endgame: [
    'In the endgame, king activity and passed pawns decide the game.',
    'Endgame technique requires precision — small advantages matter a lot more here.',
    'In endgames, calculate carefully. One wrong move can flip the result.',
  ],
};

// ─── Move Narrations ────────────────────────────────────────────────────────

const FIRST_MOVE_TEMPLATES = [
  'Good — {san} is the right move here.',
  'That\'s it! {san} is the key move.',
  'Correct, {san}. Now let\'s see what follows.',
  '{san} — exactly right.',
];

const CONTINUATION_TEMPLATES = [
  'Your opponent plays {opponentSan}. Now find the next best move.',
  'After {opponentSan}, what\'s the best continuation?',
  '{opponentSan} is the response. Keep the pressure up.',
];

const MID_MOVE_TEMPLATES = [
  'Nice, {san}. Keep going.',
  '{san} — well done. The position is improving.',
  'Good, {san}. You\'re on the right track.',
];

const FINAL_MOVE_TEMPLATES = [
  '{san} — and that completes the combination!',
  'And {san} finishes it off nicely.',
  '{san}! That\'s the whole idea.',
];

// ─── Outro Templates ────────────────────────────────────────────────────────

const OUTRO_TEMPLATES: Record<MistakeClassification, string[]> = {
  blunder: [
    'Blunders often come from moving too fast. Take an extra moment to check for threats before committing.',
    'The key lesson here is to always ask yourself: is my piece safe after this move?',
    'Before every move, scan for checks, captures, and threats. That habit prevents blunders.',
  ],
  mistake: [
    'Mistakes like this are part of learning. The pattern to remember here is to consider all forcing moves first.',
    'Next time in a position like this, look for moves that improve your position while creating threats.',
    'Good players minimize mistakes by checking their candidate moves systematically.',
  ],
  inaccuracy: [
    'Small inaccuracies add up over a game. Sharpening your move selection here will gain you rating points.',
    'The difference between good and great is catching these small improvements. Keep training your pattern recognition.',
    'Precision like this comes with practice. You\'re already on the right track by studying your mistakes.',
  ],
  miss: [
    'Spotting your opponent\'s mistakes is just as important as avoiding your own. Stay alert for opportunities.',
    'When your opponent makes an error, punish it immediately. Missed chances can be the difference in a game.',
    'Train your tactical eye to catch these moments. The more puzzles you solve, the sharper you\'ll get.',
  ],
};

// ─── Main Generator ─────────────────────────────────────────────────────────

export function generateMistakeNarration(params: NarrationParams): MistakeNarration {
  const { classification, gamePhase, playerMoveSan, bestMoveSan, cpLoss, fen, moves } = params;

  const cpText = cpToText(cpLoss);

  // Build intro
  const introTemplate = pick(INTRO_TEMPLATES[classification]);
  const phaseContext = pick(PHASE_CONTEXT[gamePhase]);
  const intro = introTemplate
    .replace(/\{playerMove\}/g, playerMoveSan)
    .replace(/\{bestMove\}/g, bestMoveSan)
    .replace(/\{cpText\}/g, cpText)
    + ' ' + phaseContext;

  // Build per-move narrations
  const moveNarrations = buildMoveNarrations(fen, moves);

  // Build outro
  const outro = pick(OUTRO_TEMPLATES[classification]);

  return { intro, moveNarrations, outro };
}

function buildMoveNarrations(fen: string, movesUci: string): string[] {
  const uciMoves = movesUci.trim().split(/\s+/).filter(Boolean);
  if (uciMoves.length === 0) return [];

  const narrations: string[] = [];
  const chess = new Chess(fen);
  const playerMoveCount = Math.ceil(uciMoves.length / 2);

  for (let i = 0; i < uciMoves.length; i++) {
    const san = uciToSan(chess.fen(), uciMoves[i]);
    const isPlayerMove = i % 2 === 0;

    try {
      chess.move({ from: uciMoves[i].slice(0, 2), to: uciMoves[i].slice(2, 4), promotion: uciMoves[i].length > 4 ? uciMoves[i][4] : undefined });
    } catch {
      break;
    }

    if (isPlayerMove) {
      const playerIdx = Math.floor(i / 2);
      let template: string;
      if (playerIdx === 0) {
        template = pick(FIRST_MOVE_TEMPLATES);
      } else if (playerIdx === playerMoveCount - 1) {
        template = pick(FINAL_MOVE_TEMPLATES);
      } else {
        template = pick(MID_MOVE_TEMPLATES);
      }
      narrations.push(template.replace(/\{san\}/g, san));
    } else {
      // Opponent move — attach narration to the previous player move if exists
      const continuationText = pick(CONTINUATION_TEMPLATES).replace(/\{opponentSan\}/g, san);
      if (narrations.length > 0) {
        narrations[narrations.length - 1] += ' ' + continuationText;
      }
    }
  }

  return narrations;
}
