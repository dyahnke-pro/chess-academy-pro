import { useCallback, useRef, useState } from 'react';
import { LpcSprite } from './LpcSprite';
import type { LpcAction, LpcDirection } from './lpcLayout';

// Proof-of-concept for "RPG-style animated pieces": real characters that walk
// to a square and stab the piece occupying it, then it dies. Art is the
// Universal LPC Spritesheet (CC-BY-SA 3.0 / GPLv3) — see public/rpg/CREDITS.md.
// This is an ISOLATED demo route (/rpg-demo); it does not touch the real boards.

const ATTACKER_SHEET = '/rpg/body-dark.png';
const VICTIM_SHEET = '/rpg/body-female-light.png';

const SQUARES = 6;
const SQUARE = 72;
const VICTIM_SQUARE = 2;
const ATTACKER_START = 5;
const ATTACKER_STRIKE = 3; // square just to the victim's right

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

interface ActorState {
  square: number;
  action: LpcAction;
  direction: LpcDirection;
  playing: boolean;
  loop: boolean;
}

export function RpgDemoPage(): JSX.Element {
  const [attacker, setAttacker] = useState<ActorState>({
    square: ATTACKER_START,
    action: 'walk',
    direction: 'left',
    playing: false,
    loop: false,
  });
  const [victim, setVictim] = useState<ActorState>({
    square: VICTIM_SQUARE,
    action: 'walk',
    direction: 'down',
    playing: false,
    loop: false,
  });
  const [victimDead, setVictimDead] = useState(false);
  const [busy, setBusy] = useState(false);
  const runRef = useRef(0);

  const reset = useCallback((): void => {
    runRef.current += 1;
    setBusy(false);
    setVictimDead(false);
    setAttacker({ square: ATTACKER_START, action: 'walk', direction: 'left', playing: false, loop: false });
    setVictim({ square: VICTIM_SQUARE, action: 'walk', direction: 'down', playing: false, loop: false });
  }, []);

  const runAttack = useCallback(async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    const run = ++runRef.current;
    const alive = (): boolean => runRef.current === run;

    // 1) March across to the square beside the victim (CSS slides the position
    //    while the walk cycle loops).
    setAttacker((a) => ({ ...a, action: 'walk', direction: 'left', playing: true, loop: true, square: ATTACKER_STRIKE }));
    await sleep(((ATTACKER_START - ATTACKER_STRIKE) / 2) * 900);
    if (!alive()) return;

    // 2) Thrust at the victim.
    setAttacker((a) => ({ ...a, action: 'thrust', direction: 'left', playing: true, loop: false }));
    await sleep(360); // strike connects mid-thrust
    if (!alive()) return;

    // 3) Victim recoils (hurt) then falls.
    setVictim((v) => ({ ...v, action: 'hurt', direction: 'down', playing: true, loop: false }));
    await sleep(520);
    if (!alive()) return;
    setVictimDead(true);
    await sleep(450);
    if (!alive()) return;

    // 4) Attacker stands down (idle facing the victim).
    setAttacker((a) => ({ ...a, action: 'walk', direction: 'left', playing: false, loop: false }));
    setBusy(false);
  }, [busy]);

  return (
    <div className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 max-w-lg mx-auto w-full">
      <div className="text-center">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          RPG Pieces — Demo
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          A proof-of-concept: a character walks to a square and strikes the piece
          occupying it. Tap <span className="font-semibold">Attack</span>.
        </p>
      </div>

      {/* Stage */}
      <div
        className="relative mx-auto rounded-xl overflow-hidden"
        style={{
          width: SQUARES * SQUARE,
          maxWidth: '100%',
          height: SQUARE + 40,
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
                background: (i % 2 === 0) ? 'rgba(74,222,128,0.10)' : 'rgba(255,255,255,0.04)',
                boxShadow: 'inset 0 0 0 1px rgba(74,222,128,0.12)',
              }}
            />
          ))}
        </div>

        {/* Victim */}
        <div
          className="absolute"
          style={{
            left: victim.square * SQUARE,
            bottom: 4,
            opacity: victimDead ? 0 : 1,
            transition: 'opacity 0.45s ease-out',
          }}
        >
          <LpcSprite
            sheet={VICTIM_SHEET}
            action={victim.action}
            direction={victim.direction}
            playing={victim.playing}
            loop={victim.loop}
            size={SQUARE}
          />
        </div>

        {/* Attacker */}
        <div
          className="absolute"
          style={{
            left: attacker.square * SQUARE,
            bottom: 4,
            transition: 'left 0.9s linear',
          }}
        >
          <LpcSprite
            sheet={ATTACKER_SHEET}
            action={attacker.action}
            direction={attacker.direction}
            playing={attacker.playing}
            loop={attacker.loop}
            size={SQUARE}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        <button
          onClick={() => void runAttack()}
          disabled={busy}
          className="px-5 py-2 rounded-lg font-bold text-sm transition-opacity disabled:opacity-40"
          style={{ background: 'rgba(74,222,128,0.18)', color: '#86efac', border: '1px solid rgba(74,222,128,0.4)' }}
          data-testid="rpg-attack-btn"
        >
          ⚔ Attack
        </button>
        <button
          onClick={reset}
          className="px-5 py-2 rounded-lg font-bold text-sm transition-colors"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          data-testid="rpg-reset-btn"
        >
          ↺ Reset
        </button>
      </div>

      <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        Characters: <a className="underline" href="https://github.com/jrconway3/Universal-LPC-spritesheet" target="_blank" rel="noreferrer">Universal LPC Spritesheet</a> (CC-BY-SA 3.0 / GPLv3).
        This is a throwaway concept demo — next steps would be a full 6-piece set,
        a knight that leaps over pieces, and capture/death wired to real moves.
      </p>
    </div>
  );
}
