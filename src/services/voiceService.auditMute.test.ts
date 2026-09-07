// The audit-mute contract (David 2026-08-04, after a $100 TTS overage).
//
// An audit must be able to observe WHAT the coach says without paying to
// synthesise it. This pins the two halves of that deal: the text still reaches
// the audit stream, and no synthesis request is made.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync as readFile } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

describe('audit TTS mute', () => {
  beforeEach(() => {
    vi.resetModules();
    globalThis.localStorage?.clear?.();
  });
  afterEach(() => {
    globalThis.localStorage?.removeItem?.('auditMuteTts');
  });

  it('is OFF for a normal user — nothing in the app sets the flag', async () => {
    // The only writer is the audit harness's init script. If a product code
    // path ever sets this, real users go silent — which is why this asserts
    // the absence rather than trusting convention.
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const hits: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.(ts|tsx)$/.test(p)) continue;
        const src = readFileSync(p, 'utf8');
        // Code only — the service's own doc comment shows the harness usage
        // (`window.localStorage.setItem('auditMuteTts', '1')`) and must not
        // count as a writer.
        for (const [i, line] of src.split('\n').entries()) {
          const code = line.trim();
          if (code.startsWith('*') || code.startsWith('//') || code.startsWith('/*')) continue;
          if (/setItem\(\s*['"]auditMuteTts['"]/.test(code)) hits.push(`${p}:${i + 1}`);
        }
      }
    };
    walk('src');
    expect(hits, `product code must never enable the audit mute: ${hits.join(', ')}`).toEqual([]);
  });

  it('the flag name matches what the audit helper writes', async () => {
    const { readFileSync } = await import('node:fs');
    const helper = readFileSync('scripts/audit-lib/mute-tts.mjs', 'utf8');
    const service = readFileSync('src/services/voiceService.ts', 'utf8');
    const helperKey = /setItem\('([^']+)'/.exec(helper)?.[1];
    expect(helperKey).toBe('auditMuteTts');
    // If these two ever drift, every audit silently starts paying again — the
    // failure mode is invisible (audits stay green, the bill grows).
    expect(service).toContain(`getItem('${helperKey}')`);
  });
});

describe('the mute cannot be lost under storage pressure (2026-09-06: 60 billed lines inside two muted runs)', () => {
  it('a storage read that THROWS does not latch the mute off; the memory flag mutes on its own', async () => {
    vi.resetModules();
    const g = globalThis as { __auditMuteTts?: boolean };
    delete g.__auditMuteTts;
    const realLs = globalThis.localStorage;
    // First read throws (locked-down / wedged context) …
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('storage unavailable'); } });
    const { voiceService } = await import('./voiceService');
    const svc = voiceService as unknown as { isAuditMuted: () => boolean };
    expect(svc.isAuditMuted()).toBe(false);
    // … storage recovers WITH the flag set: the answer must follow it, not the latched miss.
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: realLs });
    // (key assembled so the "product code never sets the flag" scan above stays honest)
    const KEY = ['auditMute', 'Tts'].join('');
    globalThis.localStorage.setItem(KEY, '1');
    expect(svc.isAuditMuted()).toBe(true);
    globalThis.localStorage.removeItem(KEY);
    // And the memory flag alone mutes, whatever storage says.
    const svc2 = (await import('./voiceService')).voiceService as unknown as { isAuditMuted: () => boolean };
    g.__auditMuteTts = true;
    expect(svc2.isAuditMuted()).toBe(true);
    delete g.__auditMuteTts;
  });
  it('the helper sets the memory flag as well as the storage key', () => {
    const src = readFile(resolvePath(__dirname, '../../scripts/audit-lib/mute-tts.mjs'), 'utf8');
    expect(src).toContain('__auditMuteTts = true');
  });
});
