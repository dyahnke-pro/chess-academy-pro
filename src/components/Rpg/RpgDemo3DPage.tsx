import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, ContactShadows, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Chess } from 'chess.js';

// In-app 3D chess board with FULLY ARTICULATED characters (CC0 KayKit, themed
// to David's cast). Pieces walk to their square, the knight leaps, captures play
// a real melee/spell attack and the victim plays a death — with a cinematic
// kill-cam. Clean rigged skeletons, no Mixamo, all on our end.

// Per chess role: David's reconstructed + rigged piece where built, otherwise
// the CC0 KayKit base. Both share the same 76-clip skeleton, so they're
// drop-in. Pawn = hooded rogue, queen + king = his robed royalty (with staffs);
// knight/bishop/rook fall back to KayKit until rebuilt from his art.
const SKINNED: Record<string, string> = {
  p: '/rpg/models/skinned-rogue.glb',
  q: '/rpg/models/skinned-queen.glb',
  k: '/rpg/models/skinned-king.glb',
  b: '/rpg/models/skinned-bishop.glb',
  n: '/rpg/models/skinned-knight.glb', // his mounted knight (horse+rider, glides — no humanoid rig)
};
const KAYKIT: Record<string, string> = { r: 'Barbarian' };
const MODEL_URL = (type: string): string => SKINNED[type] ?? `/rpg/models/kaykit/${KAYKIT[type] ?? 'rogue'}.glb`;
['p', 'n', 'b', 'r', 'q', 'k'].forEach((t) => useGLTF.preload(MODEL_URL(t)));

const ATTACK: Record<string, string> = {
  p: '1H_Melee_Attack_Slice_Diagonal', n: '1H_Melee_Attack_Slice_Diagonal', r: '2H_Melee_Attack_Chop',
  b: 'Spellcast_Shoot', q: 'Spellcast_Shoot', k: '1H_Melee_Attack_Slice_Diagonal',
};
const HEIGHT: Record<string, number> = { p: 1.1, n: 1.3, b: 1.25, r: 1.35, q: 1.5, k: 1.45 };
const TEAM: Record<'w' | 'b', THREE.Color> = { w: new THREE.Color('#f0d9a0'), b: new THREE.Color('#b69cff') };
const LOOP = new Set(['Idle', 'Walking_C', 'Running_A']);

/** One articulated fighter: own skeleton clone + mixer, plays the given clip. */
function Fighter({ type, color, clip }: { type: string; color: 'w' | 'b'; clip: string }): JSX.Element {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL(type));
  const obj = useMemo(() => {
    const c = cloneSkeleton(scene);
    const tint = TEAM[color];
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.frustumCulled = false;
        const src = m.material as THREE.MeshStandardMaterial;
        const mat = src.clone();
        mat.color = (src.color ? src.color.clone() : new THREE.Color('#ffffff')).multiply(tint);
        m.material = mat;
      }
    });
    return c;
  }, [scene, color]);
  const { actions, mixer } = useAnimations(animations, group);

  useEffect(() => {
    const a = actions[clip] ?? actions['Idle'];
    if (!a) return;
    a.reset();
    a.setLoop(LOOP.has(clip) ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    a.clampWhenFinished = !LOOP.has(clip);
    a.fadeIn(0.2).play();
    return () => { a.fadeOut(0.2); };
  }, [clip, actions, mixer]);

  const h = HEIGHT[type] ?? 1.2;
  return <group ref={group} scale={[h / 1.78, h / 1.78, h / 1.78]} rotation={[0, color === 'w' ? 0 : Math.PI, 0]}><primitive object={obj} /></group>;
}

interface Anim { from: string; to: string; type: string; color: 'w' | 'b'; t: number; dur: number; capture: string | null; phase: 'move' | 'strike' }

const sqWorld = (sq: string): [number, number] => {
  const f = sq.charCodeAt(0) - 97;
  const r = parseInt(sq[1], 10) - 1;
  return [f - 3.5, -(r - 3.5)];
};

function Scene(): JSX.Element {
  const gameRef = useRef(new Chess());
  const [, force] = useState(0);
  const animRef = useRef<Anim | null>(null);
  const moving = useRef<THREE.Group>(null);
  const dyingRef = useRef<{ square: string; type: string; color: 'w' | 'b'; t: number; kx: number } | null>(null);
  const dying = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 7.5, 9.5));
  const camLook = useRef(new THREE.Vector3(0, 0.6, 0));
  const lookCur = useRef(new THREE.Vector3(0, 0.6, 0));
  const [movingClip, setMovingClip] = useState('Idle');

  const moves = useMemo(() => ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7', 'Qf3+', 'Ke6', 'Nc3'], []);
  const mi = useRef(0);

  useEffect(() => {
    let alive = true;
    const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
    async function loop(): Promise<void> {
      await sleep(1400);
      while (alive) {
        const g = gameRef.current;
        if (mi.current >= moves.length) { await sleep(1800); gameRef.current = new Chess(); mi.current = 0; force((n) => n + 1); await sleep(900); continue; }
        const san = moves[mi.current++];
        const legal = g.moves({ verbose: true }).find((m) => m.san === san);
        if (!legal) continue;
        const capture = legal.captured ? legal.to : null;
        const isKnight = legal.piece === 'n';
        animRef.current = { from: legal.from, to: legal.to, type: legal.piece, color: legal.color, t: 0, dur: isKnight ? 1.0 : 1.1, capture, phase: 'move' };
        setMovingClip(isKnight ? 'Jump_Full_Long' : 'Walking_C');
        force((n) => n + 1);
        await sleep((animRef.current?.dur ?? 1.1) * 1000);
        if (!alive) return;
        if (capture) {
          // strike: attacker swings, victim dies + knocked back; camera punches in
          const [tx, tz] = sqWorld(legal.to);
          camPos.current.set(tx + 2.4, 1.7, tz + 2.8); camLook.current.set(tx, 0.7, tz);
          if (animRef.current) animRef.current.phase = 'strike';
          setMovingClip(ATTACK[legal.piece] ?? '1H_Melee_Attack_Slice_Diagonal');
          const v = g.get(capture);
          const ux = Math.sign(sqWorld(legal.to)[0] - sqWorld(legal.from)[0]) || 0;
          if (v) dyingRef.current = { square: capture, type: v.type, color: v.color, t: 0, kx: ux };
          force((n) => n + 1);
          await sleep(900);
        }
        g.move(san);
        animRef.current = null; setMovingClip('Idle');
        force((n) => n + 1);
        if (capture) { await sleep(500); dyingRef.current = null; }
        camPos.current.set(0, 7.5, 9.5); camLook.current.set(0, 0.6, 0);
        force((n) => n + 1);
        await sleep(650);
      }
    }
    void loop();
    return () => { alive = false; };
  }, [moves]);

  useFrame((_, dt) => {
    const a = animRef.current;
    if (a && moving.current) {
      if (a.phase === 'move') {
        a.t = Math.min(1, a.t + dt / a.dur);
        const [fx, fz] = sqWorld(a.from); const [tx, tz] = sqWorld(a.to);
        // stop one step short of a victim so they make contact, not overlap
        const e = a.t * a.t * (3 - 2 * a.t);
        let gx = tx, gz = tz;
        if (a.capture) { const dx = tx - fx, dz = tz - fz; const L = Math.hypot(dx, dz) || 1; gx = tx - (dx / L) * 0.55; gz = tz - (dz / L) * 0.55; }
        const x = fx + (gx - fx) * e, z = fz + (gz - fz) * e;
        const hop = a.type === 'n' ? Math.sin(Math.PI * a.t) * 0.9 : 0;
        moving.current.position.set(x, hop, z);
        moving.current.rotation.y = Math.atan2(gx - fx, gz - fz);
      }
    }
    const d = dyingRef.current;
    if (d && dying.current) {
      d.t = Math.min(1, d.t + dt / 0.9);
      dying.current.position.x = d.kx * d.t * 0.4;
      dying.current.position.y = -d.t * 0.15;
    }
    const k = 1 - Math.pow(0.0009, dt);
    camera.position.lerp(camPos.current, k);
    lookCur.current.lerp(camLook.current, k);
    camera.lookAt(lookCur.current);
  });

  const board = gameRef.current.board();
  const a = animRef.current;
  const d = dyingRef.current;

  return (
    <group>
      <hemisphereLight args={['#cfe0ff', '#10140f', 0.55]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[6, 12, 7]} intensity={2.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-near={1} shadow-camera-far={40} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} />
      <pointLight position={[-7, 4, -5]} intensity={22} color="#b69cff" distance={22} />
      <pointLight position={[7, 4, 8]} intensity={20} color="#ffcf7b" distance={22} />
      <Board />
      <ContactShadows position={[0, 0.005, 0]} opacity={0.5} scale={16} blur={2.6} far={6} />

      <Suspense fallback={null}>
        {board.flatMap((row) =>
          row.filter((p): p is NonNullable<typeof p> => !!p).map((p) => {
            if (a && p.square === a.from) return null;
            if (d && p.square === d.square) return null;
            const [x, z] = sqWorld(p.square);
            return <group key={p.square} position={[x, 0, z]}><Fighter type={p.type} color={p.color} clip="Idle" /></group>;
          }),
        )}
        {a && <group ref={moving}><Fighter type={a.type} color={a.color} clip={movingClip} /></group>}
        {d && (
          <group ref={dying} position={[sqWorld(d.square)[0], 0, sqWorld(d.square)[1]]}>
            <Fighter type={d.type} color={d.color} clip="Death_A" />
          </group>
        )}
      </Suspense>
    </group>
  );
}

function Board(): JSX.Element {
  const tiles = useMemo(() => {
    const a: { x: number; z: number; light: boolean }[] = [];
    for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) a.push({ x: f - 3.5, z: -(r - 3.5), light: (f + r) % 2 === 0 });
    return a;
  }, []);
  return (
    <group>
      <mesh position={[0, -0.13, 0]} receiveShadow><boxGeometry args={[9, 0.26, 9]} /><meshStandardMaterial color="#0c1410" metalness={0.4} roughness={0.6} /></mesh>
      {tiles.map((t, i) => (
        <mesh key={i} position={[t.x, 0, t.z]} receiveShadow><boxGeometry args={[0.98, 0.06, 0.98]} /><meshStandardMaterial color={t.light ? '#46584d' : '#26302a'} metalness={0.2} roughness={0.7} /></mesh>
      ))}
    </group>
  );
}

export function RpgDemo3DPage(): JSX.Element {
  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: '#070b09' }}>
      <div className="text-center pt-3 pb-1 px-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>RPG Chess — Articulated Army</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Rigged characters that walk, leap, and fight — captures play a real attack + death, with a kill-cam.
        </p>
      </div>
      <div className="flex-1" style={{ minHeight: 0 }} data-testid="rpg-3d-canvas">
        <Canvas shadows camera={{ position: [0, 7.5, 9.5], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <color attach="background" args={['#070b09']} />
          <fog attach="fog" args={['#070b09', 14, 30]} />
          <SoftShadows size={26} samples={8} focus={0.9} />
          <Scene />
        </Canvas>
      </div>
    </div>
  );
}
