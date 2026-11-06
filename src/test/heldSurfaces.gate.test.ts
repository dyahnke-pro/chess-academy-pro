import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { HELD_FROM_RELEASE, isHeldRoute, type HeldSurface } from '../data/heldSurfaces';
import { APP_ROUTES_MANIFEST } from '../data/appRoutesManifest';
import { FIRST_RUN_OPENER } from '../services/firstRunPickers';
import { matchThinkingLessonRequest } from '../services/customLessonPlan';
import { bookChipForClaims } from '../data/bookChips';
import { rankUpNext } from '../services/upNextPicker';
import { APP_FUNCTION_CHIPS } from '../data/coachGreetings';

/**
 * HELD FROM RELEASE (David 2026-11-06: "I also want learn how to think, the
 * campaign, and the library tabs removed from next submission. Just remove the
 * UI"). While a surface is held nothing in the app opens it, and every door
 * reads the ONE table (`heldSurfaces.ts`): a file that links to a held route
 * without importing it fails here.
 */
const SRC = join(process.cwd(), 'src');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });
}

const stripComments = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Files that may name a held route without reading the table — each with
 *  why it is not a door. */
const NOT_A_DOOR: Record<string, string> = {
  'App.tsx': 'the routes themselves; a held route still answers a typed URL',
  'components/Campaign/CampaignMapPage.tsx': 'inside the Campaign',
  'components/Coach/CoachesLibraryPage.tsx': 'inside the Library',
  'components/Academy/AcademyPage.tsx': 'inside the Library',
  'components/Academy/CourseSyllabusPage.tsx': 'inside the Library (the Academy)',
  'components/Academy/CourseTrainerPage.tsx': 'inside the Library (the Academy)',
  'components/Coach/ChatMessage.tsx': 'acts on a read_book offer, which only bookTeaching and bookChips make, both read the table',
  'coach/questionIntents.ts': 'maps a page the student is already on to its intent; links nowhere',
  'services/accessPolicy.ts': 'the paywall policy for a page already open; links nowhere',
  'data/heldSurfaces.ts': 'the table',
};

const HELD_ROUTE_LITERAL = /['"`](?:\/coach\/campaign|\/coach\/library|\/coach\/academy|\/academy)(?:[/?'"`$]|['"`])|lesson=think/;

const ALL_HELD = Object.fromEntries(Object.keys(HELD_FROM_RELEASE).map((k) => [k, HELD_FROM_RELEASE[k as HeldSurface]])) as Record<HeldSurface, boolean>;

afterEach(() => { Object.assign(HELD_FROM_RELEASE, ALL_HELD); });

describe('every door into a held surface reads the one table', () => {
  it('a file that links to a held route imports heldSurfaces (or is listed with its reason)', () => {
    const offenders = files(SRC)
      .map((p) => ({ file: p.slice(SRC.length + 1), s: stripComments(readFileSync(p, 'utf8')) }))
      .filter(({ file, s }) => HELD_ROUTE_LITERAL.test(s) && !NOT_A_DOOR[file] && !/heldSurfaces/.test(s))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });
});

describe('while held, nothing opens Campaign, the Library or How to Think', () => {
  it('the three are held for this release', () => {
    expect(HELD_FROM_RELEASE).toEqual({ campaign: true, library: true, howToThink: true });
  });

  it('the held routes are the held surfaces and nothing else', () => {
    expect(isHeldRoute('/coach/campaign')).toBe(true);
    expect(isHeldRoute('/coach/campaign/map')).toBe(true);
    expect(isHeldRoute('/coach/campaign?boss=grabber')).toBe(true);
    expect(isHeldRoute('/coach/library?book=x&page=2')).toBe(true);
    expect(isHeldRoute('/academy')).toBe(true);
    expect(isHeldRoute('/coach/teach?lesson=think')).toBe(true);
    expect(isHeldRoute('/coach/teach')).toBe(false);
    expect(isHeldRoute('/coach/teach?lesson=custom')).toBe(false);
    expect(isHeldRoute('/coach/campaigner')).toBe(false);
  });

  it('the coach never offers to take the student there', () => {
    expect(APP_ROUTES_MANIFEST.filter((r) => isHeldRoute(r.path))).toEqual([]);
    expect(APP_ROUTES_MANIFEST.some((r) => r.path === '/coach/teach')).toBe(true);
  });

  it('no first-run chip, no typed "teach me" door, no book chip', () => {
    expect(FIRST_RUN_OPENER.chips).not.toContain('Learn how to think');
    expect(APP_FUNCTION_CHIPS).not.toContain('Learn how to think');
    expect(matchThinkingLessonRequest('teach me')).toBe(false);
    expect(matchThinkingLessonRequest('Learn how to think')).toBe(false);
    expect(bookChipForClaims(['concept:passed-pawn:e5'])).toBeNull();
  });

  it('Up next never hands out the thinking lesson', () => {
    const picks = rankUpNext({
      reps: [], latestGameSlip: null, grownPuzzle: null, freeOpeningOpen: false, coldStart: false,
      startSteps: [], endgameDue: null, openingHoles: [],
      thinking: { state: 'red', skill: 'Hanging pieces', step: 'Am I safe?', gap: null },
    } as unknown as Parameters<typeof rankUpNext>[0]);
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.filter((p) => isHeldRoute(p.path))).toEqual([]);
  });

  it('flipping the table opens the doors again (the switch is real)', () => {
    HELD_FROM_RELEASE.howToThink = false;
    HELD_FROM_RELEASE.library = false;
    expect(matchThinkingLessonRequest('teach me')).toBe(true);
    expect(bookChipForClaims(['concept:passed-pawn:e5'])).not.toBeNull();
    expect(isHeldRoute('/coach/teach?lesson=think')).toBe(false);
    expect(isHeldRoute('/coach/campaign')).toBe(true);
  });
});
