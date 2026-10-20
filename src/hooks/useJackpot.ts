import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { updateProfile } from '../services/dbService';
import { coinsFor, payout } from '../services/jackpot';
import { reward, ringCoins } from '../services/rewardService';
import type { RewardKind } from '../services/rewardEvents';
import type { JackpotGain } from '../components/Coach/JackpotBar';

/** How long the bar stays up for a payout before it fades (a jackpot longer). */
const GAIN_MS = 2600;
const JACKPOT_MS = 4000;

/** The words a payout shows under its coins. */
const LABEL: Partial<Record<RewardKind, string>> = {
  decision: 'Decision',
  saved: 'Saved',
  punished: 'Punished',
  onlyMove: 'Only move',
  gem: 'Gem',
  proven: 'Skill fixed',
  checkmate: 'Checkmate',
};

/**
 * useJackpot — the jackpot bar's ONE door (David 2026-10-20, "over the top").
 * A reward moment pays coins (`jackpot.coinsFor`, the streak multiplies them);
 * the coins are the player's XP, saved on the profile so they carry from game
 * to game; a payout that crosses a level fires the jackpot. Only skill pays:
 * callers pass the moments `learnReward` already decided earned a reward.
 */
export function useJackpot(): {
  gain: JackpotGain | null;
  award: (kind: RewardKind, streak: number) => void;
  awardCoins: (coins: number, label: string) => void;
} {
  const profile = useAppStore((s) => s.activeProfile);
  const xpRef = useRef<number>(profile?.xp ?? 0);
  const [gain, setGain] = useState<JackpotGain | null>(null);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const seq = useRef(0);

  // The profile loads after the page mounts: take its XP once it arrives.
  useEffect(() => {
    const stored = profile?.xp ?? 0;
    if (stored > xpRef.current) xpRef.current = stored;
  }, [profile?.xp]);
  useEffect(() => () => { for (const t of timers.current) clearTimeout(t); }, []);

  const pay = useCallback((coins: number, label: string): void => {
    if (coins <= 0) return;
    const from = xpRef.current;
    const out = payout(from, coins);
    xpRef.current = out.xp;
    seq.current += 1;
    const id = `gain-${seq.current}`;
    const jackpot = out.levelsGained > 0;
    setGain({ id, coins, label, from, to: out.xp, jackpot });
    timers.current.push(setTimeout(() => setGain((g) => (g?.id === id ? null : g)), jackpot ? JACKPOT_MS : GAIN_MS));
    // The move's own chime plays first; the coins ring into the bar after it.
    timers.current.push(setTimeout(() => ringCoins(coins), 260));
    if (jackpot) timers.current.push(setTimeout(() => reward({ kind: 'jackpot', label: `Jackpot! Level ${out.level}` }), 520));
    const p = useAppStore.getState().activeProfile;
    if (p) {
      void updateProfile(p.id, { xp: out.xp, level: out.level }).catch(() => undefined);
      useAppStore.getState().setActiveProfile({ ...p, xp: out.xp, level: out.level });
    }
  }, []);

  const award = useCallback((kind: RewardKind, streak: number): void => {
    pay(coinsFor(kind, streak), LABEL[kind] ?? kind);
  }, [pay]);
  const awardCoins = useCallback((coins: number, label: string): void => {
    pay(Math.round(coins), label);
  }, [pay]);

  // DEV ONLY: lets a local screenshot or hand walk fire a payout. Vite drops
  // the block from the production build.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __jackpot?: { award: typeof award; coins: typeof awardCoins } };
    w.__jackpot = { award, coins: awardCoins };
    return () => { delete w.__jackpot; };
  }, [award, awardCoins]);

  return { gain, award, awardCoins };
}
