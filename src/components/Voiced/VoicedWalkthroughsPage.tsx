import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { voiceService } from '../../services/voiceService';
import voicedData from '../../data/voiced-walkthroughs.json';

/**
 * VoicedWalkthroughsPage — renders the branching walkthroughs built by
 * `scripts/build-voiced-walkthroughs.mjs` from the our-words DNA corpus
 * (`data/video-narration-voiced/`). Lets David SEE the new walkthroughs:
 * pick an opening, walk it move-by-move, pause at forks, hear each note.
 *
 * Moves come from the bank (chess.js-legal); the prose is the hand-authored
 * DNA note (G0/G3 — nothing is generated here). FENs are computed at runtime
 * by replaying the SAN path, exactly like `useTeachWalkthrough`.
 */

interface VoicedNode {
  san: string | null;
  movedBy: 'white' | 'black' | null;
  idea: string;
  shortIdea?: string;
  children: { node: VoicedNode }[];
}
interface VoicedTree {
  openingName: string;
  eco: string;
  intro: string;
  outro: string;
  root: VoicedNode;
}
interface VoicedWalkthrough {
  id: string;
  openingName: string;
  studentSide: 'white' | 'black';
  videoIds: string[];
  narratedNodes: number;
  totalNodes: number;
  tree: VoicedTree;
}

const WALKTHROUGHS = voicedData as unknown as VoicedWalkthrough[];

function fenForPath(nodes: VoicedNode[]): string {
  const game = new Chess();
  for (const n of nodes) {
    if (n.san) {
      try { game.move(n.san); } catch { /* legal by construction */ }
    }
  }
  return game.fen();
}

export function VoicedWalkthroughsPage(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [path, setPath] = useState<VoicedNode[]>([]);

  const selected = useMemo(
    () => WALKTHROUGHS.find((w) => w.id === selectedId) ?? null,
    [selectedId],
  );

  // path always starts at the root node; [] means "just the root".
  const rootNode = selected?.tree.root ?? null;
  const currentNode = path.length ? path[path.length - 1] : rootNode;
  const nodesFromRoot = useMemo(() => (rootNode ? [rootNode, ...path] : []), [rootNode, path]);
  const fen = useMemo(() => fenForPath(nodesFromRoot), [nodesFromRoot]);

  const idea = currentNode?.idea || (path.length === 0 ? selected?.tree.intro : '') || '';
  const forks = currentNode?.children ?? [];
  const isLeaf = forks.length === 0 && !!currentNode;

  // Speak the note whenever we land on a new node (on-demand read-aloud tier —
  // bypasses the in-game verbosity gate, same as the opening-page read button).
  useEffect(() => {
    if (!idea) return;
    voiceService.speakReadAloud(idea).catch(() => { /* ignore */ });
    return () => { voiceService.stop(); };
    // re-speak only when the spoken text changes
  }, [idea]);

  function pick(child: VoicedNode): void {
    setPath((p) => [...p, child]);
  }
  function back(): void {
    setPath((p) => p.slice(0, -1));
  }
  function restart(): void {
    setPath([]);
  }
  function openList(): void {
    voiceService.stop();
    setSelectedId(null);
    setPath([]);
  }

  // ---- list view ----
  if (!selected) {
    return (
      <div className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">
        <h1 className="text-2xl font-bold text-center">Voiced Walkthroughs</h1>
        <p className="text-center text-sm text-gray-400 max-w-lg mx-auto">
          New opening walkthroughs built from the our-words DNA corpus — {WALKTHROUGHS.length} openings.
          Pick one to watch the ideas play out move by move.
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto w-full">
          {WALKTHROUGHS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => { setSelectedId(w.id); setPath([]); }}
              className="border-2 rounded-2xl bg-indigo-500/10 border-indigo-500/30 p-4 text-left flex flex-col gap-1 hover:bg-indigo-500/20 transition"
            >
              <span className="font-bold text-sm leading-tight">{w.openingName}</span>
              <span className="text-xs text-gray-400">
                {w.studentSide} · {w.narratedNodes} notes · {w.videoIds.length} game{w.videoIds.length > 1 ? 's' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---- player view ----
  return (
    <div className="flex flex-col gap-3 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 max-w-lg mx-auto w-full">
      <div className="flex items-center justify-between">
        <button type="button" onClick={openList} className="text-sm text-indigo-400">← All</button>
        <h1 className="text-base font-bold text-center flex-1 truncate px-2">{selected.openingName}</h1>
        <button type="button" onClick={restart} className="text-sm text-indigo-400">↺ Restart</button>
      </div>

      <ConsistentChessboard fen={fen} boardOrientation={selected.studentSide} />

      <div className="min-h-[4.5rem] rounded-xl bg-gray-800/60 p-3 text-sm leading-relaxed">
        {idea || <span className="text-gray-500">…</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {path.length > 0 && (
          <button type="button" onClick={back} className="px-3 py-2 rounded-lg bg-gray-700 text-sm">◀ Back</button>
        )}
        {idea && (
          <button
            type="button"
            onClick={() => { void voiceService.speakReadAloud(idea).catch(() => {}); }}
            className="px-3 py-2 rounded-lg bg-gray-700 text-sm"
          >🔊 Replay</button>
        )}
      </div>

      {isLeaf ? (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm">
          <p className="font-semibold mb-1">Line complete.</p>
          <p className="text-gray-300">{selected.tree.outro}</p>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={back} className="px-3 py-2 rounded-lg bg-gray-700 text-sm">◀ Back a move</button>
            <button type="button" onClick={restart} className="px-3 py-2 rounded-lg bg-indigo-600 text-sm">↺ Restart</button>
          </div>
        </div>
      ) : forks.length === 1 ? (
        <button
          type="button"
          onClick={() => pick(forks[0].node)}
          className="px-4 py-3 rounded-xl bg-indigo-600 font-semibold text-left"
        >
          Next: {forks[0].node.san} ▶
          {forks[0].node.shortIdea && (
            <span className="block text-xs font-normal text-indigo-200 mt-0.5">{forks[0].node.shortIdea}</span>
          )}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wide text-gray-400">Pick a line</p>
          {forks.map((c, i) => (
            <button
              key={`${c.node.san}-${i}`}
              type="button"
              onClick={() => pick(c.node)}
              className="px-4 py-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 font-semibold text-left"
            >
              {c.node.san}
              {c.node.shortIdea && (
                <span className="block text-xs font-normal text-gray-300 mt-0.5">{c.node.shortIdea}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
