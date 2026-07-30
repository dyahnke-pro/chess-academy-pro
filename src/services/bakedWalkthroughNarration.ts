// bakedWalkthroughNarration — Tier 2 of the walkthrough narration
// architecture (David 2026-07-30, locked): "If no masterclass we hand the
// llm whatever narration has been transcribed from video pulls."
//
// `scripts/danya-corpus/narrate-from-video.mjs` hands the teacher's OWN
// video transcript to the model OFFLINE, rewords it into the coach's voice,
// gates every line (7-gram overlap, attribution leak, move-number prefix,
// board-claim truth), and bakes the result into
// `src/data/walkthrough-narrations.json`. At runtime this module is a pure
// lookup: a hit replaces the generator's LLM spine narration with the baked
// script — deterministic, the same words every session, zero runtime
// generation for the covered line (G0: nothing is decided at runtime).
import bakedFile from '../data/walkthrough-narrations.json';

interface BakedIdea {
  text: string;
  shortText?: string;
}

export interface BakedNarration {
  openingName: string;
  spine: string[];
  sourceVideos: string[];
  intro: string;
  shortIntro?: string;
  outro: string;
  ideas: BakedIdea[];
}

interface BakedFileShape {
  generatedAt: string;
  narrations: Record<string, BakedNarration>;
}

const DATA = bakedFile as unknown as BakedFileShape;

const norm = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Find the baked video narration covering `spineMoves` for the named
 *  opening. A hit requires BOTH the name to match AND the baked spine to
 *  cover the runtime spine ply-for-ply — a name match on a different line
 *  would narrate moves that aren't on the board (the noteLineGuard bug
 *  class), so it is not a hit. Returns null on any mismatch. */
export function bakedNarrationFor(
  openingName: string,
  spineMoves: string[],
): BakedNarration | null {
  if (!openingName || spineMoves.length === 0) return null;
  const entry = DATA.narrations[norm(openingName)];
  if (!entry) return null;
  if (entry.spine.length < spineMoves.length) return null;
  if (entry.ideas.length !== entry.spine.length) return null;
  for (let i = 0; i < spineMoves.length; i++) {
    if (entry.spine[i] !== spineMoves[i]) return null;
  }
  return entry;
}
