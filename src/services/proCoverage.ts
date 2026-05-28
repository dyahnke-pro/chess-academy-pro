import proStudyNotesJson from '../data/pro-study-notes.json';
import proRepertoiresJson from '../data/pro-repertoires.json';
import modelGamesJson from '../data/model-games.json';
import punishGemsJson from '../data/punish-gems.json';
import middlegamePlansJson from '../data/middlegame-plans.json';

export interface StudyNote {
  studyId: string;
  url: string;
  title: string;
  role: 'primary' | 'supplementary';
}

const notesMap = (proStudyNotesJson as { openings: Record<string, StudyNote[]> }).openings;

export function getStudyNotesFor(openingId: string): StudyNote[] {
  return notesMap[openingId] ?? [];
}

export function hasStudyNotes(openingId: string): boolean {
  return getStudyNotesFor(openingId).length > 0;
}

interface ProOpening { id: string }
interface ModelGameRecord {
  openingId: string;
  studentSide?: string;
  result?: string;
  overview?: string;
}

const BOILERPLATE_RE = /Master game from|Daniel Naroditsky as (White|Black) vs|from the Lichess masters/i;
const winSide = (r?: string): string | null => (r === '1-0' ? 'white' : r === '0-1' ? 'black' : null);

const proIds = new Set((proRepertoiresJson as { openings: ProOpening[] }).openings.map((o) => o.id));
const realModelGameOpenings = new Set(
  (modelGamesJson as ModelGameRecord[])
    .filter((g) => g.studentSide && winSide(g.result) === g.studentSide && !BOILERPLATE_RE.test(g.overview ?? '') && (g.overview ?? '').length > 60)
    .map((g) => g.openingId),
);

export function hasMasterclassTier(openingId: string): boolean {
  return proIds.has(openingId) && realModelGameOpenings.has(openingId);
}

interface ProOpeningFull extends ProOpening { variations?: unknown[] }
interface PunishGem { openingId: string }
interface MiddlegamePlan { openingId: string; playableLines?: unknown[] }

const variationCount = new Map<string, number>();
(proRepertoiresJson as { openings: ProOpeningFull[] }).openings.forEach((o) => {
  variationCount.set(o.id, (o.variations ?? []).length);
});

const realModelGameCount = new Map<string, number>();
for (const g of modelGamesJson as ModelGameRecord[]) {
  const real = g.studentSide && winSide(g.result) === g.studentSide && !BOILERPLATE_RE.test(g.overview ?? '') && (g.overview ?? '').length > 60;
  if (real) realModelGameCount.set(g.openingId, (realModelGameCount.get(g.openingId) ?? 0) + 1);
}

const gemCount = new Map<string, number>();
for (const g of punishGemsJson as PunishGem[]) {
  gemCount.set(g.openingId, (gemCount.get(g.openingId) ?? 0) + 1);
}

const planOpenings = new Set<string>();
for (const p of middlegamePlansJson as MiddlegamePlan[]) {
  if ((p.playableLines ?? []).length > 0) planOpenings.add(p.openingId);
}

/**
 * Composite "data richness" score for sorting the pro main tab list, most → least.
 * Higher = more curated content + grounding signals.
 */
export function proDataScore(openingId: string): number {
  let score = 0;
  if (hasMasterclassTier(openingId)) score += 10;
  if (hasStudyNotes(openingId)) score += 5;
  score += (gemCount.get(openingId) ?? 0) * 2;
  score += realModelGameCount.get(openingId) ?? 0;
  score += variationCount.get(openingId) ?? 0;
  if (planOpenings.has(openingId)) score += 2;
  return score;
}
