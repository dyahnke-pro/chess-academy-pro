import { Suspense, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, ContactShadows, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

// 3D RPG-chess animation PROOF OF CONCEPT (React Three Fiber / Three.js).
// Real rigged characters with skeletal animation clips — Idle / Walking /
// Punch / Death — proving full articulation + a true 3D cinematic kill-cam,
// vs. the 2D sprite board. Stand-in robot (CC0, three.js examples); the real
// pipeline swaps in Mixamo-rigged knights/rogues. Isolated /rpg-3d route.

const MODEL_URL = '/rpg/models/RobotExpressive.glb';
useGLTF.preload(MODEL_URL);

type ClipName = 'Idle' | 'Walking' | 'Punch' | 'Death';

interface RobotHandle {
  play: (name: ClipName, opts?: { loop?: boolean; fade?: number; speed?: number }) => void;
}

/** One rigged character: its own skeleton clone + animation mixer, tinted per
 *  army, exposing an imperative `play(clip)` so the choreographer drives it. */
const Robot = forwardRef<RobotHandle, { color: string; emissive?: string }>(function Robot(
  { color, emissive = '#000000' },
  ref,
) {
  const { scene, animations } = useGLTF(MODEL_URL);
  const cloned = useMemo(() => cloneSkeleton(scene), [scene]);

  useMemo(() => {
    cloned.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        if (mat.color) mat.color.set(color);
        mat.metalness = 0.35;
        mat.roughness = 0.5;
        if (mat.emissive) mat.emissive.set(emissive);
        mesh.material = mat;
      }
    });
  }, [cloned, color, emissive]);

  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned]);
  const actions = useMemo(() => {
    const m: Record<string, THREE.AnimationAction> = {};
    animations.forEach((c) => (m[c.name] = mixer.clipAction(c)));
    return m;
  }, [animations, mixer]);
  const current = useRef<THREE.AnimationAction | null>(null);

  useImperativeHandle(ref, () => ({
    play(name, { loop = true, fade = 0.3, speed = 1 } = {}) {
      const next = actions[name];
      if (!next || current.current === next) return;
      next.reset();
      next.setEffectiveTimeScale(speed);
      next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      next.clampWhenFinished = !loop;
      next.fadeIn(fade).play();
      if (current.current) current.current.fadeOut(fade);
      current.current = next;
    },
  }));

  useEffect(() => {
    const idle = actions.Idle;
    if (idle) {
      idle.play();
      current.current = idle;
    }
  }, [actions]);

  useFrame((_, dt) => mixer.update(dt));
  return <primitive object={cloned} />;
});

interface PieceState {
  id: string;
  color: string;
  emissive: string;
  pos: THREE.Vector3; // live world position (mutated each frame)
  target: THREE.Vector3;
  faceTo: THREE.Vector3 | null;
  clip: ClipName;
  dead: boolean;
  opacity: number;
}

const sq = (file: number, rank: number): THREE.Vector3 =>
  new THREE.Vector3(file - 3.5, 0, rank - 3.5);

/** The animated stage: a board, lights, a handful of idle bystanders, and a
 *  looping duel — attacker walks in, punches, victim dies — with a 3D kill-cam. */
function Stage(): JSX.Element {
  const handles = useRef<Record<string, RobotHandle | null>>({});
  const groups = useRef<Record<string, THREE.Group | null>>({});
  const { camera } = useThree();

  // Camera choreography: overview vs. close kill-cam, lerped each frame.
  const camTarget = useRef({ pos: new THREE.Vector3(0, 6.2, 9), look: new THREE.Vector3(0, 1, 0) });
  const lookAt = useRef(new THREE.Vector3(0, 1, 0));

  const pieces = useRef<PieceState[]>([
    { id: 'W1', color: '#e9c46a', emissive: '#3a2c00', pos: sq(3, 1), target: sq(3, 1), faceTo: sq(3, 6), clip: 'Idle', dead: false, opacity: 1 },
    { id: 'B1', color: '#7b5cff', emissive: '#1a0a40', pos: sq(3, 6), target: sq(3, 6), faceTo: sq(3, 1), clip: 'Idle', dead: false, opacity: 1 },
    { id: 'W2', color: '#e9c46a', emissive: '#3a2c00', pos: sq(1, 0), target: sq(1, 0), faceTo: sq(1, 7), clip: 'Idle', dead: false, opacity: 1 },
    { id: 'W3', color: '#e9c46a', emissive: '#3a2c00', pos: sq(5, 0), target: sq(5, 0), faceTo: sq(5, 7), clip: 'Idle', dead: false, opacity: 1 },
    { id: 'B2', color: '#7b5cff', emissive: '#1a0a40', pos: sq(1, 7), target: sq(1, 7), faceTo: sq(1, 0), clip: 'Idle', dead: false, opacity: 1 },
    { id: 'B3', color: '#7b5cff', emissive: '#1a0a40', pos: sq(5, 7), target: sq(5, 7), faceTo: sq(5, 0), clip: 'Idle', dead: false, opacity: 1 },
  ]);
  const [, force] = useState(0);

  // Looping cinematic timeline.
  useEffect(() => {
    let alive = true;
    const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
    const setCam = (pos: THREE.Vector3, look: THREE.Vector3): void => {
      camTarget.current = { pos, look };
    };

    async function loop(): Promise<void> {
      while (alive) {
        // reset
        const w = pieces.current.find((p) => p.id === 'W1');
        const b = pieces.current.find((p) => p.id === 'B1');
        if (!w || !b) return;
        w.dead = false; w.opacity = 1; w.pos.copy(sq(3, 1)); w.target.copy(sq(3, 1)); w.faceTo = sq(3, 6); w.clip = 'Idle';
        b.dead = false; b.opacity = 1; b.pos.copy(sq(3, 6)); b.target.copy(sq(3, 6)); b.faceTo = sq(3, 1); b.clip = 'Idle';
        handles.current.W1?.play('Idle');
        handles.current.B1?.play('Idle');
        setCam(new THREE.Vector3(0, 6.2, 9), new THREE.Vector3(0, 1, 0));
        force((n) => n + 1);
        await sleep(1400);
        if (!alive) return;

        // attacker walks up, stopping one tile short of the victim
        w.faceTo = sq(3, 6);
        w.target.copy(sq(3, 5));
        w.clip = 'Walking';
        handles.current.W1?.play('Walking');
        force((n) => n + 1);
        await sleep(2600);
        if (!alive) return;

        // kill-cam dollies in low and close
        setCam(new THREE.Vector3(2.4, 1.7, 4.2), new THREE.Vector3(-0.5, 1, 1.2));
        w.clip = 'Idle';
        handles.current.W1?.play('Idle', { fade: 0.15 });
        await sleep(500);

        // punch → the victim dies and topples
        w.clip = 'Punch';
        handles.current.W1?.play('Punch', { loop: false, fade: 0.12, speed: 1.1 });
        await sleep(430);
        if (!alive) return;
        b.dead = true;
        b.clip = 'Death';
        handles.current.B1?.play('Death', { loop: false, fade: 0.1 });
        force((n) => n + 1);
        await sleep(1500);

        // fade the body, attacker stands, camera pulls back to the duel angle
        b.opacity = 0;
        w.clip = 'Idle';
        handles.current.W1?.play('Idle');
        setCam(new THREE.Vector3(-3, 3.4, 6.5), new THREE.Vector3(0, 1, 1.5));
        force((n) => n + 1);
        await sleep(2200);
      }
    }
    void loop();
    return () => { alive = false; };
  }, []);

  // Per-frame: move pieces toward targets, face travel dir, ease the camera.
  useFrame((_, dt) => {
    const k = 1 - Math.pow(0.001, dt); // smoothing
    for (const p of pieces.current) {
      const g = groups.current[p.id];
      if (!g) continue;
      if (p.clip === 'Walking') {
        p.pos.x += (p.target.x - p.pos.x) * Math.min(1, dt * 1.6);
        p.pos.z += (p.target.z - p.pos.z) * Math.min(1, dt * 1.6);
      }
      g.position.set(p.pos.x, p.pos.y, p.pos.z);
      if (p.faceTo) {
        const ang = Math.atan2(p.faceTo.x - p.pos.x, p.faceTo.z - p.pos.z);
        g.rotation.y += ((ang - g.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 8);
      }
      // fade out on death
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          const mat = m.material as THREE.MeshStandardMaterial;
          mat.transparent = p.opacity < 1;
          mat.opacity += (p.opacity - mat.opacity) * Math.min(1, dt * 4);
        }
      });
    }
    camera.position.lerp(camTarget.current.pos, k);
    lookAt.current.lerp(camTarget.current.look, k);
    camera.lookAt(lookAt.current);
  });

  return (
    <group>
      {/* lights */}
      <hemisphereLight args={['#bcd4ff', '#0c1410', 0.6]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[5, 11, 6]}
        intensity={2.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[-6, 4, -4]} intensity={30} color="#7b5cff" distance={20} />
      <pointLight position={[6, 4, 8]} intensity={28} color="#ffcf7b" distance={20} />

      {/* board */}
      <Board />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={14} blur={2.4} far={6} />

      {/* pieces */}
      {pieces.current.map((p) => (
        <group key={p.id} ref={(el) => { groups.current[p.id] = el; }} scale={0.62}>
          <Robot ref={(h) => { handles.current[p.id] = h; }} color={p.color} emissive={p.emissive} />
        </group>
      ))}
    </group>
  );
}

function Board(): JSX.Element {
  const tiles = useMemo(() => {
    const arr: { x: number; z: number; light: boolean }[] = [];
    for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) arr.push({ x: f - 3.5, z: r - 3.5, light: (f + r) % 2 === 0 });
    return arr;
  }, []);
  return (
    <group>
      {/* base slab */}
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[9, 0.24, 9]} />
        <meshStandardMaterial color="#0c1410" metalness={0.4} roughness={0.6} />
      </mesh>
      {tiles.map((t, i) => (
        <mesh key={i} position={[t.x, 0, t.z]} receiveShadow>
          <boxGeometry args={[0.98, 0.06, 0.98]} />
          <meshStandardMaterial color={t.light ? '#46584d' : '#26302a'} metalness={0.2} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

export function RpgDemo3DPage(): JSX.Element {
  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: '#070b09' }}>
      <div className="text-center pt-3 pb-1 px-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>RPG Chess — 3D Engine Demo</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Real rigged characters (skeletal animation): walk → punch → die, with a 3D kill-cam.
          Stand-in robot proving the engine — Mixamo knights/rogues swap in next.
        </p>
      </div>
      <div className="flex-1" style={{ minHeight: 0 }} data-testid="rpg-3d-canvas">
        <Canvas shadows camera={{ position: [0, 6.2, 9], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <color attach="background" args={['#070b09']} />
          <fog attach="fog" args={['#070b09', 12, 26]} />
          <SoftShadows size={28} samples={12} focus={0.9} />
          <Suspense fallback={null}>
            <Stage />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
