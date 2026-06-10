import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, ContactShadows, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

// Play gallery: every reconstructed piece in its own tile, all driven by a
// shared action bar so the whole cast animates together. Humanoid pieces use
// the KayKit clip names; the mounted knight rides the Quaternius horse rig and
// is remapped accordingly. The rook is a static shield-bearer (no rig yet).

interface Piece {
  label: string;
  url: string;
  /** Per-action clip name for this piece, or null when it has no rig. */
  clips: Record<string, string> | null;
  /** Display height (world units) so pieces read at a consistent size. */
  h: number;
  loop: Set<string>;
}

const HUMANOID: Record<string, string> = {
  Idle: 'Idle', Walk: 'Walking_C', Run: 'Running_A', Jump: 'Jump_Full_Long',
  Attack: '1H_Melee_Attack_Slice_Diagonal', Death: 'Death_A', Cheer: 'Cheer',
};
const HUMANOID_LOOP = new Set(['Idle', 'Walking_C', 'Running_A']);
const HORSE: Record<string, string> = {
  Idle: 'Idle', Walk: 'Gallop', Run: 'Gallop', Jump: 'Gallop_Jump',
  Attack: 'Attack_Kick', Death: 'Death', Cheer: 'Eating',
};
const HORSE_LOOP = new Set(['Idle', 'Gallop', 'Walk']);

const PIECES: Piece[] = [
  { label: 'Pawn', url: '/rpg/models/skinned-rogue.glb', clips: HUMANOID, h: 1.7, loop: HUMANOID_LOOP },
  { label: 'Bishop', url: '/rpg/models/skinned-bishop.glb', clips: HUMANOID, h: 1.8, loop: HUMANOID_LOOP },
  { label: 'Queen', url: '/rpg/models/skinned-queen.glb', clips: HUMANOID, h: 1.95, loop: HUMANOID_LOOP },
  { label: 'King', url: '/rpg/models/skinned-king.glb', clips: HUMANOID, h: 1.95, loop: HUMANOID_LOOP },
  { label: 'Knight', url: '/rpg/models/skinned-knight.glb', clips: HORSE, h: 2.0, loop: HORSE_LOOP },
  { label: 'Rook', url: '/rpg/models/skinned-rook.glb', clips: null, h: 1.85, loop: HUMANOID_LOOP },
];
PIECES.forEach((p) => useGLTF.preload(p.url));

const ACTIONS = ['Idle', 'Walk', 'Run', 'Jump', 'Attack', 'Death', 'Cheer'] as const;

function Figure({ piece, action }: { piece: Piece; action: string }): JSX.Element {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(piece.url);
  const obj = useMemo(() => {
    const c = cloneSkeleton(scene);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; }
    });
    return c;
  }, [scene]);
  const { actions, mixer } = useAnimations(animations, group);

  useEffect(() => {
    if (!piece.clips) return; // static piece
    const want = piece.clips[action] ?? 'Idle';
    const a = actions[want] ?? actions['Idle'];
    if (!a) return;
    mixer.stopAllAction();
    a.reset();
    a.setLoop(piece.loop.has(want) ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    a.clampWhenFinished = !piece.loop.has(want);
    a.fadeIn(0.2).play();
    return () => { a.fadeOut(0.2); };
  }, [action, actions, mixer, piece]);

  // gentle idle sway for the static rook so the tile isn't dead
  useFrame((state) => {
    if (!piece.clips && group.current) {
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.4;
    }
  });

  const s = piece.h / 1.95;
  return <group ref={group} scale={[s, s, s]}><primitive object={obj} /></group>;
}

function Tile({ piece, action }: { piece: Piece; action: string }): JSX.Element {
  return (
    <div className="relative rounded-xl overflow-hidden" style={{ background: '#0c1410', border: '1px solid var(--color-border)', aspectRatio: '3 / 4' }}>
      <Canvas shadows camera={{ position: [0, 1.1, 3.4], fov: 38 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={['#0c1410']} />
        <SoftShadows size={18} samples={6} focus={0.9} />
        <hemisphereLight args={['#cfe0ff', '#10140f', 0.6]} />
        <directionalLight position={[3, 6, 4]} intensity={2.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <pointLight position={[-4, 3, -3]} intensity={14} color="#b69cff" distance={16} />
        <ContactShadows position={[0, -0.01, 0]} opacity={0.5} scale={6} blur={2.4} far={4} />
        <Suspense fallback={null}>
          <group position={[0, -1, 0]}><Figure piece={piece} action={action} /></group>
        </Suspense>
      </Canvas>
      <div className="absolute top-2 left-0 right-0 text-center text-sm font-bold pointer-events-none" style={{ color: '#e9c46a', textShadow: '0 1px 3px #000' }}>{piece.label}</div>
    </div>
  );
}

export function RpgGalleryPage(): JSX.Element {
  const [action, setAction] = useState<string>('Idle');
  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: '#070b09' }}>
      <div className="text-center pt-3 pb-1 px-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>RPG Cast — Play Gallery</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          All six of your pieces. Tap an action and watch the whole cast move at once. (Rook is the static shield-bearer for now; knight rides the gallop rig.)
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-3" style={{ minHeight: 0 }} data-testid="rpg-gallery">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl mx-auto pb-3">
          {PIECES.map((p) => <Tile key={p.label} piece={p} action={action} />)}
        </div>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 p-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom,0px))' }}>
        {ACTIONS.map((a) => (
          <button
            key={a}
            onClick={() => setAction(a)}
            className="py-2 rounded-lg text-sm font-semibold"
            style={{
              background: action === a ? 'rgba(233,196,106,0.25)' : 'var(--color-surface)',
              color: action === a ? '#e9c46a' : 'var(--color-text-muted)',
              border: `1px solid ${action === a ? 'rgba(233,196,106,0.5)' : 'var(--color-border)'}`,
            }}
          >
            {a}
          </button>
        ))}
      </div>
    </div>
  );
}
