import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { identityFor, openingIdentityLine, setOpeningIdentity } from './openingIdentity';

const FILE = 'public/data/opening-identity.json';

describe('openingIdentity', () => {
  beforeAll(() => { setOpeningIdentity(JSON.parse(readFileSync(FILE, 'utf8'))); });

  it('the shipped file is what the builder makes today (not stale)', () => {
    const before = readFileSync(FILE, 'utf8');
    execFileSync(process.execPath, ['scripts/build-opening-identity.mjs'], { stdio: 'ignore' });
    expect(readFileSync(FILE, 'utf8')).toBe(before);
  }, 120_000);

  it('Alekhine: provokes the pawn at the knight, from the student\'s seat', () => {
    const asBlack = openingIdentityLine('Alekhine Defense', 'b', 'seat');
    expect(asBlack?.text).toMatch(/they (almost always|usually|often|sometimes) answer with the pawn to e5, a centre pawn thrown forward at your knight on f6/);
    const asWhite = openingIdentityLine('Alekhine Defense', 'w', 'seat');
    expect(asWhite?.text).toMatch(/you (almost always|usually|often|sometimes) answer with the pawn to e5, a centre pawn thrown forward at their knight on f6/);
    expect(openingIdentityLine('Alekhine Defense', 'w', 'demo')?.text).toMatch(/White (almost always|usually|often|sometimes) answers with/);
  });

  it('a gambit that lasts is said with its length; an ordinary opening is not a gambit', () => {
    expect(openingIdentityLine('Italian Game: Evans Gambit', 'w', 'seat')?.text).toMatch(/you stay a pawn down for at least \d+ moves/);
    expect(openingIdentityLine("Queen's Gambit", 'w', 'seat')?.text ?? '').not.toMatch(/pawn down/);
  });

  it('an e4/e5 standoff is not a locked centre; a real chain is', () => {
    expect(openingIdentityLine('Italian Game', 'w', 'seat')?.text ?? '').not.toMatch(/locks the centre/);
    expect(openingIdentityLine('French Defense: Advance Variation', 'b', 'seat')?.text).toMatch(/locks the centre, pawns on e5 and e6/);
  });

  it('a variation falls back to its named parent', () => {
    expect(identityFor('Alekhine Defense: Some Unknown Line, Deep Sub')?.name).toBe('Alekhine Defense');
  });

  it('famous games are over-the-board masters only', () => {
    const all = Object.values(JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, { famous: Array<{ event: string | null }> }>);
    for (const r of all) for (const g of r.famous) expect(g.event ?? '').not.toMatch(/chess\.com|lichess|blitz|bullet|rapid/i);
  });
});
