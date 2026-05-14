/**
 * verify-pro-suffix-bases.test.ts
 *
 * Regression gate: every base value in
 * annotationService.PRO_SUFFIX_TO_BASE must resolve to a real
 * annotation `*.json` file. If a future rename pass deletes one
 * of these files (the way the May-2026 orphan-rename pass did),
 * this test fails CI before the silent runtime-null regression
 * ships.
 */
import { describe, expect, it } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

const REPO = join(__dirname, '..');
const SCRIPT = join(REPO, 'scripts/verify-pro-suffix-bases.mjs');

describe('PRO_SUFFIX_TO_BASE alias integrity', () => {
  it('every base value resolves to a real annotation file', () => {
    let stdout = '';
    let exitCode = 0;
    try {
      stdout = execSync(`node ${SCRIPT}`, { encoding: 'utf8' });
    } catch (err: unknown) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      exitCode = e.status ?? 1;
      stdout = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    }
    expect(
      exitCode,
      `verify-pro-suffix-bases.mjs failed. Output:\n${stdout}`,
    ).toBe(0);
  });
});
