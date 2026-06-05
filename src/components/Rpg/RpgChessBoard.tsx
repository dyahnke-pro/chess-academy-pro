import { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Chess, type Square } from 'chess.js';
import { LpcCharacter, type CharacterLayer } from './LpcCharacter';
import { pieceVisual, attackStyle } from './rpgRoster';
import { playCaptureSound, playArrowSound, playMoveSound, playWarCry } from './rpgSfx';
import type { LpcAction, LpcDirection } from './lpcLayout';

const S = 46; // square size (px) — 8×46 = 368, fits a phone
const CHAR = 64; // characters render at native LPC frame size (crisp), fit to square
const OFFX = (CHAR - S) / 2;
const OFFY = CHAR - S;
const PAD = OFFY; // top head-room so back-rank helmets aren't clipped

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

interface SqXY { x: number; y: number }
function sqXY(square: string): SqXY {
  const file = square.charCodeAt(0) - 97; // a..h → 0..7
  const rank = parseInt(square[1], 10); // 1..8
  return { x: file * S, y: (8 - rank) * S };
}
function faceDir(from: string, to: string): LpcDirection {
  const a = sqXY(from);
  const b = sqXY(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

interface Overlay {
  layers: CharacterLayer[];
  glow: string;
  baseX: number;
  baseY: number;
  action: LpcAction;
  direction: LpcDirection;
  loop: boolean;
  anim: { x: number | number[]; y: number | number[] };
  transition: object;
}

export function RpgChessBoard(): JSX.Element {
  const gameRef = useRef(new Chess());
  const [, setVersion] = useState(0);
  const bump = (): void => setVersion((v) => v + 1);

  const [selected, setSelected] = useState<string | null>(null);
  const [legal, setLegal] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const soundRef = useRef(true);
  soundRef.current = soundOn;

  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [animFrom, setAnimFrom] = useState<string | null>(null);
  const [dying, setDying] = useState<string | null>(null);
  const [dead, setDead] = useState(false);
  const [arrow, setArrow] = useState<{ x0: number; y0: number; x1: number; y1: number; fly: boolean } | null>(null);
  const runRef = useRef(0);

  const game = gameRef.current;
  const board = game.board();
  const turn = game.turn();

  const status = useMemo(() => {
    if (game.isCheckmate()) return `Checkmate — ${turn === 'w' ? 'Black' : 'White'} wins`;
    if (game.isDraw()) return 'Draw';
    if (game.isCheck()) return `${turn === 'w' ? 'White' : 'Black'} in check`;
    return `${turn === 'w' ? 'White' : 'Black'} to move`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, turn, dead, overlay]);

  const doMove = useCallback(async (from: string, to: string): Promise<void> => {
    const g = gameRef.current;
    const moving = g.get(from as Square);
    if (!moving) return;
    const target = g.get(to as Square);
    const style = attackStyle(moving.type);
    const vis = pieceVisual(moving.type, moving.color);
    const fromP = sqXY(from);
    const toP = sqXY(to);
    const dx = toP.x - fromP.x;
    const dy = toP.y - fromP.y;
    const dir = faceDir(from, to);
    const dist = Math.max(Math.abs(dx), Math.abs(dy)) / S;
    const walkDur = Math.max(0.4, dist * 0.16);

    setBusy(true);
    setSelected(null);
    setLegal([]);
    setAnimFrom(from);
    const run = ++runRef.current;
    const alive = (): boolean => runRef.current === run;

    const base = { layers: vis.layers, glow: vis.glow, baseX: fromP.x - OFFX, baseY: PAD + fromP.y - OFFY };

    if (style === 'ranged' && target) {
      // Archer: draw + loose an arrow, the target falls, THEN advance.
      setOverlay({ ...base, action: 'shoot', direction: dir, loop: false, anim: { x: 0, y: 0 }, transition: { duration: 0 } });
      await sleep(430);
      if (!alive()) return;
      setArrow({ x0: fromP.x + S / 2, y0: PAD + fromP.y + S * 0.3, x1: toP.x + S / 2, y1: PAD + toP.y + S * 0.4, fly: false });
      await sleep(30);
      setArrow((a) => (a ? { ...a, fly: true } : a));
      if (soundRef.current) playArrowSound();
      await sleep(250);
      if (!alive()) return;
      setDying(to);
      if (soundRef.current) playCaptureSound(target.type);
      setArrow(null);
      await sleep(430);
      if (!alive()) return;
      setDead(true);
      await sleep(170);
      if (!alive()) return;
      if (soundRef.current) playMoveSound(moving.type); // archer advances
      setOverlay((o) => (o ? { ...o, action: 'walk', loop: true, anim: { x: dx, y: dy }, transition: { x: { duration: walkDur, ease: 'linear' }, y: { duration: walkDur, ease: 'linear' } } } : o));
      await sleep(walkDur * 1000 + 80);
    } else if (style === 'leap') {
      // Rider: leap in an arc OVER whatever is in the way.
      if (soundRef.current) playMoveSound(moving.type); // galloping hooves
      const arc = Math.min(130, 64 + dist * 16);
      setOverlay({ ...base, action: 'slash', direction: dir, loop: true, anim: { x: dx, y: [0, -arc, dy] }, transition: { x: { duration: 0.72, ease: 'easeOut' }, y: { duration: 0.72, ease: 'easeOut', times: [0, 0.5, 1] } } });
      await sleep(760);
      if (!alive()) return;
      if (target) {
        setOverlay((o) => (o ? { ...o, action: 'thrust', loop: false, anim: { x: dx, y: dy }, transition: { duration: 0 } } : o));
        await sleep(340);
        setDying(to);
        if (soundRef.current) playCaptureSound(target.type);
        await sleep(500);
        setDead(true);
        await sleep(170);
      }
    } else {
      // Melee: march to the square, stab if occupied.
      if (soundRef.current) playMoveSound(moving.type); // armor scrape / footsteps
      setOverlay({ ...base, action: 'walk', direction: dir, loop: true, anim: { x: dx, y: dy }, transition: { x: { duration: walkDur, ease: 'linear' }, y: { duration: walkDur, ease: 'linear' } } });
      await sleep(walkDur * 1000 + 80);
      if (!alive()) return;
      if (target) {
        if (soundRef.current && moving.type === 'p') playWarCry(); // peasant charge
        setOverlay((o) => (o ? { ...o, action: 'thrust', loop: false, transition: { duration: 0 } } : o));
        await sleep(340);
        setDying(to);
        if (soundRef.current) playCaptureSound(target.type);
        await sleep(500);
        setDead(true);
        await sleep(170);
      }
    }
    if (!alive()) return;

    g.move({ from: from as Square, to: to as Square, promotion: 'q' });
    setOverlay(null);
    setAnimFrom(null);
    setDying(null);
    setDead(false);
    setArrow(null);
    bump();
    setBusy(false);
  }, []);

  const handleClick = useCallback(
    (sq: string): void => {
      if (busy) return;
      const g = gameRef.current;
      if (selected && legal.includes(sq)) {
        void doMove(selected, sq).catch((e: unknown) => console.error('rpg doMove failed', e));
        return;
      }
      const p = g.get(sq as Square);
      if (p && p.color === g.turn()) {
        setSelected(sq);
        const moves = g.moves({ square: sq as Square, verbose: true });
        setLegal(moves.map((m) => m.to as string));
      } else {
        setSelected(null);
        setLegal([]);
      }
    },
    [busy, selected, legal, doMove],
  );

  const newGame = useCallback((): void => {
    runRef.current += 1;
    gameRef.current = new Chess();
    setSelected(null);
    setLegal([]);
    setOverlay(null);
    setAnimFrom(null);
    setDying(null);
    setDead(false);
    setArrow(null);
    setBusy(false);
    bump();
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }} data-testid="rpg-status">
        {status}
      </div>

      <div
        className="relative rounded-lg overflow-hidden"
        style={{ width: 8 * S, height: 8 * S + PAD, boxShadow: '0 0 22px 2px rgba(74,222,128,0.14)', background: '#101713' }}
        data-testid="rpg-chess-board"
      >
        {/* Squares */}
        {Array.from({ length: 8 }, (_, r) =>
          Array.from({ length: 8 }, (_, c) => {
            const sq = `${'abcdefgh'[c]}${8 - r}`;
            const lightSq = (r + c) % 2 === 0;
            const isSel = selected === sq;
            const isLegal = legal.includes(sq);
            return (
              <div
                key={sq}
                data-square={sq}
                onClick={() => handleClick(sq)}
                style={{
                  position: 'absolute',
                  left: c * S,
                  top: PAD + r * S,
                  width: S,
                  height: S,
                  background: isSel
                    ? 'rgba(74,222,128,0.45)'
                    : lightSq
                      ? '#46584d'
                      : '#26302a',
                  boxShadow: 'inset 0 0 0 1px rgba(74,222,128,0.10)',
                  cursor: busy ? 'default' : 'pointer',
                }}
              >
                {isLegal && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: S * 0.28,
                      height: S * 0.28,
                      transform: 'translate(-50%,-50%)',
                      borderRadius: '50%',
                      background: 'rgba(74,222,128,0.5)',
                    }}
                  />
                )}
              </div>
            );
          }),
        )}

        {/* Pieces (idle) */}
        {board.map((row, r) =>
          row.map((piece, c) => {
            if (!piece) return null;
            const sq = piece.square;
            if (sq === animFrom) return null; // moving piece lives in the overlay
            const vis = pieceVisual(piece.type, piece.color);
            const isDying = sq === dying;
            return (
              <div
                key={sq}
                style={{
                  position: 'absolute',
                  left: c * S - OFFX,
                  top: PAD + r * S - OFFY,
                  width: CHAR,
                  height: CHAR,
                  pointerEvents: 'none',
                  opacity: isDying && dead ? 0 : 1,
                  transition: 'opacity 0.4s ease-out',
                  zIndex: isDying ? 3 : 2,
                }}
              >
                <LpcCharacter
                  layers={vis.layers}
                  glow={vis.glow}
                  action={isDying ? 'hurt' : 'walk'}
                  direction="down"
                  playing={isDying}
                  loop={false}
                  size={CHAR}
                />
                <PieceBadge glyph={vis.glyph} color={piece.color} />
              </div>
            );
          }),
        )}

        {/* Arrow projectile */}
        {arrow && (
          <motion.div
            initial={{ left: arrow.x0, top: arrow.y0, opacity: 0 }}
            animate={{ left: arrow.fly ? arrow.x1 : arrow.x0, top: arrow.fly ? arrow.y1 : arrow.y0, opacity: 1 }}
            transition={{ duration: 0.25, ease: 'linear' }}
            style={{ position: 'absolute', width: 10, height: 3, borderRadius: 2, background: '#fde047', boxShadow: '0 0 5px 1px rgba(250,204,21,0.9)', zIndex: 6 }}
          />
        )}

        {/* Moving overlay character */}
        {overlay && (
          <motion.div
            style={{ position: 'absolute', left: overlay.baseX, top: overlay.baseY, width: CHAR, height: CHAR, zIndex: 5 }}
            animate={overlay.anim}
            transition={overlay.transition}
          >
            <LpcCharacter
              layers={overlay.layers}
              glow={overlay.glow}
              action={overlay.action}
              direction={overlay.direction}
              playing
              loop={overlay.loop}
              size={CHAR}
            />
          </motion.div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={newGame}
          className="px-4 py-2 rounded-lg font-bold text-sm transition-colors"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          data-testid="rpg-newgame-btn"
        >
          ↺ New Game
        </button>
        <button
          onClick={() => setSoundOn((s) => !s)}
          className="px-4 py-2 rounded-lg font-bold text-sm transition-colors"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          data-testid="rpg-sound-btn"
          aria-pressed={soundOn}
        >
          {soundOn ? '🔊 Sound' : '🔇 Muted'}
        </button>
      </div>
    </div>
  );
}

function PieceBadge({ glyph, color }: { glyph: string; color: 'w' | 'b' }): JSX.Element {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 0,
        transform: 'translateX(-50%)',
        fontSize: 11,
        lineHeight: '12px',
        padding: '0 3px',
        borderRadius: 4,
        background: 'rgba(0,0,0,0.55)',
        color: color === 'w' ? '#ffd479' : '#c4b5fd',
        textShadow: '0 1px 1px rgba(0,0,0,0.8)',
      }}
    >
      {glyph}
    </div>
  );
}
