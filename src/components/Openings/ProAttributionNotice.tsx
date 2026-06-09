interface ProAttributionNoticeProps {
  /** A specific player's display name, when the surface is about ONE
   *  player. Omit on surfaces that span multiple players (the roster /
   *  the generic picker). */
  playerName?: string;
  /** Extra classes for spacing at the call site. */
  className?: string;
}

/**
 * User-facing right-of-publicity / non-endorsement disclaimer shown on every
 * surface that attributes openings or games to a NAMED player.
 *
 * The app teaches from players' PUBLIC games (factual, nominative use of the
 * name — New Kids on the Block nominative fair use). This notice makes the
 * no-affiliation / no-endorsement explicit so the attribution can never read
 * as a false endorsement / affiliation (Lanham §43(a)) or a right-of-publicity
 * problem. It pairs with the coach's existing "unbranded lesson" tool guard
 * (lookupPlayerOpeningMoves: "DO NOT advertise the lesson as the player's
 * official course — the name is only a factual source") so the disclaimer is
 * shown in the UI AND enforced in the narration. (Legal-mitigation sweep,
 * David 2026-06-09.)
 */
export function ProAttributionNotice({ playerName, className }: ProAttributionNoticeProps): JSX.Element {
  const subject = playerName ? `${playerName} is` : 'The featured players are';
  return (
    <p
      data-testid="pro-attribution-notice"
      className={`text-[11px] leading-snug text-theme-text-muted ${className ?? ''}`}
    >
      {subject} not affiliated with, and does not endorse, this app. Lessons are
      derived from publicly available games and the general, established understanding
      of these openings — not official or endorsed content.
    </p>
  );
}
