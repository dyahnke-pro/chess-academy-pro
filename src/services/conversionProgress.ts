// Conversion-drill progress (David 2026-05-27) — the CLOSE for the conversion
// loop. Conversion failures are derived live from games, so to stop a position
// resurfacing once the student has actually converted it, we persist the set
// of "addressed" peak positions (by position key) in the meta store. The
// unified profile excludes addressed conversions; CoachGamePage records one
// when the student WINS a game launched from that peak position.

import { db } from '../db/schema';

const META_KEY = 'addressedConversions';

/** Position key = piece placement + side + castling + ep (drop move counters).
 *  Matches weaknessSpine.posKey so a drilled FEN lines up with its conversion. */
export function conversionPosKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

export async function getAddressedConversions(): Promise<Set<string>> {
  try {
    const row = (await db.table('meta').get(META_KEY)) as { value?: unknown } | undefined;
    const value = row?.value ?? [];
    return new Set(Array.isArray(value) ? (value as string[]) : []);
  } catch {
    return new Set();
  }
}

export async function addAddressedConversion(fen: string): Promise<void> {
  try {
    const current = await getAddressedConversions();
    current.add(conversionPosKey(fen));
    await db.table('meta').put({ key: META_KEY, value: [...current] });
  } catch {
    /* best-effort — a failed write just means it resurfaces, never a crash */
  }
}
