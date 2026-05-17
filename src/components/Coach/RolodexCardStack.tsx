/**
 * RolodexCardStack
 * ----------------
 * Renders one color's favorited openings as a flip-able card stack.
 * Back cards (everything that isn't active) sit above the active card
 * as collapsed "tabs" showing the opening's ECO + name; the active
 * card sits at the bottom of the visual stack with its full body
 * (header + 8 training rows) extended.
 *
 * Why back-on-top, active-on-bottom: matches the physical-rolodex
 * mental model — you flip THROUGH the deck by tapping a card behind
 * the one currently in front. Tap → that card slides into the active
 * position, the previously-active card slots back into the tab list.
 *
 * Animation: `LayoutGroup` wraps the siblings so when the active id
 * changes, Framer Motion's `layout` prop on each `RolodexCard`
 * animates the position swap with a single coordinated spring. No
 * imperative re-ordering, no manual key swapping — Framer handles it
 * by tracking each motion element across renders by its DOM identity
 * (preserved via stable `key={card.id}`).
 *
 * Default stack order: most recently favorited first (`favorites[0]`
 * is "newest"). The active card is HOISTED out of natural order and
 * placed at the bottom of the render list (= front of the visual
 * stack); everything else keeps its relative order. PR-4 introduces
 * user-defined ordering via drag-reorder + persistence; until then,
 * the caller (`TrainingPlanRolodexPage`) just hands us the favorites
 * list and we display it in that order.
 *
 * Stable LayoutGroup id (`rolodex-stack-${color}`) scopes Framer's
 * layout tracking to a single column — important because the page
 * renders both the desktop and mobile panels at all times (JSDOM
 * and CSS-hidden both honor the markup), so without scoping the
 * same card id would collide across panels.
 */
import { useMemo } from 'react';
import { LayoutGroup } from 'framer-motion';
import { RolodexCard } from './RolodexCard';
import type { OpeningRecord } from '../../types';

interface RolodexCardStackProps {
  color: 'white' | 'black';
  favorites: OpeningRecord[];
  /** The id of the card currently at the front of the stack. Null
   *  shouldn't happen in practice — the stack is only rendered when
   *  `favorites.length > 0` and the page guarantees first-favorite
   *  auto-activation — but treated defensively (renders the first
   *  favorite as active). */
  activeId: string | null;
  /** Called when the user taps a back card's tab. The page wires
   *  this to `setActiveOpeningCard(color, id)` in the memory store. */
  onActivate: (openingId: string) => void;
}

export function RolodexCardStack({
  color,
  favorites,
  activeId,
  onActivate,
}: RolodexCardStackProps): JSX.Element {
  // Resolve to a real card id even when the prop is null or stale
  // (opening was unfavorited elsewhere). Page-level effect bumps the
  // memory store back into sync; until then the stack picks the
  // first favorite so something always renders as active.
  const resolvedActiveId = useMemo<string | null>(() => {
    if (favorites.length === 0) return null;
    if (activeId && favorites.some((o) => o.id === activeId)) return activeId;
    return favorites[0]?.id ?? null;
  }, [favorites, activeId]);

  // Build the render order: every non-active card in its default sort
  // order, then the active card last. Last-rendered = bottom of the
  // flex column = front of the visual stack (active card body
  // visible, back card tabs above).
  const orderedCards = useMemo(() => {
    if (favorites.length === 0) return favorites;
    const back = favorites.filter((o) => o.id !== resolvedActiveId);
    const active = favorites.find((o) => o.id === resolvedActiveId);
    return active ? [...back, active] : favorites;
  }, [favorites, resolvedActiveId]);

  return (
    <LayoutGroup id={`rolodex-stack-${color}`}>
      <div
        className="flex flex-col gap-1"
        data-testid={`rolodex-card-stack-${color}`}
      >
        {orderedCards.map((card) => (
          <RolodexCard
            key={card.id}
            opening={card}
            isActive={card.id === resolvedActiveId}
            onActivate={() => onActivate(card.id)}
          />
        ))}
      </div>
    </LayoutGroup>
  );
}
