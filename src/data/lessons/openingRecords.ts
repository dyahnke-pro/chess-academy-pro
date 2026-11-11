// ONE LOOKUP OF AN OPENING'S RECORD FOR THE LESSON GATES (WO-OPENINGS-REWRITE-01
// R4). A lesson in the gate registry belongs to an opening in one of three
// files — the masterclass repertoire, the gambit courses, or the pro
// repertoires — and every gate that asks "what side, which tabs, how many key
// ideas" reads it here. Three gates each read repertoire.json on its own, so a
// pro opening rewritten as a Watch course (and so promoted into the registry,
// CLAUDE.md G9) failed them as "not found".
import repertoire from '../repertoire.json';
import gambits from '../gambits.json';
import proRepertoires from '../pro-repertoires.json';

export interface OpeningRecordLike {
  id: string;
  name: string;
  color: 'white' | 'black';
  pgn: string;
  variations?: Array<{ name: string; pgn: string }>;
  keyIdeas?: string[];
}

const pros = (Array.isArray(proRepertoires) ? proRepertoires : (proRepertoires as { openings: unknown[] }).openings) as OpeningRecordLike[];
const BY_ID = new Map<string, OpeningRecordLike>(
  [...(repertoire as OpeningRecordLike[]), ...(gambits as OpeningRecordLike[]), ...pros].map((o) => [o.id, o] as const),
);

/** The opening's record from whichever file carries it, or null. */
export function openingRecord(id: string): OpeningRecordLike | null {
  return BY_ID.get(id) ?? null;
}
