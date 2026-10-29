// computedPlan — THE MIDDLEGAME PLAN MASTERS PLAYED FROM A LINE'S END
// (WO-ALL-OPENINGS-01 O5, David 2026-10-28: "The builder needs to be able to
// build all aspects of the opening tabs on the fly. Middle games, gems, end
// game"). A line with no hand-written plan gets one read off the deep master
// tree: from the line's last board the masters reached in numbers (the tabia,
// G9.3 Gate C — at most a few plies before the line's end) the masters'
// continuations are walked a few moves on, and what the student's side did in
// them is counted — the pawn breaks it played and the routes its pieces took,
// each with the share of master games that played it. The plan line is the
// masters' most-played continuation. Every move is a move masters played (G3);
// every word is a count (G0). Empty > invented: a tabia too few masters
// reached, or one where nothing clears the bar, has no plan.
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import type {
  AnnotationArrow,
  AnnotationHighlight,
  LichessExplorerResult,
  MiddlegamePlan,
  PlayableMiddlegameLine,
} from '../types';
import { andList } from '../utils/andList';
import { openSentence } from '../utils/openSentence';

/** A board's games and whose they are — the words say whose games were
 *  counted (WO-ALL-OPENINGS-01 O9). */
export interface PlanBoard { result: LichessExplorerResult; source: 'masters' | 'online' }

export interface ComputedPlanOptions {
  lookup: (sans: readonly string[]) => Promise<PlanBoard | null>;
  /** The plan's board is never before this ply — a tab's own first move, so a
   *  variation is never handed its trunk's plan. 0 for a main line. */
  floorPly: number;
}

/** Plies walked past the tabia: six moves each side. */
const HORIZON = 12;
/** A continuation is walked while this share of the board's games played it… */
const WALK_SHARE = 0.08;
/** …and this many games did. */
const WALK_GAMES = 10;
/** The tabia must have been reached in this many games. */
const MIN_TABIA_GAMES = 20;
/** The tabia sits at most this many plies before the line's end, so the plan
 *  picks up where the line ends. */
const MAX_STEP_BACK = HORIZON / 2;
/** A break or route is part of the plan once this share of the games played it. */
const PLAN_SHARE = 0.15;

const PIECE: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const GAMES_NOUN: Record<PlanBoard['source'], string> = { masters: 'master games', online: 'strong online games' };
const PLAYERS_NOUN: Record<PlanBoard['source'], string> = { masters: 'masters', online: 'strong online players' };
const MOVE_ARROW = 'rgba(40,185,95,0.92)';
const KEY_SQUARE = 'rgba(255,214,0,0.88)';

/** `path` is the move order most of the share took to it (from the tabia,
 *  ending on the move itself) — the plan line plays it out. */
interface Tally { share: number; fen: string; arrow: AnnotationArrow; square: string; path: string[]; best: number }
interface RouteTally { share: number; piece: string; squares: string[]; path: string[]; best: number }

function total(r: LichessExplorerResult): number {
  return r.white + r.draws + r.black;
}

function fenAfter(sans: readonly string[]): string | null {
  const c = new Chess();
  try { for (const s of sans) c.move(s); } catch { return null; }
  return c.fen();
}

/** A pawn move that meets an enemy pawn: it takes one, attacks one, or lands
 *  where one attacks it. Pure. */
export function isPawnBreak(fenBefore: string, san: string): boolean {
  const c = new Chess(fenBefore);
  let mv;
  try { mv = c.move(san); } catch { return false; }
  if (mv.piece !== 'p') return false;
  if (mv.captured === 'p') return true;
  const them = mv.color === 'w' ? 'b' : 'w';
  const file = mv.to.charCodeAt(0);
  const rank = Number(mv.to[1]);
  const ahead = mv.color === 'w' ? rank + 1 : rank - 1;
  for (const df of [-1, 1]) {
    const f = String.fromCharCode(file + df);
    if (f < 'a' || f > 'h') continue;
    const hits = c.get(`${f}${ahead}` as Square);
    if (hits && hits.type === 'p' && hits.color === them) return true;
  }
  return c.attackers(mv.to, them).some((sq) => c.get(sq)?.type === 'p');
}

function label(san: string, side: 'w' | 'b'): string {
  return side === 'b' ? `…${san}` : san;
}

/**
 * The plan masters played from the deepest board on `fullLine` they reached in
 * numbers, for the side `side` plays. Never rejects; null when the tree has
 * too little to say.
 */
export async function computedPlanAt(
  fullLine: readonly string[],
  side: 'white' | 'black',
  openingId: string,
  planId: string,
  opts: ComputedPlanOptions,
): Promise<MiddlegamePlan | null> {
  if (!fenAfter(fullLine)) return null;
  // THE TABIA IS THE DEEPEST BOARD ON THE LINE THE MASTERS REACHED IN NUMBERS
  // (2026-10-29). A page's lines run on past the masters into strong online
  // games (O7), so a line's last board is often one the master tree does not
  // hold — and a plan read only there had nothing to read (on 128 real tab
  // lines, 105 had no plan; the Mengarini's main tab among them). The plan is
  // read from the deepest board with MIN_TABIA_GAMES master games, at most
  // MAX_STEP_BACK plies before the end and never before `floorPly`.
  let rootBoard: PlanBoard | null = null;
  let end = fullLine.length;
  for (; end >= Math.max(opts.floorPly, fullLine.length - MAX_STEP_BACK, 0); end -= 1) {
    try { rootBoard = await opts.lookup(fullLine.slice(0, end)); } catch { return null; }
    if (rootBoard && total(rootBoard.result) >= MIN_TABIA_GAMES) break;
    rootBoard = null;
  }
  if (!rootBoard) return null;
  const root = rootBoard.result;
  /** Whose games the walk counted — masters only, or strong online games too. */
  const sources = new Set<PlanBoard['source']>([rootBoard.source]);
  const lineSans = fullLine.slice(0, end);
  const tabiaFen = fenAfter(lineSans);
  if (!tabiaFen) return null;
  const rootGames = total(root);
  const me: 'w' | 'b' = side === 'white' ? 'w' : 'b';

  const breaks = new Map<string, Tally>();
  /** route key "N:d2-f1-g3" → the share of games that made it. */
  const routes = new Map<string, RouteTally>();
  // LEVEL BY LEVEL, AS SHARES. The tree counts a BOARD's games whatever move
  // order reached it — lines from outside transpose in — so raw counts deeper
  // in cannot be divided by the tabia's games. Instead the walk carries the
  // SHARE of the tabia's games at each board: a board passes its share to the
  // replies it walks in proportion to their games (the rare replies it does
  // not walk are taken to go the same way — they mostly transpose back), and a
  // board reached by several orders sums them. A break or route is credited
  // the share that played it, so it can never pass 100%.
  interface Frontier { sans: string[]; flow: number; pieceRoutes: Map<string, string[]>; best: number }
  let level = new Map<string, Frontier>([[tabiaFen.split(' ').slice(0, 4).join(' '), { sans: [...lineSans], flow: 1, pieceRoutes: new Map(), best: 1 }]]);
  const seen = new Set<string>(level.keys());
  for (let depth = 0; depth < HORIZON && level.size > 0; depth += 1) {
    const next = new Map<string, Frontier>();
    for (const at of level.values()) {
      let node: LichessExplorerResult | null;
      if (depth === 0) node = root;
      else {
        let b: PlanBoard | null;
        try { b = await opts.lookup(at.sans); } catch { b = null; }
        if (b) sources.add(b.source);
        node = b?.result ?? null;
      }
      if (!node) continue;
      const n = total(node);
      if (n < WALK_GAMES) continue;
      const fen = fenAfter(at.sans);
      if (!fen) continue;
      const walked = node.moves.filter((m) => {
        const raw = m.white + m.draws + m.black;
        return raw >= WALK_GAMES && raw / n >= WALK_SHARE;
      });
      const walkedGames = walked.reduce((a, m) => a + m.white + m.draws + m.black, 0);
      for (const m of walked) {
        const g = at.flow * ((m.white + m.draws + m.black) / walkedGames);
        const c = new Chess(fen);
        let mv;
        try { mv = c.move(m.san); } catch { continue; }
        const routesAfter = new Map(at.pieceRoutes);
        if (mv.color === me) {
          if (mv.piece === 'p') {
            if (isPawnBreak(fen, m.san)) {
              const key = label(mv.san, me);
              const t = breaks.get(key);
              const path = [...at.sans.slice(lineSans.length), mv.san];
              if (t) { t.share += g; if (g > t.best) { t.best = g; t.path = path; } }
              else breaks.set(key, { share: g, fen, arrow: { from: mv.from, to: mv.to, color: MOVE_ARROW }, square: mv.to, path, best: g });
            }
          } else if (mv.piece !== 'k' && !mv.captured && !mv.san.startsWith('O-')) {
            const route = [...(routesAfter.get(mv.from) ?? [mv.from]), mv.to];
            routesAfter.delete(mv.from);
            routesAfter.set(mv.to, route);
            // A piece that goes out and back has made no journey.
            if (route.length >= 3 && new Set(route).size === route.length) {
              const key = `${mv.piece}:${route.join('-')}`;
              const t = routes.get(key);
              const path = [...at.sans.slice(lineSans.length), mv.san];
              if (t) { t.share += g; if (g > t.best) { t.best = g; t.path = path; } }
              else routes.set(key, { share: g, piece: mv.piece, squares: route, path, best: g });
            }
          } else {
            routesAfter.delete(mv.from);
          }
        } else if (mv.captured) {
          routesAfter.delete(mv.to);
        }
        const board = c.fen().split(' ').slice(0, 4).join(' ');
        if (seen.has(board) && !next.has(board)) continue;
        const was = next.get(board);
        if (was) {
          was.flow += g;
          // A piece's route is the one most of the games took to this board.
          if (g > was.best) { was.best = g; was.pieceRoutes = routesAfter; was.sans = [...at.sans, mv.san]; }
        } else {
          next.set(board, { sans: [...at.sans, mv.san], flow: g, pieceRoutes: routesAfter, best: g });
          seen.add(board);
        }
      }
    }
    level = next;
  }

  // What the line itself plays past the tabia is the line, not the plan: a
  // break it pushed or a hop it made is left out, so the plan is what comes
  // after it (the Mengarini's …e6 tab plays …d5 itself; its plan is not …d5).
  const lineHops = new Set<string>();
  const lineBreaks = new Set<string>();
  {
    const c = new Chess(tabiaFen);
    for (const san of fullLine.slice(lineSans.length)) {
      const before = c.fen();
      let mv;
      try { mv = c.move(san); } catch { break; }
      if (mv.color !== me) continue;
      lineHops.add(`${mv.from}-${mv.to}`);
      if (mv.piece === 'p' && isPawnBreak(before, mv.san)) lineBreaks.add(label(mv.san, me));
    }
  }
  const shareOf = (share: number): number => Math.min(1, share);
  const planBreaks = [...breaks.entries()]
    .filter(([k]) => !lineBreaks.has(k))
    .filter(([, t]) => shareOf(t.share) >= PLAN_SHARE)
    .sort((a, b) => b[1].share - a[1].share);
  // A route that is the start of a longer one masters also took is the same
  // journey; the longer one speaks.
  const routeList = [...routes.values()]
    .filter((r) => !lineHops.has(`${r.squares[r.squares.length - 2]}-${r.squares[r.squares.length - 1]}`))
    .sort((a, b) => b.share - a.share);
  const planRoutes = routeList.filter((r) =>
    shareOf(r.share) >= PLAN_SHARE &&
    !routeList.some((o) => o !== r && o.piece === r.piece && o.squares.length > r.squares.length &&
      r.squares.every((s, i) => o.squares[i] === s) && shareOf(o.share) >= PLAN_SHARE),
  );
  if (planBreaks.length === 0 && planRoutes.length === 0) return null;

  const pct = (share: number): number => Math.round(shareOf(share) * 100);
  const breakPhrase = (k: string): string => `the ${k} break`;
  const routePhrase = (r: { piece: string; squares: string[] }): string => `the ${PIECE[r.piece]} to ${r.squares[r.squares.length - 1]}`;
  const headline = [
    ...(planBreaks[0] ? [breakPhrase(planBreaks[0][0])] : []),
    ...(planRoutes[0] ? [routePhrase(planRoutes[0])] : []),
  ];
  const title = andList(headline);
  const facts = [
    ...planBreaks.map(([k, t]) => `${pct(t.share)}% played ${k}`),
    ...planRoutes.map((r) => `${pct(r.share)}% took the ${PIECE[r.piece]} ${r.squares.join('–')}`),
  ];
  // The words say whose games were counted: the board's own count is its own
  // source's; a share the walk carried through both is "strong players'".
  const rootNoun = GAMES_NOUN[rootBoard.source];
  const walkNoun = sources.size > 1 ? 'games between strong players' : GAMES_NOUN[[...sources][0]];
  const overview = `In the ${rootGames.toLocaleString('en-US')} ${rootNoun} that reached this position, within the next ${HORIZON / 2} moves about ${andList(facts)}.`;

  // The plan line SHOWS the plan: the move order most masters took to its
  // headline (the more-played of the top break and the top route), then their
  // main moves on.
  const lead = [planBreaks.at(0)?.[1], planRoutes.at(0)].filter((t): t is Tally | RouteTally => t !== undefined)
    .sort((a, b) => b.share - a.share).at(0);
  const line = await mainContinuation(lineSans, tabiaFen, me, planBreaks.map(([, t]) => t.square), planRoutes, lead?.path ?? [], opts,
    sources.size > 1 ? 'strong players' : PLAYERS_NOUN[[...sources][0]]);

  return {
    id: planId,
    openingId,
    criticalPositionFen: tabiaFen,
    lineMoves: [...lineSans],
    title: openSentence(title),
    overview,
    pawnBreaks: planBreaks.map(([k, t]) => ({
      move: k,
      explanation: `${pct(t.share)}% of the ${walkNoun} here played ${k} within ${HORIZON / 2} moves.`,
      fen: t.fen,
      arrows: [t.arrow],
    })),
    pieceManeuvers: planRoutes.map((r) => ({
      piece: openSentence(PIECE[r.piece]),
      route: r.squares.join('–'),
      explanation: `${pct(r.share)}% of the ${walkNoun} here took the ${PIECE[r.piece]} ${r.squares.join('–')}.`,
    })),
    strategicThemes: [],
    endgameTransitions: [],
    ...(line ? { playableLines: [line] } : {}),
  };
}

/** The masters' continuation from the tabia — `start` (the move order to the
 *  plan's headline) and then their most-played moves — HORIZON plies on, with
 *  the plan's squares marked where the student's moves reach them. */
async function mainContinuation(
  lineSans: readonly string[],
  tabiaFen: string,
  me: 'w' | 'b',
  breakSquares: readonly string[],
  planRoutes: ReadonlyArray<{ squares: string[] }>,
  start: readonly string[],
  opts: ComputedPlanOptions,
  /** Whose games the line follows, for its title. */
  players: string,
): Promise<PlayableMiddlegameLine | null> {
  const key = new Set([...breakSquares, ...planRoutes.flatMap((r) => r.squares.slice(1))]);
  const moves: string[] = [];
  const arrows: AnnotationArrow[][] = [];
  const highlights: AnnotationHighlight[][] = [];
  const c = new Chess(tabiaFen);
  for (let i = 0; i < HORIZON; i += 1) {
    let san: string | undefined = start.at(i);
    if (san === undefined) {
      let node: LichessExplorerResult | null;
      try { node = (await opts.lookup([...lineSans, ...moves]))?.result ?? null; } catch { node = null; }
      san = node?.moves.find((m) => m.white + m.draws + m.black >= WALK_GAMES)?.san;
    }
    if (!san) break;
    let mv;
    try { mv = c.move(san); } catch { break; }
    moves.push(mv.san);
    arrows.push([{ from: mv.from, to: mv.to, color: MOVE_ARROW }]);
    highlights.push(mv.color === me && key.has(mv.to) ? [{ square: mv.to, color: KEY_SQUARE }] : []);
  }
  if (moves.length < 4) return null;
  return {
    fen: tabiaFen,
    moves,
    annotations: moves.map(() => ''),
    arrows,
    highlights,
    title: `The plan, as ${players} played it`,
  };
}
