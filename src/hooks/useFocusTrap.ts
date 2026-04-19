import { useEffect, useRef } from 'react';

/**
 * Minimal focus-trap hook. Scope: modal dialogs and bottom sheets.
 *
 * When `active` is true, keyboard focus is captured inside the
 * element returned via the ref. Tab wraps from the last focusable
 * element back to the first; Shift+Tab wraps the other way. The
 * previously-focused element is restored when the trap deactivates
 * so keyboard users don't lose their place.
 *
 * Intentionally lightweight — no aria-hidden siblings, no inert
 * polyfill, no portal handling. Good enough for the two coach
 * drawers; a11y audit said Escape-to-close was the must-have and
 * focus-trap was the next step.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean): React.RefObject<T | null> {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    // Remember where focus was when the trap engaged so we can
    // restore it on deactivate.
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    // Move focus into the container on engage. Prefer the first
    // focusable element; fall back to the container itself (with
    // tabindex=-1 if the caller added it).
    const focusables = getFocusableElements(container);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else if (container.tabIndex >= 0) {
      container.focus();
    }

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return;
      const current = getFocusableElements(container);
      if (current.length === 0) {
        e.preventDefault();
        return;
      }
      const first = current[0];
      const last = current[current.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        // Shift+Tab from first → wrap to last
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab from last → wrap to first
        if (active === last || !container.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus only if the previously-focused element is
      // still in the DOM — otherwise the browser picks body which
      // is fine.
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active]);

  return containerRef;
}

/**
 * Collect focusable descendants of a container. Covers the standard
 * tab stops: buttons, links, form controls, and explicit
 * tabindex="0" nodes. Skips elements hidden via `disabled`, `inert`,
 * `aria-hidden`, or `hidden` attributes so we don't land focus
 * somewhere invisible.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  const candidates = Array.from(container.querySelectorAll<HTMLElement>(selector));
  return candidates.filter((el) => {
    if (el.hasAttribute('inert')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (el.hidden) return false;
    // Skip zero-size / display-none elements.
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return true;
  });
}
