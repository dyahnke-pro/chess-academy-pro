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

interface MistakeTurnFundamental {
  /** The full verdict (diagnosis + HOW). */
  verdict: string;
  /** The HOW sentences alone ('' when this game already taught the habit). */
  howOnly: string;
  /** "You've walked into this before…" — the record's sentence, or null. */
  recurrence: string | null;
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
  /** Text the grade carries when no fundamental attributes (a definition, a plain
   *  mistake's recurrence). */
  plainTail: string;
  concession: string | null;
  /** The slip question; called only when no habit is taught this turn. */
  slipQuestion: () => string | null;
}

/** True when the fundamental's verdict and the grade name one loss. */
export function sameLossAsGrade(fund: Pick<MistakeTurnFundamental, 'square'> | null, lostSquare: string | null): boolean {
  return !!fund?.square && !!lostSquare && fund.square === lostSquare;
}

/** The turn's ONE habit claim: the mistake line that teaches a habit and the
 *  blunder-check lane carry it, so the turn teaches one (OS-11 item 6d — the
 *  8.Bxf7+ replay heard the fundamental's HOW and then the blunder check). */
export function turnHabitClaim(ply: number): string { return `turn-habit:${ply}`; }

export function mistakeTurnLine(a: MistakeTurnInput): { text: string; habitTaught: boolean } {
  const join = (...parts: Array<string | null | undefined>): string => parts.filter((p) => !!p && p.trim()).join(' ').trim();
  let body: string;
  let habitTaught: boolean;
  if (!a.fund) {
    body = join(a.evidence + a.plainTail);
    habitTaught = false;
  } else if (sameLossAsGrade(a.fund, a.lostSquare)) {
    // The grade says the loss; the fundamental adds the habit that finds it,
    // then the record's "you've done this before".
    body = join(a.evidence, a.fund.howOnly, a.fund.recurrence);
    habitTaught = !!a.fund.howOnly;
  } else {
    body = join(`${a.slipPrefix()}${a.bookSaid ? a.fund.howOnly : a.fund.verdict}`, a.fund.recurrence, a.evidence);
    habitTaught = !!a.fund.howOnly;
  }
  return { text: join(body, a.concession, habitTaught ? null : a.slipQuestion()), habitTaught };
}
