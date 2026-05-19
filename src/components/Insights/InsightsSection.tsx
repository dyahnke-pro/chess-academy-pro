import type { ReactNode } from 'react';

/**
 * Shared section header for every /weaknesses tab.
 *
 * Phone-centered with a subtle accent glow so headers read like card
 * titles instead of inline labels. When `urgent` is set — a child stat
 * has reached Severe or Critical severity — the header gains a red
 * glow + warning glyph so the user can't miss it scrolling. Desktop
 * (md+) keeps the left-aligned dashboard layout.
 *
 * Previously each tab defined its own `function Section({ title })`
 * with slightly different styles. This shared component is the single
 * source of truth — every header on the Weaknesses surface picks up
 * the same urgency + centering + glow rules from here.
 */
export function InsightsSection({
  title,
  children,
  urgent = false,
}: {
  title: string;
  children: ReactNode;
  urgent?: boolean;
}): JSX.Element {
  return (
    <div className="pt-4">
      <h3
        className="text-[11px] font-bold uppercase tracking-wider pb-2 border-b text-center md:text-left flex items-center gap-1.5 justify-center md:justify-start"
        style={{
          color: urgent ? '#ef4444' : 'var(--color-text-muted)',
          borderColor: urgent ? 'rgba(239, 68, 68, 0.4)' : 'var(--color-border)',
          textShadow: urgent
            ? '0 0 8px rgba(239, 68, 68, 0.5)'
            : '0 0 6px color-mix(in srgb, var(--color-accent) 25%, transparent)',
        }}
      >
        {urgent && (
          <span aria-label="urgent" title="One or more stats below need urgent attention">⚠</span>
        )}
        <span>{title}</span>
      </h3>
      {children}
    </div>
  );
}
