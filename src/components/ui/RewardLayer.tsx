import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { onReward, type RewardEvent } from '../../services/rewardEvents';
import { REWARD_SPECS } from '../../services/rewardService';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

/**
 * RewardLayer — the LIGHT half of the reward layer (rewardService is the sound
 * + vibration). One full-screen, click-through canvas mounted once in the app
 * shell, so every surface gets the same bursts with zero per-surface wiring.
 *
 * Neon on purpose (David 2026-10-01: "the app is already neon themed, enhance
 * it"). The palette and burst shape rotate on the event's `seed`, never
 * Math.random, so the same moment looks the same on a replay.
 */

const PALETTES: readonly (readonly string[])[] = [
  ['#00ff88', '#33ffaa', '#b9ffd9', '#ffffff'],
  ['#00e5ff', '#7af3ff', '#ff3df2', '#ffffff'],
  ['#ffd400', '#ffef7a', '#ff8a00', '#ffffff'],
  ['#ff3df2', '#b06bff', '#00e5ff', '#ffffff'],
];
const GOLD: readonly string[] = ['#ffd400', '#ffe55c', '#fff3b0', '#ffb300', '#ffffff'];
/** THE GOLD SPARKLE FIELD (David 2026-10-20, an iMessage screenshot: "Like this
 *  for the confetti") — soft out-of-focus gold orbs, every size, drifting and
 *  twinkling across the whole screen. The jackpot and a checkmate get it. */
const BOKEH: readonly string[] = ['255,233,168', '255,211,107', '255,193,77', '255,246,220', '255,179,71'];
const BOKEH_COUNT = 260;
const PARTICLES: Record<0 | 1 | 2 | 3 | 4, number> = { 0: 0, 1: 16, 2: 40, 3: 80, 4: 170 };

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; color: string; r: number; confetti: boolean; spin: number;
  /** A sparkle-field orb: `color` is an "r,g,b" triple, `phase` its twinkle. */
  bokeh: boolean; phase: number;
}

/** Deterministic pseudo-random stream from a seed (mulberry32). */
function stream(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function originOf(e: RewardEvent): { x: number; y: number } {
  if (e.square) {
    const el = document.querySelector(`[data-square="${e.square}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.42 };
}

export function RewardLayer(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const flash = useRef<{ alpha: number; color: string }>({ alpha: 0, color: '#00ff88' });
  /** The warm dark veil the sparkle field glows against (the iMessage look):
   *  it eases in under the orbs and fades over ~3s. */
  const veil = useRef(0);
  const raf = useRef<number | null>(null);
  const reduced = usePrefersReducedMotion();
  const [banner, setBanner] = useState<{ text: string; key: number; big: boolean; gold: boolean } | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = (): void => {
      const cv = canvasRef.current;
      const ctx = cv?.getContext('2d');
      if (!cv || !ctx) { raf.current = null; return; }
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (veil.current > 0.01) {
        ctx.globalAlpha = veil.current;
        ctx.fillStyle = 'rgb(36,15,2)';
        ctx.fillRect(0, 0, cv.width, cv.height);
        veil.current *= 0.988;
      }
      if (flash.current.alpha > 0.01) {
        ctx.globalAlpha = flash.current.alpha;
        ctx.fillStyle = flash.current.color;
        ctx.fillRect(0, 0, cv.width, cv.height);
        flash.current.alpha *= 0.86;
      }
      const alive: Particle[] = [];
      for (const p of particles.current) {
        p.life += 1;
        if (p.life > p.max) continue;
        if (p.bokeh) {
          // Staggered in (negative life = not yet), drifting, twinkling, fading.
          if (p.life < 0) { alive.push(p); continue; }
          p.x += p.vx;
          p.y += p.vy;
          const env = Math.min(1, p.life / 24) * Math.min(1, (p.max - p.life) / 50);
          const twinkle = 0.5 + 0.5 * Math.sin(p.life * 0.11 + p.phase);
          ctx.globalAlpha = Math.max(0, env * (0.4 + 0.6 * twinkle) * (p.r > 12 ? 0.6 : 1));
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, 'rgba(255,252,240,1)');
          g.addColorStop(0.3, `rgba(${p.color},0.95)`);
          g.addColorStop(1, `rgba(${p.color},0)`);
          ctx.fillStyle = g;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          // A small orb is a sharp sparkle: a hot pinpoint at its heart.
          if (p.r < 6) {
            ctx.fillStyle = 'rgba(255,255,245,1)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.8, p.r * 0.35), 0, Math.PI * 2);
            ctx.fill();
          }
          alive.push(p);
          continue;
        }
        p.vy += p.confetti ? 0.06 : 0.12;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.confetti ? 0 : 12;
        if (p.confetti) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.spin * p.life);
          ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        alive.push(p);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      particles.current = alive;
      raf.current = alive.length > 0 || flash.current.alpha > 0.01 || veil.current > 0.01 ? requestAnimationFrame(tick) : null;
    };

    const off = onReward((e) => {
      const size = REWARD_SPECS[e.kind].size;
      if (e.label) {
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        setBanner({ text: e.label, key: Date.now(), big: size >= 3, gold: e.kind === 'jackpot' || e.kind === 'checkmate' });
        bannerTimer.current = setTimeout(() => setBanner(null), size >= 3 ? 4200 : 3400);
      }
      if (reduced || size === 0) return;
      const cv = canvasRef.current;
      if (!cv) return;
      const dpr = window.devicePixelRatio || 1;
      if (cv.width !== window.innerWidth * dpr) {
        cv.width = window.innerWidth * dpr;
        cv.height = window.innerHeight * dpr;
        cv.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      const rnd = stream(e.seed ?? (e.step ?? 0) + 17);
      // The jackpot and a checkmate pay out in GOLD (David 2026-10-20: "gold
      // glowing. Like a slot machine!!").
      const gold = e.kind === 'jackpot' || e.kind === 'checkmate';
      const palette = gold ? GOLD : PALETTES[(e.seed ?? e.step ?? 0) % PALETTES.length];
      const { x, y } = originOf(e);
      const n = PARTICLES[size];
      const speed = 2.2 + size * 1.3;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd() * 0.5;
        const v = speed * (0.45 + rnd() * 0.75);
        particles.current.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - size * 0.6,
          life: 0, max: 34 + size * 10 + Math.floor(rnd() * 16),
          color: palette[i % palette.length], r: 1.6 + rnd() * (1 + size * 0.6), confetti: false, spin: 0,
          bokeh: false, phase: 0,
        });
      }
      if (gold) {
        veil.current = Math.max(veil.current, 0.5);
        // The sparkle field: orbs everywhere, mostly small, a few big and soft.
        for (let i = 0; i < BOKEH_COUNT; i++) {
          const k = rnd();
          particles.current.push({
            x: rnd() * window.innerWidth, y: rnd() * window.innerHeight,
            vx: (rnd() - 0.5) * 0.4, vy: -0.12 - rnd() * 0.4,
            life: -Math.floor(rnd() * 45), max: 150 + Math.floor(rnd() * 110),
            color: BOKEH[i % BOKEH.length], r: 1.8 + k * k * 22, confetti: false, spin: 0,
            bokeh: true, phase: rnd() * Math.PI * 2,
          });
        }
      } else if (size === 4) {
        for (let i = 0; i < 140; i++) {
          particles.current.push({
            x: rnd() * window.innerWidth, y: -20 - rnd() * 200, vx: (rnd() - 0.5) * 2, vy: 1 + rnd() * 2.5,
            life: 0, max: 160 + Math.floor(rnd() * 60), color: palette[i % palette.length],
            r: 4 + rnd() * 3, confetti: true, spin: (rnd() - 0.5) * 0.3,
            bokeh: false, phase: 0,
          });
        }
      }
      if (size >= 3) flash.current = { alpha: size === 4 ? 0.35 : 0.22, color: palette[0] };
      if (raf.current === null) raf.current = requestAnimationFrame(tick);
    });
    return () => {
      off();
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, [reduced]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[70] h-full w-full"
        aria-hidden="true"
        data-testid="reward-layer"
      />
      <AnimatePresence>
        {banner && (
          <motion.div
            key={banner.key}
            initial={reduced ? false : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className="pointer-events-none fixed inset-x-0 top-[30%] z-[71] flex justify-center px-4"
            data-testid="reward-banner"
            role="status"
          >
            <span
              className={`rounded-2xl border-2 bg-black/70 px-5 py-2 text-center font-black uppercase tracking-widest ${banner.gold ? 'border-yellow-300 text-yellow-200 shadow-[0_0_40px_rgba(250,204,21,0.95)]' : 'border-cyan-300/70 text-cyan-200 shadow-[0_0_24px_rgba(0,229,255,0.7)]'} ${banner.big ? 'text-2xl sm:text-3xl' : 'text-lg'}`}
            >
              {banner.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
