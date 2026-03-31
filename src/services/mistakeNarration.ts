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
  opponentName?: string | null;
  gameDate?: string | null;
  openingName?: string | null;
  evalBefore?: number | null; // from player's perspective in pawns (positive = player ahead)
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

function timeAgoText(dateStr: string): string {
  const gameDate = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - gameDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return 'last week';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return 'last month';
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return 'over a year ago';
}

function advantageText(evalBefore: number): string {
  if (evalBefore > 1.5) return 'You had a strong advantage';
  if (evalBefore > 0.5) return 'You were slightly better';
  if (evalBefore > -0.5) return 'The position was roughly equal';
  if (evalBefore > -1.5) return 'You were slightly worse';
  return 'You were already in trouble';
}

function buildContextSentence(params: NarrationParams): string {
  const parts: string[] = [];

  if (params.opponentName && params.gameDate) {
    parts.push(`In your game vs ${params.opponentName} ${timeAgoText(params.gameDate)}`);
  } else if (params.opponentName) {
    parts.push(`In your game vs ${params.opponentName}`);
  } else if (params.gameDate) {
    parts.push(`In your game from ${timeAgoText(params.gameDate)}`);
  }

  if (params.openingName) {
    parts.push(`playing the ${params.openingName}`);
  }

  if (parts.length === 0) return '';

  let sentence = parts[0];
  if (parts.length > 1) {
    sentence += ', ' + parts[1];
  }

  if (params.evalBefore !== null && params.evalBefore !== undefined) {
    sentence += ': ' + advantageText(params.evalBefore).toLowerCase() + '.';
  } else {
    sentence += '.';
  }

  return sentence;
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

// ─── Position-Aware Move Analysis ──────────────────────────────────────────

const CENTER_SQUARES = new Set(['d4', 'd5', 'e4', 'e5']);
const EXTENDED_CENTER = new Set(['c3', 'c4', 'c5', 'c6', 'd3', 'd4', 'd5', 'd6', 'e3', 'e4', 'e5', 'e6', 'f3', 'f4', 'f5', 'f6']);
const DEVELOPMENT_RANK_WHITE = new Set(['1']); // pieces starting on rank 1
const DEVELOPMENT_RANK_BLACK = new Set(['8']);

interface MoveIdea {
  isCapture: boolean;
  isCheck: boolean;
  isCastle: boolean;
  isPromotion: boolean;
  movesToCenter: boolean;
  developsPiece: boolean;
  createsPin: boolean;
  attacksKing: boolean;
  pieceMoved: string; // 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'
  conceptHints: string[];
}

function analyzeMoveIdea(fen: string, bestMoveSan: string, gamePhase: MistakeGamePhase): MoveIdea {
  const idea: MoveIdea = {
    isCapture: false,
    isCheck: false,
    isCastle: false,
    isPromotion: false,
    movesToCenter: false,
    developsPiece: false,
    createsPin: false,
    attacksKing: false,
    pieceMoved: 'pawn',
    conceptHints: [],
  };

  try {
    const chess = new Chess(fen);
    const turnColor = chess.turn() === 'w' ? 'white' : 'black';
    const move = chess.move(bestMoveSan);

    idea.isCapture = move.captured !== undefined;
    idea.isCheck = chess.isCheck();
    idea.isCastle = move.san === 'O-O' || move.san === 'O-O-O';
    idea.isPromotion = move.promotion !== undefined;
    idea.movesToCenter = CENTER_SQUARES.has(move.to) || EXTENDED_CENTER.has(move.to);

    // Determine piece type
    const pieceMap: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
    idea.pieceMoved = pieceMap[move.piece] ?? 'piece';

    // Check if this develops a piece from its starting rank
    const devRank = turnColor === 'white' ? DEVELOPMENT_RANK_WHITE : DEVELOPMENT_RANK_BLACK;
    if (devRank.has(move.from[1]) && move.piece !== 'k' && move.piece !== 'p') {
      idea.developsPiece = true;
    }

    // Build conceptual hints based on what the move accomplishes
    if (idea.isCastle) {
      idea.conceptHints.push('Think about king safety — getting your king tucked away.');
      idea.conceptHints.push('Consider castling to connect your rooks and protect your king.');
    }
    if (idea.isCheck && idea.isCapture) {
      idea.conceptHints.push('Look for a forcing move that wins material.');
      idea.conceptHints.push('There\'s a way to capture with check here.');
    } else if (idea.isCheck) {
      idea.conceptHints.push('Look for a way to put the king under pressure.');
      idea.conceptHints.push('There\'s a forcing check available that improves your position.');
    } else if (idea.isCapture) {
      idea.conceptHints.push('There\'s an unprotected piece you can take advantage of.');
      idea.conceptHints.push('Look at what your opponent left hanging.');
    }
    if (idea.developsPiece && gamePhase === 'opening') {
      idea.conceptHints.push(`Think about getting your ${idea.pieceMoved} into the game with tempo.`);
      idea.conceptHints.push('Focus on developing a piece to an active square.');
    }
    if (idea.movesToCenter && idea.pieceMoved === 'pawn') {
      idea.conceptHints.push('Consider reinforcing your control of the center.');
      idea.conceptHints.push('There\'s a pawn move that stakes a claim in the center.');
    } else if (idea.movesToCenter) {
      idea.conceptHints.push(`Think about placing your ${idea.pieceMoved} on a more active central square.`);
    }
    if (idea.isPromotion) {
      idea.conceptHints.push('One of your pawns is ready to become something much stronger.');
    }

    // If no specific hints were generated, add general strategic advice
    if (idea.conceptHints.length === 0) {
      if (gamePhase === 'opening') {
        idea.conceptHints.push('Think about what move improves your piece activity the most.');
        idea.conceptHints.push('Consider which piece isn\'t doing much and how to activate it.');
      } else if (gamePhase === 'middlegame') {
        idea.conceptHints.push('Look for the move that creates the most problems for your opponent.');
        idea.conceptHints.push('Think about improving your worst-placed piece.');
      } else {
        idea.conceptHints.push('In this endgame, think about king activity and pawn advancement.');
        idea.conceptHints.push('Consider which side of the board holds the key to this position.');
      }
    }
  } catch {
    idea.conceptHints.push('Take a closer look at the position — there\'s a stronger idea here.');
  }

  return idea;
}

/** Build a natural-sounding description of what the best move accomplishes */
function describeMoveIdea(idea: MoveIdea, bestMoveSan: string): string {
  const parts: string[] = [];

  if (idea.isCastle) {
    return `${bestMoveSan} tucks the king to safety and connects the rooks.`;
  }
  if (idea.isCheck && idea.isCapture) {
    return `${bestMoveSan} captures with check — winning material while keeping the initiative.`;
  }
  if (idea.isPromotion) {
    return `${bestMoveSan} promotes the pawn, creating a decisive advantage.`;
  }
  if (idea.isCheck) {
    parts.push(`${bestMoveSan} delivers check`);
  } else if (idea.isCapture) {
    parts.push(`${bestMoveSan} picks up material`);
  } else if (idea.developsPiece && idea.movesToCenter) {
    return `${bestMoveSan} develops the ${idea.pieceMoved} to an active central square.`;
  } else if (idea.developsPiece) {
    return `${bestMoveSan} gets the ${idea.pieceMoved} into the game.`;
  } else if (idea.movesToCenter) {
    return `${bestMoveSan} strengthens your grip on the center.`;
  }

  if (parts.length > 0) {
    return parts[0] + '.';
  }

  return `${bestMoveSan} improves your position.`;
}

// ─── Intro Templates ────────────────────────────────────────────────────────

const INTRO_TEMPLATES: Record<MistakeClassification, string[]> = {
  blunder: [
    'You played {playerMove} here, but that was a blunder costing {cpText}. {ideaText}',
    '{playerMove} was a serious mistake — you lost {cpText}. {ideaText}',
    'Uh oh — {playerMove} dropped {cpText}. {ideaText}',
  ],
  mistake: [
    'You played {playerMove}, but there was something significantly better — that cost {cpText}. {ideaText}',
    '{playerMove} wasn\'t the best here, costing {cpText}. {ideaText}',
    'With {playerMove} you gave up {cpText}. {ideaText}',
  ],
  inaccuracy: [
    '{playerMove} was okay, but there\'s a more precise option. {ideaText}',
    'Slight slip with {playerMove}. {ideaText}',
    'Not a bad move with {playerMove}, but the engine found something sharper. {ideaText}',
  ],
  miss: [
    'Your opponent slipped here and you missed it! {ideaText}',
    'There was a chance to capitalize here, but you played {playerMove} instead. {ideaText}',
    '{playerMove} let your opponent off the hook. {ideaText}',
  ],
};

const PHASE_CONTEXT: Record<MistakeGamePhase, string[]> = {
  opening: [
    'In the opening, piece development and center control are everything.',
    'Early in the game, every tempo counts.',
    'In the opening, look for moves that develop pieces while fighting for the center.',
  ],
  middlegame: [
    'In the middlegame, always scan for tactical shots before committing to a plan.',
    'Middlegame positions require checking for checks, captures, and threats on every move.',
    'In complex middlegame positions, look for forcing moves first.',
  ],
  endgame: [
    'In the endgame, king activity and passed pawns decide the game.',
    'Endgame technique requires precision — small advantages matter more here.',
    'In endgames, calculate carefully. One wrong move can flip the result.',
  ],
};

// ─── Move Narrations ────────────────────────────────────────────────────────

const FIRST_MOVE_TEMPLATES = [
  'That\'s it! {san}. {ideaText}',
  'Correct, {san}. {ideaText}',
  '{san} — exactly right. {ideaText}',
  'Nice find! {san}. {ideaText}',
];

const CONTINUATION_TEMPLATES = [
  'Your opponent responds with {opponentSan}. Now find the follow-up.',
  'After {opponentSan}, what keeps the pressure on?',
  '{opponentSan}. Now stay sharp — what\'s next?',
];

const MID_MOVE_TEMPLATES = [
  '{san} — good continuation.',
  '{san}. The position keeps getting better.',
  'Well played, {san}.',
];

const FINAL_MOVE_TEMPLATES = [
  '{san} — and that wraps it up!',
  'And {san} finishes it off.',
  '{san}! That\'s the whole idea.',
  'Perfect, {san}. You\'ve got it.',
];

// ─── Outro Templates (position-aware) ──────────────────────────────────────

function buildOutro(params: NarrationParams, idea: MoveIdea): string {
  const { classification, gamePhase } = params;

  // Build a position-specific outro based on what the best move was about
  const outroVariants: string[] = [];

  if (idea.isCastle) {
    outroVariants.push('Remember — king safety is never optional. Castle early when you can.');
    outroVariants.push('Getting your king safe early frees you to attack without worrying about back-rank issues.');
  }
  if (idea.isCapture) {
    outroVariants.push('Always check if something is undefended before committing to your plan.');
    outroVariants.push('Hanging pieces are free points. Make it a habit to scan for captures first.');
  }
  if (idea.isCheck) {
    outroVariants.push('Checks are forcing — they limit your opponent\'s options. Always consider them.');
    outroVariants.push('When you have a forcing check that also improves your position, it\'s usually the right call.');
  }
  if (idea.developsPiece) {
    outroVariants.push('Developing with purpose is the hallmark of strong opening play. Get those pieces working.');
    outroVariants.push('Every move in the opening should either develop a piece, control the center, or prepare castling.');
  }
  if (idea.movesToCenter && idea.pieceMoved === 'pawn') {
    outroVariants.push('Central pawns control key squares. Reinforcing the center is almost always a solid plan.');
  }

  // Phase-specific fallbacks
  if (outroVariants.length === 0) {
    if (gamePhase === 'opening') {
      outroVariants.push('Opening mistakes compound fast — get your pieces out, control the center, and castle.');
      outroVariants.push('The opening is about getting a playable middlegame. Every tempo matters.');
      outroVariants.push('Solid opening play comes from following principles: develop, control, castle.');
    } else if (gamePhase === 'middlegame') {
      outroVariants.push('In the middlegame, the right move often creates multiple threats at once.');
      outroVariants.push('When you\'re unsure, ask yourself: what\'s my opponent\'s idea, and how can I improve my worst piece?');
      outroVariants.push('Tactical awareness in the middlegame comes from pattern recognition. You\'re building that now.');
    } else {
      outroVariants.push('Endgames reward patience and precision. Every pawn move is permanent.');
      outroVariants.push('In endgames, activate your king aggressively — it\'s a fighting piece now.');
      outroVariants.push('Endgame technique separates club players from experts. This kind of study is exactly how you improve.');
    }
  }

  // Add a classification-flavored closer
  const closerVariants: Record<MistakeClassification, string[]> = {
    blunder: [
      'Next time, take one extra second to double-check.',
      'These moments are painful but they teach the most lasting lessons.',
    ],
    mistake: [
      'Catching these patterns gets easier with practice.',
      'The more you train this, the more automatic it becomes.',
    ],
    inaccuracy: [
      'These small edges add up to wins over a full game.',
      'Refining your accuracy here is what separates levels.',
    ],
    miss: [
      'Stay hungry for your opponent\'s errors — they happen more often than you think.',
      'The sharper your tactical eye, the more points you\'ll collect.',
    ],
  };

  return pick(outroVariants) + ' ' + pick(closerVariants[classification]);
}

// ─── Main Generator ─────────────────────────────────────────────────────────

export function generateMistakeNarration(params: NarrationParams): MistakeNarration {
  const { classification, gamePhase, playerMoveSan, bestMoveSan, cpLoss, fen, moves } = params;

  const cpText = cpToText(cpLoss);
  const idea = analyzeMoveIdea(fen, bestMoveSan, gamePhase);
  const ideaText = describeMoveIdea(idea, bestMoveSan);

  // Build context sentence (opponent, time ago, opening, advantage)
  const contextSentence = buildContextSentence(params);

  // Build intro — now includes the idea description instead of just naming the best move
  const introTemplate = pick(INTRO_TEMPLATES[classification]);
  const phaseContext = pick(PHASE_CONTEXT[gamePhase]);
  const mistakeExplanation = introTemplate
    .replace(/\{playerMove\}/g, playerMoveSan)
    .replace(/\{bestMove\}/g, bestMoveSan)
    .replace(/\{cpText\}/g, cpText)
    .replace(/\{ideaText\}/g, ideaText);
  const intro = contextSentence
    ? contextSentence + ' ' + mistakeExplanation + ' ' + phaseContext
    : mistakeExplanation + ' ' + phaseContext;

  // Build per-move narrations with idea text on first move
  const moveNarrations = buildMoveNarrations(fen, moves, ideaText);

  // Build position-aware outro
  const outro = buildOutro(params, idea);

  // Build conceptual hint for when the player makes a wrong attempt
  const conceptHint = pick(idea.conceptHints);

  return { intro, moveNarrations, outro, conceptHint };
}

function buildMoveNarrations(fen: string, movesUci: string, firstMoveIdea: string): string[] {
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
        template = pick(FIRST_MOVE_TEMPLATES).replace(/\{ideaText\}/g, firstMoveIdea);
      } else if (playerIdx === playerMoveCount - 1) {
        template = pick(FINAL_MOVE_TEMPLATES);
      } else {
        template = pick(MID_MOVE_TEMPLATES);
      }
      narrations.push(template.replace(/\{san\}/g, san));
    } else {
      const continuationText = pick(CONTINUATION_TEMPLATES).replace(/\{opponentSan\}/g, san);
      if (narrations.length > 0) {
        narrations[narrations.length - 1] += ' ' + continuationText;
      }
    }
  }

  return narrations;
}
