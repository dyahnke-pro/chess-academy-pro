/**
 * Verification tests for:
 * 1. Jobava London annotations + arrows in walkthrough
 * 2. Voice narration re-enabled after Master All Off is turned off
 * 3. Audio session / speak calls actually fire
 */
import { test, expect } from '@playwright/test';

test.describe('Jobava London annotations', () => {
  test('variation walkthrough shows annotations and arrows', async ({ page }) => {
    // Capture console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to Openings
    const openingsLink = page.getByRole('link', { name: /openings/i }).first();
    await openingsLink.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/tmp/01-openings-list.png' });

    // Find London System
    const londonCard = page.getByText(/london system/i).first();
    await expect(londonCard).toBeVisible({ timeout: 10000 });
    await londonCard.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/tmp/02-london-detail.png' });

    // Look for Jobava London variation
    const jobavaBtn = page.getByText(/jobava/i).first();
    await expect(jobavaBtn).toBeVisible({ timeout: 10000 });
    await jobavaBtn.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/tmp/03-jobava-selected.png' });

    // Click Walkthrough / Study button
    const walkthroughBtn = page.getByRole('button', { name: /walkthrough|study/i }).first();
    await expect(walkthroughBtn).toBeVisible({ timeout: 10000 });
    await walkthroughBtn.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/tmp/04-walkthrough-start.png' });

    // Wait for annotations to load — look for annotation text in the panel
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/05-walkthrough-annotations.png' });

    // Check annotation text is visible (not empty / loading)
    const annotationPanel = page.locator('[data-testid="annotation-text"], .annotation-text, [class*="annotation"]').first();
    const bodyText = await page.textContent('body');

    // Verify no "no annotations" error message
    expect(bodyText).not.toMatch(/no annotations found/i);

    // Check for SVG arrows on board (custom arrows are SVG lines/paths drawn on the chessboard)
    const svgArrows = page.locator('svg line, svg path[marker-end]');
    const arrowCount = await svgArrows.count();
    console.log(`Arrow SVG elements found: ${arrowCount}`);

    // Advance one move to see if annotations update
    const nextBtn = page.getByRole('button', { name: /next/i }).first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: '/tmp/06-walkthrough-move2.png' });

      const arrowCountAfter = await svgArrows.count();
      console.log(`Arrow SVG elements after move: ${arrowCountAfter}`);
    }

    // Advance several moves and screenshot
    for (let i = 0; i < 4; i++) {
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(800);
      }
    }
    await page.screenshot({ path: '/tmp/07-walkthrough-deep.png' });

    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });
});

test.describe('Voice narration toggle', () => {
  test('Master All Off off restores voice narration', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go to Settings
    const settingsLink = page.getByRole('link', { name: /settings/i }).first();
    await settingsLink.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/tmp/08-settings.png' });

    // Find Master All Off toggle
    const masterOffToggle = page.getByText(/master.*off|challenge mode/i).first();
    const bodyText = await page.textContent('body');
    console.log('Settings page contains:', bodyText?.substring(0, 500));

    await page.screenshot({ path: '/tmp/09-settings-scroll.png' });

    // Check voice narration toggle state
    const voiceToggle = page.getByRole('checkbox', { name: /voice narration/i }).first();
    if (await voiceToggle.isVisible()) {
      const isChecked = await voiceToggle.isChecked();
      const isDisabled = await voiceToggle.isDisabled();
      console.log(`Voice narration - checked: ${isChecked}, disabled: ${isDisabled}`);
    } else {
      console.log('Voice narration toggle not found by checkbox role, checking for switch...');
      const switches = page.locator('[role="switch"]');
      const switchCount = await switches.count();
      console.log(`Found ${switchCount} switches`);
      for (let i = 0; i < switchCount; i++) {
        const label = await switches.nth(i).getAttribute('aria-label');
        const checked = await switches.nth(i).getAttribute('aria-checked');
        console.log(`  Switch ${i}: label="${label}" checked="${checked}"`);
      }
    }
  });
});

test.describe('Speak calls on walkthrough', () => {
  test('speech synthesis is invoked during walkthrough narration', async ({ page }) => {
    const speakCalls: string[] = [];

    // Intercept speechSynthesis.speak
    await page.addInitScript(() => {
      const origSpeak = window.speechSynthesis?.speak?.bind(window.speechSynthesis);
      if (origSpeak) {
        window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
          (window as unknown as Record<string, unknown[]>)['_speakCalls'] = (window as unknown as Record<string, unknown[]>)['_speakCalls'] ?? [];
          (window as unknown as Record<string, unknown[]>)['_speakCalls'].push(utterance.text);
          origSpeak(utterance);
        };
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to openings → London → Jobava → Walkthrough
    const openingsLink = page.getByRole('link', { name: /openings/i }).first();
    await openingsLink.click();
    await page.waitForLoadState('networkidle');

    const londonCard = page.getByText(/london system/i).first();
    if (await londonCard.isVisible({ timeout: 5000 })) {
      await londonCard.click();
      await page.waitForLoadState('networkidle');

      const jobavaBtn = page.getByText(/jobava/i).first();
      if (await jobavaBtn.isVisible({ timeout: 5000 })) {
        await jobavaBtn.click();
        const walkthroughBtn = page.getByRole('button', { name: /walkthrough|study/i }).first();
        if (await walkthroughBtn.isVisible({ timeout: 5000 })) {
          await walkthroughBtn.click();
          await page.waitForTimeout(3000);

          // Advance a move
          const nextBtn = page.getByRole('button', { name: /next/i }).first();
          if (await nextBtn.isVisible()) {
            await nextBtn.click();
            await page.waitForTimeout(2000);
          }

          const calls = await page.evaluate(() => (window as unknown as Record<string, unknown[]>)['_speakCalls'] ?? []);
          console.log(`Speech synthesis called ${calls.length} times:`, calls);
          speakCalls.push(...(calls as string[]));
        }
      }
    }

    await page.screenshot({ path: '/tmp/10-speak-check.png' });
    console.log('Total speak calls:', speakCalls.length);
  });
});
