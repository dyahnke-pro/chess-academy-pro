// fundamentalLessons — the "Learn this fundamental" TEACHING content, one short
// lesson per FundamentalId (David 2026-09-07: "1 and 2" → a per-fundamental Learn
// lesson, launched in the classroom without redirecting).
//
// G0/G3 contract: every word is authored CLASSICAL PRINCIPLE — the established,
// public-domain understanding (Capablanca's *Chess Fundamentals*, Lasker,
// Tarrasch), restated as clear teaching. NOT an LLM invention, NOT a claim about
// any specific board. The lesson `facts` are handed to the coach spine and voiced
// verbatim through `voiceFacts` in the DNA register (preferRaw) — the model only
// phrases; it decides nothing (the same chokepoint every grounded answer uses).
//
// Perspective (locked 2026-08-28): the student is "you/your", the opponent
// "they/their" — NEVER "we/our". Each lesson is self-contained: name the idea,
// why neglecting it costs, and the check to run before the move.
//
// `Record<FundamentalId, …>` so a NEW fundamental cannot silently ship without a
// lesson — TypeScript forces one here, same guarantee as the scorecard catalog.

import type { FundamentalId } from '../services/principleAttribution';

export interface FundamentalLesson {
  /** The teaching, voiced verbatim through the coach spine (DNA register). */
  facts: string;
  /** Resolvable grounding refs (concept ids from chess-concepts.json). */
  sources: string[];
}

/**
 * Distinctive phrasing that names ONE specific fundamental in a teaching ask —
 * so "teach me not moving the same piece twice" / "why are poisoned pawns bad" /
 * "explain the opposition" reach the right deep lesson. Ordered; the resolver
 * returns the FIRST match, so the more specific patterns come first where two
 * could overlap. Deliberately narrow — a bare mention on a live board must NOT
 * trip these (the caller also requires a teaching frame).
 */
const FUNDAMENTAL_MATCH: ReadonlyArray<readonly [FundamentalId, RegExp]> = [
  ['poisoned-pawn', /\bpoison(?:ed|ous)?\s+pawn/],
  ['same-piece-twice', /\bsame\s+piece\s+twice\b|\bmov(?:e|ing)\s+(?:the\s+)?same\s+piece\b|\bpiece\s+twice\b/],
  ['early-queen-sortie', /\bearly\s+queen\b|\bqueen\b[\s\w]{0,18}\bearly\b|\bqueen\s+sortie\b|\bbring(?:ing)?\s+(?:the\s+|my\s+)?queen\s+out\b/],
  ['knights-before-bishops', /\bknights?\s+before\s+bishops?\b|\bbishops?\s+before\s+knights?\b/],
  ['premature-centre-break', /\b(?:premature|early)\s+(?:cent(?:er|re)\s+)?break\b|\bbreak(?:ing)?\s+(?:the\s+|open\s+)?(?:the\s+)?cent(?:er|re)\s+(?:too\s+)?early\b/],
  ['early-edge-pawns', /\b(?:early\s+)?edge\s+pawns?\b|\brook[-\s]?pawns?\s+early\b|\bwing\s+pawns?\s+early\b/],
  ['neglected-development', /\bneglect(?:ing|ed)?\s+develop|\bnot\s+develop|\bfail(?:ing|ed)?\s+to\s+develop|\bfall(?:ing)?\s+behind\s+in\s+develop|\bdevelop(?:ment|ing)?\s+(?:my\s+)?pieces\b/],
  ['tempo-handed', /\bhand(?:ing|ed)?\s+(?:over\s+)?(?:a\s+)?tempo\b|\blos(?:e|ing)\s+(?:a\s+)?tempo\b|\bgiv(?:e|ing)\s+(?:up\s+|away\s+)?(?:a\s+)?tempo\b|\bwasting\s+tempo\b/],
  ['space-conceded', /\bconced(?:e|ing)\s+(?:the\s+)?(?:cent(?:er|re)|space)\b|\bgiv(?:e|ing)\s+(?:up\s+|away\s+)(?:the\s+)?(?:cent(?:er|re)|space)\b|\bgiving\s+up\s+space\b/],
  ['king-left-in-centre', /\bking\s+(?:stuck\s+|left\s+|caught\s+)?in\s+the\s+cent(?:er|re)\b|\buncastled\s+king\b|\bnot\s+castl|\bforget(?:ting)?\s+to\s+castle\b|\bwhen\s+(?:should\s+i\s+|do\s+i\s+|to\s+)castle\b|\bshould\s+i\s+castle\b|\bcastl(?:e|ing)\s+(?:early|late|in\s+time)\b/],
  ['greedy-pawn-grab', /\bgreedy\s+pawn\b|\bpawn\s+grab\b|\bgrab(?:bing)?\s+(?:a\s+)?pawn\b|\bpawn[-\s]?grab|\bpawn\s+hunt/],
  ['buried-own-bishop', /\bbur(?:y|ied|ying)\s+(?:(?:my|your|its|the)\s+)?(?:own\s+)?bishop\b|\bblock(?:ing|ed)?\s+(?:in\s+)?(?:(?:my|your)\s+)?(?:own\s+)?bishop\b|\bbad\s+bishop\s+behind\b/],
  ['knight-to-the-rim', /\bknight\s+on\s+the\s+rim\b|\brim\s+(?:is\s+)?dim\b|\bknight\s+(?:on|to)\s+the\s+edge\b/],
  ['worst-piece-unimproved', /\bworst\s+piece\b|\bimprov(?:e|ing)\s+(?:my\s+|your\s+)?(?:worst\s+)?piece\b|\bleast\s+active\s+piece\b|\bpassive\s+pieces?\b/],
  ['rook-ignored-open-file', /\bopen\s+files?\b|\brooks?\s+(?:on|to)\s+(?:the\s+)?(?:open\s+)?files?\b|\bignor(?:e|ing)\s+(?:an\s+|the\s+)?open\s+file\b/],
  ['kept-bad-bishop', /\bbad\s+bishop\b|\bgood\s+(?:bishop\s+)?(?:vs|versus|and)\s+bad\s+bishop\b|\btrad(?:e|ing)\s+(?:the\s+|my\s+)?bad\s+bishop\b/],
  ['traded-active-for-passive', /\btrad(?:e|ing)\s+(?:the\s+|my\s+)?(?:wrong|active|best|good)\s+piece\b|\bwrong\s+(?:piece\s+)?to\s+trade\b|\bwhich\s+piece\s+to\s+(?:trade|exchange)\b|\bbishop\s+pair\b/],
  ['weakened-king-shield', /\bking(?:'s)?\s+(?:pawn\s+)?(?:shield|shelter|cover|safety\s+pawns?)\b|\bpush(?:ing)?\s+pawns?\s+(?:in\s+front\s+of\s+|near\s+)(?:my\s+|the\s+)?king\b|\bweaken(?:ing)?\s+(?:my\s+|the\s+)?king\b/],
  ['created-pawn-weakness', /\bpawn\s+weakness(?:es)?\b|\bisolated\s+pawns?\b|\bdoubled\s+pawns?\b|\bweak\s+pawns?\b|\bcreat(?:e|ing)\s+(?:a\s+)?weakness\b/],
  ['overextended-pawn', /\bover[-\s]?extend(?:ed|ing)?\s+(?:a\s+)?pawns?\b|\bpush(?:ing)?\s+(?:a\s+)?pawn\s+too\s+far\b|\bpawn\s+too\s+far\b/],
  ['capture-toward-centre', /\bcaptur(?:e|ing)\s+toward|\brecaptur(?:e|ing)\s+(?:the\s+)?(?:right|wrong|correct)\s+way\b|\bwhich\s+way\s+to\s+(?:re)?capture\b|\brecaptur(?:e|ing)\s+toward\s+(?:the\s+)?cent(?:er|re)\b/],
  ['loose-piece', /\bloose\s+pieces?\b|\bundefended\s+pieces?\b|\bhang(?:ing)?\s+(?:a\s+)?pieces?\b|\bleav(?:e|ing)\s+(?:a\s+)?piece\s+(?:loose|hanging|undefended)\b/],
  ['ignored-threat', /\bignor(?:e|ing)\s+(?:a\s+|the\s+|their\s+)?threats?\b|\bmiss(?:ing|ed)?\s+(?:a\s+|the\s+|their\s+)?threats?\b|\bopponent(?:'s)?\s+threats?\b/],
  ['passive-when-forcing-existed', /\bforcing\s+moves?\b|\bchecks?\s*,?\s*captures?\s*,?\s*(?:and\s+)?threats?\b|\bcalculat(?:e|ing|ion)\b/],
  ['overvalued-attack', /\bovervalu(?:e|ing|ed)\s+(?:the\s+|my\s+|an\s+)?attack\b|\bunsound\s+(?:attack|sacrifice|sac)\b|\bis\s+(?:my\s+|the\s+|this\s+)?(?:attack|sacrifice|sac)\s+sound\b|\bcount(?:ing)?\s+attackers?\b|\battackers?\s+(?:and|vs|versus)\s+defenders?\b/],
  ['wrong-trade-for-material', /\bwrong\s+trade\s+for\s+(?:the\s+)?material\b|\btrad(?:e|ing)\s+for\s+(?:the\s+)?material\b|\bwhen\s+to\s+trade\b|\btrad(?:e|ing)\s+when\s+(?:ahead|behind|up|down)\b|\btrad(?:e|ing)\s+pieces\s+(?:when\s+)?(?:ahead|behind|up|down|winning|losing)\b|\bsimplif(?:y|ying)\s+when\b/],
  ['passive-king-endgame', /\b(?:active|passive)\s+king\b|\bking\s+in\s+the\s+end(?:game|ing)\b|\bactivat(?:e|ing)\s+(?:my\s+|the\s+)?king\b|\bking\s+(?:is\s+)?a\s+(?:fighting\s+)?piece\b/],
  ['mistimed-pawn-break', /\bpawn\s+breaks?\b|\bmistim(?:e|ed|ing)\s+(?:a\s+)?(?:pawn\s+)?break\b|\btim(?:e|ing)\s+(?:a\s+|the\s+)?(?:pawn\s+)?break\b/],
  ['rook-in-front-of-passer', /\brook\s+(?:in\s+front\s+of|behind)\s+(?:the\s+|a\s+)?pass(?:ed|er)\b|\brooks?\s+(?:and|behind)\s+pass(?:ed|er)/],
  ['passed-pawn-neglected', /\bpassed\s+pawns?\b|\bpassers?\b|\bpush(?:ing)?\s+(?:the\s+|a\s+)?pass(?:ed|er)/],
  ['lost-the-opposition', /\bopposition\b/],
  ['passive-rook-endgame', /\bactive\s+rooks?\b|\bpassive\s+rooks?\b|\brooks?\s+(?:on|to)\s+the\s+seventh\b|\brook\s+ending?s?\b|\brook\s+endgames?\b/],
  ['botched-conversion', /\bconvert(?:ing)?\s+(?:a\s+)?(?:won|winning)\b|\brush(?:ing)?\s+(?:a\s+|the\s+)?(?:won|winning|win)\b|\bbotch(?:ing|ed)?\s+(?:a\s+)?(?:won|win)\b|\bthrow(?:ing)?\s+(?:away\s+)?(?:a\s+)?(?:won|winning|win)\b|\bconvert(?:ing)?\s+(?:an\s+)?advantage\b/],
];

/** The specific fundamental a teaching ask names, or null when none is named.
 *  Pure text — the CALLER decides it is a teaching ask (a bare mention on a live
 *  board must not deliver a lesson). */
export function resolveTaughtFundamental(ask: string | undefined): FundamentalId | null {
  if (!ask) return null;
  const t = ask.toLowerCase();
  for (const [id, re] of FUNDAMENTAL_MATCH) {
    if (re.test(t)) return id;
  }
  return null;
}

export const FUNDAMENTAL_LESSON: Record<FundamentalId, FundamentalLesson> = {
  // ── opening play ──
  'same-piece-twice': {
    facts:
      "In the opening you are racing to get every piece into the game. Moving the same piece twice while others still sit at home spends a whole turn on a piece that already had one — and hands the opponent a free move to develop. The rule is simple: a new move wants a new piece. Only move a developed piece again for a concrete reason you can name, like escaping a real attack.",
    sources: ['concept:pos-development', 'concept:pos-tempo'],
  },
  'tempo-handed': {
    facts:
      "A tempo is a single move's worth of time, and in the opening time is everything. You hand one over when your move lets the opponent develop a piece WITH a threat — they improve a piece and hit something of yours in the same move, so your next move is forced to react instead of build. Before you commit, ask what their reply gets to do: if it develops with an attack, the move was not free.",
    sources: ['concept:pos-tempo', 'concept:pos-development'],
  },
  'space-conceded': {
    facts:
      "A piece standing in the centre holds a square the opponent would love to occupy. Step it back without thinking and a pawn can plant itself on that square for nothing, cramping everything behind it — space you do not easily win back. Before a central piece retreats, name who takes the square next, and whether a pawn can sit there permanently.",
    sources: ['concept:pos-space', 'concept:pos-center'],
  },
  'neglected-development': {
    facts:
      "Development means getting your knights and bishops off the back rank toward the centre. Starting an attack, or pushing pawns, while pieces still sleep at home is fighting a battle a piece short. Bring out a new piece every move until they are all in the game — pieces before pawns, pieces before plans.",
    sources: ['concept:pos-development'],
  },
  'early-queen-sortie': {
    facts:
      "The queen is your most valuable piece, so the opponent develops WITH TEMPO by attacking her — every square she runs to buys them a free developing move. Bringing her out early feels active but usually just gives the opponent targets. Develop the knights and bishops first; the queen comes out once she has safe squares and a job.",
    sources: ['concept:pos-development', 'concept:pos-tempo'],
  },
  'king-left-in-centre': {
    facts:
      "A king in the centre is fine while the position is closed — and a disaster the moment it opens. Central files crack open, rooks and queens pour down them, and the king that never castled is the single most common way a game is lost. Castle before you open the centre: count the open central files, and if there is even one, the king moves to safety first.",
    sources: ['concept:pos-king-safety'],
  },
  'greedy-pawn-grab': {
    facts:
      "A pawn is worth about three moves of development. Grabbing one in the opening — especially with a piece that then has to scramble home — often costs you exactly that much time, and the opponent uses it to develop and attack. Price every pawn in tempo before you take it: if the grab costs three moves you needed, you paid full price for a pawn.",
    sources: ['concept:pos-development', 'concept:pos-tempo'],
  },
  'early-edge-pawns': {
    facts:
      "The opening is a fight for the centre, and an early rook-pawn or knight-pawn push on the edge does nothing to help you win it. It spends one of your tempi on the rim while the important squares are still up for grabs. Push edge pawns only for a concrete reason — luft, or to kick a piece; otherwise your tempo belongs in the centre.",
    sources: ['concept:pos-development', 'concept:pos-center'],
  },
  'knights-before-bishops': {
    facts:
      "Knights know their best squares early — they almost always belong on the third rank toward the centre — while a bishop's best diagonal often depends on how the pawns settle. Committing both bishops before a single knight declares your intentions too soon and gives the opponent targets to hit with tempo. As a guide, develop knights before bishops, and keep at least one bishop flexible.",
    sources: ['concept:pos-development'],
  },
  'premature-centre-break': {
    facts:
      "A pawn break in the centre opens lines — and lines cut both ways. Play it before your own king is safe and your pieces are ready, and you open the position for the better-developed side, which may be the opponent. Open the centre only when you are the one prepared for it: king castled, rooks connected, pieces aimed at the files that will open.",
    sources: ['concept:pos-center', 'concept:pos-king-safety'],
  },
  // ── development & activity ──
  'buried-own-bishop': {
    facts:
      "A bishop's power is its long diagonal, and your own pawns can shut it off just as surely as the opponent's. Lock a pawn on the diagonal in front of your bishop and you have a piece that cannot breathe — effectively a piece down. Give your bishops open diagonals, and when a pawn move would bury one, look for another move first.",
    sources: ['concept:pos-development'],
  },
  'knight-to-the-rim': {
    facts:
      "A knight on the rim is dim — from the edge it controls at most four squares, against eight from the centre. Parked on the a- or h-file it does little and is easily driven back or shut out of the game. Route your knights toward central outposts, squares the opponent can no longer attack with a pawn, where they sit strong for the rest of the game.",
    sources: ['concept:pos-outpost', 'concept:pos-centralization'],
  },
  'worst-piece-unimproved': {
    facts:
      "When you have no forcing move, the best move is usually to improve your worst piece. Find the one doing the least — a knight on the rim, a bishop behind its pawns, a rook off any open file — and give it a job before you start anything. Chess is a team game: your position is only as strong as its most idle piece.",
    sources: ['concept:pos-development', 'concept:pos-centralization'],
  },
  'rook-ignored-open-file': {
    facts:
      "Rooks are long-range pieces that do nothing behind their own pawns and everything on an open file, where they rake the board and invade on the seventh rank. An open file with no rook on it is an unclaimed highway — and whoever grabs it first usually keeps it. When a file opens, put your rook on it before the opponent does.",
    sources: ['concept:pos-open-file'],
  },
  'kept-bad-bishop': {
    facts:
      "A bad bishop is one hemmed in by your own pawns fixed on its colour — it defends but barely attacks. Keeping it while your good pieces do the work is playing a piece short. Trade a bad bishop off, or free it by moving the pawns that block it; when choosing what to exchange, get rid of your worst piece, not your best.",
    sources: ['concept:pos-bishop-pair', 'concept:pawn-chain'],
  },
  'traded-active-for-passive': {
    facts:
      "Every trade improves one side more than the other. Swapping your active, well-placed piece for the opponent's passive one — or giving up the bishop pair for a knight without cause — hands them the better half of the deal. Before any exchange, ask which side it improves: trade your worst piece for their best, never the reverse.",
    sources: ['concept:pos-bishop-pair', 'concept:pos-development'],
  },
  // ── king safety ──
  'weakened-king-shield': {
    facts:
      "The pawns in front of your castled king are its shield, and pawns never move backward — so every push in front of the king opens a door that never closes. One careless advance can hand the opponent a file, a diagonal, or an outpost right next to your king. Move the pawns in front of your king only for a concrete, named reason.",
    sources: ['concept:pos-king-safety'],
  },
  // ── pawn structure ──
  'created-pawn-weakness': {
    facts:
      "Pawns are the only piece that never moves backward, so every pawn move you make is permanent — it gives up a square forever and can leave a pawn no other pawn can ever defend. Isolated and doubled pawns become long-term targets the opponent piles pieces against. Before every pawn push, name the square you surrender for good, and decide if the trade is worth it.",
    sources: ['concept:pawn-isolated', 'concept:pawn-doubled'],
  },
  'overextended-pawn': {
    facts:
      "A pawn advances safely only as far as its neighbours can support it. Push one too far, alone, and it becomes a weakness the opponent surrounds and wins — or ties your pieces down to defending. Before a pawn charges forward, find the pawn that will stand behind it; if there is none, the push waits.",
    sources: ['concept:pawn-isolated', 'concept:pos-space'],
  },
  'capture-toward-centre': {
    facts:
      "When you can recapture two ways, the usual rule is to take toward the centre, because a central pawn controls more and supports your play. But it is a guide, not a law: sometimes capturing AWAY from the centre is stronger because it opens a file for your rook, and an active rook is worth more than the extra central pawn. Weigh what each recapture opens before you choose.",
    sources: ['concept:pos-open-file', 'concept:pawn-doubled'],
  },
  'poisoned-pawn': {
    facts:
      "Some pawns are left hanging on purpose — bait. Grab one with a piece that then has no way home, and it gets chased down and trapped, costing you far more than the pawn was worth. Before you take a pawn with a piece, find its retreat: if every square home is cut off or covered, the pawn is poison and the piece is the price.",
    sources: ['concept:tac-trap'],
  },
  // ── tactics & threats ──
  'loose-piece': {
    facts:
      "Loose pieces drop off — an undefended piece is an invitation to a tactic, because it can be won by a fork, a pin, or a simple attack it has no answer to. Most combinations only work because something was left hanging. After you choose a move, check every piece you own for a defender; a piece worth keeping is a piece worth guarding.",
    sources: ['concept:tac-double-attack', 'concept:tac-fork'],
  },
  'ignored-threat': {
    facts:
      "Chess is a conversation: every move the opponent makes is trying to do something to you. Charging ahead with your own plan while their last move sets up a capture or a threat is how a winning position turns losing in one move. Their move first — before your plan, ask what the opponent's last move wants to do, and answer that before anything else.",
    sources: ['concept:pos-prophylaxis'],
  },
  'passive-when-forcing-existed': {
    facts:
      "Forcing moves — checks, captures, and threats — narrow the opponent's replies and are how tactics get delivered. Playing a quiet move when a forcing one wins lets the chance slip, often for good. Every single move, run the list in order for both sides: every check, every capture, every threat, before your hand commits to anything quiet.",
    sources: ['concept:tac-double-attack', 'concept:pos-initiative'],
  },
  'overvalued-attack': {
    facts:
      "An attack or a sacrifice only works if enough of your pieces reach the target before the defenders do. Throwing material at the king on a feeling — before the attack is really there — just leaves you down material once the defence untangles. Count the attackers against the defenders on the target square first: if their defenders arrive faster, the attack is a loan you cannot repay.",
    sources: ['concept:att-greek-gift', 'concept:tac-sacrifice'],
  },
  'wrong-trade-for-material': {
    facts:
      "The material count decides which trades help you. When you are AHEAD, trade pieces — every swap brings the simpler, winning endgame closer and drains the opponent's counterplay. When you are BEHIND, do the opposite: keep the pieces on, trade pawns, and keep the position complicated so you still have chances. Check the material before you swap.",
    sources: ['concept:pos-initiative'],
  },
  // ── endgame technique ──
  'passive-king-endgame': {
    facts:
      "Once the queens come off, the king stops hiding and becomes a fighting piece — often the strongest one. Leaving it passive on the back rank in an endgame is playing a piece down. March your king toward the centre and the pawns; the king that walks in first usually decides the ending.",
    sources: ['concept:end-key-squares', 'concept:end-opposition'],
  },
  'mistimed-pawn-break': {
    facts:
      "A pawn break in the endgame can make a passed pawn or open a road for your king — but timing is everything, and a pawn never comes back. Push it before your pieces are behind it and you just create a weakness the opponent rounds up. Prepare the break first: get the king and rook supporting it, then play it.",
    sources: ['concept:pawn-chain', 'concept:pos-space'],
  },
  'rook-in-front-of-passer': {
    facts:
      "Rooks belong BEHIND passed pawns — yours and theirs. Behind your own passer, the rook supports every advance and gains scope as the pawn runs. In front of it, the rook blocks its own pawn and has to move aside to let it go. Put the rook behind the passer, where it grows stronger as the pawn advances.",
    sources: ['concept:pawn-passed', 'concept:end-rook-7th'],
  },
  'passed-pawn-neglected': {
    facts:
      "A passed pawn — one no enemy pawn can stop — is a rocket, and its value is in advancing. Leave it sitting and the opponent walls it in with a piece for free, and a blockaded passer is just a target. Passed pawns must be pushed: run your passer while the road is open and make the defender spend pieces to stop it.",
    sources: ['concept:pawn-passed'],
  },
  'lost-the-opposition': {
    facts:
      "In king-and-pawn endings the opposition decides who queens. When the kings stand a square apart with nothing between them, whoever is forced to move first must give ground — so having the opposition means the OTHER king has to step aside. Take the opposition and you push the enemy king back; give it up and their king walks through yours.",
    sources: ['concept:end-opposition', 'concept:end-key-squares'],
  },
  'passive-rook-endgame': {
    facts:
      "In rook endings an active rook is worth about a pawn. A rook on the seventh rank cuts off the enemy king and eats pawns from behind; a rook sitting home on defence just watches the ending slip away. Activate your rook — the seventh rank, or behind a passer — even at the cost of a pawn; activity, not material, usually decides a rook ending.",
    sources: ['concept:end-rook-7th'],
  },
  'botched-conversion': {
    facts:
      "A won position is not won until it is finished, and the fastest way to throw one away is to rush. Grabbing more, or forcing matters, when a calm move keeps everything gives the opponent the swindle they were hoping for. Convert with patience: when you are winning, trade pieces toward a simple ending, remove counterplay, and take the safe move over the flashy one.",
    sources: ['concept:pos-initiative'],
  },
};
