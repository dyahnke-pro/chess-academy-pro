// factImagery — THE PHRASE BANK OF IMAGES (teach-brief §L: "vivid imagery tied
// to a board fact, to make a principle stick" — "a walled-in bishop bites
// rock"). PHRASING ONLY, never a board read: an image is appended to a fact a
// computer already proved, keyed on that fact's kind, and rotated on a stable
// key (the position), never rolled. An empty variant is part of the rotation,
// so the image is a seasoning that comes and goes, not a refrain.
//
// Leaf (only the one rotation helper). Exhaustive over `ImageryKey`, so a new key fails to
// compile until it has a bank.
import { rotateStem } from '../utils/rotateStem';

export type ImageryKey =
  | 'only-developed' | 'defender-trade' | 'exchange-for-attacker' | 'deny-exchange'
  | 'abandoned-duty' | 'trade-choice' | 'duty-parity' | 'maintenance-trade' | 'prepare-recapture'
  | 'threat-cost' | 'simplest-win' | 'safe-because'
  | 'wing-for-centre' | 'material-arithmetic' | 'knight-rim' | 'c-pawn-block'
  | 'badbishop';

export const IMAGERY: Record<ImageryKey, readonly string[]> = {
  'only-developed': ['', 'Their army is back in the barracks.'],
  // Cut (review tape 2026-10-15): it said the fact again — "every attacker
  // traded is one less to meet", then "every attacker that leaves is one less
  // hand on your door".
  'defender-trade': [''],
  'exchange-for-attacker': [''],
  'deny-exchange': [''],
  'abandoned-duty': ['', 'A guard that steps away leaves the gate open.'],
  'trade-choice': ['', 'An offer is not a deal until they accept it.'],
  // Cut (review of chesscom-1040709576, 2026-10-13): an image that only
  // restates its fact teaches nothing — it is description, and description
  // is cut. An empty bank keeps the key exhaustive. What stays carries a RULE
  // the fact does not say ("a knight on the rim is dim", "count the wood").
  'duty-parity': [''],
  'maintenance-trade': ['', 'Not a win, just paying the bill before it comes due.'],
  'prepare-recapture': ['', 'Set the table before the guests arrive.'],
  'threat-cost': [''],
  'simplest-win': ['', 'Win the plain way; the fancy way only adds chances to slip.'],
  'safe-because': [''],
  'wing-for-centre': ['', 'A side street for the main road.'],
  'material-arithmetic': ['', 'Count the wood, not the names on it.'],
  // ONE IMAGE PER FACT, not per read (Smith-Morra replay 2026-10-19: "A
  // knight on the rim is dim" after Nxc3, b1→c3 — a knight going TO the
  // centre). The rim image belongs to the rim fact only.
  'knight-rim': ['', 'A knight on the rim is dim.'],
  'c-pawn-block': [''],
  badbishop: ['', 'A walled-in bishop bites rock.'],
};

/** The image for a fact of `key`, rotated on `stem` (a hash of the position),
 *  or null on the rotation's quiet turn. */
export function imageryFor(key: ImageryKey, stem: number): string | null {
  return rotateStem(IMAGERY[key], stem) || null;
}
