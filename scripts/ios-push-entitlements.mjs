#!/usr/bin/env node
/**
 * Give the generated iOS project the Push Notifications entitlement
 * (David 2026-11-25). `cap add ios` regenerates ios/ with no entitlements
 * file, so every build — Xcode Cloud's ci_post_clone.sh and a local
 * `npm run setup:ios` — runs this after `cap sync`:
 *
 *   1. copy ios-patches/App/App.entitlements → ios/App/App/App.entitlements
 *   2. point the App target's build configurations at it
 *      (CODE_SIGN_ENTITLEMENTS = App/App.entitlements;)
 *
 * Idempotent. FAILS (exit 1) when the project has no App target settings to
 * patch, or the entitlement is not there afterwards — a build without it
 * ships an app that can never receive a push, and nothing else would say so.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

export const ENTITLEMENTS_SETTING = 'CODE_SIGN_ENTITLEMENTS = App/App.entitlements;';

/**
 * Add the entitlements setting to every build configuration that carries the
 * App target's Info.plist (Debug and Release). PURE.
 * Returns the new text and how many configurations carry the setting.
 */
export function addEntitlementsSetting(pbx) {
  const lines = pbx.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    out.push(line);
    const m = /^(\s*)INFOPLIST_FILE = App\/Info\.plist;\s*$/.exec(line);
    if (!m) continue;
    // Already patched? Look within this buildSettings block (until its closing brace).
    let has = false;
    for (let j = i - 1; j >= 0 && !/buildSettings = \{/.test(lines[j]); j -= 1) {
      if (lines[j].includes('CODE_SIGN_ENTITLEMENTS')) { has = true; break; }
    }
    for (let j = i + 1; j < lines.length && !/^\s*\};/.test(lines[j]); j += 1) {
      if (lines[j].includes('CODE_SIGN_ENTITLEMENTS')) { has = true; break; }
    }
    if (!has) out.push(`${m[1]}${ENTITLEMENTS_SETTING}`);
  }
  const text = out.join('\n');
  const count = text.split(ENTITLEMENTS_SETTING).length - 1;
  return { text, count };
}

function main() {
  const root = process.argv[2] ?? '.';
  const src = `${root}/ios-patches/App/App.entitlements`;
  const dest = `${root}/ios/App/App/App.entitlements`;
  const pbxPath = `${root}/ios/App/App.xcodeproj/project.pbxproj`;
  if (!existsSync(pbxPath)) {
    console.error(`[ios-push-entitlements] ${pbxPath} not found — run 'npx cap add ios' first.`);
    process.exit(1);
  }
  copyFileSync(src, dest);
  const { text, count } = addEntitlementsSetting(readFileSync(pbxPath, 'utf8'));
  if (count < 2) {
    console.error(`[ios-push-entitlements] FATAL — only ${count} App build configuration(s) carry CODE_SIGN_ENTITLEMENTS (need Debug + Release). The app could never receive a push.`);
    process.exit(1);
  }
  writeFileSync(pbxPath, text);
  if (!readFileSync(dest, 'utf8').includes('aps-environment')) {
    console.error('[ios-push-entitlements] FATAL — App.entitlements has no aps-environment.');
    process.exit(1);
  }
  console.log(`[ios-push-entitlements] aps-environment entitlement wired into ${count} build configurations`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
