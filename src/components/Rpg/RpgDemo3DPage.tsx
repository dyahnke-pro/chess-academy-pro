import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, ContactShadows, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Chess } from 'chess.js';

// In-app 3D chess board (React Three Fiber). Renders David's OWN pieces —
// reconstructed from his art via image-to-3D — as a full set, and auto-plays a
// short game with gliding moves and a cinematic 3D kill-cam on captures.
// Static meshes for now (no skeleton yet); skeletal walk/swing is the next layer.

const PIECES = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'] as const;
type PieceName = (typeof PIECES)[number];
const URL = (n: PieceName): string => `/rpg/models/pieces/${n}.glb`;
PIECES.forEach((n) => useGLTF.preload(URL(n)));

const TYPE_TO_NAME: Record<string, PieceName> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const HEIGHT: Record<string, number> = { p: 0.9, n: 1.15, b: 1.15, r: 1.1, q: 1.35, k: 1.28 };
const TEAM = { w: new THREE.Color('#e9c46a'), b: new THREE.Color('#9a7bff') };

const sqWorld = (sq: string): [number, number] => {
  const f = sq.charCodeAt(0) - 97; // a..h
  const r = parseInt(sq[1], 10) - 1; // 0..7
  return [f - 3.5, -(r - 3.5)];
};

/** One reconstructed piece, tinted per army (its art × a faint team color). */
function Piece({ type, color }: { type: string; color: 'w' | 'b' }): JSX.Element {
  const name = TYPE_TO_NAME[type];
  const { scene } = useGLTF(URL(name));
  const obj = useMemo(() => {
    const c = scene.clone(true);
    const tint = TEAM[color];
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        const mat = (m.material as THREE.MeshStandardMaterial).clone();
        mat.vertexColors = true;
        mat.color = tint.clone();
        mat.metalness = 0.25;
        mat.roughness = 0.5;
        mat.emissive = tint.clone().multiplyScalar(0.08);
        m.material = mat;
      }
    });
    return c;
  }, [scene, color]);
  const h = HEIGHT[type] ?? 1;
  return <primitive object={obj} scale={[h, h, h]} rotation={[0, color === 'w' ? 0 : Math.PI, 0]} />;
}

interface Anim { from: string; to: string; type: string; color: 'w' | 'b'; t: number; dur: number; capture: string | null }

function Scene(): JSX.Element {
  const gameRef = useRef(new Chess());
  const [, force] = useState(0);
  const animRef = useRef<Anim | null>(null);
  const movingGroup = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 7.5, 9.5));
  const camLook = useRef(new THREE.Vector3(0, 0.6, 0));
  const lookCur = useRef(new THREE.Vector3(0, 0.6, 0));

  // Scripted demo line (loops). Mix of quiet moves + captures for kill-cams.
  const moves = useMemo(
    () => ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7', 'Qf3+', 'Ke6', 'Nc3', 'Ncb4'],
    [],
  );
  const mi = useRef(0);

  useEffect(() => {
    let alive = true;
    const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
    async function loop(): Promise<void> {
      await sleep(1200);
      while (alive) {
        const g = gameRef.current;
        if (mi.current >= moves.length) {
          await sleep(1600);
          gameRef.current = new Chess();
          mi.current = 0;
          force((n) => n + 1);
          await sleep(900);
          continue;
        }
        const san = moves[mi.current++];
        const legal = g.moves({ verbose: true }).find((m) => m.san === san);
        if (!legal) { continue; }
        const capture = legal.captured ? legal.to : null;
        animRef.current = { from: legal.from, to: legal.to, type: legal.piece, color: legal.color, t: 0, dur: legal.piece === 'n' ? 0.9 : 0.8, capture };
        // kill-cam: punch toward the action square on a capture
        if (capture) {
          const [tx, tz] = sqWorld(legal.to);
          camPos.current.set(tx + 2.6, 1.8, tz + 3.0);
          camLook.current.set(tx, 0.7, tz);
        }
        force((n) => n + 1);
        await sleep(((animRef.current?.dur ?? 0.8) * 1000) + 120);
        // commit the move
        g.move(san);
        animRef.current = null;
        // pull camera back to the overview
        camPos.current.set(0, 7.5, 9.5);
        camLook.current.set(0, 0.6, 0);
        force((n) => n + 1);
        await sleep(700);
      }
    }
    void loop();
    return () => { alive = false; };
  }, [moves]);

  // animate the moving piece + ease the camera
  useFrame((_, dt) => {
    const a = animRef.current;
    if (a && movingGroup.current) {
      a.t = Math.min(1, a.t + dt / a.dur);
      const [fx, fz] = sqWorld(a.from);
      const [tx, tz] = sqWorld(a.to);
      const e = a.t * a.t * (3 - 2 * a.t); // smoothstep
      const x = fx + (tx - fx) * e;
      const z = fz + (tz - fz) * e;
      const hop = a.type === 'n' ? 1.1 : 0.35;
      const y = Math.sin(Math.PI * a.t) * hop;
      movingGroup.current.position.set(x, y, z);
      const dir = Math.atan2(tx - fx, tz - fz);
      movingGroup.current.rotation.y = dir;
    }
    const k = 1 - Math.pow(0.0009, dt);
    camera.position.lerp(camPos.current, k);
    lookCur.current.lerp(camLook.current, k);
    camera.lookAt(lookCur.current);
  });

  const board = gameRef.current.board();
  const a = animRef.current;

  return (
    <group>
      <hemisphereLight args={['#bcd4ff', '#0c1410', 0.55]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[6, 12, 7]} intensity={2.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-near={1} shadow-camera-far={40} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} />
      <pointLight position={[-7, 4, -5]} intensity={26} color="#9a7bff" distance={22} />
      <pointLight position={[7, 4, 8]} intensity={24} color="#ffcf7b" distance={22} />
      <Board />
      <ContactShadows position={[0, 0.005, 0]} opacity={0.5} scale={16} blur={2.6} far={6} />

      {/* idle pieces (skip the one currently moving) */}
      {board.flatMap((row) =>
        row.filter((p): p is NonNullable<typeof p> => !!p).map((p) => {
          if (a && p.square === a.from) return null;
          const [x, z] = sqWorld(p.square);
          return (
            <group key={p.square} position={[x, 0, z]}>
              <Piece type={p.type} color={p.color} />
            </group>
          );
        }),
      )}

      {/* the moving piece */}
      {a && (
        <group ref={movingGroup}>
          <Piece type={a.type} color={a.color} />
        </group>
      )}

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
      <mesh position={[0, -0.13, 0]} receiveShadow>
        <boxGeometry args={[9, 0.26, 9]} />
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
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>RPG Chess — 3D Army</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Your own pieces, reconstructed in 3D, on a live board with a cinematic kill-cam.
          (Skeletal walk/weapon animation is the next layer.)
        </p>
      </div>
      <div className="flex-1" style={{ minHeight: 0 }} data-testid="rpg-3d-canvas">
        <Canvas shadows camera={{ position: [0, 7.5, 9.5], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <color attach="background" args={['#070b09']} />
          <fog attach="fog" args={['#070b09', 14, 30]} />
          <SoftShadows size={26} samples={10} focus={0.9} />
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
