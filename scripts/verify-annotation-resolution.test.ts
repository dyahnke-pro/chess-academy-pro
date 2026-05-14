/**
 * verify-annotation-resolution.test.ts
 *
 * Three-part regression gate (delegates to
 * scripts/verify-annotation-resolution.mjs):
 *
 *   1. PRO_SUFFIX_TO_BASE — every value resolves to a real
 *      annotation file.
 *   2. LEGACY_ID_TO_BASE  — every value resolves to a real
 *      annotation file.
 *   3. Reachability — every entry in repertoire.json,
 *      gambits.json, and pro-repertoires.json resolves to an
 *      annotation via the resolver chain.
 *
 * Locks the invariant that the openings tab can render real
 * annotation prose for every user-surfaced opening. If a future
 * rename pass moves/deletes annotation files, this gate fails
 * CI before the silent runtime regression ships.
 */
import { describe, expect, it } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

const REPO = join(__dirname, '..');
const SCRIPT = join(REPO, 'scripts/verify-annotation-resolution.mjs');

describe('Annotation resolver integrity', () => {
  it('every pro suffix, legacy id, and repertoire/gambit/pro entry resolves', () => {
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
      `verify-annotation-resolution.mjs failed. Output:\n${stdout}`,
    ).toBe(0);
  });
});
