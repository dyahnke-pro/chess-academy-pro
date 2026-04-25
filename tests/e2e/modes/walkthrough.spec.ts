import { test, expect } from '@playwright/test';

/**
 * Regression guard for WO-BUG-WALKTHROUGH-NAV: Next / Prev / Reset
 * must update the board state in a walkthrough session. A silent
 * regression here shipped twice before; this test must always pass.
 */

test('walkthrough Vienna: board responds to Next/Prev/Reset', async ({ page }) => {
  await page.goto('/coach/session/walkthrough?subject=vienna&orientation=white');

  const board = page.getByTestId('consistent-chessboard').or(page.locator('[data-testid*="board"]').first());
  await expect(board).toBeVisible({ timeout: 15_000 });

  // Capture an initial board signature. We probe the DOM for piece
  // placement rather than a specific FEN string so the test is resilient
  // to internal state-container changes.
  const initialSignature = await board.innerHTML();

  const next = page.getByRole('button', { name: /next/i });
  await expect(next).toBeVisible();

  await next.click();
  await next.click();
  await next.click();

  const afterNext = await board.innerHTML();
  expect(afterNext).not.toBe(initialSignature);

  const prev = page.getByRole('button', { name: /prev|back/i });
  await prev.click();
  const afterPrev = await board.innerHTML();
  expect(afterPrev).not.toBe(afterNext);

  const reset = page.getByRole('button', { name: /reset|restart/i });
  await reset.click();
  // After reset we're back at the starting position.
  const afterReset = await board.innerHTML();
  expect(afterReset).toBe(initialSignature);
});
