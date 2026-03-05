import type { CoachPersonality, MoveClassification } from '../types';

type Scenario =
  | 'move_commentary'
  | 'hint_level1'
  | 'hint_level2'
  | 'hint_level3'
  | 'encouragement'
  | 'post_game_win'
  | 'post_game_loss'
  | 'post_game_draw'
  | 'chat_greeting'
  | 'chat_fallback'
  | 'game_opening'
  | 'game_thinking'
  | 'takeback_allowed'
  | 'takeback_refused'
  | 'takeback_reluctant';

type Phase = 'opening' | 'middlegame' | 'endgame';

interface TemplateVars {
  bestMove?: string;
  playerMove?: string;
  evalDelta?: string;
  phase?: Phase;
  playerName?: string;
  opening?: string;
  rating?: number;
}

// Template interpolation
function interpolate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{bestMove\}/g, vars.bestMove ?? '??')
    .replace(/\{playerMove\}/g, vars.playerMove ?? '??')
    .replace(/\{evalDelta\}/g, vars.evalDelta ?? '0')
    .replace(/\{phase\}/g, vars.phase ?? 'middlegame')
    .replace(/\{playerName\}/g, vars.playerName ?? 'friend')
    .replace(/\{opening\}/g, vars.opening ?? 'this opening')
    .replace(/\{rating\}/g, String(vars.rating ?? 1200));
}

// ─── Move Commentary Templates by Classification ────────────────────────────

const MOVE_COMMENTARY: Record<CoachPersonality, Record<MoveClassification, string[]>> = {
  danya: {
    brilliant: [
      "Wow, {playerMove}! That's a brilliant move — you found something really special there!",
      "Outstanding! {playerMove} is the kind of move that wins games. You should be proud of that calculation.",
    ],
    great: [
      "That's a really strong move! {playerMove} keeps the pressure on nicely.",
      "Nice one! {playerMove} is exactly the kind of move we want to see.",
    ],
    good: [
      "Solid move with {playerMove}. You're developing well here.",
      "{playerMove} is a good practical choice. Let's keep the momentum going.",
    ],
    book: [
      "Good theory! {playerMove} is the main line here.",
      "You know your stuff — {playerMove} follows the main theoretical path.",
    ],
    inaccuracy: [
      "{playerMove} is okay, but {bestMove} would have been a bit more precise. The difference is about {evalDelta} — not a big deal, but worth noticing.",
      "Slight slip with {playerMove}. {bestMove} was a touch better here, keeping more control of the position.",
    ],
    mistake: [
      "Ooh, {playerMove} lets your opponent back in. {bestMove} was the move — it keeps our advantage intact. Don't worry, let's refocus.",
      "{playerMove} is a mistake, unfortunately. {bestMove} was much stronger here. But we learn from these — what matters is you understand why.",
    ],
    blunder: [
      "Uh oh — {playerMove} is a serious mistake. {bestMove} was needed here. Let's figure out what went wrong so we don't repeat it.",
      "That hurts — {playerMove} throws away our position. {bestMove} was critical. Take a breath, and let's learn from this moment.",
    ],
  },
  kasparov: {
    brilliant: [
      "{playerMove}! Now THAT is an attack. Brilliant.",
      "Exceptional. {playerMove} shows real fighting spirit.",
    ],
    great: [
      "{playerMove}. Strong. Keep attacking.",
      "Good. {playerMove}. Don't let up now.",
    ],
    good: [
      "{playerMove}. Acceptable. Find the follow-up.",
      "{playerMove}. Fine. But can you find something sharper?",
    ],
    book: [
      "{playerMove}. You know the theory. Good.",
      "Theory. {playerMove}. Now show me you understand WHY.",
    ],
    inaccuracy: [
      "{playerMove}? No. {bestMove} was more aggressive. You hesitated.",
      "Imprecise. {playerMove} gives away tempo. {bestMove}. Always {bestMove}.",
    ],
    mistake: [
      "{playerMove}?! What was that? {bestMove} was obvious. Attack, don't retreat!",
      "Unacceptable. {playerMove} loses the initiative. {bestMove}! Think harder.",
    ],
    blunder: [
      "{playerMove}?? You just threw away the game. {bestMove} was right there. Focus!",
      "Disastrous. {playerMove}. The position demanded {bestMove}. You weren't at war.",
    ],
  },
  fischer: {
    brilliant: [
      "{playerMove}. Precisely calculated. That's the correct move.",
      "{playerMove}. Perfect. That's the only move that works here.",
    ],
    great: [
      "{playerMove}. Accurate. The evaluation confirms it.",
      "{playerMove}. Correct technique.",
    ],
    good: [
      "{playerMove}. Adequate. {bestMove} was marginally superior.",
      "{playerMove}. Acceptable, though imprecise by {evalDelta}.",
    ],
    book: [
      "{playerMove}. Standard theory. You should know this cold.",
      "{playerMove}. Book move. As expected.",
    ],
    inaccuracy: [
      "{playerMove} is inaccurate. {bestMove} was better by {evalDelta}. Study this pattern.",
      "Imprecise. {playerMove} instead of {bestMove}. The difference: {evalDelta}. Note it.",
    ],
    mistake: [
      "{playerMove} is a mistake. {bestMove} was required. You didn't calculate deeply enough.",
      "Error. {playerMove} loses {evalDelta}. The correct continuation was {bestMove}. Unacceptable.",
    ],
    blunder: [
      "{playerMove} is a blunder. {bestMove} was forced. You must know this. Study it until you dream it.",
      "Catastrophic: {playerMove}. The position required {bestMove}. There's no excuse for missing this.",
    ],
  },
};

// ─── Scenario Templates ─────────────────────────────────────────────────────

const SCENARIO_TEMPLATES: Record<CoachPersonality, Record<Scenario, string[]>> = {
  danya: {
    move_commentary: [
      "Interesting position! Let's think about what's going on here in the {phase}.",
    ],
    hint_level1: [
      "Think about piece activity — which of your pieces isn't doing much right now?",
      "Look at the pawn structure. Is there a weakness you can target?",
      "Consider your king safety and your opponent's. Any opportunities?",
    ],
    hint_level2: [
      "Your knight has some interesting options. Look at where it could go.",
      "There's a tactical idea involving the {phase} position. Look at checks and captures.",
      "Focus on the center. There's a way to improve your position significantly.",
    ],
    hint_level3: [
      "The best move here is {bestMove}. Here's why it works — it improves your position by {evalDelta}.",
      "{bestMove} is the key move. It addresses the main issue in this position.",
    ],
    encouragement: [
      "You're doing really well! Your understanding is growing with every game.",
      "Keep it up! I can see real improvement in how you're thinking about positions.",
      "Great effort today. Remember, every master was once a beginner.",
    ],
    post_game_win: [
      "Congratulations on the win! Let's look at the key moments that decided this game.",
      "Well played! You earned that victory. Let me highlight what you did well.",
    ],
    post_game_loss: [
      "Tough game, but there's a lot to learn here. Let's focus on the turning points.",
      "Don't let this one get you down. Every loss is a lesson. Let's find the key moments.",
    ],
    post_game_draw: [
      "A draw! Let's see if there were any missed opportunities for both sides.",
      "Solid result. Let's look at whether there were winning chances we could have found.",
    ],
    chat_greeting: [
      "Hey {playerName}! Good to see you. Ready to work on some chess today?",
      "Welcome back, {playerName}! What would you like to work on?",
      "Hi there! I've been looking at your recent games. Want to dive in?",
    ],
    chat_fallback: [
      "That's an interesting question! While I'm not sure about that specifically, I can definitely help with chess. Want to look at a position or talk strategy?",
      "I'm not quite sure what you mean, but I'm here to help with your chess! Want to practice something?",
    ],
    game_opening: [
      "Alright, let's play! I'll try to give you a good game. Remember to develop your pieces and control the center!",
      "Game on! Let's see what you've got. I'll be commenting as we go — it's the best way to learn!",
    ],
    game_thinking: [
      "Let me think about this position...",
      "Hmm, interesting position. Let me find a good move...",
    ],
    takeback_allowed: [
      "Sure, no problem! Let's go back and try again. Sometimes it helps to reconsider.",
      "Of course! Take it back. Let's think through this position together.",
    ],
    takeback_refused: [
      "I think it's better to play on and learn from it. We'll review after the game!",
    ],
    takeback_reluctant: [
      "Okay, I'll let you take that one back. But try to commit to your moves — it builds calculation skills!",
    ],
  },
  kasparov: {
    move_commentary: [
      "The {phase}. This is where games are won and lost.",
    ],
    hint_level1: [
      "Attack. Find the weakness in your opponent's position.",
      "Look for initiative. Who controls the board?",
      "Think about forcing moves. Checks, captures, threats.",
    ],
    hint_level2: [
      "There's a tactical shot here. Look at forcing sequences.",
      "Your pieces aren't coordinated. Fix that, then attack.",
      "The opponent's king is vulnerable. Find the combination.",
    ],
    hint_level3: [
      "{bestMove}. That's the move. See it? Now calculate the follow-up.",
      "The answer is {bestMove}. You should have found it faster.",
    ],
    encouragement: [
      "Better. But don't get comfortable. There's always another level.",
      "You showed some fight today. Build on it.",
    ],
    post_game_win: [
      "You won. Good. Now tell me — where could you have won FASTER?",
      "Victory. But was it clean? Let's find the moments you should have been sharper.",
    ],
    post_game_loss: [
      "You lost because you stopped fighting. Let's find exactly where.",
      "Defeat. Learn from it or it means nothing. Show me where you went passive.",
    ],
    post_game_draw: [
      "A draw? Did you play for the win? Let's see where the fight was.",
      "Drawing is acceptable only when you've earned it. Did you?",
    ],
    chat_greeting: [
      "Ready to work? Let's not waste time.",
      "You're here. Good. Let's make every minute count.",
    ],
    chat_fallback: [
      "Focus. We're here for chess. What do you want to work on?",
      "Stay on target. Ask me about positions, openings, or strategy.",
    ],
    game_opening: [
      "Let's play. Don't hold back — I won't.",
      "Time to fight. Show me what you've got. No mercy.",
    ],
    game_thinking: [
      "Calculating...",
      "Interesting. Let me find the strongest reply...",
    ],
    takeback_allowed: [
      "Fine. Once. Don't ask again.",
    ],
    takeback_refused: [
      "No. Play the position. Learn from your mistakes in real time.",
      "Takebacks are weakness. Play on.",
    ],
    takeback_reluctant: [
      "I'll allow it this once. But a real competitor doesn't take back moves.",
    ],
  },
  fischer: {
    move_commentary: [
      "The position requires precise calculation in this {phase}.",
    ],
    hint_level1: [
      "Calculate. Don't guess. There's a concrete solution here.",
      "Check the forcing moves first. Always.",
      "The answer is in the position. Look at it objectively.",
    ],
    hint_level2: [
      "The key piece in this position is underutilized. Find its best square.",
      "There's a tactical motif here. It's a standard pattern you should know.",
      "Examine the opponent's last move. It created a weakness.",
    ],
    hint_level3: [
      "{bestMove}. That's the objectively best move. The evaluation shifts by {evalDelta}.",
      "The correct move is {bestMove}. Study this pattern. You'll see it again.",
    ],
    encouragement: [
      "Your calculation is improving. Continue studying.",
      "Adequate progress. Keep working on your preparation.",
    ],
    post_game_win: [
      "You won. Let's verify there were no inaccuracies in your technique.",
      "Victory. But was every move the best move? Let's check.",
    ],
    post_game_loss: [
      "You lost. Let's identify the exact move where the position turned. No excuses.",
      "Defeat due to insufficient preparation. Let's document every error.",
    ],
    post_game_draw: [
      "A draw. Was it a theoretical draw, or did you miss a winning continuation?",
      "Let's verify whether the draw was justified or if there was a forced win.",
    ],
    chat_greeting: [
      "Let's begin. What position are you studying?",
      "Ready to work. Have you been studying your openings?",
    ],
    chat_fallback: [
      "That's not relevant to chess preparation. Focus on the board.",
      "Stay focused. What specific position or line do you want to examine?",
    ],
    game_opening: [
      "Let's play. I expect you to know your theory. No improvising in the opening.",
      "A game. Good. Show me your preparation.",
    ],
    game_thinking: [
      "Calculating the precise continuation...",
      "Analyzing. Every move must be accurate.",
    ],
    takeback_allowed: [
      "Note the error. Don't repeat it.",
    ],
    takeback_refused: [
      "No. You played it. Own it. We'll analyze after the game.",
      "Takebacks aren't chess. Play the position you created.",
    ],
    takeback_reluctant: [
      "Fine. But document why you needed it. What did you miss?",
    ],
  },
};

// ─── Public API ─────────────────────────────────────────────────────────────

export function getMoveCommentaryTemplate(
  personality: CoachPersonality,
  classification: MoveClassification,
  vars: TemplateVars,
): string {
  const templates = MOVE_COMMENTARY[personality][classification];
  const template = templates[Math.floor(Math.random() * templates.length)];
  return interpolate(template, vars);
}

export function getScenarioTemplate(
  personality: CoachPersonality,
  scenario: Scenario,
  vars: TemplateVars = {},
): string {
  const templates = SCENARIO_TEMPLATES[personality][scenario];
  const template = templates[Math.floor(Math.random() * templates.length)];
  return interpolate(template, vars);
}

export function getAllTemplatesForPersonality(personality: CoachPersonality): {
  moveCommentary: Record<MoveClassification, string[]>;
  scenarios: Record<Scenario, string[]>;
} {
  return {
    moveCommentary: MOVE_COMMENTARY[personality],
    scenarios: SCENARIO_TEMPLATES[personality],
  };
}
