/**
 * THE TRACKS (docs/CAMPAIGN.md §9): Beginner = Levels 1–18, Intermediate =
 * 19–36, Advanced = 37–50 (silent games and bosses). The student picks where
 * to start (David 2026-10-21: "intermediates need a way to bypass the first
 * easy levels" → "i want the intermediate and advanced campaigns done by the
 * morning"); inside a track the RECORD decides, as everywhere else in the
 * Campaign. Absent a choice the track is Beginner.
 */
import type { CampaignTrack } from '../types';
import type { MissionCard } from './missionCard';

export type { CampaignTrack } from '../types';

export interface TrackInfo {
  title: string;
  /** One line for the map's track picker. */
  blurb: string;
  first: number;
  last: number;
  /** A silent track: no missions — the coach says nothing until the game ends. */
  silent: boolean;
}

export const TRACKS: Record<CampaignTrack, TrackInfo> = {
  beginner: { title: 'Beginner', blurb: 'One habit at a time: develop, win material, mate.', first: 1, last: 18, silent: false },
  intermediate: { title: 'Intermediate', blurb: 'Technique, theory and calculation, for players who already develop and castle.', first: 19, last: 36, silent: false },
  advanced: { title: 'Advanced', blurb: 'Silent games and the bosses — no coaching until the game ends.', first: 37, last: 50, silent: true },
};

export const TRACK_ORDER: readonly CampaignTrack[] = ['beginner', 'intermediate', 'advanced'];

export function isCampaignTrack(x: unknown): x is CampaignTrack {
  return typeof x === 'string' && (TRACK_ORDER as readonly string[]).includes(x);
}

/** The track a level belongs to. */
export function trackOfLevel(level: number): CampaignTrack {
  return TRACK_ORDER.find((t) => level >= TRACKS[t].first && level <= TRACKS[t].last) ?? 'advanced';
}

/** The cards of one track, keyed as the registry keys them — what the track's
 *  games pick from (`missionForPhase(phase, record, cardsOfTrack(…))`). */
export function cardsOfTrack(track: CampaignTrack, source: Readonly<Record<string, MissionCard>>): Record<string, MissionCard> {
  return Object.fromEntries(Object.entries(source).filter(([, c]) => trackOfLevel(c.level) === track));
}
