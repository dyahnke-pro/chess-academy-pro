// THE OTA VERSION MUST MEAN THE SAME THING ON BOTH SIDES OF THE COMPARISON.
//
// 🚨 Found in PostHog, not by any audit (David 2026-08-16: "comb through the
// audit report on posthog. Catch the errors that you have been regularly
// missing today"). `ota_download_failed` had fired 10 times across 7 REAL
// native iOS devices in 7 days — a fortnight of it in the data — and no
// browser audit could ever have seen it, because OTA is not a browser flow.
//
// ROOT CAUSE: `git rev-parse --short HEAD` obeys `core.abbrev`, which defaults
// to AUTO. Git lengthens the abbreviation whenever 7 characters would be
// ambiguous in that object database — so two machines building the SAME COMMIT
// mint different strings. The wild data shows both forms of the same commits:
// f929e5b / f929e5b3, 90c89ee / 90c89ee5, 7ba2cf9 / 7ba2cf96.
//
// Three sites minted it and they run on different machines:
//   · ios/App/ci_scripts/ci_post_clone.sh  (Xcode Cloud — the BUILTIN stamp)
//   · .github/workflows/daily-deploy.yml   (the runner — the PUBLISHED bundle)
//   · scripts/ci/publish-ota-bundle.mjs    (its fallback)
//
// The device compares version STRINGS. A length difference reads as "update
// available" for the bundle it is already running — the PostHog rows include
// running == updateTo (c02ae379 → c02ae379, 18190383 → 18190383) — and since
// the blob path is `ota/bundles/<version>.zip`, the URL it then fetches is for
// a name that was never uploaded. Hence the download failure.
//
// Any ONE site drifting breaks the comparison, so this gates all three.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const read = (rel: string): string => readFileSync(resolve(ROOT, rel), 'utf8');

/** Code only. The first version of this check read the whole file and tripped
 *  on its own explanatory comment — the publish script's note EXPLAINS the bare
 *  `--short` defect while the code below it uses `--short=8`. A gate that greps
 *  prose reports the documentation as the bug. */
const code = (rel: string): string => read(rel)
  .split('\n')
  .filter((l) => !/^\s*(?:\/\/|#|\*|\/\*)/.test(l))
  .join('\n');

const MINTERS = [
  'ios/App/ci_scripts/ci_post_clone.sh',
  '.github/workflows/daily-deploy.yml',
  'scripts/ci/publish-ota-bundle.mjs',
];

describe('the OTA bundle version is length-stable across machines', () => {
  it.each(MINTERS)('%s pins the abbreviation length', (rel) => {
    const src = code(rel);
    // A BARE `--short` is the defect: it is machine-dependent.
    const bare = /rev-parse\s+(?:-C\s+"?\$?\{?[A-Za-z_]*\}?"?\s+)?--short(?!=)/.test(src);
    expect(bare, `${rel} uses bare --short; core.abbrev is auto, so its length varies by machine`).toBe(false);
  });

  it('all three pin the SAME length — a shared length or none at all', () => {
    const lengths = new Set(
      MINTERS.flatMap((rel) => [...code(rel).matchAll(/rev-parse\s+(?:-C\s+\S+\s+)?--short=(\d+)/g)]
        .map((m) => m[1])),
    );
    expect(lengths.size, `sites disagree on abbreviation length: ${[...lengths].join(', ')}`).toBe(1);
  });

  it('the builtin stamp and the published bundle agree on the command', () => {
    // Both halves of the comparison must derive the version the same way. If
    // one ever switches to a tag, a date, or the full SHA, the other has to
    // follow in the same commit or every device sees a phantom update.
    expect(code('ios/App/ci_scripts/ci_post_clone.sh')).toContain('rev-parse --short=8');
    expect(code('.github/workflows/daily-deploy.yml')).toContain('rev-parse --short=8');
  });
});
