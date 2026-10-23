/**
 * THE CAMPAIGN MAP's model (WO-CAMPAIGN-MASTER, Lane C). PURE: the record in,
 * every chapter's levels, their three mission slots and the boss node out.
 *
 * Chapters and level titles are the mission list in docs/CAMPAIGN.md §9; a
 * slot shows the registry's card when one is built and the list's name, as
 * "coming", when not. Status is read off the record through the same
 * progression the game uses, so the map can never disagree with what the
 * next game will teach.
 */
import { MISSIONS, missionForPhase, progressOf, type MissionRecordRow } from '../../missions/registry';
import { PHASES } from '../../missions/missionRunner';
import { BOSSES, bossUnlocked, isBossId } from '../../missions/bosses';
import { cardsOfTrack, TRACKS, type CampaignTrack } from '../../missions/tracks';
import { bossGate, type BossGate } from '../../missions/bosses/attempts';
import type { BossAttemptRecord, BossId, MissionCard, MissionId, MissionPhase } from '../../missions/missionCard';

export interface Chapter {
  tier: number;
  title: string;
  track: CampaignTrack;
  levels: readonly number[];
  /** The boss closing the chapter (a `BossId` once its preset is built). */
  boss: string;
  bossName: string;
  /** A silent chapter's theme (the advanced track has no missions). */
  theme?: string;
}

/** One chapter per tier, each closed by its boss — docs/CAMPAIGN.md §7 (the
 *  bosses) and §9 (the levels: four per tier, the boss rush and the
 *  Gauntlet two each; the advanced tiers are silent games by theme). */
export const CHAPTERS: readonly Chapter[] = ([
  [1, 'beginner', [1, 2, 3, 4], 'grabber', 'The Grabber'],
  [2, 'beginner', [5, 6, 7, 8], 'trapper', 'The Trapper'],
  [3, 'beginner', [9, 10, 11, 12], 'wall', 'The Wall'],
  [4, 'beginner', [13, 14, 15, 16], 'gambler', 'The Gambler'],
  [5, 'beginner', [17, 18], 'beginner-boss-rush', 'The beginner boss rush'],
  [6, 'intermediate', [19, 20, 21, 22], 'trickster', 'The Trickster'],
  [7, 'intermediate', [23, 24, 25, 26], 'architect', 'The Architect'],
  [8, 'intermediate', [27, 28, 29, 30], 'bully', 'The Bully'],
  [9, 'intermediate', [31, 32, 33, 34], 'escape-artist', 'The Escape Artist'],
  [10, 'intermediate', [35, 36], 'gauntlet', 'The Gauntlet'],
  [11, 'advanced', [37, 38, 39, 40], 'attacker', 'The Attacker', 'Calculation'],
  [12, 'advanced', [41, 42, 43, 44], 'dynamo', 'The Dynamo', 'Imbalances'],
  [13, 'advanced', [45, 46, 47, 48], 'grinder', 'The Grinder', 'Squeeze and resilience'],
  [14, 'advanced', [49, 50], 'mirror', 'The Mirror', 'Your own record'],
] as const).map(([tier, track, levels, boss, bossName, theme]: readonly [number, CampaignTrack, readonly number[], string, string, string?]) => ({
  tier, title: `Chapter ${tier}`, track, levels, boss, bossName, ...(theme ? { theme } : {}),
}));

/** The mission list, docs/CAMPAIGN.md §9 (opening | middlegame | endgame).
 *  A slot shows the registry's card once built, this name as "coming" until. */
export const LEVEL_TITLES: Readonly<Record<number, Record<MissionPhase, string>>> = {
  1: { opening: 'Develop & castle', middlegame: 'Tactically win an extra piece, maintain the advantage to the end', endgame: 'Checkmate the king (no stalemate)' },
  2: { opening: 'Centre first', middlegame: 'Count before you capture', endgame: 'K+R mate (box)' },
  3: { opening: 'Queen stays home', middlegame: 'Knight fork', endgame: 'Push the passed pawn (king in front)' },
  4: { opening: 'Connect the rooks', middlegame: 'Back-rank awareness', endgame: 'Up a pawn, trade pieces' },
  5: { opening: "Check what's attacked", middlegame: 'Hunt the loose piece', endgame: 'Opposition' },
  6: { opening: 'Spot the trap', middlegame: 'The pin', endgame: 'Rook behind the passer' },
  7: { opening: 'Punish the early queen', middlegame: 'Skewer & double attack', endgame: 'Wake up the king' },
  8: { opening: 'Punish slow development', middlegame: 'Discovery & remove the guard', endgame: 'Philidor (3rd rank)' },
  9: { opening: 'Read the structure', middlegame: 'Weak point, aim at it', endgame: 'Make a passed pawn' },
  10: { opening: 'Play the break', middlegame: 'The outpost', endgame: 'The outside passer' },
  11: { opening: 'Isolated queen pawn', middlegame: 'Improve your worst piece', endgame: 'Rook to the seventh' },
  12: { opening: 'Give them a weakness', middlegame: 'Opposite-side castling', endgame: 'Good knight, bad bishop' },
  13: { opening: 'Break a rule only to win', middlegame: 'The f7 sacrifice', endgame: 'Give it back to win' },
  14: { opening: 'Gambits: take or decline', middlegame: 'The Greek gift', endgame: 'Pawn breakthrough' },
  15: { opening: 'Refute the unsound sac', middlegame: 'Knight sac on d5/f5/e6', endgame: 'Deflection to promote' },
  16: { opening: 'Exchange sac on c3', middlegame: 'Clearance & deflection mates', endgame: "The defender's sac" },
  17: { opening: 'Weakest habit (record-chosen)', middlegame: 'Weakest habit (record-chosen)', endgame: 'Weakest habit (record-chosen)' },
  18: { opening: 'Beginner boss rush', middlegame: 'Beginner boss rush', endgame: 'Beginner boss rush' },
  19: { opening: 'Plan by move 10', middlegame: 'Candidate moves', endgame: 'Outflanking' },
  20: { opening: 'Move-order traps', middlegame: 'Calculate to the end', endgame: 'Lucena with a rook pawn' },
  21: { opening: 'Punish the theory slip', middlegame: 'The in-between move', endgame: 'Triangulation' },
  22: { opening: 'Play the gambit', middlegame: 'The only move', endgame: 'Wrong rook pawn' },
  23: { opening: 'Hanging pawns', middlegame: 'The second weakness', endgame: 'Opposite-coloured bishops' },
  24: { opening: 'Maroczy bind', middlegame: 'Minority attack', endgame: 'Cut the king off' },
  25: { opening: 'Space: trade or keep', middlegame: 'Closed centre, wing play', endgame: 'Queen endings' },
  26: { opening: 'KID/Benoni plans', middlegame: 'Use the bishop pair', endgame: 'Bishop pair in the ending' },
  27: { opening: 'What do they want?', middlegame: 'The prophylactic move', endgame: 'Build a fortress' },
  28: { opening: 'Meet the counter-gambit', middlegame: 'Counterattack', endgame: 'Perpetual check' },
  29: { opening: 'Pawn for the initiative', middlegame: 'Positional exchange sac', endgame: 'Pawn for activity' },
  30: { opening: 'Keep the initiative', middlegame: 'Sac to open their king', endgame: 'The active rook' },
  31: { opening: 'Know your repertoire', middlegame: 'Convert extra material', endgame: 'Connected passers vs rook' },
  32: { opening: 'When theory ends', middlegame: "Don't hurry", endgame: 'Bishop vs knight, both wings' },
  33: { opening: 'Offbeat sideline', middlegame: 'Spend the lead in time', endgame: 'Zugzwang' },
  34: { opening: 'Trade queens when it helps', middlegame: 'Choose the transition', endgame: 'Win vs perfect defence' },
  35: { opening: 'Weakest judgement', middlegame: 'Weakest judgement', endgame: 'Weakest judgement' },
  36: { opening: 'The Gauntlet', middlegame: 'The Gauntlet', endgame: 'The Gauntlet' },
};

export type SlotStatus =
  /** The phase's mission next game. */
  | 'active'
  /** Brought back by a pattern of slips: the phase's mission next game. */
  | 'reactivated'
  /** Learned; it watches silently. */
  | 'graduated'
  /** Built, not reached yet. */
  | 'locked'
  /** Not built yet. */
  | 'coming';

export interface MapSlot {
  level: number;
  phase: MissionPhase;
  title: string;
  cardId: MissionId | null;
  status: SlotStatus;
}

export interface MapLevel { level: number; slots: MapSlot[] }

export interface MapChapter {
  chapter: Chapter;
  /** Empty for a silent chapter (its levels are games, not missions). */
  levels: MapLevel[];
  /** Null while the chapter's boss is not built yet (`chapter.bossName` names it). */
  boss: { id: BossId; name: string; gate: BossGate; practiceTitle: string | null } | null;
}

function cardFor(level: number, phase: MissionPhase, source: Readonly<Record<string, MissionCard>>): MissionCard | null {
  return Object.values(source).find((c) => c.level === level && c.phase === phase) ?? null;
}

export function campaignMap(
  record: readonly MissionRecordRow[],
  attempts: readonly BossAttemptRecord[] = [],
  source: Readonly<Record<string, MissionCard>> = MISSIONS,
  track: CampaignTrack = 'beginner',
): MapChapter[] {
  const progress = progressOf(record);
  // The next game of THIS track: its missions only (a Beginner card is never
  // an Intermediate player's mission).
  const trackCards = cardsOfTrack(track, source);
  const next: Record<MissionPhase, MissionId | null> = {
    opening: missionForPhase('opening', record, trackCards)?.id ?? null,
    middlegame: missionForPhase('middlegame', record, trackCards)?.id ?? null,
    endgame: missionForPhase('endgame', record, trackCards)?.id ?? null,
  };
  return CHAPTERS.filter((chapter) => chapter.track === track).map((chapter) => {
    const levels = TRACKS[track].silent ? [] : chapter.levels.map((level) => ({
      level,
      slots: PHASES.map((phase): MapSlot => {
        const card = cardFor(level, phase, source);
        const title = card?.title ?? LEVEL_TITLES[level]?.[phase] ?? '';
        if (!card) return { level, phase, title, cardId: null, status: 'coming' };
        const p = progress(card);
        const status: SlotStatus = p.status === 'graduated' ? 'graduated'
          : p.status === 'reactivated' ? 'reactivated'
            : next[phase] === card.id ? 'active' : 'locked';
        return { level, phase, title, cardId: card.id, status };
      }),
    }));
    if (!isBossId(chapter.boss)) return { chapter, levels, boss: null };
    // The boss waits for every mission of the chapter to have graduated once.
    const id = chapter.boss;
    const preset = BOSSES[id];
    const gate = bossGate(bossUnlocked(preset, record, attempts, source), attempts.filter((a) => a.bossId === id), record);
    const practiceTitle = gate.kind === 'practice' ? (source[gate.cardId] ?? MISSIONS[gate.cardId]).title : null;
    return { chapter, levels, boss: { id, name: preset.name, gate, practiceTitle } };
  });
}
