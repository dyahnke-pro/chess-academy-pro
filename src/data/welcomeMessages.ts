// Rotating welcome greetings spoken on app launch to warm up the TTS
// connection and reduce voice narration lag in the opening trainer.
// Keep messages short (under ~8 seconds of speech) and varied.

export const WELCOME_MESSAGES: string[] = [
  'Welcome back. Ready to sharpen your openings?',
  'Good to see you. Let\'s make some strong moves today.',
  'Welcome back, champion. Your board awaits.',
  'Hey there. Time to level up your chess game.',
  'Welcome back. Every session makes you stronger.',
  'Ready for some chess? Let\'s get to work.',
  'Great to have you back. Let\'s find some brilliant moves.',
  'Welcome. Your next great game starts here.',
  'Hey, welcome back. The pieces are set and waiting.',
  'Good to see you again. Let\'s train like a grandmaster.',
  'Welcome back. Shall we explore some new lines today?',
  'Another day, another chance to improve. Let\'s go.',
  'Welcome. Time to turn knowledge into instinct.',
  'Hey there. Let\'s build on what you learned last time.',
  'Welcome back. Consistency is what separates good from great.',
  'Ready to play? Your opening repertoire is waiting.',
  'Welcome. Let\'s make today\'s session count.',
  'Good to have you here. Let\'s sharpen those tactics.',
  'Hey, welcome back. Let\'s see what you\'ve got today.',
  'Welcome. Remember, every master was once a beginner.',
];

/** Pick a random welcome message, avoiding the most recently used one. */
export function getRandomWelcome(lastUsed?: string): string {
  const pool = lastUsed
    ? WELCOME_MESSAGES.filter((m) => m !== lastUsed)
    : WELCOME_MESSAGES;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
