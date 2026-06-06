import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, ContactShadows, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';

// Playground for the auto-rigged rogue: David's reconstructed pawn, bound here
// (no Mixamo) to a 14-action skeleton. Tap a button to fire an action; it sways
// gently at rest. Proves real skeletal articulation on his own piece, in-app.

const URL = '/rpg/models/skinned-rogue.glb';
useGLTF.preload(URL);

const LOOP = new Set(['Idle', 'Walking_C', 'Running_A']);
const CLIP: Record<string,string> = { Walk:'Walking_C', Run:'Running_A', Jump:'Jump_Full_Long', Attack:'1H_Melee_Attack_Slice_Diagonal', Shoot:'2H_Ranged_Shoot', Death:'Death_A', Cheer:'Cheer', Idle:'Idle' };
const ACTIONS = ['Walk','Run','Jump','Attack','Shoot','Death','Cheer','Idle'] as const;

function Rogue({ action, onDone }: { action: string; onDone: () => void }): JSX.Element {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(URL);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.frustumCulled = false;
      }
    });
    return c;
  }, [scene]);
  const { actions, mixer } = useAnimations(animations, group);

  useEffect(() => {
    const clip = CLIP[action] ?? 'Idle';
    const a = actions[clip];
    if (!a) return;
    mixer.stopAllAction();
    a.reset();
    a.setLoop(LOOP.has(clip) ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    a.clampWhenFinished = !LOOP.has(clip);
    a.fadeIn(0.25).play();
    const onFinished = (): void => { if (!LOOP.has(clip)) onDone(); };
    mixer.addEventListener('finished', onFinished);
    return () => { mixer.removeEventListener('finished', onFinished); };
  }, [action, actions, mixer, onDone]);

  // gentle idle sway
  useFrame((state) => {
    if (action === 'Idle' && group.current) {
      const t = state.clock.elapsedTime;
      group.current.rotation.z = Math.sin(t * 1.1) * 0.025;
      group.current.position.y = Math.sin(t * 1.4) * 0.015;
    } else if (group.current) {
      group.current.rotation.z = 0;
    }
  });

  return <group ref={group}><primitive object={obj} /></group>;
}

function Stage({ action, onDone }: { action: string; onDone: () => void }): JSX.Element {
  return (
    <group>
      <hemisphereLight args={['#cfe0ff', '#10140f', 0.6]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[4, 8, 5]} intensity={2.4} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-near={0.5} shadow-camera-far={30} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} />
      <pointLight position={[-5, 3, -3]} intensity={18} color="#9a7bff" distance={16} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#161c18" metalness={0.3} roughness={0.7} />
      </mesh>
      <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={6} blur={2.2} far={3} />
      <Suspense fallback={null}>
        <Rogue action={action} onDone={onDone} />
      </Suspense>
    </group>
  );
}

export function RpgAnimPlaygroundPage(): JSX.Element {
  const [action, setAction] = useState<string>('Idle');
  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: '#070b09' }}>
      <div className="text-center pt-3 pb-1 px-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>RPG Rogue — Articulated</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          A clean rigged hooded rogue (CC0) — walk, run, jump, swing, shoot, die, cheer. Tap to play. Themed to match your cast.
        </p>
      </div>
      <div className="flex-1" style={{ minHeight: 0 }} data-testid="rpg-anim-canvas">
        <Canvas shadows camera={{ position: [1.6, 2.4, 4.2], fov: 38 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <color attach="background" args={['#070b09']} />
          <SoftShadows size={20} samples={8} focus={0.9} />
          <Stage action={action} onDone={() => setAction('Idle')} />
        </Canvas>
      </div>
      <div className="grid grid-cols-4 gap-2 p-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom,0px))' }}>
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
