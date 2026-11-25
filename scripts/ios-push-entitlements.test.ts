import { describe, it, expect } from 'vitest';
// @ts-expect-error — a plain .mjs build script, no type declarations
import { addEntitlementsSetting, ENTITLEMENTS_SETTING } from './ios-push-entitlements.mjs';

// The two App-target configurations of Capacitor 8's generated project
// (ios-spm-template), cut to the lines the patch reads.
const PBX = [
  '\t\t504EC3171FED79650016851F /* Debug */ = {',
  '\t\t\tisa = XCBuildConfiguration;',
  '\t\t\tbuildSettings = {',
  '\t\t\t\tCODE_SIGN_STYLE = Automatic;',
  '\t\t\t\tINFOPLIST_FILE = App/Info.plist;',
  '\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.chessacademy.pro;',
  '\t\t\t};',
  '\t\t};',
  '\t\t504EC3181FED79650016851F /* Release */ = {',
  '\t\t\tisa = XCBuildConfiguration;',
  '\t\t\tbuildSettings = {',
  '\t\t\t\tCODE_SIGN_STYLE = Automatic;',
  '\t\t\t\tINFOPLIST_FILE = App/Info.plist;',
  '\t\t\t};',
  '\t\t};',
].join('\n');

describe('ios-push-entitlements', () => {
  it('points Debug and Release at App.entitlements', () => {
    const { text, count } = addEntitlementsSetting(PBX) as { text: string; count: number };
    expect(count).toBe(2);
    expect(text).toContain(`\t\t\t\tINFOPLIST_FILE = App/Info.plist;\n\t\t\t\t${ENTITLEMENTS_SETTING as string}`);
  });

  it('is idempotent', () => {
    const once = (addEntitlementsSetting(PBX) as { text: string }).text;
    const twice = addEntitlementsSetting(once) as { text: string; count: number };
    expect(twice.text).toBe(once);
    expect(twice.count).toBe(2);
  });

  it('reports 0 on a project with no App target settings (the script then fails the build)', () => {
    expect((addEntitlementsSetting('nothing here') as { count: number }).count).toBe(0);
  });
});
