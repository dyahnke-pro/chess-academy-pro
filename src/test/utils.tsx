import { type ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { vi } from 'vitest';

interface WrapperProps {
  children: ReactNode;
}

function AllProviders({ children }: WrapperProps): JSX.Element {
  return (
    <MemoryRouter>
      <MotionConfig transition={{ duration: 0 }}>
        {children}
      </MotionConfig>
    </MemoryRouter>
  );
}

function customRender(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  return render(ui, { wrapper: AllProviders, ...options });
}

// ─── beforeinstallprompt Helper ──────────────────────────────────────────────

export function dispatchInstallPrompt(): {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>;
  preventDefault: () => void;
} {
  const fakeEvent = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>;
    preventDefault: () => void;
  };

  const promptFn = vi.fn().mockResolvedValue({ outcome: 'accepted' as const });
  Object.defineProperty(fakeEvent, 'prompt', { value: promptFn });

  window.dispatchEvent(fakeEvent);

  return { prompt: promptFn, preventDefault: fakeEvent.preventDefault };
}

// ─── navigator.onLine mock helper ───────────────────────────────────────────

export function setNavigatorOnLine(value: boolean): void {
  const setter = (globalThis as unknown as Record<string, ((v: boolean) => void) | undefined>).__setNavigatorOnLine;
  setter?.(value);
}

export * from '@testing-library/react';
export { customRender as render };
