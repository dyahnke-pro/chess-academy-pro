// THE MISTAKE TURN'S LINE — the grade, the fundamental behind it, and ONE habit.
//
// David's Smith-Morra replay, 8.Bxf7+ (2026-10-20), heard the same loss twice
// and two habits in one breath:
//   "That pawn was defended: your bishop takes on f7 and is taken on the spot —
//    it cost you far more than a pawn. Here's how: before taking a free pawn…
//    Bxf7+ was a mistake. That took the pawn on f7, but the king on e8 takes
//    back — you lose a bishop for a pawn. Blunder check before you let go of a
//    piece: run CCT for them…"
// The grade's line and the fundamental's verdict named one loss (the piece on
// f7), and only a loose piece or an ignored threat was recognised as the same
// claim. Now ANY fundamental about the square the grade says was lost is the
// same loss: the grade speaks it, and the fundamental keeps only its HOW. And
// a turn teaches one habit: the slip question (the generic blunder check) is
// asked only when the fundamental taught none.
//
// THE HABIT CLOSES THE TURN (David 2026-10-20, carve-out 3: "what Bc3
// allowed, what the better move did, and the habit that catches it next
// time"; WO-ONE-COACH-01). The fundamental's HOW used to ride inside its
// verdict, ahead of the grade's line — the habit before the loss it was about.

interface MistakeTurnFundamental {
  /** The diagnosis alone — what the move broke. */
  diagnosis: string;
  /** The HOW — the habit ('' when this game already taught it). */
  howOnly: string;
  /** The square the fundamental is about, when it names one. */
  square: string | null;
}

interface MistakeTurnInput {
  fund: MistakeTurnFundamental | null;
  /** The grade's own line (what the move allowed, with its cost). */
  evidence: string;
  /** The square the grade says was lost, when it names one. */
  lostSquare: string | null;
  /** The opening lane already announced the book departure: the diagnosis is said. */
  bookSaid: boolean;
  /** The per-game slip marker; called only when the full verdict speaks. */
  slipPrefix: () => string;
  /** Text the grade carries when no fundamental attributes (a definition). */
  plainTail: string;
  concession: string | null;
  /** The slip question; called only when no habit is taught this turn. */
  slipQuestion: () => string | null;
}

/** True when the fundamental's verdict and the grade name one loss. */
export function sameLossAsGrade(fund: Pick<MistakeTurnFundamental, 'square'> | null, lostSquare: string | null): boolean {
  return !!fund?.square && !!lostSquare && fund.square === lostSquare;
}

/** The turn's line and its habit, said apart: the body leads the turn, the
 *  habit (the fundamental's HOW, or the slip question) is its own fact in the
 *  turn's habit step, so it closes the turn after everything else the move
 *  says — the line played out included (WO-ONE-COACH-01). The door keeps one
 *  habit a turn (`method:` claims). */
export interface MistakeTurn {
  /** What the move broke, what it allowed and what that cost. */
  body: string;
  /** The habit that catches it next game, '' when none. */
  habit: string;
  teachesMethod: boolean;
}

export function mistakeTurnLine(a: MistakeTurnInput): MistakeTurn {
  const join = (...parts: Array<string | null | undefined>): string => parts.filter((p) => !!p && p.trim()).join(' ').trim();
  let body: string;
  let how: string;
  if (!a.fund) {
    body = join(a.evidence + a.plainTail);
    how = '';
  } else if (sameLossAsGrade(a.fund, a.lostSquare)) {
    // The grade says the loss; the fundamental adds the habit that finds it.
    body = join(a.evidence);
    how = a.fund.howOnly;
  } else {
    body = join(`${a.slipPrefix()}${a.bookSaid ? '' : a.fund.diagnosis}`, a.evidence);
    how = a.fund.howOnly;
  }
  const habit = how || a.slipQuestion() || '';
  return { body: join(body, a.concession), habit, teachesMethod: !!habit };
}
