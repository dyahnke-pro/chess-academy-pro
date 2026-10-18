/**
 * firstRunPickers — what a new install sees on its first Learn visit (David
 * 2026-10-18: "Let user know briefly what can be done. Watch an opening, play a
 * certain opening against user, or just start playing" → "the nuggets then
 * should be pickers. So should the options. Pickers can have more than the
 * three spoken options").
 *
 * PURE. Every choice is a picker the student taps; the voice names three of
 * them and nothing more. Nothing is offered DURING a game (David 2026-10-18:
 * "NO QUESTIONS DURING THE GAME") — the pickers live before it starts. Each chip's text is a request the coach already
 * answers (the opening walkthrough, the play intent, the question lanes), so a
 * tap goes through the one door like anything the student types.
 */

export const FIRST_RUN_WATCH = 'Watch an opening';
export const FIRST_RUN_PLAY = 'Play an opening';
export const FIRST_RUN_JUST_PLAY = 'Just play';

export interface FirstRunOpener { line: string; chips: string[] }

/** The opener: three named in the voice, more on the picker row. */
export const FIRST_RUN_OPENER: FirstRunOpener = {
  line: 'Three ways to start: watch an opening played out, play one move by move, or just make your first move.',
  chips: [FIRST_RUN_WATCH, FIRST_RUN_PLAY, FIRST_RUN_JUST_PLAY, 'Import my games', 'Learn how to think'],
};

/** The openings offered on the "which one?" step — the most played lines a
 *  new player meets from each side. Names resolve through the opening DB
 *  (`firstRunPickers.test` holds that). */
export const FIRST_RUN_OPENINGS: readonly string[] = [
  'Italian Game', "Queen's Gambit", 'London System', 'Sicilian Defense', 'Caro-Kann Defense', 'French Defense',
];

export type FirstRunChoice = 'watch' | 'play' | 'just-play';

/** Which first-run choice `text` is, tapped or typed. */
export function matchFirstRunChoice(text: string): FirstRunChoice | null {
  const t = (text ?? '').trim().replace(/[.!?]+$/, '').toLowerCase();
  if (t === FIRST_RUN_WATCH.toLowerCase() || /^watch (?:an|a) opening$/.test(t)) return 'watch';
  if (t === FIRST_RUN_PLAY.toLowerCase() || /^play (?:an|a) opening$/.test(t)) return 'play';
  if (t === FIRST_RUN_JUST_PLAY.toLowerCase() || /^(?:let'?s )?just play$/.test(t)) return 'just-play';
  return null;
}

/** The coach's answer to a first-run choice: what it says, and the pickers
 *  that follow. Watch and Play ask which opening; Just play hands the board
 *  over. */
export function firstRunFollowUp(choice: FirstRunChoice): FirstRunOpener {
  switch (choice) {
    case 'watch':
      return { line: 'Which one? Pick it, or type any opening by name.', chips: FIRST_RUN_OPENINGS.map((n) => `Teach me the ${n}`) };
    case 'play':
      return { line: 'Which one? Pick it, or type any opening by name.', chips: FIRST_RUN_OPENINGS.map((n) => `Play the ${n}`) };
    case 'just-play':
      return { line: 'The board is yours. Make your first move.', chips: [] };
  }
}
