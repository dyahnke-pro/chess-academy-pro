/**
 * upNextHome — the two small reads Home needs beside the Up-next pick:
 * "what got better" (the heat map, against a once-a-week snapshot) and the
 * coach's one gentle line per pick per day.
 */
import { db } from '../db/schema';
import { getCapabilityProfile } from './capabilityEvidence';
import { getUnifiedWeaknessProfile } from './weaknessSpine';
import { heatMap } from './heatMap';
import { weekStartKey, dayKey } from './trainingWeek';
import { voiceService } from './voiceService';

const WEEK_SNAPSHOT_KEY = 'heatmap_week_snapshot_v1';

export interface WhatGotBetter {
  green: number;
  red: number;
  /** Skills green now that were not green when this week began. */
  newly: number;
}

export async function loadWhatGotBetter(now: Date = new Date()): Promise<WhatGotBetter> {
  const [profile, holes, snap] = await Promise.all([
    getCapabilityProfile().catch(() => new Map()),
    getUnifiedWeaknessProfile().catch(() => []),
    db.meta.get(WEEK_SNAPSHOT_KEY).catch(() => undefined),
  ]);
  const tiles = heatMap(profile, holes);
  const greenNow = tiles.filter((t) => t.state === 'green').map((t) => t.tag);
  const week = weekStartKey(now);
  let baseline: string[] = greenNow;
  try {
    const parsed = snap ? (JSON.parse(snap.value) as { week: string; green: string[] }) : null;
    if (parsed && parsed.week === week) baseline = parsed.green;
    else await db.meta.put({ key: WEEK_SNAPSHOT_KEY, value: JSON.stringify({ week, green: greenNow }) });
  } catch { /* first read — baseline is now */ }
  const base = new Set(baseline);
  return {
    green: greenNow.length,
    red: tiles.filter((t) => t.state === 'red').length,
    newly: greenNow.filter((g) => !base.has(g)).length,
  };
}

/** The coach says why — once per pick per day, through the narration setting
 *  (`voiceService.speak` honours silent / brief). */
export async function sayPickOncePerDay(pickKey: string, reason: string, now: Date = new Date()): Promise<boolean> {
  const key = `upnext_spoken_${dayKey(now)}`;
  try {
    const rec = await db.meta.get(key);
    const said: string[] = rec ? (JSON.parse(rec.value) as string[]) : [];
    if (said.includes(pickKey)) return false;
    await db.meta.put({ key, value: JSON.stringify([...said, pickKey]) });
  } catch {
    return false;
  }
  void voiceService.speak(reason);
  return true;
}
