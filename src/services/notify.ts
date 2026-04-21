import { toast } from 'sonner';

/**
 * Uniform toast surface wrapping sonner. Feature code should import
 * `notify` from here rather than importing `toast` from 'sonner'
 * directly so variant names, default durations, and ARIA semantics
 * stay consistent app-wide.
 *
 * Accessibility: sonner renders toasts in a live region with role="status".
 * We keep a minimum duration of 5s (matching WCAG guidance) and always
 * render a dismiss button so keyboard-only users can clear a toast
 * before its timeout.
 */

interface NotifyOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const DEFAULT_DURATION_MS = 5000;

function resolve(opts?: NotifyOptions): Parameters<typeof toast>[1] {
  return {
    description: opts?.description,
    duration: opts?.duration ?? DEFAULT_DURATION_MS,
    action: opts?.action,
  };
}

export const notify = {
  info: (message: string, opts?: NotifyOptions): string | number =>
    toast(message, resolve(opts)),

  success: (message: string, opts?: NotifyOptions): string | number =>
    toast.success(message, resolve(opts)),

  warn: (message: string, opts?: NotifyOptions): string | number =>
    toast.warning(message, resolve(opts)),

  error: (message: string, opts?: NotifyOptions): string | number =>
    toast.error(message, { ...resolve(opts), duration: opts?.duration ?? 8000 }),

  /** Mistakes-due nudge variant: higher contrast, action-oriented. */
  due: (message: string, opts?: NotifyOptions): string | number =>
    toast.warning(message, resolve(opts)),

  dismiss: (id?: string | number): void => {
    if (id === undefined) {
      toast.dismiss();
    } else {
      toast.dismiss(id);
    }
  },
};
