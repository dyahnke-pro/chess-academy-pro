import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LpcSprite } from './LpcSprite';
import type { LpcAction, LpcDirection } from './lpcLayout';

// Proof-of-concept for "RPG-style animated pieces": real characters that walk
// to a square and stab the piece occupying it — and a KNIGHT that leaps OVER an
// intervening piece to strike. Art is the Universal LPC Spritesheet
// (CC-BY-SA 3.0 / GPLv3) — see public/rpg/CREDITS.md. Isolated /rpg-demo route;
// does not touch the real boards.

const KNIGHT_SHEET = '/rpg/body-dark.png';
const GUARD_SHEET = '/rpg/body-female-light.png';
const VICTIM_SHEET = '/rpg/body-light.png';

const SQUARES = 6;
const SQUARE = 60;

const KNIGHT_START = 5;
const GUARD_SQUARE = 3; // the piece the knight leaps over
const VICTIM_SQUARE = 1; // the piece struck after the leap
const WALK_STRIKE_SQUARE = 4; // beside the guard, for the walk-strike demo
const LEAP_LAND_SQUARE = 2; // beside the victim, after clearing the guard

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

interface KnightState {
  action: LpcAction;
  direction: LpcDirection;
  playing: boolean;
  loop: boolean;
  anim: { x: number | number[]; y: number | number[] };
  transition: object;
}

interface PieceState {
  action: LpcAction;
  playing: boolean;
  dead: boolean;
}

const KNIGHT_IDLE: KnightState = {
  action: 'walk',
  direction: 'left',
  playing: false,
  loop: false,
  anim: { x: 0, y: 0 },
  transition: { duration: 0 },
};

export function RpgDemoPage(): JSX.Element {
  const [knight, setKnight] = useState<KnightState>(KNIGHT_IDLE);
  const [guard, setGuard] = useState<PieceState>({ action: 'walk', playing: false, dead: false });
  const [victim, setVictim] = useState<PieceState>({ action: 'walk', playing: false, dead: false });
  const [busy, setBusy] = useState(false);
  const runRef = useRef(0);

  const reset = useCallback((): void => {
    runRef.current += 1;
    setBusy(false);
    setKnight(KNIGHT_IDLE);
    setGuard({ action: 'walk', playing: false, dead: false });
    setVictim({ action: 'walk', playing: false, dead: false });
  }, []);

  // Shared finisher: knight thrusts, the target recoils and dies.
  const strike = useCallback(
    async (
      setTarget: React.Dispatch<React.SetStateAction<PieceState>>,
      alive: () => boolean,
    ): Promise<void> => {
      setKnight((k) => ({ ...k, action: 'thrust', direction: 'left', playing: true, loop: false, transition: { duration: 0 } }));
      await sleep(360);
      if (!alive()) return;
      setTarget((t) => ({ ...t, action: 'hurt', playing: true }));
      await sleep(520);
      if (!alive()) return;
      setTarget((t) => ({ ...t, dead: true }));
      await sleep(450);
      if (!alive()) return;
      setKnight((k) => ({ ...k, action: 'walk', playing: false, loop: false }));
      setBusy(false);
    },
    [],
  );

  const runWalk = useCallback(async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    reset();
    const run = ++runRef.current;
    const alive = (): boolean => runRef.current === run;
    await sleep(30);

    // March one square and strike the guard.
    const dx = (WALK_STRIKE_SQUARE - KNIGHT_START) * SQUARE;
    setKnight((k) => ({
      ...k,
      action: 'walk',
      direction: 'left',
      playing: true,
      loop: true,
      anim: { x: dx, y: 0 },
      transition: { x: { duration: 0.9, ease: 'linear' }, y: { duration: 0 } },
    }));
    await sleep(920);
    if (!alive()) return;
    await strike(setGuard, alive);
  }, [busy, reset, strike]);

  const runLeap = useCallback(async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    reset();
    const run = ++runRef.current;
    const alive = (): boolean => runRef.current === run;
    await sleep(30);

    // Crouch, then leap in an arc OVER the guard and land beside the victim.
    setKnight((k) => ({ ...k, action: 'walk', direction: 'left', playing: false, loop: false }));
    await sleep(160);
    if (!alive()) return;

    const dx = (LEAP_LAND_SQUARE - KNIGHT_START) * SQUARE;
    setKnight((k) => ({
      ...k,
      action: 'slash', // mid-air strike pose reads as a leap
      direction: 'left',
      playing: true,
      loop: true,
      anim: { x: dx, y: [0, -78, 0] },
      transition: {
        x: { duration: 0.72, ease: 'easeOut' },
        y: { duration: 0.72, ease: 'easeOut', times: [0, 0.5, 1] },
      },
    }));
    await sleep(760);
    if (!alive()) return;
    await strike(setVictim, alive);
  }, [busy, reset, strike]);

  return (
    <div className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 max-w-lg mx-auto w-full">
      <div className="text-center">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          RPG Pieces — Demo
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Characters that walk up and strike — and a knight that <span className="font-semibold">leaps over</span> a piece to capture.
        </p>
      </div>

      {/* Stage */}
      <div
        className="relative mx-auto rounded-xl overflow-hidden"
        style={{
          width: SQUARES * SQUARE,
          maxWidth: '100%',
          height: SQUARE + 84,
          background: 'linear-gradient(180deg, #0c1411 0%, #12201a 100%)',
          boxShadow: '0 0 24px 2px rgba(74,222,128,0.12)',
        }}
        data-testid="rpg-stage"
      >
        {/* Board squares (bottom row) */}
        <div className="absolute left-0 bottom-0 flex">
          {Array.from({ length: SQUARES }, (_, i) => (
            <div
              key={i}
              style={{
                width: SQUARE,
                height: SQUARE,
                background: i % 2 === 0 ? 'rgba(74,222,128,0.10)' : 'rgba(255,255,255,0.04)',
                boxShadow: 'inset 0 0 0 1px rgba(74,222,128,0.12)',
              }}
            />
          ))}
        </div>

        {/* Victim */}
        <PieceSprite sheet={VICTIM_SHEET} square={VICTIM_SQUARE} state={victim} />
        {/* Guard (leapt over) */}
        <PieceSprite sheet={GUARD_SHEET} square={GUARD_SQUARE} state={guard} />

        {/* Knight */}
        <motion.div
          className="absolute"
          style={{ left: KNIGHT_START * SQUARE, bottom: 4 }}
          animate={knight.anim}
          transition={knight.transition}
        >
          <LpcSprite
            sheet={KNIGHT_SHEET}
            action={knight.action}
            direction={knight.direction}
            playing={knight.playing}
            loop={knight.loop}
            size={SQUARE}
          />
        </motion.div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => void runWalk()}
          disabled={busy}
          className="px-4 py-2 rounded-lg font-bold text-sm transition-opacity disabled:opacity-40"
          style={{ background: 'rgba(74,222,128,0.18)', color: '#86efac', border: '1px solid rgba(74,222,128,0.4)' }}
          data-testid="rpg-walk-btn"
        >
          ⚔ Walk &amp; Strike
        </button>
        <button
          onClick={() => void runLeap()}
          disabled={busy}
          className="px-4 py-2 rounded-lg font-bold text-sm transition-opacity disabled:opacity-40"
          style={{ background: 'rgba(250,204,21,0.16)', color: '#fde047', border: '1px solid rgba(250,204,21,0.4)' }}
          data-testid="rpg-leap-btn"
        >
          🐴 Knight Leap
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg font-bold text-sm transition-colors"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          data-testid="rpg-reset-btn"
        >
          ↺ Reset
        </button>
      </div>

      <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        Characters: <a className="underline" href="https://github.com/jrconway3/Universal-LPC-spritesheet" target="_blank" rel="noreferrer">Universal LPC Spritesheet</a> (CC-BY-SA 3.0 / GPLv3).
        Concept demo — next: a full 6-piece cast, weapon overlays, and capture/leap wired to real moves.
      </p>
    </div>
  );
}

function PieceSprite({
  sheet,
  square,
  state,
}: {
  sheet: string;
  square: number;
  state: PieceState;
}): JSX.Element {
  return (
    <div
      className="absolute"
      style={{
        left: square * SQUARE,
        bottom: 4,
        opacity: state.dead ? 0 : 1,
        transition: 'opacity 0.45s ease-out',
      }}
    >
      <LpcSprite sheet={sheet} action={state.action} direction="down" playing={state.playing} loop={false} size={SQUARE} />
    </div>
  );
}
