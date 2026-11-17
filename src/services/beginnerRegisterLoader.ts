/**
 * The beginner register's verdict for THIS student, loaded from their record
 * (`beginnerRegister.beginnerVerdict`). One loader, memoized, dropped when the
 * record changes — every surface that speaks in the register reads it here.
 */
import { getCapabilityProfile, type CapabilityProfile } from './capabilityEvidence';
import { beginnerPrior, beginnerVerdict, type BeginnerVerdict } from './beginnerRegister';
import { onWeaknessModelChanged } from './weaknessModelEvents';
import { useAppStore } from '../stores/appStore';

let cache: { prior: boolean; verdict: BeginnerVerdict } | null = null;
let inflight: Promise<BeginnerVerdict> | null = null;

/** The prior alone — what the register is before the record has loaded. */
export function beginnerPriorNow(): boolean {
  return beginnerPrior(useAppStore.getState().activeProfile);
}

/** The last verdict read, or the prior when none has been read yet. */
export function beginnerRegisterNow(): boolean {
  const prior = beginnerPriorNow();
  return cache && cache.prior === prior ? cache.verdict.beginner : prior;
}

export async function loadBeginnerRegister(): Promise<BeginnerVerdict> {
  const prior = beginnerPriorNow();
  if (cache && cache.prior === prior) return cache.verdict;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const profile = await getCapabilityProfile('use').catch((): CapabilityProfile => new Map());
      const verdict = beginnerVerdict(new Map([...profile.entries()].map(([tag, e]) => [tag, e.hold] as const)), prior);
      cache = { prior, verdict };
      return verdict;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

onWeaknessModelChanged(() => { cache = null; });
