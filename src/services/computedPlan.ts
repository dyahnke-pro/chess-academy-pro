// computedPlan — THE MIDDLEGAME PLAN MASTERS PLAYED FROM A LINE'S MIDDLEGAME
// (WO-ALL-OPENINGS-01 O5, David 2026-10-28: "The builder needs to be able to
// build all aspects of the opening tabs on the fly. Middle games, gems, end
// game"). A line with no hand-written plan gets one read off the stored game
// trees: the line is walked on to the MIDDLEGAME along the games' most-played
// moves (`walkToMiddlegame`, the games course's own walk), and from the
// middlegame board the games reached in numbers (the tabia, G9.3 Gate C) their
// continuations are walked a few moves on, and what the student's side did in
// them is counted — the pawn breaks it played and the routes its pieces took,
// each with the share of the games that played it. The plan line plays the
// moves from the line's end to the tabia (`approach`), then the games'
// most-played continuation. Every move is a move strong players played (G3);
// every word is a count (G0). Empty > invented: a line whose games run out
// before a middlegame, a tabia too few games reached, or one where nothing
// clears the bar, has no plan.
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import type {
  AnnotationArrow,
  AnnotationHighlight,
  LichessExplorerResult,
  MiddlegamePlan,
  OpeningRecord,
  PlayableMiddlegameLine,
} from '../types';
import { andList } from '../utils/andList';
import { openSentence } from '../utils/openSentence';
import { tabLineSans } from './tabLine';
import { walkToMiddlegame } from './gamesCourse';

/** A board's games and whose they are — the words say whose games were
 *  counted (WO-ALL-OPENINGS-01 O9). */
export interface PlanBoard { result: LichessExplorerResult; source: 'masters' | 'online' }

export interface ComputedPlanOptions {
  lookup: (sans: readonly string[]) => Promise<PlanBoard | null>;
}

/** Plies walked past the tabia: six moves each side. */
const HORIZON = 12;
/** A continuation is walked while this share of the board's games played it… */
const WALK_SHARE = 0.08;
/** …and this many games did. */
const WALK_GAMES = 10;
/** The tabia must have been reached in this many games. */
const MIN_TABIA_GAMES = 20;
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

/** A pawn move that STARTS a fight with an enemy pawn: it takes one that has
 *  stood its ground, attacks one, or lands where one attacks it. Taking what
 *  the opponent's last move put there — a recapture, or the lever they just
 *  pushed, en passant included — answers their break; it is not one
 *  (2026-10-29: "the axb4 break", played in every game, was the recapture of
 *  …cxb4; the Najdorf's "…dxe5 break" took the e5 pawn White had just pushed).
 *  `lastTo` is the square the opponent's last move landed on, null at the
 *  start. Pure. */
export function isPawnBreak(fenBefore: string, san: string, lastTo: string | null): boolean {
  const c = new Chess(fenBefore);
  let mv;
  try { mv = c.move(san); } catch { return false; }
  if (mv.piece !== 'p') return false;
  if (mv.captured && (mv.to === lastTo || mv.isEnPassant())) return false;
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

/** The plan the games played for one tab of an opening (`lineIndex`,
 *  MAIN_LINE_INDEX for the main line), its line read through `lookup`. Never
 *  rejects. */
export function tabPlanFor(
  opening: Pick<OpeningRecord, 'id' | 'pgn' | 'variations' | 'color'>,
  lineIndex: number,
  lookup: ComputedPlanOptions['lookup'],
): Promise<MiddlegamePlan | null> {
  return computedPlanAt(tabLineSans(opening, lineIndex), opening.color, opening.id, `computed-${opening.id}-${lineIndex}`, { lookup })
    .catch(() => null);
}

/**
 * The plan masters played from the middlegame `line` reaches, for the side
 * `side` plays. Never rejects; null when the games run out before a
 * middlegame or have too little to say there.
 */
export async function computedPlanAt(
  line: readonly string[],
  side: 'white' | 'black',
  openingId: string,
  planId: string,
  opts: ComputedPlanOptions,
): Promise<MiddlegamePlan | null> {
  if (!fenAfter(line)) return null;
  // THE PLAN IS READ AT A MIDDLEGAME BOARD (2026-10-29). Many tab lines stop
  // in the opening, and a plan read at an opening board counted the opening's
  // own moves as the plan — development, not a plan — while the structure
  // read there named "their weak pawn on a7" on a pawn that had never moved.
  // So the line is first walked on along the games (the games course's own
  // walk, the stored trees the line was built from) until both kings are
  // settled and no exchange is half-played (`isMiddlegameBoard`); a line whose
  // games run out first has no plan. A line already on such a board is not
  // walked.
  const me: 'w' | 'b' = side === 'white' ? 'w' : 'b';
  let walked;
  try {
    walked = await walkToMiddlegame(line, me, { lookup: async (sans) => (await opts.lookup(sans))?.result ?? null });
  } catch {
    return null;
  }
  if (walked.stop !== 'middlegame') return null;
  // THE TABIA IS WHERE THE LINE ENDS, OR THE MIDDLEGAME IT WALKS ON TO — never
  // a board the line has already left (G9.3 Gate C, 2026-10-29). A plan read a
  // few plies back on the line, where the games were thicker, told the student
  // a plan their own line had just turned down: the Grünfeld's tab plays
  // …Bd7 and its plan was "the bishop c8–g4–e6"; the KIA's plays e5 and its
  // plan was "the exd5 break". Where the games run out on the line itself,
  // there is no plan.
  let rootBoard: PlanBoard | null;
  try { rootBoard = await opts.lookup(walked.sans); } catch { return null; }
  if (!rootBoard || total(rootBoard.result) < MIN_TABIA_GAMES) return null;
  return planFromTabia(walked.sans, line.length, rootBoard, side, openingId, planId, opts);
}

/** The square the last move of `sans` landed on, or null at the start. */
function lastMoveTo(sans: readonly string[]): string | null {
  const c = new Chess();
  try { for (const s of sans) c.move(s); } catch { return null; }
  return c.history({ verbose: true }).at(-1)?.to ?? null;
}

/** The plan read from the board `lineSans` reaches (the tabia), or null when
 *  what was played from it shows none. `lineEnd` is where the given line
 *  stopped: the moves from there to the tabia are its `approach`. */
async function planFromTabia(
  lineSans: readonly string[],
  lineEnd: number,
  rootBoard: PlanBoard,
  side: 'white' | 'black',
  openingId: string,
  planId: string,
  opts: ComputedPlanOptions,
): Promise<MiddlegamePlan | null> {
  const root = rootBoard.result;
  /** Whose games the walk counted — masters only, or strong online games too. */
  const sources = new Set<PlanBoard['source']>([rootBoard.source]);
  const tabiaFen = fenAfter(lineSans);
  if (!tabiaFen) return null;
  // The way from the line's end into its middlegame — played first on the
  // plan line, so the plan picks up where the line ends (G9.3 Gate C).
  const lineStart = lineSans.slice(0, lineEnd);
  const approach = lineSans.slice(lineEnd);
  const rootGames = total(root);
  const me: 'w' | 'b' = side === 'white' ? 'w' : 'b';

  const breaks = new Map<string, Tally>();
  /** route key "N:d2-f1-g3" → the share of games that made it. */
  const routes = new Map<string, RouteTally>();
  // LEVEL BY LEVEL, AS SHARES. The tree counts a BOARD's games whatever move
  // order reached it — lines from outside transpose in — so raw counts deeper
  // in cannot be divided by the tabia's games. Instead the walk carries the
  // SHARE of the tabia's games at each board: a board passes each reply it
  // walks that reply's share of ALL its games, and a board reached by several
  // orders sums them. The replies it does not walk keep their share out of the
  // count: on a thin board they were most of the games, and passing their share
  // on to the one reply walked said "100% played axb5" where 11 of 42 games
  // did (2026-10-29). A break or route is credited the share that played it,
  // so it never passes 100%.
  // `lastTo` is where the move that reached the board landed: taking the pawn
  // that just arrived there answers a break, it is not one (`isPawnBreak`).
  interface Frontier { sans: string[]; flow: number; pieceRoutes: Map<string, string[]>; best: number; lastTo: string | null }
  let level = new Map<string, Frontier>([[tabiaFen.split(' ').slice(0, 4).join(' '), { sans: [...lineSans], flow: 1, pieceRoutes: new Map(), best: 1, lastTo: lastMoveTo(lineSans) }]]);
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
      for (const m of walked) {
        const g = at.flow * ((m.white + m.draws + m.black) / n);
        const c = new Chess(fen);
        let mv;
        try { mv = c.move(m.san); } catch { continue; }
        const routesAfter = new Map(at.pieceRoutes);
        if (mv.color === me) {
          if (mv.piece === 'p') {
            if (isPawnBreak(fen, m.san, at.lastTo)) {
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
          if (g > was.best) { was.best = g; was.pieceRoutes = routesAfter; was.sans = [...at.sans, mv.san]; was.lastTo = mv.to; }
        } else {
          next.set(board, { sans: [...at.sans, mv.san], flow: g, pieceRoutes: routesAfter, best: g, lastTo: mv.to });
          seen.add(board);
        }
      }
    }
    level = next;
  }

  const shareOf = (share: number): number => Math.min(1, share);
  const planBreaks = [...breaks.entries()]
    .filter(([, t]) => shareOf(t.share) >= PLAN_SHARE)
    .sort((a, b) => b[1].share - a[1].share);
  // A route that is the start of a longer one masters also took is the same
  // journey; the longer one speaks.
  const routeList = [...routes.values()].sort((a, b) => b.share - a.share);
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
    sources.size > 1 ? 'strong players' : PLAYERS_NOUN[[...sources][0]], approach);

  return {
    id: planId,
    openingId,
    criticalPositionFen: tabiaFen,
    lineMoves: [...lineStart],
    ...(approach.length ? { approach: [...approach] } : {}),
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
 *  the plan's squares marked where the student's moves reach them. With an
 *  `approach`, the line starts where the tab's line ended and plays the way
 *  into the middlegame first. */
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
  /** The moves from the tab line's end to the tabia (`lineSans`' last ones). */
  approach: readonly string[],
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
  const fromFen = fenAfter(lineSans.slice(0, lineSans.length - approach.length));
  if (!fromFen) return null;
  const way: AnnotationArrow[][] = [];
  const b = new Chess(fromFen);
  for (const san of approach) {
    const mv = b.move(san);
    way.push([{ from: mv.from, to: mv.to, color: MOVE_ARROW }]);
  }
  return {
    fen: fromFen,
    moves: [...approach, ...moves],
    annotations: [...approach, ...moves].map(() => ''),
    arrows: [...way, ...arrows],
    highlights: [...approach.map(() => []), ...highlights],
    title: `The plan, as ${players} played it`,
  };
}
