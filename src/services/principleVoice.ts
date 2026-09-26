/**
 * principleVoice — the FUNDAMENTAL, spoken (deterministic, DNA register).
 *
 * The verdict LEADS a flagged move's beat; everything else the review computed
 * follows as supporting evidence (David 2026-09-05: "I want the fundamental
 * flaw to be stated first and then the other computer narration following it
 * as supporting evidence"). Every word here is a code template over the
 * attributor's evidence — the squares and moves named are the ones it proved
 * on the board — so the line is identical on every open and every device, and
 * no model rephrases it (G0 `preferRaw`; David: "This all needs to be
 * deterministic!!"). Variety comes from stems rotated on the ply index, never
 * from a model. Perspective: the student is "you/your", the opponent
 * "they/their" (locked 2026-08-28).
 *
 * A fundamental that already spoke in full earlier in the game is repeated in
 * a short stem — the walk accumulates, it does not nag (G.4).
 */
import type { PrincipleAttribution, FundamentalId } from './principleAttribution';

const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
const nth = (n: number): string => ORD[n] ?? `${n}th`;

function listMoves(moves: readonly string[], joiner = ' then '): string {
  return moves.join(joiner);
}

/** ─── THE "HERE'S HOW" LAYER ────────────────────────────────────────────────
 *
 *  David 2026-09-16, reading the review of his own game: "The plan plus here's
 *  how!!! The how is teaching!! How and why statements critical to this app's
 *  success!"
 *
 *  Measured the same hour: `deriveNextPlans` carried a HOW on 8 of its 8 plans,
 *  and every OTHER teaching surface carried zero. This file is the worst case —
 *  it is the DIAGNOSE layer, it names 33 fundamentals by name with board proof,
 *  and it never once told the student how to stop doing it. Naming the flaw is
 *  half a lesson; the procedure that prevents it next game is the other half.
 *
 *  Each entry is the HABIT, not a restatement of the fault: what to DO, in the
 *  order to do it, at the board. No square is named here — the verdict above
 *  already proved the geometry, and a fixed string cannot know the position
 *  (G0/G3: the how is a procedure, never an invented board claim).
 *
 *  `Record<FundamentalId, string>` is deliberate: a 34th fundamental FAILS TO
 *  COMPILE until someone writes its how. A diagnosis without a remedy cannot
 *  ship again. */
const FUNDAMENTAL_HOW: Record<FundamentalId, string> = {
  // ── opening: development and tempo ──
  'same-piece-twice':
    'Before you move a piece a second time, ask what it gains that a NEW piece would not. If the answer is "it gets safer", prefer developing — safety usually comes free once everything is out.',
  'tempo-handed':
    'Count it out loud: does this move force them to answer, or do they get a free turn? When a move gives them a tempo, look for one that develops AND asks a question.',
  'space-conceded':
    'Before retreating or stepping aside, check whether you can hold the square by DEFENDING it instead — add a defender rather than give the square away, because pawns never come back.',
  'neglected-development':
    'Run the checklist every opening move: are all four minors out, is the king castled, are the rooks connected? Answer no anywhere and that is your move — everything else can wait.',
  'early-queen-sortie':
    'Keep the queen home until the minors are out. The test is simple: if a knight or bishop can be kicked at your queen with tempo, you are financing their development.',
  'king-left-in-centre':
    'Castle by move ten unless a concrete line stops you. When files start opening in the centre, castling is not a luxury move you get to play later — it is the move.',
  'early-edge-pawns':
    'Ask what an edge pawn actually attacks. If the answer is nothing, spend the move on a piece — rook pawns win games in the endgame, not the opening.',
  'knights-before-bishops':
    'Develop knights first: a knight has one good square early, a bishop has several and you cannot know which until their structure commits. Let them tell you where the bishop belongs.',
  // ── pieces on bad squares ──
  'buried-own-bishop':
    'Before a pawn move, look at your own bishops and ask which squares this shuts. Put your pawns on the colour your bishop does NOT travel on, so it keeps its diagonals.',
  'knight-to-the-rim':
    'Ask how many squares the knight will have from there. Route it toward the centre or an outpost instead — count the squares before AND after, and take the bigger number.',
  'worst-piece-unimproved':
    'Find your worst piece before you attack. Spend two or three moves walking it somewhere it bites: a piece doing nothing means you are playing a piece down.',
  'kept-bad-bishop':
    'Spot the bishop stuck behind its own pawns early, and either trade it off or free it by moving those pawns to the other colour. Do not carry a dead piece into an endgame.',
  'rook-ignored-open-file':
    'The moment a file opens, ask which rook takes it. An open file is the rook\'s only road into their position, and whoever claims it first usually keeps it.',
  'passive-rook-endgame':
    'Rooks go BEHIND passed pawns and onto the seventh. Before defending passively, look for the active square — an active rook is often worth a pawn in a rook ending.',
  // ── threats and tactics ──
  'loose-piece':
    'End every move with a sweep: what of mine is undefended right now? Loose pieces are what makes their tactic work, so defend it or move it before it becomes their idea.',
  'ignored-threat':
    'Their move first, always. Before you look for your own idea, answer what their last move threatens — if it threatens something, that is the move you have to meet.',
  'passive-when-forcing-existed':
    'Scan forcing moves first, in order: every check, every capture, every threat. Only when none of them works do you look at quiet moves — that order is what finds shots.',
  'poisoned-pawn':
    'Before taking a free pawn, ask why they let you. Play out their reply: if it comes with tempo and you end up worse coordinated, the pawn was the bait.',
  'greedy-pawn-grab':
    'Price the pawn in tempi. If collecting it costs two moves and lets them develop with threats, it is not free — count the moves before you count the material.',
  'overvalued-attack':
    'Count attackers and defenders before you commit. An attack with fewer attackers than defenders is a plan you have to abandon later, after it has cost you the position.',
  // ── structure ──
  'weakened-king-shield':
    'Do not move the pawns in front of your own king without a concrete reason. Before one, ask which piece of theirs gets a route in once that square is gone.',
  'created-pawn-weakness':
    'Look one move ahead of every pawn push: what square does this permanently stop covering, and can a piece of theirs sit there? A pawn move is the only one you cannot undo.',
  'overextended-pawn':
    'A pawn far up the board needs support before it goes. Check it is defended and that you can hold the square behind it — otherwise it becomes the target instead of the spearhead.',
  'premature-centre-break':
    'Finish development before you open the position. The break is strong only when your pieces are ready to pour through the lines it opens — otherwise it opens them for THEM.',
  'capture-toward-centre':
    'When two captures are legal, take toward the centre by default. It builds a pawn mass pointing at the middle instead of a wing pawn nobody needs.',
  'mistimed-pawn-break':
    'Prepare the break before playing it: get every piece that touches the break square onto it first. A break played a move early just trades your good pawn for their bad one.',
  // ── trades ──
  'traded-active-for-passive':
    'Before a trade, compare the two pieces honestly: which one is doing more work right now? Trade your worst piece for their best, never the other way round.',
  'wrong-trade-for-material':
    'Material is not the only ledger. Ask what the position looks like after the trade — a piece count that improves while your structure or king safety gets worse is a bad deal.',
  // ── endgame ──
  'passive-king-endgame':
    'When the queens come off, the king becomes a fighting piece — march it toward the centre. In endgames the side whose king arrives first usually wins.',
  'rook-in-front-of-passer':
    'Put the rook BEHIND the passer, always — yours or theirs. In front it is a blocker doing nothing; behind, it gains scope with every square the pawn advances.',
  'passed-pawn-neglected':
    'Passed pawns must be pushed. Clear the square in front, escort it with the king, and advance one safe square at a time until they must give up a piece to stop it.',
  'lost-the-opposition':
    'In king-and-pawn endings, count the squares between the kings before you move. Keep an odd number with them to move and the opposition — and the key squares — stay yours.',
  'botched-conversion':
    'Winning positions are won by simplifying. Trade pieces at every chance but keep the pawn structure intact, steer for the ending where the extra material decides, and refuse every complication.',
  // ── section 14: the reasoning errors ──
  'calculation-depth':
    'Calculate to a QUIET position, not to a good feeling. Follow every forcing reply — check, capture, threat — until nothing forces, then judge. If the line ends while they still have a capture, you have not finished.',
  'left-book-early':
    'Before you leave theory, ask what the new move gains that the book move does not. If you cannot say it out loud, prefer the book move — it is there because thousands of games found it works.',
  'no-plan':
    'Name the target before you touch a piece. Ask what the position wants — a weak pawn, an open file, a passed pawn — and let the move serve that. If a move serves no plan you can say in one sentence, it is not the move.',
};

/** The HOW's lead-in, rotated by how many HOWs this ply has already spoken:
 *  two lessons earned on one ply both speak, but never under the same stem
 *  twice in a row (walk 5, R10 — "Here's how: … Here's how: …"). */
const HOW_STEMS = ["Here's how:", 'The habit that fixes it:', 'Next time:'] as const;

/** Every sentence of every HOW — the procedure the student runs next game.
 *  A HOW is an instruction, so the review's past-tense pass must never touch
 *  it; its SECOND sentence carries no "here's how" of its own and used to come
 *  out as "check, captured, threat" (walk 5, R17). */
const HOW_SENTENCES: ReadonlySet<string> = new Set(
  Object.values(FUNDAMENTAL_HOW).flatMap((how) => how.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean)),
);
export function isMethodSentence(sentence: string): boolean {
  const t = sentence.trim();
  if (HOW_SENTENCES.has(t)) return true;
  for (const stem of HOW_STEMS) if (t.includes(stem)) return true;
  return false;
}

/** The habit that prevents this fundamental next game, or null when the id is
 *  unknown (a caller holding a stale id gets silence, never a guess). */
export function fundamentalHow(id: FundamentalId, facts: Record<string, string | number> = {}): string | null {
  // The remedy follows the FACT (WO-STANDARD-01 D-5): a bishop buried by the
  // student's own KING (Ke2 in front of Bf1) is not fixed by pawn discipline.
  if (id === 'buried-own-bishop' && facts.blockerPiece && facts.blockerPiece !== 'pawn') {
    return `Before you park a ${facts.blockerPiece} in front of your own bishop, ask which diagonal it shuts. Develop the bishop first, or put the ${facts.blockerPiece} where the bishop still sees past it.`;
  }
  return FUNDAMENTAL_HOW[id] ?? null;
}

/** The full verdict for one attribution. `v` picks the stem variant. */
function fullVerdict(a: PrincipleAttribution, v: number): string {
  const f = a.facts;
  const e = a.evidence;
  const kick = e.moves.length ? listMoves(e.moves) : null;
  switch (a.id) {
    case 'same-piece-twice': {
      const s = [
        `That's the same ${f.piece} for the ${nth(Number(f.nth))} time while ${f.homeMinors} of your pieces still sit at home — every re-move hands the opponent a free turn.`,
        `The ${f.piece} moves again — its ${nth(Number(f.nth))} trip — with ${f.homeMinors} pieces still undeveloped. In the opening, a new move wants a new piece.`,
        `Your ${f.piece} is on its ${nth(Number(f.nth))} move and ${f.homeMinors} pieces haven't left the back rank. That's a tempo spent on a piece that already had its turn.`,
      ];
      return s[v % s.length];
    }
    case 'tempo-handed': {
      const s = [
        `That hands them a tempo: ${kick} comes with a threat on your ${f.target}, and you have to spend a move answering it instead of building.`,
        `Tempo lost — after this they get ${kick} for free, hitting your ${f.target}, and your next move is forced to react.`,
        `The cost is time: ${kick} is now on for them, hitting your ${f.target}, and you would spend your next move on the same piece again.`,
      ];
      return s[v % s.length];
    }
    case 'space-conceded': {
      const s = [
        `You gave up ${f.square}: with the piece gone, ${f.push} plants a pawn there for free and the centre is theirs.`,
        `That concedes the ${f.square} square — ${f.push} can now sit there and nothing of yours can take it back.`,
        `Space handed over: stepping off ${f.square} lets ${f.push} claim it, and a pawn that far up cramps everything behind it.`,
      ];
      return s[v % s.length];
    }
    case 'neglected-development': {
      const s = [
        `Development first: ${f.homeMinors} of your pieces are still at home, and ${f.better} brought one out instead.`,
        `Pieces before pawns — with ${f.homeMinors} still undeveloped, this was the moment for ${f.better}.`,
        `That's a move that develops nothing while ${f.homeMinors} pieces wait at home; ${f.better} puts one to work.`,
      ];
      return s[v % s.length];
    }
    case 'early-queen-sortie': {
      const s = [
        `The queen came out too early: on ${f.square} she's a target, and ${f.kick} develops a piece by hitting her.`,
        `An early queen sortie — ${f.kick} attacks her on ${f.square} with a developing move, so they gain time for free.`,
        `Queen before the pieces: ${f.kick} kicks her off ${f.square} and every tempo she spends running is theirs.`,
      ];
      return s[v % s.length];
    }
    case 'king-left-in-centre': {
      if (f.walked) {
        // The king WALKED (D-5): the loss is castling itself, not a punish.
        const w = [
          `Stepping the king to ${f.walked} throws castling away for good — ${f.better} keeps him home and the option open.`,
          `The king on ${f.walked} can never castle now; ${f.better} was the move, and the king stays put until the rook comes across.`,
          `A king walk to ${f.walked} costs the one move that tucks him away — play ${f.better} and castle when it's time.`,
        ];
        return w[v % w.length];
      }
      const s = [
        `The king is still in the centre and castling was there — now ${f.punish} lands while he's exposed.`,
        `Castle first: leaving the king in the middle lets ${f.punish} come with the king still on its file.`,
        `That leaves the king uncastled one move too long, and ${f.punish} arrives before he gets to safety.`,
      ];
      return s[v % s.length];
    }
    case 'greedy-pawn-grab': {
      const s = [
        `The pawn on ${f.pawn} was poisoned: taking it costs time, and ${f.punish} collects it straight away.`,
        `A pawn grab with the pieces still at home — ${f.punish} answers, and the pawn isn't worth the tempo.`,
        `Greedy: the ${f.pawn} pawn buys you nothing but ${f.punish}, and you're behind in development for it.`,
      ];
      return s[v % s.length];
    }
    case 'early-edge-pawns': {
      const s = [
        `An edge pawn this early does nothing for the centre — ${f.better} fights for it instead.`,
        `The ${f.pawn} push spends a tempo on the rim while the centre is still up for grabs; ${f.better} was the move.`,
        `Edge pawns wait: with the centre unresolved, ${f.better} is where the tempo belongs.`,
      ];
      return s[v % s.length];
    }
    case 'knights-before-bishops': {
      const s = [
        `Both bishops are committed before a single knight — and ${f.kick} hits the one on ${f.square} with gain.`,
        `Knights before bishops: the bishop on ${f.square} gives them a target, and ${f.kick} takes it with tempo.`,
        `The bishops declared their squares too soon; ${f.kick} kicks the one on ${f.square} for free.`,
      ];
      return s[v % s.length];
    }
    case 'buried-own-bishop': {
      const s = [
        `That buries your own bishop: with ${f.blocker} in the way, the bishop on ${f.bishop} has nowhere to go.`,
        `Your bishop on ${f.bishop} is shut in behind ${f.blocker} — a piece that can't move is a piece you don't have.`,
        `The bishop on ${f.bishop} loses its diagonal to ${f.blocker}; keep your own pieces breathing.`,
      ];
      return s[v % s.length];
    }
    case 'premature-centre-break': {
      const s = [
        `A centre break ${f.reason} is premature — ${f.punish} opens it while you're not ready.`,
        `Open the centre only when you're ready: ${f.reason}, and ${f.punish} punishes the push on ${f.pawn}.`,
        `The ${f.pawn} break comes too soon — ${f.reason} — and ${f.punish} is the bill.`,
      ];
      return s[v % s.length];
    }
    case 'knight-to-the-rim': {
      const s = [
        `A knight on the rim is dim: on ${f.square} it covers little, and ${f.kick} drives it back anyway.`,
        `The knight on ${f.square} is on the edge of the board — ${f.kick} kicks it, and it never did anything there.`,
        `Knights belong in the centre; on ${f.square} this one gets hit by ${f.kick} for nothing.`,
      ];
      return s[v % s.length];
    }
    case 'loose-piece': {
      const s = [
        `Loose pieces drop off: the ${f.piece} on ${f.square} is left hanging, and ${kick ?? 'the capture'} just takes it.`,
        `That leaves the ${f.piece} on ${f.square} undefended — ${kick ?? 'a capture'} wins it outright.`,
        `The ${f.piece} on ${f.square} hangs after this; ${kick ?? 'taking it'} is free material.`,
      ];
      return s[v % s.length];
    }
    case 'ignored-threat': {
      const s = [
        `Their threat first: the ${f.piece} on ${f.square} was already attacked, and this move doesn't deal with it — ${kick ?? 'the capture'} wins it.`,
        `The ${f.piece} on ${f.square} was hanging before you moved, and it's still hanging after; ${kick ?? 'they take it'} next.`,
        `Answer the threat before your own plan — the ${f.piece} on ${f.square} stays en prise and ${kick ?? 'the capture'} collects.`,
      ];
      return s[v % s.length];
    }
    case 'passive-when-forcing-existed': {
      const s = [
        `Checks, captures, threats — there was a forcing move here: ${f.better} wins by force, and this quiet move lets it go.`,
        `A forcing win was on the board — ${f.better} — and a quiet move walked past it.`,
        `Always run the forcing moves first: ${f.better} was decisive, and this doesn't force anything.`,
      ];
      return s[v % s.length];
    }
    case 'weakened-king-shield': {
      const s = [
        `That loosens the shelter in front of your king on ${f.king}: the ${f.pawn} pawn moved, and ${f.punish} comes through the gap.`,
        `Pawns in front of the king move only for a reason — this one opens a line, and ${f.punish} uses it.`,
        `The king on ${f.king} is airier for it: ${f.punish} lands where the ${f.pawn} pawn used to guard.`,
      ];
      return s[v % s.length];
    }
    case 'created-pawn-weakness': {
      const s = [
        `That creates a weakness: no pawn beside ${f.pawn} can defend it now, and it becomes a target.`,
        `Pawns don't move backwards — the pawn on ${f.pawn} is now a weakness they can pile on.`,
        `A structural cost: ${f.pawn} is a weak pawn now.`,
      ];
      return s[v % s.length];
    }
    case 'overextended-pawn': {
      const s = [
        `The pawn on ${f.pawn} is overextended — nothing supports it, and it's a target the moment they look at it.`,
        `A pawn advanced past its support: ${f.pawn} has no neighbour behind it and can be attacked for free.`,
        `Too far, too soon: the pawn on ${f.pawn} stands alone and they win it or tie you to defending it.`,
      ];
      return s[v % s.length];
    }
    case 'traded-active-for-passive': {
      const s = [
        `That trades your active ${f.piece} for their passive one${f.kind === 'bishop pair' ? ' and hands over the bishop pair' : ''} — the wrong side of the exchange.`,
        `Trade your worst piece for their best, not the reverse: your ${f.piece} was doing more than the piece it took.`,
        `An exchange that improves them: ${f.kind === 'bishop pair' ? 'they keep both bishops and you don\'t' : `your ${f.piece} was the better piece`}.`,
      ];
      return s[v % s.length];
    }
    case 'wrong-trade-for-material': {
      const s = f.situation === 'ahead' ? [
        `You're ahead in material — trade pieces and the win gets simpler; ${f.better} does exactly that.`,
        `When you're up, every piece off the board brings the win closer: ${f.better} was the trade to make.`,
        `Ahead means simplify — ${f.better} trades pieces and drains their counterplay.`,
      ] : [
        `You're behind in material — trading pieces takes your chances with them; ${f.better} keeps them on.`,
        `When you're down, keep the pieces and trade pawns: ${f.better} holds the tension instead of swapping.`,
        `Behind means complicate — this trade simplifies toward a lost ending; ${f.better} doesn't.`,
      ];
      return s[v % s.length];
    }
    case 'worst-piece-unimproved': {
      const s = [
        `Improve your worst piece: the ${f.piece} on ${f.square} is doing the least, and ${f.better} gives it a job.`,
        `The ${f.piece} on ${f.square} is your least active piece — ${f.better} brings it into the game.`,
        `Find the piece doing nothing and fix it: the ${f.piece} on ${f.square}, via ${f.better}.`,
      ];
      return s[v % s.length];
    }
    case 'rook-ignored-open-file': {
      const s = [
        `Rooks belong on open files: the ${f.file}-file was open and ${f.better} takes it — now they get there first.`,
        `The open ${f.file}-file was yours for ${f.better}; leave it and they occupy it.`,
        `An open file is a highway — ${f.better} puts a rook on the ${f.file}-file before they do.`,
      ];
      return s[v % s.length];
    }
    case 'passive-king-endgame': {
      const s = [
        `In the endgame the king is a piece: yours on ${f.king} should be walking in — ${f.better} — and theirs is.`,
        `Activate the king: ${f.better} brings him toward the action while the other king is already marching.`,
        `Queens off, king on — ${f.better} was the move; the king on ${f.king} can't win this from the back.`,
      ];
      return s[v % s.length];
    }
    case 'mistimed-pawn-break': {
      const s = [
        `That break is mistimed: the pawn on ${f.pawn} goes forward and ${f.cost} — prepare it first.`,
        `Pushing ${f.pawn} before the pieces were ready: ${f.cost}, and a pawn never comes back.`,
        `A pawn break needs its pieces behind it — here ${f.cost} the moment it lands on ${f.pawn}.`,
      ];
      return s[v % s.length];
    }
    case 'rook-in-front-of-passer': {
      const s = [
        `Rooks belong behind passed pawns: on ${f.rook} yours sits in front of the pawn on ${f.pawn} — ${f.better} puts it behind.`,
        `In front of the passer the rook blocks its own pawn; ${f.better} goes behind it, where it pushes from strength.`,
        `The rook on ${f.rook} has the passed pawn on ${f.pawn} the wrong way round — behind it, with ${f.better}.`,
      ];
      return s[v % s.length];
    }
    case 'passed-pawn-neglected': {
      const s = [
        `Passed pawns must be pushed: your pawn on ${f.pawn} is passed and ${f.better} runs it — every move it waits, they build a blockade in front of it.`,
        `A passer is a rocket — ${f.better} launches the pawn on ${f.pawn}; leave it home and their pieces wall it in for free.`,
        `Push the passer: ${f.better} was the move, sending the pawn on ${f.pawn} down the board while the road is still open.`,
      ];
      return s[v % s.length];
    }
    case 'lost-the-opposition': {
      const s = [
        `Take the opposition: ${f.better} steps your king square-to-square with theirs and forces them to give way — the played move hands that back.`,
        `King-and-pawn endings turn on the opposition — ${f.better} seizes it; step aside and their king walks through instead.`,
        `Whoever has to move gives ground: ${f.better} keeps your king in the opposition, and this surrenders it.`,
      ];
      return s[v % s.length];
    }
    case 'passive-rook-endgame': {
      const s = [
        `An active rook is worth a pawn: ${f.better} swings yours to ${f.square} on the seventh, cutting their king and raking the pawns — the played move leaves it passive.`,
        `Rooks belong on the seventh — ${f.better} lands yours on ${f.square}; a passive rook just watches the ending go by.`,
        `The seventh rank is the rook's home in the endgame: ${f.better} takes it on ${f.square} while there's still something to attack.`,
      ];
      return s[v % s.length];
    }
    case 'kept-bad-bishop': {
      const s = [
        `Trade the bad bishop: yours on ${f.bishop} is shut in behind ${f.pawns} of your own pawns on its colour — ${f.better} frees or swaps it, and this leaves it buried.`,
        `A bishop hemmed in by its own pawns is barely a piece — ${f.better} gets the one on ${f.bishop} into the game.`,
        `Your worst piece is the bishop on ${f.bishop}, boxed in by pawns on its colour; ${f.better} improves it before anything else.`,
      ];
      return s[v % s.length];
    }
    case 'overvalued-attack': {
      const s = [
        `The attack was overvalued: ${f.move} commits material, but the engine shows the defence holding and coming out ahead — count the attackers before you invest.`,
        `That sacrifice doesn't land — after ${f.move} they consolidate and keep the extra material; the attack needed more pieces than you had on it.`,
        `You threw ${f.move} at the king before the attack was real — the defender untangles and you're just down material.`,
      ];
      return s[v % s.length];
    }
    case 'poisoned-pawn': {
      const s = [
        `That pawn was poisoned: your ${f.piece} takes on ${f.square} and then gets trapped — the engine wins it straight back, and it cost you far more than a pawn.`,
        `A pawn grab with the ${f.piece} that ends badly — chased down after ${f.square}, it's snared for more than it took.`,
        `Don't reach for that pawn: the ${f.piece} on ${f.square} is hunted and lost, and the pawn was never worth the piece.`,
      ];
      return s[v % s.length];
    }
    case 'capture-toward-centre': {
      const s = [
        `Recapture direction: taking toward the centre is the usual rule, but here ${f.better} was better — it opens the ${f.file}-file for your rook, and ${f.played} kept it closed.`,
        `Normally you capture toward the centre, yet this is the exception — ${f.better} clears the ${f.file}-file for a rook; ${f.played} leaves the file blocked.`,
        `The other capture was the one: ${f.better} opens the ${f.file}-file for your rook, worth more than the central pawn ${f.played} gained.`,
      ];
      return s[v % s.length];
    }
    case 'botched-conversion': {
      // Eval is spoken in POINTS, never "pawns" (David 2026-07-24). A big drop
      // (thrown mate / a rout) names no exact figure — "a winning position".
      const lost = Number(f.drop) >= 6 ? 'a winning position' : `about ${f.drop} point${Number(f.drop) === 1 ? '' : 's'} of your edge`;
      const s = [
        `You had it won and rushed — this move throws away ${lost}; ${f.better} keeps it simple and holds the advantage.`,
        `Convert with patience: you were clearly winning and this hands most of it back — ${f.better} was the calm move.`,
        `A won position needs care, not haste — this gives up ${lost}; ${f.better} stays on track.`,
      ];
      return s[v % s.length];
    }
    case 'calculation-depth': {
      const s = [
        `The move looks fine for two moves — then ${f.punish} lands. The line had to be followed ${f.depth} plies deep, and the calculation stopped early.`,
        `Nothing hangs right away, which is the trap: ${f.punish} arrives on their ${nth(Math.ceil(Number(f.depth) / 2))} move.`,
        `Shallow read: ${f.played} survives the first replies and breaks on ${f.punish}. That is a thread lost deeper in the line, not a piece left loose.`,
      ];
      return s[v % s.length];
    }
    case 'left-book-early': {
      const s = [
        `That leaves the book — ${f.opening} continues ${f.book} here, and ${f.played} steps out of every known line into a worse position.`,
        `Theory ends with ${f.played}: the book move is ${f.book} (${f.opening}), and this departure costs.`,
        `Out of book early. ${f.book} is what the games play here; ${f.played} is on nobody's line and the engine agrees it is worse.`,
      ];
      return s[v % s.length];
    }
    case 'no-plan': {
      const s = [
        `What was ${f.played} for? The position had a plan — ${f.plan} — and this move serves none of it; ${f.better} does.`,
        `A move without a purpose: the board wanted you to ${f.plan}, and ${f.played} works on something else entirely. ${f.better} was the plan move.`,
        `Name the target before you move. Here the target was to ${f.plan}; ${f.better} goes there, ${f.played} does not.`,
      ];
      return s[v % s.length];
    }
  }
}

/** The shortened repeat stem — the fundamental already spoke in full earlier
 *  in this game, so the walk accumulates instead of re-teaching. */
function shortVerdict(a: PrincipleAttribution): string {
  const f = a.facts;
  const e = a.evidence;
  switch (a.id) {
    case 'same-piece-twice': return `The same ${f.piece} again — its ${nth(Number(f.nth))} move.`;
    case 'tempo-handed': return `Another tempo handed over: ${listMoves(e.moves)} hits your ${f.target}.`;
    case 'space-conceded': return `Space given up again — ${f.push} takes ${f.square}.`;
    case 'neglected-development': return `Development again — ${f.homeMinors} pieces still at home.`;
    case 'early-queen-sortie': return `The early queen again — ${f.kick} hits her.`;
    case 'king-left-in-centre': return f.walked ? `The king walked again, to ${f.walked} — castling is gone.` : `The king still isn't castled, and ${f.punish} is on.`;
    case 'greedy-pawn-grab': return `Another pawn grab — ${f.punish} is the price.`;
    case 'early-edge-pawns': return `Another edge pawn while the centre waits.`;
    case 'knights-before-bishops': return `The bishop again before the knights — ${f.kick} kicks it.`;
    case 'buried-own-bishop': return `Your bishop on ${f.bishop} is shut in again.`;
    case 'premature-centre-break': return `Another early break on ${f.pawn}.`;
    case 'knight-to-the-rim': return `A knight on the rim again, on ${f.square}.`;
    case 'loose-piece': return `Loose piece again — the ${f.piece} on ${f.square} hangs.`;
    case 'ignored-threat': return `Their threat again — the ${f.piece} on ${f.square} is still hanging.`;
    case 'passive-when-forcing-existed': return `A forcing move missed again: ${f.better}.`;
    case 'weakened-king-shield': return `The king's shelter loosened again — ${f.punish}.`;
    case 'created-pawn-weakness': return `Another weak pawn, on ${f.pawn}.`;
    case 'overextended-pawn': return `Overextended again — the pawn on ${f.pawn}.`;
    case 'traded-active-for-passive': return `The wrong side of a trade again.`;
    case 'wrong-trade-for-material': return `The material rule again — ${f.better} was the trade.`;
    case 'worst-piece-unimproved': return `The worst piece still waits, on ${f.square}.`;
    case 'rook-ignored-open-file': return `The open ${f.file}-file, again unclaimed.`;
    case 'passive-king-endgame': return `The king still isn't walking in.`;
    case 'mistimed-pawn-break': return `Another mistimed push, on ${f.pawn}.`;
    case 'rook-in-front-of-passer': return `The rook in front of the passer again.`;
    case 'passed-pawn-neglected': return `The passer on ${f.pawn} still isn't running.`;
    case 'lost-the-opposition': return `The opposition given up again — ${f.better}.`;
    case 'passive-rook-endgame': return `The rook still passive — ${f.better} takes the seventh.`;
    case 'kept-bad-bishop': return `The bad bishop on ${f.bishop} still buried — ${f.better}.`;
    case 'overvalued-attack': return `The attack overvalued again — ${f.move} doesn't hold up.`;
    case 'poisoned-pawn': return `Another poisoned pawn — the ${f.piece} on ${f.square} is snared.`;
    case 'capture-toward-centre': return `The recapture again — ${f.better} opens the ${f.file}-file.`;
    case 'botched-conversion': return `Rushing the win again — ${f.better} was calmer.`;
    case 'calculation-depth': return `Stopped calculating early again — ${f.punish} was waiting deeper.`;
    case 'left-book-early': return `Out of book early again — ${f.book} was the line.`;
    case 'no-plan': return `Another move without a plan — ${f.better} served the position.`;
  }
}

export interface FundamentalVerdictOptions {
  /** 1-based ply of the move (stem rotation). */
  ply: number;
  /** Fundamentals already spoken in full this game — mutated as verdicts are issued. */
  seen: Set<FundamentalId>;
  /** The opponent's reply when the surface knows it (Learn after it lands,
   *  review from the next ply). REQUIRED, `null` when unknown: a hung piece
   *  they did not take is a MISS, never "is free material" (re-walk 1380,
   *  24.Bg5 f4 — said beside "you win the queen"). */
  replySan: string | null;
}

/**
 * The verdict line(s) that LEAD the beat, most important first. Up to three
 * attributions, each in full the first time it appears in the game and in a
 * short stem after that. Empty string when nothing attached.
 */
export function renderFundamentalVerdict(attrs: readonly PrincipleAttribution[], opts: FundamentalVerdictOptions): string {
  const parts: string[] = [];
  let hows = 0;
  attrs.forEach((a, i) => {
    const missed = missedPunish(a, opts.replySan);
    if (missed) { opts.seen.add(a.id); parts.push(missed); return; }
    const first = !opts.seen.has(a.id);
    opts.seen.add(a.id);
    if (!first) { parts.push(shortVerdict(a)); return; }
    // THE DIAGNOSIS, THEN THE HOW (David 2026-09-16: "The plan plus here's
    // how!!! The how is teaching!!"). Naming the flaw is half a lesson; the
    // procedure that stops it next game is the other half. Attached on the
    // FIRST appearance only — `opts.seen` is already the say-once ledger, so a
    // fundamental that recurs gets its short stem and never the lecture twice.
    // Not capped to one per ply: if two NEW fundamentals were both proved here,
    // the board earned both and the student hears both (G4.5). They spread
    // themselves out across the game because each can only fire once.
    const how = fundamentalHow(a.id, a.facts);
    parts.push(how ? `${fullVerdict(a, opts.ply + i)} ${HOW_STEMS[hows++ % HOW_STEMS.length]} ${how}` : fullVerdict(a, opts.ply + i));
  });
  return parts.join(' ');
}

/** A hung piece the reply did not take — said as a miss, in the past. */
function missedPunish(a: PrincipleAttribution, replySan: string | null): string | null {
  if (replySan === null) return null;
  if (a.id !== 'loose-piece' && a.id !== 'ignored-threat') return null;
  const cap = a.evidence.moves[0];
  const sq = a.facts.square;
  if (!cap || typeof sq !== 'string') return null;
  if (replySan.replace(/[+#]+$/, '').includes(`x${sq}`)) return null;
  return `That left your ${a.facts.piece} on ${sq} hanging to ${cap} — they missed it this time.`;
}

/** The engine-line corroboration, spoken as evidence after the verdict. Only
 *  when the persisted PV actually contains the punishing move. */
export function renderPvEvidence(attrs: readonly PrincipleAttribution[]): string | null {
  const withPv = attrs.find((a) => a.evidence.pvMoves.length > 0);
  if (!withPv) return null;
  return `In the engine's line it goes ${listMoves(withPv.evidence.pvMoves, ', ')} — exactly that.`;
}

const RECAP_NOUN: Record<FundamentalId, string> = {
  'same-piece-twice': 'moved the same piece twice',
  'tempo-handed': 'handed over a tempo',
  'space-conceded': 'gave up space in the centre',
  'neglected-development': 'neglected development',
  'early-queen-sortie': 'brought the queen out early',
  'king-left-in-centre': 'left the king in the centre',
  'greedy-pawn-grab': 'grabbed a pawn at the wrong time',
  'early-edge-pawns': 'pushed edge pawns early',
  'knights-before-bishops': 'committed the bishops before the knights',
  'buried-own-bishop': 'buried your own bishop',
  'premature-centre-break': 'opened the centre too early',
  'knight-to-the-rim': 'put a knight on the rim',
  'loose-piece': 'left a piece loose',
  'ignored-threat': 'ignored their threat',
  'passive-when-forcing-existed': 'missed a forcing move',
  'weakened-king-shield': 'loosened the king\'s shelter',
  'created-pawn-weakness': 'created a pawn weakness',
  'overextended-pawn': 'overextended a pawn',
  'traded-active-for-passive': 'traded the wrong piece',
  'wrong-trade-for-material': 'traded against the material situation',
  'worst-piece-unimproved': 'left your worst piece unimproved',
  'rook-ignored-open-file': 'ignored an open file',
  'passive-king-endgame': 'kept the king passive in the endgame',
  'mistimed-pawn-break': 'mistimed a pawn break',
  'rook-in-front-of-passer': 'put the rook in front of the passed pawn',
  'passed-pawn-neglected': 'left a passed pawn unpushed',
  'lost-the-opposition': 'gave up the opposition',
  'passive-rook-endgame': 'kept the rook passive',
  'kept-bad-bishop': 'kept a bad bishop',
  'overvalued-attack': 'overvalued the attack',
  'poisoned-pawn': 'took a poisoned pawn',
  'capture-toward-centre': 'recaptured the wrong way',
  'botched-conversion': 'rushed a winning position',
  'calculation-depth': 'stopped calculating too early',
  'left-book-early': 'left the book early',
  'no-plan': 'played without a plan',
};

/**
 * The end-of-game aggregate — the actual lesson (G.4): "three of your five
 * flagged moves handed over a tempo." Deterministic counts; the most frequent
 * fundamental leads, one runner-up at most. Null when nothing attached.
 */
export function renderFundamentalsRecap(perMove: readonly (readonly PrincipleAttribution[])[], flaggedCount: number): string | null {
  const counts = new Map<FundamentalId, number>();
  let movesWithOne = 0;
  for (const attrs of perMove) {
    if (attrs.length === 0) continue;
    movesWithOne += 1;
    for (const a of attrs) counts.set(a.id, (counts.get(a.id) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const ranked = [...counts.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
  const [topId, topN] = ranked[0];
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const w = (n: number) => words[n] ?? String(n);
  // "one of your one flagged move" — read off the live prod recap, 2026-09-17.
  // The x-of-y shape only reads as English while y is genuinely bigger than x.
  // When every flagged move shares the same fault there is no subset to name,
  // and the sentence should say THAT instead of dividing a number by itself.
  // A count is not a phrasing.
  const subject = ((): string | null => {
    if (flaggedCount <= 0) return null;
    if (flaggedCount === 1) return 'your one flagged move';
    if (topN >= flaggedCount) {
      return flaggedCount === 2 ? 'both of your flagged moves' : `all ${w(flaggedCount)} of your flagged moves`;
    }
    return `${w(topN)} of your ${w(flaggedCount)} flagged moves`;
  })();
  const lead = subject
    ? `The pattern: ${subject} ${RECAP_NOUN[topId]}.`
    : `The pattern: you ${RECAP_NOUN[topId]} ${w(topN)} time${topN === 1 ? '' : 's'}.`;
  const runner = ranked[1] && ranked[1][1] >= 2 ? ` Behind it, you ${RECAP_NOUN[ranked[1][0]]} ${w(ranked[1][1])} times.` : '';
  const close = movesWithOne >= 2 ? ' That is the one thing to carry into the next game.' : '';
  return `${lead}${runner}${close}`;
}
