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
import { BOSSES, bossUnlocked } from '../../missions/bosses';
import { bossGate, type BossGate } from '../../missions/bosses/attempts';
import type { BossAttemptRecord, BossId, MissionCard, MissionId, MissionPhase } from '../../missions/missionCard';

export interface Chapter {
  tier: number;
  title: string;
  levels: readonly number[];
  boss: BossId;
}

/** One chapter per boss: its tier, the levels it closes (docs/CAMPAIGN.md §7). */
export const CHAPTERS: readonly Chapter[] = Object.values(BOSSES)
  .sort((a, b) => a.tier - b.tier)
  .map((p) => ({ tier: p.tier, title: `Chapter ${p.tier}`, levels: p.levels, boss: p.id }));

/** The mission list, docs/CAMPAIGN.md §9 (opening | middlegame | endgame). */
export const LEVEL_TITLES: Readonly<Record<number, Record<MissionPhase, string>>> = {
  1: { opening: 'Develop & castle', middlegame: 'Tactically win an extra piece, maintain the advantage to the end', endgame: 'K+Q mate (no stalemate)' },
  2: { opening: 'Centre first', middlegame: 'Count before you capture', endgame: 'K+R mate (box)' },
  3: { opening: 'Queen stays home', middlegame: 'Knight fork', endgame: 'Push the passed pawn (king in front)' },
  4: { opening: 'Connect the rooks', middlegame: 'Back-rank awareness', endgame: 'Up a pawn, trade pieces' },
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
  levels: MapLevel[];
  boss: { id: BossId; name: string; gate: BossGate; practiceTitle: string | null };
}

function cardFor(level: number, phase: MissionPhase, source: Readonly<Record<string, MissionCard>>): MissionCard | null {
  return Object.values(source).find((c) => c.level === level && c.phase === phase) ?? null;
}

export function campaignMap(
  record: readonly MissionRecordRow[],
  attempts: readonly BossAttemptRecord[] = [],
  source: Readonly<Record<string, MissionCard>> = MISSIONS,
): MapChapter[] {
  const progress = progressOf(record);
  const next: Record<MissionPhase, MissionId | null> = {
    opening: missionForPhase('opening', record, source)?.id ?? null,
    middlegame: missionForPhase('middlegame', record, source)?.id ?? null,
    endgame: missionForPhase('endgame', record, source)?.id ?? null,
  };
  return CHAPTERS.map((chapter) => {
    const levels = chapter.levels.map((level) => ({
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
    // The boss waits for every mission of the chapter to have graduated once.
    const preset = BOSSES[chapter.boss];
    const gate = bossGate(bossUnlocked(preset, record, source), attempts.filter((a) => a.bossId === chapter.boss), record);
    const practiceTitle = gate.kind === 'practice' ? (source[gate.cardId] ?? MISSIONS[gate.cardId]).title : null;
    return { chapter, levels, boss: { id: chapter.boss, name: preset.name, gate, practiceTitle } };
  });
}
