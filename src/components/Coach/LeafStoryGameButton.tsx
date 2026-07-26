// The walkthrough-leaf "story-as-evidence" button (#26 Phase C, David 2026-07-19
// "story game"): when a taught opening has a verified master game in the corpus,
// offer a one-tap watch — a real GM showing the idea. pickStoryGame is
// deterministic + G3-grounded (real players/event/year, never fabricated); the
// button only renders when a real pgn exists (no empty viewer).
//
// Extracted into its OWN small component on purpose: the parent CoachTeachPage
// is ~7k lines, and ESLint's typed program resolves cross-module types to
// `error` for newly-added nodes there (tsc is clean — a project-service quirk).
// In a small file the types resolve normally, so the type-aware rules pass.

import { pickStoryGame } from '../../services/reviewStoryGame';
import { buildSession } from '../../services/walkthroughAdapter';
import { logAppAudit } from '../../services/appAuditor';
import type { WalkthroughSession } from '../../types/walkthrough';

interface LeafStoryGameButtonProps {
  openingName: string;
  studentSide: 'white' | 'black';
  /** Hand the built silent walkthrough to the parent's in-page model-game viewer. */
  onWatch: (session: WalkthroughSession) => void;
}

export function LeafStoryGameButton({
  openingName,
  studentSide,
  onWatch,
}: LeafStoryGameButtonProps): JSX.Element | null {
  const story = pickStoryGame(openingName);
  if (!story?.pgn) return null;

  return (
    <button
      onClick={() => {
        const session = buildSession({
          pgn: story.pgn,
          title: story.citation,
          subtitle: `${openingName} · a master shows the idea`,
          orientation: studentSide,
          kind: 'opening',
          source: 'story-game',
        });
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'CoachTeachPage.leafStoryGame',
          summary: `story-game watch offered at leaf for "${openingName}": ${story.citation}`,
        });
        onWatch(session);
      }}
      className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-theme-accent/40 bg-theme-surface text-theme-text text-sm font-semibold min-h-[48px] transition-colors"
      data-testid="walkthrough-leaf-story-game"
    >
      ▶ Watch {story.citation}
    </button>
  );
}
