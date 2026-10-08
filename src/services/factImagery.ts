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
  | 'wing-for-centre' | 'material-arithmetic' | 'knight-squares' | 'c-pawn-block'
  | 'badbishop';

export const IMAGERY: Record<ImageryKey, readonly string[]> = {
  'only-developed': ['', 'Their army is back in the barracks.'],
  'defender-trade': ['', 'Every attacker that leaves is one less hand on your door.'],
  'exchange-for-attacker': ['', 'You pay a little to take away their sharpest tool.'],
  'deny-exchange': ['', 'You take away the trade their whole setup was waiting for.'],
  'abandoned-duty': ['', 'A guard that steps away leaves the gate open.'],
  'trade-choice': ['', 'An offer is not a deal until they accept it.'],
  'duty-parity': ['', 'Two sentries staring at each other — neither can walk away.'],
  'maintenance-trade': ['', 'Not a win, just paying the bill before it comes due.'],
  'prepare-recapture': ['', 'Set the table before the guests arrive.'],
  'threat-cost': ['', 'The door is still open, but now there is a trap behind it.'],
  'simplest-win': ['', 'Win the plain way; the fancy way only adds chances to slip.'],
  'safe-because': ['', 'Yesterday\'s move is paying today\'s bill.'],
  'wing-for-centre': ['', 'A side street for the main road.'],
  'material-arithmetic': ['', 'Count the wood, not the names on it.'],
  'knight-squares': ['', 'A knight on the rim is dim.', 'Put a knight in the middle and it sees the whole board.'],
  'c-pawn-block': ['', 'The knight is parked on the c-pawn\'s road.'],
  badbishop: ['', 'A walled-in bishop bites rock.', 'That bishop is staring at its own pawns.'],
};

/** The image for a fact of `key`, rotated on `stem` (a hash of the position),
 *  or null on the rotation's quiet turn. */
export function imageryFor(key: ImageryKey, stem: number): string | null {
  return rotateStem(IMAGERY[key], stem) || null;
}
