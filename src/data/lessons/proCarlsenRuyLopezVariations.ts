import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Magnus Carlsen — Ruy Lopez / Open Games per-variation Watch lessons.
// Student = WHITE. Hand-authored from his combined-corpus data spines.
// Board-accurate, two registers, G9.4 voice. Carlsen's complete 1.e4 e5.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/Ruy_Lopez', 'https://www.chess.com/openings/Ruy-Lopez', 'https://api.chess.com/pub/player/magnuscarlsen/games/archives'];

const ITALIAN: LessonScript = {
  openingId: 'pro-carlsen-ruy-lopez', title: "Italian Bc4", minutes: 7, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bc4', moves: 'e4 e5 Nf3 Nc6 Bc4', arrows: [A('c4', 'f7')], highlights: [H('f7')], say: "Carlsen's other great e5 weapon — the Italian. The bishop goes to c4 and trains on f7, the most vulnerable square in Black's camp. Where the Ruy pressures c6, the Italian aims straight at the king's doorstep.", sayShort: 'Bc4 — point at f7.' }),
    b({ id: 'd3', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 O-O d6 c3', highlights: [H('d3'), H('c3')], say: "The modern Giuoco Pianissimo — the 'very quiet game'. White plays the restrained d3 and prepares c3 and d4 at his own pace. No early clashes; just a slow build where the better-coordinated side eventually breaks through. Carlsen's favourite way to play for a win without risk.", sayShort: 'd3, c3 — the quiet build.' }),
    b({ id: 'a5', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 O-O d6 c3 a5', highlights: [H('a5'), H('d4')], say: "Black grabs queenside space with a5 to stop White's b4, and the position settles into a long manoeuvring game. White will prepare d4 to open the centre when his pieces are best placed. A rich, almost symmetrical fight that rewards the deeper understanding — Carlsen's home turf.", sayShort: 'a5 — both sides manoeuvre, d4 looms.' }),
  ],
};

const BERLIN: LessonScript = {
  openingId: 'pro-carlsen-ruy-lopez', title: "Berlin vs ...Nf6", minutes: 6, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd3', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3', highlights: [H('d3')], say: "Against the rock-solid Berlin, Carlsen sidesteps the famous drawish endgame with the quiet d3 — the Anti-Berlin. He keeps the queens on and the pieces flexible, steering toward a slow middlegame where his technique can grind rather than a forced simplification.", sayShort: 'd3 — dodge the Berlin endgame.' }),
    b({ id: 'bxc6', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 Bxc6 dxc6', arrows: [A('b5', 'c6')], highlights: [H('c6')], say: "The structural idea: Bxc6 trades the bishop for the knight and saddles Black with doubled c-pawns. White concedes the bishop pair but gets the healthier majority and a simple, durable plan — a typical Carlsen long-term trade of one small thing for another.", sayShort: 'Bxc6 — double the c-pawns.' }),
    b({ id: 'oo', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 Bxc6 dxc6 O-O Nd7 c3', highlights: [H('c3'), H('e5')], say: "White castles and plays c3, preparing to challenge the centre and reach a queenside pawn-majority endgame where the doubled c-pawns tell. It's a tiny, nagging edge — the kind Carlsen converts more often than anyone alive.", sayShort: 'c3 — head for the better endgame.' }),
  ],
};

const PETROV: LessonScript = {
  openingId: 'pro-carlsen-ruy-lopez', title: "vs Petrov ...Nf6", minutes: 6, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nxe5', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4', highlights: [H('d4'), H('e4')], say: "The Petrov — Black's most solid, symmetrical defence. After the knights swap pawns, White plays d4 to claim the centre. The position is dead-level by reputation, so Carlsen's goal is simply a fraction more space and a long game where small differences accumulate.", sayShort: 'd4 — claim the centre vs the Petrov.' }),
    b({ id: 'bd3', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Bd6 O-O O-O', arrows: [A('d3', 'h7')], highlights: [H('d3')], say: "Both sides mirror each other and castle. White's bishop sits on d3 eyeing the b1-h7 diagonal toward Black's king — a small attacking trump in a symmetrical sea. The plan is patience: keep more space, trade well, and outplay in the endgame.", sayShort: 'Bd3 — the lone attacking diagonal.' }),
    b({ id: 'c4', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Bd6 O-O O-O c4 c6 Re1', arrows: [A('e1', 'e4')], highlights: [H('c4')], say: "c4 strikes at Black's d5-pawn to open lines, and Re1 takes the half-open e-file. White generates the only imbalance available against the Petrov — a touch more activity — and from there it's pure Carlsen technique.", sayShort: 'c4, Re1 — pry it open.' }),
  ],
};

const SCOTCH: LessonScript = {
  openingId: 'pro-carlsen-ruy-lopez', title: "Scotch d4", minutes: 6, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd4', moves: 'e4 e5 Nf3 Nc6 d4', highlights: [H('d4')], say: "The Scotch — an early d4 that blasts the centre open immediately. Carlsen reaches for it when he wants a fresh, less-charted fight than the Ruy. The pawn trade in the middle hands White easy development and a lead in piece activity.", sayShort: 'd4 — open the centre at once.' }),
    b({ id: 'nb3', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Nb3 Bb6', arrows: [A('b3', 'c5')], highlights: [H('b6')], say: "Black hits the knight with the bishop and White retreats to b3, gaining a tempo by chasing the bishop to b6. White's pieces flow out naturally; Black must spend time regrouping. Small gains in time and space — the Carlsen currency.", sayShort: 'Nb3 — chase with tempo.' }),
    b({ id: 'a4', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Nb3 Bb6 a4', highlights: [H('a4')], say: "a4 lunges up the board, threatening a5 to trap or chase the b6-bishop and grab queenside space. White is the one asking all the questions. A pleasant, slightly better position with no risk — exactly what Carlsen orders against 1...e5.", sayShort: 'a4 — harass the bishop, grab space.' }),
  ],
};

const FOUR_KNIGHTS: LessonScript = {
  openingId: 'pro-carlsen-ruy-lopez', title: "Four Knights Nc3", minutes: 6, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nc3', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4', highlights: [H('d4')], say: "The Scotch Four Knights — all four knights out, then d4 to open the centre. A classical, principled way to play for a small, durable pull. Carlsen uses it to steer the game into clean structures where his technique outweighs his opponent's preparation.", sayShort: 'd4 — classical central break.' }),
    b({ id: 'trade', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5', arrows: [A('d3', 'h7')], highlights: [H('c6'), H('d5')], say: "After the central trades, Bxc6 doubles Black's pawns and the bishop drops to d3 on the attacking diagonal. Black gets the bishop pair and central space; White gets the better structure and a clear target in the doubled c-pawns. A balanced fight with a long-term edge.", sayShort: 'Bd3 — doubled pawns, better structure.' }),
    b({ id: 'oo', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O', highlights: [H('d5')], say: "Both sides castle into a symmetrical-looking middlegame, but Black's d5-pawn is isolated and the c-pawns are doubled. White will blockade and pressure those weaknesses for the rest of the game — the pure Carlsen recipe of nursing a structural edge to the full point.", sayShort: 'O-O — pressure the weak pawns.' }),
  ],
};

export const PRO_CARLSEN_RUY_LOPEZ_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-carlsen-ruy-lopez::Italian Bc4': ITALIAN,
  'pro-carlsen-ruy-lopez::Berlin vs ...Nf6': BERLIN,
  'pro-carlsen-ruy-lopez::vs Petrov ...Nf6': PETROV,
  'pro-carlsen-ruy-lopez::Scotch d4': SCOTCH,
  'pro-carlsen-ruy-lopez::Four Knights Nc3': FOUR_KNIGHTS,
};
