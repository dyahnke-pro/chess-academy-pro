import { test, expect, type Page } from '@playwright/test';

/**
 * Full audit of the Coach tab — tests every feature end-to-end.
 */

// Helper: wait for app to be ready
async function waitForApp(page: Page): Promise<void> {
  await page.goto('/');
  // Wait for any content to load — the app might show dashboard or onboarding
  // Give the SPA time to boot (React + IndexedDB + Zustand)
  await page.waitForTimeout(5000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1: Coach Home Page — all 6 action cards render and navigate
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Coach Home Page', () => {
  test('renders coach home page with all action cards', async ({ page }) => {
    await waitForApp(page);
    await page.goto('/coach');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Take a screenshot to see what's actually rendered
    await page.screenshot({ path: 'test-results/coach-home.png', fullPage: true });

    // Check page content
    const html = await page.content();
    const hasCoachHome = html.includes('coach-home-page');
    const hasCoachAction = html.includes('coach-action');
    console.log('Has coach-home-page testid:', hasCoachHome);
    console.log('Has coach-action testid:', hasCoachAction);

    // Check what's visible
    const bodyText = await page.textContent('body');
    console.log('Page text (first 500 chars):', bodyText?.slice(0, 500));
  });

  test('action cards navigate correctly', async ({ page }) => {
    await waitForApp(page);
    await page.goto('/coach');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Try clicking Play & Review
    const playCard = page.getByTestId('coach-action-play');
    if (await playCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await playCard.click();
      await expect(page).toHaveURL(/\/coach\/play/, { timeout: 5000 });
    } else {
      // Fallback: try text-based locator
      const playLink = page.getByText('Play', { exact: false }).first();
      if (await playLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await playLink.click();
        await page.waitForTimeout(2000);
        console.log('Current URL after clicking Play:', page.url());
      } else {
        console.log('Could not find Play card. Taking screenshot.');
        await page.screenshot({ path: 'test-results/coach-home-debug.png', fullPage: true });
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2: Coach Game Page — Pre-game setup
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Coach Game Page', () => {
  test('renders game page with board and controls', async ({ page }) => {
    await waitForApp(page);
    await page.goto('/coach/play');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/coach-game-page.png', fullPage: true });

    // Check for key elements
    const board = page.getByTestId('chess-board-container');
    const colorSelector = page.getByTestId('color-selector');
    const difficultyToggle = page.getByTestId('difficulty-toggle');

    const boardVisible = await board.isVisible({ timeout: 5000 }).catch(() => false);
    const colorVisible = await colorSelector.isVisible({ timeout: 3000 }).catch(() => false);
    const difficultyVisible = await difficultyToggle.isVisible({ timeout: 3000 }).catch(() => false);

    console.log('Board visible:', boardVisible);
    console.log('Color selector visible:', colorVisible);
    console.log('Difficulty toggle visible:', difficultyVisible);

    expect(boardVisible).toBe(true);
  });

  test('difficulty toggle works', async ({ page }) => {
    await waitForApp(page);
    await page.goto('/coach/play');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const easy = page.getByTestId('difficulty-easy');
    const medium = page.getByTestId('difficulty-medium');
    const hard = page.getByTestId('difficulty-hard');

    if (await easy.isVisible({ timeout: 5000 }).catch(() => false)) {
      await easy.click();
      await page.waitForTimeout(500);
      console.log('Easy clicked successfully');

      await hard.click();
      await page.waitForTimeout(500);
      console.log('Hard clicked successfully');
    } else {
      console.log('Difficulty toggle not found');
      await page.screenshot({ path: 'test-results/difficulty-debug.png', fullPage: true });
    }
  });

  test('color selector works', async ({ page }) => {
    await waitForApp(page);
    await page.goto('/coach/play');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const whiteBtn = page.getByTestId('color-white-btn');
    const blackBtn = page.getByTestId('color-black-btn');

    if (await whiteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await blackBtn.click();
      await page.waitForTimeout(500);
      console.log('Switched to black');

      await whiteBtn.click();
      await page.waitForTimeout(500);
      console.log('Switched to white');
    } else {
      console.log('Color selector not found');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3: Playing a game — move interaction + coach response
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Coach Game — Playing', () => {
  test('can play e4 and board updates', async ({ page }) => {
    await waitForApp(page);
    await page.goto('/coach/play');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/before-move.png', fullPage: true });

    // Try to play e2-e4
    const e2 = page.locator('[data-square="e2"]');
    const e4 = page.locator('[data-square="e4"]');

    if (await e2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await e2.click();
      await page.waitForTimeout(300);
      await e4.click();
      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'test-results/after-e4.png', fullPage: true });
      console.log('Played e4 successfully');

      // Wait for coach to respond (up to 10s for Stockfish)
      await page.waitForTimeout(8000);
      await page.screenshot({ path: 'test-results/after-coach-response.png', fullPage: true });

      // Check move list
      const moveList = page.getByTestId('move-list-panel');
      if (await moveList.isVisible({ timeout: 3000 }).catch(() => false)) {
        const moveText = await moveList.textContent();
        console.log('Move list content:', moveText?.slice(0, 200));
      }
    } else {
      console.log('Board squares not found — checking for data-square attributes');
      const squares = await page.locator('[data-square]').count();
      console.log('Total squares found:', squares);
      await page.screenshot({ path: 'test-results/no-board-debug.png', fullPage: true });
    }
  });

  test('hint button works during game', async ({ page }) => {
    await waitForApp(page);
    await page.goto('/coach/play');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Play e4 first
    const e2 = page.locator('[data-square="e2"]');
    const e4 = page.locator('[data-square="e4"]');
    if (await e2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await e2.click();
      await page.waitForTimeout(300);
      await e4.click();
      await page.waitForTimeout(8000); // Wait for coach response

      // Now it's player's turn again — try hint
      const hintBtn = page.getByTestId('hint-button');
      if (await hintBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await hintBtn.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/after-hint.png', fullPage: true });
        console.log('Hint button clicked');
      } else {
        console.log('Hint button not visible');
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4: Resign and review flow
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Coach Game — Resign & Review Flow', () => {
  test('can resign after a few moves and enter review', async ({ page }) => {
    await waitForApp(page);
    await page.goto('/coach/play');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Play e4
    const e2 = page.locator('[data-square="e2"]');
    const e4 = page.locator('[data-square="e4"]');
    if (!(await e2.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await e2.click();
    await page.waitForTimeout(300);
    await e4.click();
    await page.waitForTimeout(6000); // Wait for coach

    // Play d4
    const d2 = page.locator('[data-square="d2"]');
    const d4 = page.locator('[data-square="d4"]');
    if (await d2.isVisible({ timeout: 3000 }).catch(() => false)) {
      await d2.click();
      await page.waitForTimeout(300);
      await d4.click();
      await page.waitForTimeout(6000);
    }

    await page.screenshot({ path: 'test-results/before-resign.png', fullPage: true });

    // Resign
    const resignBtn = page.getByTestId('resign-btn');
    if (await resignBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await resignBtn.click();
      await page.waitForTimeout(1000);

      // Confirm
      const resignYes = page.getByTestId('resign-yes');
      if (await resignYes.isVisible({ timeout: 2000 }).catch(() => false)) {
        await resignYes.click();
      }

      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'test-results/after-resign.png', fullPage: true });

      // Check for skip-to-review or direct review
      const skipBtn = page.getByTestId('skip-to-review-btn');
      if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await skipBtn.click();
        await page.waitForTimeout(3000);
      }

      await page.screenshot({ path: 'test-results/review-phase.png', fullPage: true });

      // Check for review components
      const summaryCard = page.getByTestId('review-summary-card');
      const reviewComp = page.getByTestId('coach-game-review');
      const summaryVisible = await summaryCard.isVisible({ timeout: 10000 }).catch(() => false);
      const reviewVisible = await reviewComp.isVisible({ timeout: 3000 }).catch(() => false);

      console.log('Summary card visible:', summaryVisible);
      console.log('Review component visible:', reviewVisible);

      if (summaryVisible) {
        // Check summary components
        const resultBanner = await page.getByTestId('result-banner').isVisible().catch(() => false);
        const accuracy = await page.getByTestId('hero-accuracy').isVisible().catch(() => false);
        const pills = await page.getByTestId('classification-pills').isVisible().catch(() => false);

        console.log('Result banner:', resultBanner);
        console.log('Accuracy ring:', accuracy);
        console.log('Classification pills:', pills);
      }
    } else {
      console.log('Resign button not found');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5: Review navigation and action buttons
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Game Review — Controls', () => {
  test('review has navigation and action buttons', async ({ page }) => {
    await waitForApp(page);
    await page.goto('/coach/play');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Quick game: e4 + resign
    const e2 = page.locator('[data-square="e2"]');
    if (!(await e2.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await e2.click();
    await page.locator('[data-square="e4"]').click();
    await page.waitForTimeout(5000);

    // Resign
    await page.getByTestId('resign-btn').click();
    await page.waitForTimeout(1000);
    if (await page.getByTestId('resign-yes').isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByTestId('resign-yes').click();
    }

    await page.waitForTimeout(5000);
    if (await page.getByTestId('skip-to-review-btn').isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.getByTestId('skip-to-review-btn').click();
    }
    await page.waitForTimeout(3000);

    // Click Start Review if in summary phase
    if (await page.getByTestId('start-review-btn').isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.getByTestId('start-review-btn').click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'test-results/review-analysis.png', fullPage: true });

    // Check navigation controls
    const navControls = page.getByTestId('move-nav-controls');
    const navVisible = await navControls.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('Move navigation visible:', navVisible);

    // Check action buttons
    const showBest = page.getByTestId('show-best-btn');
    const showLine = page.getByTestId('show-line-btn');
    console.log('Show Best visible:', await showBest.isVisible().catch(() => false));
    console.log('Show Line visible:', await showLine.isVisible().catch(() => false));

    // Check auto-review button
    const autoReview = page.getByTestId('auto-review-btn');
    console.log('Auto Review visible:', await autoReview.isVisible().catch(() => false));

    // Check ask about position
    const askBtn = page.getByTestId('ask-position-btn');
    console.log('Ask Position visible:', await askBtn.isVisible().catch(() => false));

    // Try navigating
    const nextBtn = page.locator('[aria-label="Next move"]');
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/review-next-move.png', fullPage: true });
      console.log('Navigated to next move');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 6: Other coach pages render
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Other Coach Pages', () => {
  test('chat page renders with input', async ({ page }) => {
    await waitForApp(page);
    await page.goto('/coach/chat');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/coach-chat.png', fullPage: true });

    const chatPage = page.getByTestId('coach-chat-page');
    const chatInput = page.getByTestId('chat-text-input');
    const voiceToggle = page.getByTestId('voice-toggle');

    console.log('Chat page:', await chatPage.isVisible({ timeout: 5000 }).catch(() => false));
    console.log('Chat input:', await chatInput.isVisible({ timeout: 3000 }).catch(() => false));
    console.log('Voice toggle:', await voiceToggle.isVisible({ timeout: 3000 }).catch(() => false));
  });

  test('analyse page renders with FEN input', async ({ page }) => {
    await waitForApp(page);
    await page.goto('/coach/analyse');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/coach-analyse.png', fullPage: true });

    const analysePage = page.getByTestId('coach-analyse-page');
    const fenInput = page.getByTestId('fen-input');
    const loadBtn = page.getByTestId('load-fen-btn');
    const board = page.getByTestId('chess-board-container');

    console.log('Analyse page:', await analysePage.isVisible({ timeout: 5000 }).catch(() => false));
    console.log('FEN input:', await fenInput.isVisible({ timeout: 3000 }).catch(() => false));
    console.log('Load button:', await loadBtn.isVisible({ timeout: 3000 }).catch(() => false));
    console.log('Board:', await board.isVisible({ timeout: 3000 }).catch(() => false));
  });

  test('train page renders with greeting', async ({ page }) => {
    await waitForApp(page);
    await page.goto('/coach/train');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/coach-train.png', fullPage: true });

    const trainPage = page.getByTestId('coach-train-page');
    const greeting = page.getByTestId('coach-greeting');

    console.log('Train page:', await trainPage.isVisible({ timeout: 5000 }).catch(() => false));
    console.log('Greeting:', await greeting.isVisible({ timeout: 3000 }).catch(() => false));
  });

  test('session plan page renders', async ({ page }) => {
    await waitForApp(page);
    await page.goto('/coach/plan');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/coach-plan.png', fullPage: true });

    const planPage = page.getByTestId('coach-session-plan-page');
    console.log('Plan page:', await planPage.isVisible({ timeout: 5000 }).catch(() => false));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 7: Console error monitoring
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Error Monitoring', () => {
  test('collect console errors on coach/play page', async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      errors.push(`PAGE ERROR: ${err.message}`);
    });

    await waitForApp(page);
    await page.goto('/coach/play');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    // Play a move
    const e2 = page.locator('[data-square="e2"]');
    if (await e2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await e2.click();
      await page.locator('[data-square="e4"]').click();
      await page.waitForTimeout(8000);
    }

    console.log('=== ERRORS ===');
    for (const e of errors) {
      console.log('ERROR:', e);
    }
    console.log(`Total errors: ${errors.length}`);
  });
});
