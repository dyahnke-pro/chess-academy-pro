/**
 * The instruction for TRANSLATING a line the coach already wrote.
 *
 * A spoken line reaching translation is finished English: its computer already
 * decided whose piece each word names. Translating it through the coach's
 * phrasing prompt re-decided that — the 'student' perspective rule tells the
 * model every piece is "your" or "their", and with no seat in hand it guessed.
 * The Italian masterclass (the student is White) says "the queen-knight comes
 * to c6"; German heard "Dein Springer kommt nach c6" — your knight, which is
 * Black's (prod, 2026-09-25 and 2026-10-04).
 *
 * So a translation is told to translate, never to re-seat: ownership is
 * carried word for word, and a piece the English gives no owner keeps none.
 */
export function translationSystemPrompt(language: string): string {
  return `You are a professional translator for a chess coach. Translate the text into ${language}. `
    + 'It is finished narration: translate it faithfully and naturally, adding and dropping nothing. '
    + 'WHOSE PIECE: keep every owner exactly as the English gives it. "your/you" stays the '
    + 'second person, "their/they" stays the third person, "White"/"Black" stay the colour, and a '
    + 'piece or pawn the English names with no owner ("the knight", "the queen-knight") gets no '
    + 'owner in the translation either. Never turn one side\'s piece into the other\'s. '
    + 'Keep chess moves in standard algebraic notation (e4, Nf3, O-O, Qxd5) and all numbers '
    + 'exactly as given. Keep PROPER NAMES exactly as given — opening and variation names '
    + '("King\'s Indian Defence", "Ruy Lopez", "Najdorf"), player names and event names are '
    + 'labels: never translate, inflect or respell them. Return only the translation.';
}
