// The ONE marketing version (2026-10-21). Xcode Cloud stamps every build with
// PINNED_MARKETING_VERSION from ci_post_clone.sh; the App Store Connect scripts
// used to carry their own copy — eleven workflows said '4.0.6' and the scripts
// fell back to '3.0' / '3.2' — so a hotfix built as 4.0.7 would have been
// attached to, and submitted under, the closed 4.0.6 version.
//
// APP_VERSION in the environment still wins, for a deliberate one-off.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const POST_CLONE = join(dirname(fileURLToPath(import.meta.url)), '../../ios/App/ci_scripts/ci_post_clone.sh');

export function pinnedAppVersion() {
  const m = readFileSync(POST_CLONE, 'utf8').match(/^PINNED_MARKETING_VERSION="([0-9]+(?:\.[0-9]+){1,2})"/m);
  if (!m) throw new Error(`PINNED_MARKETING_VERSION not found in ${POST_CLONE}`);
  return m[1];
}

export function appVersion() {
  return process.env.APP_VERSION || pinnedAppVersion();
}
