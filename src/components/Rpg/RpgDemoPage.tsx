import { RpgChessBoard } from './RpgChessBoard';

// "RPG-style animated pieces" demo: a fully playable board (real chess rules)
// where every piece is an animated LPC character with its own combat style —
// melee march-and-stab, the knight's leap, and the archer-bishop's shoot-then-
// advance. Art is the Universal LPC Spritesheet (CC-BY-SA 3.0 / GPLv3 — see
// public/rpg/CREDITS.md). Isolated /rpg-demo route; does not touch the real boards.

export function RpgDemoPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 max-w-lg mx-auto w-full">
      <div className="text-center">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          RPG Chess — Demo
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Tap a piece, then a highlighted square. Real chess rules — every capture
          is a fight.
        </p>
      </div>

      <RpgChessBoard />

      <div className="text-xs space-y-1 max-w-xs mx-auto" style={{ color: 'var(--color-text-muted)' }}>
        <p><span className="font-semibold">King</span> crowned with a scepter · <span className="font-semibold">Queen</span> in robe + tiara · <span className="font-semibold">Rook</span> a plated guard · <span className="font-semibold">Knight</span> a mailed rider · <span className="font-semibold">Bishop</span> a hooded archer · <span className="font-semibold">Pawn</span> a spear peasant.</p>
        <p><span className="font-semibold">♞ Knight</span> — leaps over the pieces in its way and strikes on landing.</p>
        <p><span className="font-semibold">♝ Bishop</span> — looses an arrow, the target falls, then advances to the square.</p>
        <p><span className="font-semibold">others</span> — march onto the square and run the piece through.</p>
        <p className="opacity-70">Gold glow = White army, arcane purple = Black. (Knight-on-horseback is the next upgrade.)</p>
      </div>

      <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        Characters: <a className="underline" href="https://github.com/jrconway3/Universal-LPC-spritesheet" target="_blank" rel="noreferrer">Universal LPC Spritesheet</a> (CC-BY-SA 3.0 / GPLv3).
      </p>
    </div>
  );
}
