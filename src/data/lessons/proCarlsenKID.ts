import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Magnus Carlsen — King's Indian Defence, BLACK. 300 games (online + OTB).
// The most combative answer to d4 — Black cedes the centre, then attacks it.
// Main line = the Classical Mar del Plata, the great opposite-wing race. Variations
// cover the Fianchetto, the Grünfeld set-up, the Makogonov and the Sämisch.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence', 'https://www.chess.com/openings/Kings-Indian-Defense', 'https://api.chess.com/pub/player/magnuscarlsen/games/archives'];

export const PRO_CARLSEN_KID_LESSON: LessonScript = {
  openingId: 'pro-carlsen-kid',
  title: "This repertoire's King's Indian — the Mar del Plata Race",
  minutes: 11,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'setup', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6', arrows: [A('g7', 'a1')], highlights: [H('g7'), H('d6')], say: "The King's Indian — Black's most aggressive answer to d4. He deliberately lets White build a big pawn centre, then fianchettoes the bishop on g7 to snipe at it from the long diagonal. The plan is bold: invite the centre forward, then blow it up with ...e5 and a kingside storm.", sayShort: 'Bg7 — cede the centre, then strike.' }),
    b({ id: 'e5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Nf3 e5', arrows: [A('e5', 'd4')], highlights: [H('e5')], say: "Black castles and strikes with ...e5 — the soul of the King's Indian. He challenges White's centre directly. White can trade, hold the tension, or push past with d5; each choice leads to a completely different battle, and Black is booked and dangerous in all of them.", sayShort: 'e5 — the King\'s Indian strike.' }),
    b({ id: 'd5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Nf3 e5 O-O Nc6 d5', highlights: [H('d5'), H('e5')], say: "White plays d5, locking the centre and gaining queenside space — the Mar del Plata main line. Now the famous race is on: White attacks on the queenside where his space is, Black storms the kingside toward White's king. Whoever's attack lands first wins. Pure, thrilling chess.", sayShort: 'd5 — the locked-centre race begins.' }),
    b({ id: 'ne7', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Nf3 e5 O-O Nc6 d5 Ne7', arrows: [A('e7', 'f5')], highlights: [H('e7')], say: "The knight reroutes — ...Ne7, heading for g6 and f5 to join the kingside attack, and clearing the way for the thematic ...f5 pawn break. Black throws everything at White's king with ...f5-f4, ...g5-g4, the pieces pouring in behind. This is the most exciting plan in chess, and this repertoire has wielded it against the very best.", sayShort: 'Ne7 — reroute, prepare f5.' }),
  ],
};

const FIANCHETTO: LessonScript = {
  openingId: 'pro-carlsen-kid', title: "Fianchetto g3", minutes: 7, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'g3', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6', highlights: [H('d6')], say: "The Fianchetto Variation is White's most solid anti-King's-Indian: he fianchettoes too, blunting Black's g7-bishop along the long diagonal. Black doesn't panic — he sets up the same ...d6 and ...e5 structure and looks for a slower, more positional version of his usual plans.", sayShort: 'd6 — meet the calm fianchetto.' }),
    b({ id: 'e5', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nbd7 O-O e5', arrows: [A('e5', 'd4')], highlights: [H('e5')], say: "Black develops the knight to d7 and breaks with ...e5 as always. Against the fianchetto, the play is more about central control and piece activity than a kingside avalanche, but Black gets a sound, double-edged game with the better long-term chances if White over-presses.", sayShort: 'e5 — central break vs the fianchetto.' }),
    b({ id: 're8', moves: 'd4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nbd7 O-O e5 e4 Re8 h3', highlights: [H('e8'), H('e5')], say: "After White grabs space with e4, Black supports the centre with ...Re8 and prepares ...exd4 and ...c6 or ...a5 to fight for the queenside squares. It's a rich, manoeuvring King's Indian where understanding the pawn breaks matters more than memory — exactly this repertoire's strength.", sayShort: 'Re8 — support e5, manoeuvre.' }),
  ],
};

const GRUNFELD: LessonScript = {
  openingId: 'pro-carlsen-kid', title: "Grünfeld ...d5", minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd5', moves: 'd4 Nf6 c4 g6 Nc3 d5', arrows: [A('d5', 'c4')], highlights: [H('d5')], say: "The Grünfeld — instead of the King's Indian's ...d6, Black hits the centre at once with ...d5. He'll let White build a big pawn centre, then attack it with pieces from the flanks. It's the hypermodern philosophy in its purest, most dynamic form, and a this repertoire World-Championship weapon.", sayShort: 'd5 — the hypermodern Grünfeld.' }),
    b({ id: 'bg7', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7', arrows: [A('g7', 'd4')], highlights: [H('g7'), H('c3')], say: "After the exchanges, White builds a massive pawn centre on c3, d4 and e4 — and Black's fianchettoed bishop on g7 immediately takes aim at it down the long diagonal. The whole game is about whether White's centre is strong or just a target. Black bets on the latter.", sayShort: 'Bg7 — aim at the big centre.' }),
    b({ id: 'c5', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 Nc6 Be3 O-O', arrows: [A('c5', 'd4')], highlights: [H('c5')], say: "Black strikes with ...c5, the thematic Grünfeld lever, hammering at the base of White's centre, then develops and castles. The d4-pawn becomes the target of Black's whole army. If White can't hold and use his centre, it falls and Black stands better — and this repertoire excels at proving exactly that.", sayShort: 'c5 — hammer the centre\'s base.' }),
  ],
};

const MAKOGONOV: LessonScript = {
  openingId: 'pro-carlsen-kid', title: "Makogonov h3", minutes: 5, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'h3', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 e5', arrows: [A('e5', 'd4')], highlights: [H('e5')], say: "The Makogonov — White plays h3 to take the g4-square away from Black's pieces and prepare a calm Be3 and d5 setup. Black reacts in the centre with the usual ...e5, refusing to be slowed down. The h3 move is solid but slightly slow, and Black's central counterplay arrives on time.", sayShort: 'e5 — counter the slow h3.' }),
    b({ id: 'nbd7', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 h3 O-O Be3 e5 d5 Nbd7', highlights: [H('d7'), H('c5')], say: "White locks with d5 and Black reroutes the knight to d7, heading for c5 to hit the e4-pawn and the queenside light squares, while preparing the ...f5 break. Black has a comfortable King's Indian where White's h3 has cost a tempo. Patient, two-sided, full of chances — This repertoire territory.", sayShort: 'Nbd7 — head for c5 and f5.' }),
  ],
};

const SAEMISCH: LessonScript = {
  openingId: 'pro-carlsen-kid', title: "Sämisch f3", minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'f3', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 c5', highlights: [H('c5'), H('d4')], say: "The Sämisch — White braces the centre with f3 and prepares Be3, Qd2 and a kingside pawn storm. Rather than let that slow plan roll, Black strikes the centre at once with ...c5, challenging d4 and opening lines for counterplay before White is ready.", sayShort: '...c5 — counter the centre at once.' }),
    b({ id: 'lock', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 c5 Nge2 Nc6 d5 Ne5', arrows: [A('e5', 'c4')], highlights: [H('e5')], say: "White locks the centre with d5; Black's knight swings to the e5-outpost — a superb square in the heart of White's camp, eyeing c4 and d3 and impossible to chase off with a pawn. Black follows with ...a6 and ...b5 to open the queenside while White is committed to the other wing.", sayShort: '...Ne5 — the outpost, play the queenside.' }),
  ],
};

export const PRO_CARLSEN_KID_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-carlsen-kid::Fianchetto g3': FIANCHETTO,
  'pro-carlsen-kid::Grünfeld ...d5': GRUNFELD,
  'pro-carlsen-kid::Makogonov h3': MAKOGONOV,
  'pro-carlsen-kid::Sämisch f3': SAEMISCH,
};
