/**
 * THE TRAP MENU — turning the gems we already own into pickable chips.
 *
 * David 2026-08-16: "So let's get the coach teaching gems we already have.
 * Place them in pickers into the chat like we do for other things. Once one gem
 * is taught have the coach ask if they want to continue down the [list]. Again
 * present the pickers. Make sure they are labeled well enough to identify each
 * one individually."
 *
 * A chip's LABEL is its identity: tapping one routes the label text back
 * through `handleSubmit`, so the label has to name exactly one gem and survive
 * the round trip. That is the whole design constraint here.
 *
 * WHY THE MOVE NUMBER IS IN THE LABEL. The Vienna's 21 gems are not distinct on
 * the slip alone — two are punished after `Qf6`, two after `Nge7`. Labelling by
 * slip and punish would print the same chip twice and teach the wrong line half
 * the time. The ply the slip happens on separates them, and it is also what the
 * student needs in order to recognise the moment over the board.
 *
 * Nothing here generates chess. Every field is read off a mined, engine-graded,
 * hand-narrated gem (G0/G3); this module only formats and parses.
 */
import type { PunishGem } from './punishGems';
import { getPunishGemsForOpening, isSurfaceableGem, gemId } from './punishGems';
import { getGemNarration } from './punishGemNarration';
import { ALL_GEMS } from './punishGems';

/** The move number the slip is played on — `lineMoves` is the spine BEFORE it. */
export function slipMoveNumber(gem: PunishGem): number {
  const plies = gem.lineMoves.trim().split(/\s+/).filter(Boolean).length;
  return Math.floor(plies / 2) + 1;
}

/** Whose slip it is — the ellipsis convention readers already know. */
function slipIsBlack(gem: PunishGem): boolean {
  return gem.lineMoves.trim().split(/\s+/).filter(Boolean).length % 2 === 1;
}

/**
 * The chip text — the SAME wording the masterclasses already use for gems
 * (David 2026-08-16: "keep the same wording of the gems already in the
 * masterclasses"). `OpeningDetailPage` renders each gem card as
 * "Opponent plays {slip} — punish with {punish}"; a student who has seen that
 * card should read the same sentence here.
 *
 * The one addition is the move number, and only because it is load-bearing:
 * two Vienna traps are punished after Qf6 and two after Nge7, so the
 * masterclass phrasing alone would print duplicate chips and resolve half of
 * them to the wrong line. It also happens to be what the student needs in
 * order to spot the moment over the board.
 *
 *   "Opponent plays 6…Ng4 — punish with Ng5"
 *   "Opponent plays 5.Bg5 — punish with Nxe4"
 */
export function gemChipLabel(gem: PunishGem): string {
  const sep = slipIsBlack(gem) ? '…' : '.';
  return `Opponent plays ${slipMoveNumber(gem)}${sep}${gem.inaccuracy} — punish with ${gem.punish}`;
}

/** Parse a chip label back to its coordinates. Null when it is not one. */
export function parseGemChipLabel(label: string): { moveNumber: number; inaccuracy: string; punish: string } | null {
  const m = /^Opponent plays\s+(\d+)(?:…|\.\.\.|\.)\s*(\S+?)\s+—\s+punish with\s+(\S+?)\s*$/i.exec(label.trim());
  if (!m) return null;
  return { moveNumber: Number(m[1]), inaccuracy: m[2], punish: m[3] };
}

/** Every teachable trap for an opening, in the order the chips are shown.
 *  SURFACEABLE ONLY — weapon tier plus narration, the same rule the UI renders
 *  by, so a chip can never offer a lesson the app then cannot play. */
export function teachableGems(openingId: string | undefined | null): PunishGem[] {
  return getPunishGemsForOpening(openingId)
    .filter(isSurfaceableGem)
    // Stable, teachable order: earliest slip first, so the menu walks the
    // opening forward rather than jumping around it.
    .sort((a, b) => slipMoveNumber(a) - slipMoveNumber(b) || a.inaccuracy.localeCompare(b.inaccuracy));
}

/** The chips for an opening's trap menu. */
export function gemTrapChoices(openingId: string | undefined | null): string[] {
  return teachableGems(openingId).map((g) => gemChipLabel(g));
}

/**
 * Resolve a tapped chip back to the gem it names.
 *
 * Matched on the COORDINATES (move number + slip + punish), not on the index —
 * the index shifts as taught traps are dropped from the menu, and a stale chip
 * in the transcript would otherwise teach whatever now sits in that slot.
 */
export function gemForChipLabel(openingId: string | undefined | null, label: string): PunishGem | null {
  const parsed = parseGemChipLabel(label);
  if (!parsed) return null;
  const gems = teachableGems(openingId);
  return gems.find((g) => g.inaccuracy === parsed.inaccuracy
    && g.punish === parsed.punish
    && slipMoveNumber(g) === parsed.moveNumber) ?? null;
}

/** The menu minus what has already been taught — what "continue down the list"
 *  shows. Keyed by `gemId` so it survives reordering and re-labelling. */
export function remainingGemChoices(openingId: string | undefined | null, taughtGemIds: Iterable<string>): string[] {
  const taught = new Set(taughtGemIds);
  const left = teachableGems(openingId).filter((g) => !taught.has(gemId(g)));
  // Re-number from 1 so the student sees "Trap 1, Trap 2…" of what REMAINS,
  // never a menu that starts at Trap 4 with gaps in it.
  return left.map((g) => gemChipLabel(g));
}

/** The paging chip. The `[CHOICES:]` extractor caps at 6, so an opening with 21
 *  traps shows five and this, rather than silently truncating the menu — a
 *  student told "here are the traps" must not be shown a quarter of them with
 *  no sign the rest exist. */
export const MORE_TRAPS_CHIP = 'More traps →';

/**
 * The taught text for one trap, assembled from the gem's OWN hand-authored
 * narration — the same `watch[]` lines the WLPP player speaks.
 *
 * Assembly, not generation: every sentence was written by hand against that
 * exact ply and is already gated by `punishGems.test`. The model never sees
 * this, so it cannot reword a verified line into an unverified one (G0).
 * Silent plies (empty strings) are routine moves the author deliberately left
 * unnarrated; they are skipped rather than padded.
 */
export function gemTeachingText(gem: PunishGem): string | null {
  const narration = getGemNarration(gemId(gem));
  if (!narration) return null;
  const plies = gem.playLine.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  narration.watch.forEach((say, i) => {
    const text = (say ?? '').trim();
    if (!text) return;                       // authored silence — the board is the lesson there
    const san = plies[i];
    lines.push(san ? `${san} — ${text}` : text);
  });
  return lines.length ? lines.join('\n\n') : null;
}

/**
 * Resolve a chip when the opening is not known.
 *
 * A chip carries its trap's coordinates but not its opening, and the surface
 * that renders the menu does not always know the id either (the walkthrough
 * tree carries a NAME). Rather than thread the scope through every path — and
 * fail closed when one of them forgets — search every opening that has gems and
 * accept the match ONLY when it is unique.
 *
 * Ambiguous means no answer, deliberately: two openings whose traps share a
 * move number, slip and punish are indistinguishable from the label alone, and
 * teaching the wrong one is worse than falling through to the normal router.
 */
export function gemForChipLabelAnywhere(label: string): PunishGem | null {
  const parsed = parseGemChipLabel(label);
  if (!parsed) return null;
  const matches = ALL_GEMS.filter((g) => isSurfaceableGem(g)
    && g.inaccuracy === parsed.inaccuracy
    && g.punish === parsed.punish
    && slipMoveNumber(g) === parsed.moveNumber);
  const openings = new Set(matches.map((g) => g.openingId));
  return matches.length === 1 && openings.size === 1 ? matches[0] : null;
}
