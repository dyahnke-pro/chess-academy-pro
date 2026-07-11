// openingFactChains — the opening-phase teaching chain (David 2026-07-11:
// "In the opening he explains the purpose of each move and what traps might
// form out of the opening").
//
// Two computed fact classes for live opening narration:
//   1. WHERE THE MOVES LEAD — named continuations from the Lichess DB
//      (findContinuationsAtPly): "from here, Nf3 heads into the Italian Game."
//      The DB's sub-line NAMES carry the purpose; nothing is invented (G3).
//   2. TRAPS LURKING FROM THIS EXACT POSITION — engine-verified trap/pitfall
//      lines (verifiedLineLibrary) whose move sequence extends the current
//      game, close enough to matter. Every line passed the Stockfish accuracy
//      gate, so "you come out on top" is a computed claim, not a vibe.
//
// The output is ready-to-voice fact sentences for the voiceFacts chokepoint —
// the LLM phrases them; it decides nothing (G0).

import { detectOpening, findContinuationsAtPly } from './openingDetectionService';
import { getAllVerifiedLines } from './verifiedLineLibrary';
import { isWeaponGem, type PunishGem } from '../data/lessons/punishGems';
import gemsData from '../data/punish-gems.json';
import gambitGemsData from '../data/gambit-punish-gems.json';

// Engine-verified punish-gems (the weapon-section spine) are the RICHEST
// "trap that might form" source — the opponent's actual common slip at the
// student's level + the engine-verified punish. Weapon tiers only.
const ALL_GEMS = [...(gemsData as PunishGem[]), ...(gambitGemsData as PunishGem[])];

/** Which side plays the gem's inaccuracy — the OPPONENT slips, so the student
 *  is the other side. Ply parity of lineMoves decides. */
function gemStudentColor(gem: PunishGem): 'white' | 'black' {
  const spineLen = gem.lineMoves.trim().split(/\s+/).filter(Boolean).length;
  return spineLen % 2 === 0 ? 'black' : 'white'; // even → White slips next → student is Black
}

export interface OpeningChainFacts {
  facts: string[];
  /** Names of traps surfaced this call — callers dedup across a game so the
   *  same lurking trap isn't announced on every ply it stays live. */
  trapNames: string[];
}

/** A lurking line only surfaces when its decisive tail is within reach —
 *  after 1.e4 every e4 trap is technically "live", which is noise. */
export const TRAP_PROXIMITY_MAX_PLIES = 8;
/** Named-continuation facts per call (keeps narration tight). */
const MAX_CONTINUATIONS = 2;

function stripSan(t: string): string {
  return t.replace(/[+#!?]+$/, '');
}

/** True when the history walks `lineTokens`' path (prefix match, SAN
 *  suffixes ignored). `strict` additionally requires the line to go on. */
function onPath(lineTokens: string[], history: string[], strict: boolean): boolean {
  if (strict ? lineTokens.length <= history.length : lineTokens.length < history.length) return false;
  for (let i = 0; i < history.length; i++) {
    if (stripSan(lineTokens[i]) !== stripSan(history[i])) return false;
  }
  return true;
}

export function buildOpeningChainFacts(opts: {
  historySans: string[];
  studentColor: 'white' | 'black';
  /** Trap names already announced this game — skipped. */
  announcedTraps?: ReadonlySet<string>;
  maxTraps?: number;
}): OpeningChainFacts {
  const { historySans, studentColor } = opts;
  const maxTraps = opts.maxTraps ?? 1;
  const facts: string[] = [];
  const trapNames: string[] = [];
  if (historySans.length === 0) return { facts, trapNames };

  // 1. Named continuations — where the next moves LEAD, per the DB.
  try {
    const det = detectOpening(historySans);
    const conts = findContinuationsAtPly(historySans);
    const named: string[] = [];
    for (const [san, rep] of conts) {
      if (named.length >= MAX_CONTINUATIONS) break;
      if (det && rep.name === det.name) {
        named.push(`the main line of the ${det.name} continues with ${san} here`);
      } else {
        named.push(`${san} from here heads into the ${rep.name}`);
      }
    }
    if (named.length > 0) {
      facts.push(`Named continuations from this exact position (Lichess opening DB): ${named.join('; ')}.`);
    }
  } catch { /* DB unavailable — the chain is a bonus, never a blocker */ }

  // 2. Engine-verified NAMED traps/pitfalls live from this exact position.
  const announced = opts.announcedTraps ?? new Set<string>();
  try {
    for (const line of getAllVerifiedLines()) {
      if (trapNames.length >= maxTraps) break;
      if (line.setupFen) continue; // mined fragments don't anchor to move 1
      if (line.studentColor !== studentColor) continue;
      if (announced.has(line.name)) continue;
      const tokens = line.pgn.trim().split(/\s+/).filter(Boolean);
      if (!onPath(tokens, historySans, true)) continue;
      const remaining = tokens.length - historySans.length;
      if (remaining < 1 || remaining > TRAP_PROXIMITY_MAX_PLIES) continue;
      const tail = tokens.slice(historySans.length, historySans.length + 6).join(' ');
      if (line.role === 'trap') {
        facts.push(
          `A verified trap is live from this exact position: the ${line.name}. ` +
          `The line runs ${tail} — if the opponent walks into it, you come out on top (engine-verified).`,
        );
      } else {
        facts.push(
          `Careful — a verified pitfall lurks here for YOUR side: the ${line.name}. ` +
          `The slip line runs ${tail} — know it so you don't walk in.`,
        );
      }
      trapNames.push(line.name);
    }
  } catch { /* library unavailable — skip */ }

  // 3. Engine-verified punish-GEMS whose slip is coming up on this path —
  //    the opponent's real, common mistake at the student's level + the
  //    verified punish. The richest "what might form here" source.
  try {
    for (const gem of ALL_GEMS) {
      if (trapNames.length >= maxTraps) break;
      if (!isWeaponGem(gem)) continue;
      if (gemStudentColor(gem) !== studentColor) continue;
      const key = `gem:${gem.openingId}:${gem.inaccuracy}:${gem.punish}`;
      if (announced.has(key)) continue;
      const spine = gem.lineMoves.trim().split(/\s+/).filter(Boolean);
      // Live when the game walks the gem's spine and the slip is within reach
      // (0 remaining = the opponent's very next move could be the slip).
      if (!onPath(spine, historySans, false)) continue;
      const remaining = spine.length - historySans.length;
      if (remaining > TRAP_PROXIMITY_MAX_PLIES) continue;
      const freq = Number.isFinite(gem.freqPct) ? `${gem.freqPct}% of games` : 'a meaningful share of games';
      facts.push(
        `A punishable mistake may form here: at your level opponents play ${gem.inaccuracy} ` +
        `from this line in ${freq}, and it's engine-verified as an error — the punish is ${gem.punish}.`,
      );
      trapNames.push(key);
    }
  } catch { /* gem data unavailable — skip */ }

  return { facts, trapNames };
}
