/**
 * THE BUILD ID NEVER GOES INTO A JS CHUNK (2026-09-26).
 *
 * `vite.config.ts` stamps every build with `<sha>+Date.now()`. While that
 * stamp was a `define` inlined into appAuditor's chunk, every build renamed
 * that chunk AND every chunk importing it by its hashed name — measured at
 * 142 files / 8.7 MB on a build whose code had not changed — and every OTA
 * re-shipped them. The stamp now lives in index.html as
 * `<meta name="app-build-id">`, which already changes every build.
 *
 * This gate fails if any per-build value comes back as a JS `define`, or if
 * `getBuildId()` stops reading the meta tag.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const viteConfig = readFileSync(resolve(__dirname, '../../vite.config.ts'), 'utf8');

describe('build id stays out of JS chunks', () => {
  it('vite.config.ts does not define __BUILD_ID__ (or the buildId value) into JS', () => {
    const defineBlock = viteConfig.slice(viteConfig.indexOf('define: {'), viteConfig.indexOf('plugins: ['));
    expect(defineBlock.length, 'define block not found — gate would pass vacuously').toBeGreaterThan(20);
    expect(defineBlock).not.toMatch(/__BUILD_ID__/);
    expect(defineBlock).not.toMatch(/\bbuildId\b/);
    expect(defineBlock).not.toMatch(/Date\.now\(\)/);
  });

  it('vite.config.ts stamps the id into index.html', () => {
    expect(viteConfig).toMatch(/name: 'app-build-id'/);
    expect(viteConfig).toMatch(/transformIndexHtml/);
  });

  describe('getBuildId reads the meta tag', () => {
    beforeEach(() => {
      vi.resetModules();
      document.head.querySelectorAll('meta[name="app-build-id"]').forEach((m) => m.remove());
    });

    it('returns the meta content', async () => {
      const meta = document.createElement('meta');
      meta.name = 'app-build-id';
      meta.content = 'abc1234d+1790000000000';
      document.head.appendChild(meta);
      const { getBuildId } = await import('../services/appAuditor');
      expect(getBuildId()).toBe('abc1234d+1790000000000');
    });

    it("returns 'unknown' when no tag is present", async () => {
      const { getBuildId } = await import('../services/appAuditor');
      expect(getBuildId()).toBe('unknown');
    });
  });
});
