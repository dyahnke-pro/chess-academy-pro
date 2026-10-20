// THE REV FINGERPRINT GATE (the lead, 2026-10-20). A `*_REV` cache key is a
// promise: "when what this producer writes changes, I move". As a convention it
// was broken for three weeks — REVIEW_NARRATION_REV sat at 6 through weeks of
// narration changes, so David's phone replayed old Review narration for every
// game he had already opened. Now each such key is committed beside a
// fingerprint of its producer's output on fixed inputs, and the pair must move
// together: output changed with the rev still → fail; rev moved with the output
// still → fail too (a needless bump costs every device a rebuild).
//
// Regenerate a pair after a deliberate bump:
//   UPDATE_REV_FINGERPRINTS=1 npx vitest run <the gate's test file>
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export interface RevPair { rev: string | number; parts: Record<string, string> }

/** A short stable hash of any JSON-able value. */
export function fingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

const fileFor = (name: string): string => `src/test/revFingerprints/${name}.json`;

/** Null when the committed pair agrees with (rev, parts); else the failure,
 *  naming what changed and what to do. Writes the pair under UPDATE. */
export function checkRevFingerprint(name: string, rev: string | number, parts: Record<string, string>, testFile: string): string | null {
  const file = fileFor(name);
  if (process.env.UPDATE_REV_FINGERPRINTS === '1') {
    writeFileSync(file, `${JSON.stringify({ rev, parts } satisfies RevPair, null, 2)}\n`);
    return null;
  }
  const regen = `UPDATE_REV_FINGERPRINTS=1 npx vitest run ${testFile}`;
  if (!existsSync(file)) return `${name}: no committed (rev, fingerprint) pair — run ${regen}`;
  const committed = JSON.parse(readFileSync(file, 'utf8')) as RevPair;
  const keys = [...new Set([...Object.keys(committed.parts), ...Object.keys(parts)])];
  const changed = keys.filter((k) => committed.parts[k] !== parts[k]);
  const revMoved = committed.rev !== rev;
  if (changed.length > 0 && !revMoved) {
    return `${name}: the output changed (${changed.join(', ')}) but the rev is still ${String(rev)} — a device would keep serving what it cached. Bump the rev, then run ${regen}`;
  }
  if (changed.length === 0 && revMoved) {
    return `${name}: the rev moved ${String(committed.rev)} → ${String(rev)} but the output did not change — a needless bump rebuilds every device. Put it back to ${String(committed.rev)}.`;
  }
  if (changed.length > 0 && revMoved) {
    return `${name}: rev and output both moved — commit the new pair: run ${regen}`;
  }
  return null;
}
