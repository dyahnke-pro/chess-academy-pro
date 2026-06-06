import { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Chess, type Square } from 'chess.js';
import { CastToken } from './CastToken';
import { CAST_GLYPH, CAST_TEAM_GLOW, roleOf } from './rpgCast';
import { hasFrames, type SpriteAction, type Facing } from './rpgCastFrames';
import { attackStyle } from './rpgRoster';
import { playCaptureSound, playArrowSound, playMoveSound, playWarCry, playQueenLaugh, playPawnTaunt, playChargeSound, playVictory, playDefeat } from './rpgSfx';

const S = 46; // square size (px) — 8×46 = 368, fits a phone
const TOKEN_W = S; // footprint width = one square
const TOKEN_H = Math.round(S * 1.35); // full-body tokens stand a bit taller than the square
const KNIGHT_H = Math.round(S * 1.85); // the mounted knight stands ~½ a head over the pawns
const PAD = KNIGHT_H - S; // top head-room for the tallest piece (the rider)
const pieceH = (type: string): number => (type === 'n' ? KNIGHT_H : TOKEN_H);

type Dir = 'left' | 'right' | 'up' | 'down';
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

interface SqXY { x: number; y: number }
function sqXY(square: string): SqXY {
  const file = square.charCodeAt(0) - 97; // a..h → 0..7
  const rank = parseInt(square[1], 10); // 1..8
  return { x: file * S, y: (8 - rank) * S }; // token top-left (bottom aligns to square)
}
function faceDir(from: string, to: string): Dir {
  const a = sqXY(from);
  const b = sqXY(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
/** Inclusive straight-line squares from `from` to `to` (rank, file, or diagonal). */
function squaresBetween(from: string, to: string): string[] {
  const f0 = from.charCodeAt(0) - 97;
  const r0 = parseInt(from[1], 10);
  const f1 = to.charCodeAt(0) - 97;
  const r1 = parseInt(to[1], 10);
  const df = Math.sign(f1 - f0);
  const dr = Math.sign(r1 - r0);
  const steps = Math.max(Math.abs(f1 - f0), Math.abs(r1 - r0));
  const out: string[] = [];
  for (let i = 0; i <= steps; i++) out.push(`${'abcdefgh'[f0 + df * i]}${r0 + dr * i}`);
  return out;
}
/** Bottom-center (the foot line) of a square, in board px — where fire licks up. */
function footCenter(square: string): SqXY {
  const p = sqXY(square);
  return { x: p.x + S / 2, y: PAD + p.y + S };
}
/** Squares whose centre lies under the knight's leap arc (between, not at, the
 *  endpoints) — those pieces duck as the horse sails over them. */
function squaresUnderLeap(occupied: string[], from: string, to: string): string[] {
  const a = sqXY(from);
  const b = sqXY(to);
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy || 1;
  return occupied.filter((sq) => {
    if (sq === from || sq === to) return false;
    const q = sqXY(sq);
    const t = ((q.x - a.x) * vx + (q.y - a.y) * vy) / len2;
    if (t < 0.18 || t > 0.82) return false;
    const px = a.x + t * vx;
    const py = a.y + t * vy;
    return Math.hypot(q.x - px, q.y - py) < S * 0.62;
  });
}

interface Overlay {
  type: string;
  color: 'w' | 'b';
  flip: boolean;
  facing: Facing;
  action: SpriteAction;
  baseX: number;
  baseY: number;
  anim: { x: number | number[]; y: number | number[]; scale?: number | number[]; rotate?: number | number[] };
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
  // A pawn "kicking" a piece (advancing to attack an enemy non-pawn): the pawn
  // pokes toward `victim` and that piece recoils — but stays on the board.
  const [kickReact, setKickReact] = useState<{ pawn: string; victim: string; dx: number; dy: number } | null>(null);
  const [arrow, setArrow] = useState<{ x0: number; y0: number; x1: number; y1: number; fly: boolean } | null>(null);
  // Pawn (assassin) hidden-blade kill: a blade glint + the victim crumpling in place.
  const [crumple, setCrumple] = useState<string | null>(null);
  const [blade, setBlade] = useState<{ x: number; y: number; key: number } | null>(null);
  const bladeKeyRef = useRef(0);
  // Pieces the knight is currently leaping OVER — they duck under the horse.
  const [ducking, setDucking] = useState<string[]>([]);
  // Random cinematic close-up: the board punches in on the kill square, then out.
  // The origin lives in a ref so zooming back out stays anchored on the kill (no snap).
  const [zoomed, setZoomed] = useState(false);
  const camOriginRef = useRef('50% 50%');
  // Rook charge: ground fire licking up under the feet along the charge path,
  // and the victim getting shield-bashed clean off the board.
  const [fireTrail, setFireTrail] = useState<{ path: SqXY[]; key: number } | null>(null);
  const [headbutt, setHeadbutt] = useState<{ square: string; fx: number; fy: number; rot: number } | null>(null);
  const fireKeyRef = useRef(0);
  // At game end the winning army celebrates; the losers throw a fit (or all
  // slump on a draw, winner = null).
  const [gameOver, setGameOver] = useState<{ winner: 'w' | 'b' | null } | null>(null);
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
    const fromP = sqXY(from);
    const toP = sqXY(to);
    const dx = toP.x - fromP.x;
    const dy = toP.y - fromP.y;
    const dir = faceDir(from, to);
    const dist = Math.max(Math.abs(dx), Math.abs(dy)) / S;
    const walkDur = Math.max(0.4, dist * 0.16);
    // Random cinematic kill-shot: punch in on a fraction of captures. Skip the
    // rook charge — its victim flies OFF the board, which reads better wide.
    const closeUp = !!target && style !== 'charge' && Math.random() < 0.5;
    const killOx = toP.x + S / 2;
    const killOy = PAD + toP.y + S * 0.45;
    const punchIn = (): void => { if (closeUp) { camOriginRef.current = `${killOx}px ${killOy}px`; setZoomed(true); } };

    setBusy(true);
    setSelected(null);
    setLegal([]);
    setAnimFrom(from);
    const run = ++runRef.current;
    const alive = (): boolean => runRef.current === run;

    const facing: Facing = dir === 'up' ? 'back' : 'front';
    const base = { type: moving.type, color: moving.color, flip: dir === 'left', facing, action: 'walk' as SpriteAction, baseX: fromP.x, baseY: PAD + fromP.y + S - pieceH(moving.type) };
    const framed = hasFrames(roleOf(moving.type));

    if (style === 'ranged' && target) {
      // Archer: draw the bow (lean back), loose an arrow, the target falls, THEN advance.
      setOverlay({ ...base, anim: { x: 0, y: 0, scale: [1, 0.97, 1.01], rotate: [0, dir === 'left' ? 7 : -7, 0] }, transition: { duration: 0.42, times: [0, 0.7, 1] } });
      await sleep(430);
      if (!alive()) return;
      setArrow({ x0: fromP.x + S / 2, y0: PAD + fromP.y + S - TOKEN_H * 0.65, x1: toP.x + S / 2, y1: PAD + toP.y + S - TOKEN_H * 0.65, fly: false });
      await sleep(30);
      setArrow((a) => (a ? { ...a, fly: true } : a));
      if (soundRef.current) playArrowSound();
      await sleep(250);
      if (!alive()) return;
      punchIn(); // close-up as the arrow lands
      setDying(to);
      if (soundRef.current) playCaptureSound(target.type);
      setArrow(null);
      await sleep(430);
      if (!alive()) return;
      setDead(true);
      await sleep(170);
      if (!alive()) return;
      if (soundRef.current) playMoveSound(moving.type); // archer advances
      setOverlay((o) => (o ? { ...o, anim: { x: dx, y: dy }, transition: { x: { duration: walkDur, ease: 'linear' }, y: { duration: walkDur, ease: 'linear' } } } : o));
      await sleep(walkDur * 1000 + 80);
    } else if (style === 'leap') {
      // Rider: gallop + a controlled hop arcing OVER whatever's in the way and
      // landing ON the square — the arc is clamped so it never sails off the top
      // of the board — then the axe comes down.
      if (soundRef.current) playMoveSound(moving.type);
      const occupied = g.board().flat().filter((p): p is NonNullable<typeof p> => !!p).map((p) => p.square);
      setDucking(squaresUnderLeap(occupied, from, to)); // pieces under the arc duck
      const arc = Math.min(52, 24 + dist * 6, base.baseY + 16); // gentle; stays on-screen
      setOverlay({ ...base, anim: { x: dx, y: [0, -arc, dy] }, transition: { x: { duration: 0.66, ease: 'easeInOut' }, y: { duration: 0.66, ease: 'easeInOut', times: [0, 0.5, 1] } } });
      await sleep(700);
      setDucking([]);
      if (!alive()) return;
      if (target) {
        punchIn(); // close-up as the axe comes down
        setOverlay((o) => (o ? { ...o, action: framed ? 'attack' : o.action, anim: { x: dx, y: dy, scale: [1, 1.12, 1] }, transition: { duration: 0.36 } } : o));
        await sleep(360);
        setDying(to);
        if (soundRef.current) playCaptureSound(target.type);
        await sleep(500);
        setDead(true);
        await sleep(170);
      }
    } else if (style === 'charge') {
      // Armored guard: a fast charge — leaning forward, fire licking up under the
      // feet — that STOPS one square short and shield-bashes the victim clean off
      // the board.
      if (soundRef.current) { playMoveSound(moving.type); playChargeSound(); }
      const lineSquares = squaresBetween(from, to);
      const approachSq = lineSquares.length >= 2 ? lineSquares[lineSquares.length - 2] : from;
      const aP = sqXY(approachSq);
      const adx = aP.x - fromP.x;
      const ady = aP.y - fromP.y;
      const lean = dir === 'left' ? -10 : dir === 'right' ? 10 : 0; // lean into the charge
      setFireTrail({ path: lineSquares.slice(0, -1).map(footCenter), key: ++fireKeyRef.current });
      const chargeDur = Math.max(0.18, dist * 0.07); // markedly faster than the other pieces
      setOverlay({ ...base, anim: { x: adx, y: ady, rotate: [0, lean, lean] }, transition: { x: { duration: chargeDur, ease: 'easeIn' }, y: { duration: chargeDur, ease: 'easeIn' }, rotate: { duration: chargeDur } } });
      await sleep(chargeDur * 1000 + 50);
      if (!alive()) { setFireTrail(null); return; }
      if (target) {
        if (soundRef.current) playCaptureSound(target.type);
        // Shield-bash from the square just before the victim — the rook plays its
        // shield-thrust frames and the victim is launched off the board.
        setOverlay((o) => (o ? { ...o, action: framed ? 'attack' : o.action, anim: { x: adx, y: ady, scale: [1, 1.18, 1.05], rotate: [lean, lean * 1.4, 0] }, transition: { duration: 0.2 } } : o));
        const ux = Math.sign(dx);
        const uy = Math.sign(dy);
        const fx = ux !== 0 ? ux * S * 6 : (Math.random() < 0.5 ? -1 : 1) * S * 0.7;
        const fy = uy !== 0 ? uy * S * 6 - S * 1.5 : -S * 2.4;
        setHeadbutt({ square: to, fx, fy, rot: (ux >= 0 ? 1 : -1) * 760 });
        setDying(to);
        await sleep(720); // let the victim sail off the edge
        if (!alive()) { setFireTrail(null); setHeadbutt(null); return; }
        // Rook steps onto the cleared square.
        setOverlay((o) => (o ? { ...o, action: framed ? 'idle' : o.action, anim: { x: dx, y: dy, rotate: 0 }, transition: { duration: 0.18, ease: 'easeOut' } } : o));
        await sleep(200);
        setDead(true);
      }
      window.setTimeout(() => setFireTrail(null), 300);
    } else {
      // Melee: march to the square (with a stride sway), strike if occupied.
      if (soundRef.current) playMoveSound(moving.type);
      setOverlay({ ...base, anim: { x: dx, y: dy, rotate: [0, -3, 3, -3, 3, 0] }, transition: { x: { duration: walkDur, ease: 'linear' }, y: { duration: walkDur, ease: 'linear' }, rotate: { duration: walkDur, ease: 'linear' } } });
      await sleep(walkDur * 1000 + 80);
      if (!alive()) return;
      if (target) {
        if (moving.type === 'p' && Math.random() < 0.5) {
          // Assassin's Creed hidden-blade kill: dart in low, the blade flicks out,
          // one thrust, and the victim crumples in place — instant.
          punchIn(); // close-up on the hidden-blade strike
          setOverlay((o) => (o ? { ...o, action: 'idle', anim: { x: dx, y: dy, scale: [1, 1.12, 1], rotate: [0, dir === 'left' ? -7 : 7, 0] }, transition: { duration: 0.2 } } : o));
          setBlade({ x: toP.x + S / 2, y: PAD + toP.y + S * 0.42, key: ++bladeKeyRef.current });
          await sleep(150);
          if (!alive()) return;
          if (soundRef.current) playCaptureSound(target.type);
          setCrumple(to);
          await sleep(360);
        } else {
          if (soundRef.current) {
            if (moving.type === 'p') playWarCry();
            else if (moving.type === 'q') playQueenLaugh();
          }
          if (moving.type === 'p') {
            // Rogue dagger-spin: the spin frames whirl through the strike.
            setOverlay((o) => (o ? { ...o, action: 'attack', anim: { x: dx, y: dy, scale: [1, 1.1, 1] }, transition: { duration: 0.42 } } : o));
          } else if (framed) {
            // Pieces with a frame set play their real swing sequence.
            setOverlay((o) => (o ? { ...o, action: 'attack', anim: { x: dx, y: dy, scale: [1, 1.06, 1] }, transition: { duration: 0.36 } } : o));
          } else {
            const swing = dir === 'left' ? -24 : 24; // puppet swing toward the target
            setOverlay((o) => (o ? { ...o, anim: { x: dx, y: dy, scale: [1, 1.15, 1], rotate: [0, swing, 0] }, transition: { duration: 0.34 } } : o));
          }
          punchIn(); // close-up on the strike
          await sleep(moving.type === 'p' ? 420 : 340);
          setDying(to);
          if (soundRef.current) playCaptureSound(target.type);
          await sleep(500);
          setDead(true);
          await sleep(170);
        }
      }
    }
    if (!alive()) return;

    g.move({ from: from as Square, to: to as Square, promotion: 'q' });
    setOverlay(null);
    setAnimFrom(null);
    setDying(null);
    setDead(false);
    setArrow(null);
    setHeadbutt(null);
    setCrumple(null);
    setDucking([]);
    setZoomed(false); // zoom back out
    window.setTimeout(() => setBlade(null), 240);
    bump();

    // "Kicking" a piece (chess sense): a pawn that ADVANCED (no capture) now
    // diagonally attacks an enemy non-pawn → poke it, it recoils + "get outta
    // here", and it stays put (it's threatened, not taken).
    if (moving.type === 'p' && !target) {
      const fwd = moving.color === 'w' ? 1 : -1;
      const toFile = to.charCodeAt(0) - 97;
      const toRank = parseInt(to[1], 10);
      for (const df of [-1, 1]) {
        const ff = toFile + df;
        const rr = toRank + fwd;
        if (ff < 0 || ff > 7 || rr < 1 || rr > 8) continue;
        const vicSq = `${'abcdefgh'[ff]}${rr}`;
        const vic = g.get(vicSq as Square);
        if (vic && vic.color !== moving.color && vic.type !== 'p' && vic.type !== 'k') {
          const pP = sqXY(to);
          const vP = sqXY(vicSq);
          setKickReact({ pawn: to, victim: vicSq, dx: vP.x - pP.x, dy: vP.y - pP.y });
          if (soundRef.current) playPawnTaunt();
          window.setTimeout(() => setKickReact(null), 850);
          break;
        }
      }
    }

    // Game over → winners celebrate, losers throw a fit.
    if (g.isGameOver()) {
      const winner = g.isCheckmate() ? moving.color : null; // draw / stalemate → null
      setGameOver({ winner });
      if (soundRef.current) (winner ? playVictory : playDefeat)();
    }
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
    setKickReact(null);
    setArrow(null);
    setFireTrail(null);
    setHeadbutt(null);
    setCrumple(null);
    setBlade(null);
    setDucking([]);
    setZoomed(false);
    setGameOver(null);
    setBusy(false);
    bump();
  }, []);

  const tokenLeft = (c: number): number => c * S;
  const tokenTop = (r: number, h: number): number => PAD + r * S + S - h; // bottom-aligned to its square

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }} data-testid="rpg-status">
        {status}
      </div>

      <motion.div
        className="relative rounded-lg overflow-hidden"
        style={{ width: 8 * S, height: 8 * S + PAD, boxShadow: '0 0 22px 2px rgba(74,222,128,0.14)', background: '#0c1410', transformOrigin: camOriginRef.current }}
        animate={{ scale: zoomed ? 1.85 : 1 }}
        transition={{ duration: 0.34, ease: zoomed ? 'easeOut' : 'easeInOut' }}
        data-testid="rpg-chess-board"
        data-fen={game.fen()}
        data-selected={selected ?? ''}
        data-busy={busy ? '1' : '0'}
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
                  background: isSel ? 'rgba(74,222,128,0.45)' : lightSq ? '#46584d' : '#26302a',
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
                      background: 'rgba(74,222,128,0.6)',
                      boxShadow: '0 0 6px 1px rgba(74,222,128,0.5)',
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
            const glow = CAST_TEAM_GLOW[piece.color];
            const isDying = sq === dying;
            const h = pieceH(piece.type);
            const common = { position: 'absolute' as const, left: tokenLeft(c), top: tokenTop(r, h), width: TOKEN_W, height: h, pointerEvents: 'none' as const };

            // Game over: winners jump for joy, losers throw a fit.
            if (gameOver) {
              const isWinner = gameOver.winner === piece.color;
              const anim = isWinner
                ? { y: [0, -12, 0] }
                : { rotate: [0, -8, 8, -8, 8, 0], x: [0, -3, 3, -3, 3, 0] };
              const trans = isWinner
                ? { repeat: Infinity, duration: 0.7, delay: (c % 4) * 0.1, ease: 'easeOut' as const }
                : { repeat: Infinity, duration: 0.5, delay: (c % 4) * 0.05 };
              return (
                <motion.div key={sq} style={{ ...common, zIndex: 10 + r }} animate={anim} transition={trans}>
                  <CastToken type={piece.type} color={piece.color} w={TOKEN_W} h={h} glow={glow} action="idle" facing="front" />
                  <PieceBadge glyph={CAST_GLYPH[piece.type]} color={piece.color} />
                </motion.div>
              );
            }

            // Pawn poking a piece it just kicked.
            if (kickReact?.pawn === sq) {
              return (
                <motion.div key={sq} style={{ ...common, zIndex: 30 }} animate={{ x: [0, kickReact.dx * 0.35, 0], y: [0, kickReact.dy * 0.35, 0] }} transition={{ duration: 0.5, times: [0, 0.4, 1], ease: 'easeOut' }}>
                  <CastToken type={piece.type} color={piece.color} w={TOKEN_W} h={h} glow={glow} action="idle" facing="front" flip={kickReact.dx < 0} />
                  <PieceBadge glyph={CAST_GLYPH[piece.type]} color={piece.color} />
                </motion.div>
              );
            }
            // The kicked piece startles + recoils, then settles (stays put).
            if (kickReact?.victim === sq) {
              return (
                <motion.div key={sq} style={{ ...common, zIndex: 20 + r }} animate={{ x: [0, kickReact.dx * 0.2, 0], rotate: [0, kickReact.dx >= 0 ? 10 : -10, 0] }} transition={{ duration: 0.6, times: [0, 0.35, 1], ease: 'easeOut' }}>
                  <CastToken type={piece.type} color={piece.color} w={TOKEN_W} h={h} glow={glow} action="idle" facing="front" />
                  <PieceBadge glyph={CAST_GLYPH[piece.type]} color={piece.color} />
                </motion.div>
              );
            }
            // Shield-bashed by a charging rook: the victim tumbles clean off the board.
            if (headbutt?.square === sq) {
              return (
                <motion.div key={sq} style={{ ...common, zIndex: 50 }}
                  animate={{ x: [0, headbutt.fx * 0.5, headbutt.fx], y: [0, -S * 1.5, headbutt.fy], rotate: [0, headbutt.rot * 0.4, headbutt.rot], opacity: [1, 1, 0] }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                  <CastToken type={piece.type} color={piece.color} w={TOKEN_W} h={h} glow={glow} action="idle" facing="front" />
                  <PieceBadge glyph={CAST_GLYPH[piece.type]} color={piece.color} />
                </motion.div>
              );
            }
            // Assassinated (hidden blade): the victim crumples to the ground.
            if (crumple === sq) {
              return (
                <motion.div key={sq} style={{ ...common, zIndex: 17, transformOrigin: '50% 100%' }}
                  animate={{ scaleY: [1, 0.82, 0.18], y: [0, S * 0.1, S * 0.5], rotate: [0, 6, 16], opacity: [1, 1, 0] }}
                  transition={{ duration: 0.36, ease: 'easeIn' }}
                >
                  <CastToken type={piece.type} color={piece.color} w={TOKEN_W} h={h} glow={glow} action="idle" facing="front" />
                  <PieceBadge glyph={CAST_GLYPH[piece.type]} color={piece.color} />
                </motion.div>
              );
            }
            // Ducking under the leaping knight: crouch low, then pop back up.
            if (ducking.includes(sq)) {
              return (
                <motion.div key={sq} style={{ ...common, zIndex: 10 + r, transformOrigin: '50% 100%' }}
                  animate={{ scaleY: [1, 0.66, 0.66, 1], y: [0, S * 0.14, S * 0.14, 0] }}
                  transition={{ duration: 0.66, times: [0, 0.3, 0.6, 1], ease: 'easeInOut' }}
                >
                  <CastToken type={piece.type} color={piece.color} w={TOKEN_W} h={h} glow={glow} action="idle" facing="front" />
                  <PieceBadge glyph={CAST_GLYPH[piece.type]} color={piece.color} />
                </motion.div>
              );
            }
            return (
              <div
                key={sq}
                style={{ ...common, opacity: isDying && dead ? 0 : 1, transition: 'opacity 0.4s ease-out', zIndex: isDying ? 15 : 10 + r }}
              >
                <CastToken type={piece.type} color={piece.color} w={TOKEN_W} h={h} glow={glow} action="idle" facing="front" />
                <PieceBadge glyph={CAST_GLYPH[piece.type]} color={piece.color} />
              </div>
            );
          }),
        )}

        {/* Rook's fire trail (licks up under the feet along the charge path) */}
        {fireTrail && <FireTrail key={fireTrail.key} path={fireTrail.path} />}

        {/* Assassin's hidden-blade glint */}
        {blade && (
          <motion.div
            key={blade.key}
            initial={{ opacity: 0, scaleX: 0.4, rotate: -32 }}
            animate={{ opacity: [0, 1, 0], scaleX: [0.4, 1.3, 1.1], rotate: [-32, 14, 20] }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            style={{ position: 'absolute', left: blade.x - 16, top: blade.y, width: 32, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, transparent, #fff 45%, #cfe8ff 60%, transparent)', boxShadow: '0 0 9px 2px rgba(220,240,255,0.95)', zIndex: 44, pointerEvents: 'none' }}
          />
        )}

        {/* Arrow projectile */}
        {arrow && (
          <motion.div
            initial={{ left: arrow.x0, top: arrow.y0, opacity: 0 }}
            animate={{ left: arrow.fly ? arrow.x1 : arrow.x0, top: arrow.fly ? arrow.y1 : arrow.y0, opacity: 1 }}
            transition={{ duration: 0.25, ease: 'linear' }}
            style={{ position: 'absolute', width: 12, height: 3, borderRadius: 2, background: '#fde047', boxShadow: '0 0 6px 1px rgba(250,204,21,0.9)', zIndex: 40 }}
          />
        )}

        {/* Moving overlay token */}
        {overlay && (
          <motion.div
            style={{ position: 'absolute', left: overlay.baseX, top: overlay.baseY, width: TOKEN_W, height: pieceH(overlay.type), zIndex: 35, transformOrigin: '50% 100%' }}
            animate={overlay.anim}
            transition={overlay.transition}
          >
            <CastToken type={overlay.type} color={overlay.color} w={TOKEN_W} h={pieceH(overlay.type)} glow={CAST_TEAM_GLOW[overlay.color]} flip={overlay.flip} action={overlay.action} facing={overlay.facing} />
          </motion.div>
        )}
      </motion.div>

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

/** Fire kicked up under the rook's feet: short, hot flame tongues hugging the
 *  ground at each square along the charge path, igniting in sequence. */
function FireTrail({ path }: { path: SqXY[] }): JSX.Element {
  const flame =
    'radial-gradient(ellipse at 50% 100%, rgba(255,250,210,0.98) 0%, rgba(255,186,46,0.95) 28%, rgba(244,96,18,0.78) 52%, rgba(168,30,10,0.4) 74%, transparent 86%)';
  return (
    <>
      {path.map((p, i) =>
        [0, 1, 2].map((j) => {
          const jx = (j - 1) * S * 0.24;
          return (
            <motion.div
              key={`${i}-${j}`}
              style={{
                position: 'absolute',
                left: p.x + jx - S * 0.22,
                top: p.y - S * 0.6,
                width: S * 0.44,
                height: S * 0.6,
                pointerEvents: 'none',
                zIndex: 34,
                background: flame,
                filter: 'blur(0.6px)',
                borderRadius: '50% 50% 42% 42% / 66% 66% 34% 34%',
                transformOrigin: '50% 100%',
              }}
              initial={{ opacity: 0, scaleY: 0.35 }}
              animate={{ opacity: [0, 1, 0.8, 0], scaleY: [0.35, 1.15, 0.8, 0.25], scaleX: [1, 0.78, 1.12, 0.85] }}
              transition={{ duration: 0.62, delay: i * 0.05 + j * 0.02 + Math.random() * 0.05, times: [0, 0.25, 0.6, 1], ease: 'easeOut' }}
            />
          );
        }),
      )}
      {/* a few rising embers */}
      {path.map((p, i) => (
        <motion.div
          key={`e${i}`}
          style={{ position: 'absolute', left: p.x - 1, top: p.y - 4, width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,200,90,0.95)', boxShadow: '0 0 4px 1px rgba(255,150,40,0.8)', pointerEvents: 'none', zIndex: 35 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0], y: [0, -S * 0.7], x: [0, (Math.random() - 0.5) * S * 0.4] }}
          transition={{ duration: 0.7, delay: i * 0.05 + Math.random() * 0.1, ease: 'easeOut' }}
        />
      ))}
    </>
  );
}

function PieceBadge({ glyph, color }: { glyph: string; color: 'w' | 'b' }): JSX.Element {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: -2,
        transform: 'translateX(-50%)',
        fontSize: 10,
        lineHeight: '11px',
        padding: '0 3px',
        borderRadius: 4,
        background: 'rgba(0,0,0,0.6)',
        color: color === 'w' ? '#ffd479' : '#c4b5fd',
        textShadow: '0 1px 1px rgba(0,0,0,0.8)',
      }}
    >
      {glyph}
    </div>
  );
}
