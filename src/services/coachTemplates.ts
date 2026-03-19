import type { MoveClassification } from '../types';

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

const MOVE_COMMENTARY: Record<MoveClassification, string[]> = {
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
  miss: [
    "Your opponent slipped there! {bestMove} would have punished the mistake. Keep your eyes open for these opportunities.",
    "Missed chance! {bestMove} was the way to take advantage. Spotting these moments is a key skill to develop.",
  ],
};

// ─── Scenario Templates ─────────────────────────────────────────────────────

const SCENARIO_TEMPLATES: Record<Scenario, string[]> = {
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
};

// ─── Public API ─────────────────────────────────────────────────────────────

export function getMoveCommentaryTemplate(
  classification: MoveClassification,
  vars: TemplateVars,
): string {
  const templates = MOVE_COMMENTARY[classification];
  const template = templates[Math.floor(Math.random() * templates.length)];
  return interpolate(template, vars);
}

export function getScenarioTemplate(
  scenario: Scenario,
  vars: TemplateVars = {},
): string {
  const templates = SCENARIO_TEMPLATES[scenario];
  const template = templates[Math.floor(Math.random() * templates.length)];
  return interpolate(template, vars);
}

export function getAllTemplates(): {
  moveCommentary: Record<MoveClassification, string[]>;
  scenarios: Record<Scenario, string[]>;
} {
  return {
    moveCommentary: MOVE_COMMENTARY,
    scenarios: SCENARIO_TEMPLATES,
  };
}
