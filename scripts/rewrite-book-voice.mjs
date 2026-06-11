#!/usr/bin/env node
/**
 * One-shot content rewrite: recast the "From the Books" reader prose into
 * a single, professional-tactical teaching voice — a seasoned general
 * handing down his wisdom — in place of the verbatim 1800s descriptive-
 * notation passages.
 *
 * What it does:
 *   - Rewrites `text` for every opening "book page" in
 *     src/data/opening-book-pages.json (dropping the junk pages: raw
 *     game-score dumps, cross-tables, player indexes, history asides).
 *   - Rewrites passages[0].text for every book-backed concept AND every
 *     opening passage in src/data/chess-concepts.json (the coach-grounding
 *     + middlegame/endgame reader source), keeping one rewritten passage.
 *
 * Schema is preserved (the chessConceptService tests assert source count,
 * concept names, truthy authors, totalTaggedPassages). Provenance metadata
 * (author / title / gutenbergId) is kept on each unit so the reader can
 * credit the classic each retelling draws on, and the Sources list at the
 * end of the reader cites all seven public-domain works.
 *
 * The works are all public domain (pre-1930 Project Gutenberg), and these
 * are original retellings of their mainstream ideas — no verbatim text
 * remains — so attribution is by a Sources page + light "drawn from" credit.
 *
 * Idempotent: run again and it simply re-applies the same text.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES_PATH = join(ROOT, 'src/data/opening-book-pages.json');
const CONCEPTS_PATH = join(ROOT, 'src/data/chess-concepts.json');

const wc = (s) => s.trim().split(/\s+/).filter(Boolean).length;

// ── Concept rewrites (the seasoned-general voice) ────────────────────────────
// Keyed by conceptId. Only the 25 book-backed concepts need a body; each
// keeps its existing passage[0] metadata, we only swap the text.
const CONCEPTS = {
  'pawn-isolated':
    "An isolated pawn is a soldier with no neighbours to cover him — and the enemy knows it. No friendly pawn can ever defend him, so pieces must be tied down to the duty, and a piece chained to a guard post is a piece absent from the battle. Blockade him first: plant a knight on the square directly in front, where no pawn can ever evict it. Then bring up the heavy pieces and besiege him from every side. But respect his teeth — while he stands, he grants his owner open lines and active pieces for the attack. Trade those attackers off, and what was a spearhead becomes a cripple you collect in the endgame.",
  'pawn-doubled':
    "Do not flinch at doubled pawns out of habit — that is an amateur's fear. Pawns doubled on a file are weak only when isolated, for then they cannot shield one another. Give them a neighbour on the adjacent file and they hold their ground against three healthy pawns opposite. Weigh the compensation, too: the very capture that doubled them often handed you an open file for the rooks and the bishop pair for the campaign. Judge a structure by what it enables, not by how it looks. The general who refuses a doubled pawn on principle surrenders weapons he never troubled to understand.",
  'pawn-passed':
    "A passed pawn is a runner with the road to promotion clear before him — no enemy pawn left to bar or capture him on his march. Wherever pawn-majorities face off, the side that can manufacture such a runner holds a trump for the endgame. Push him, and the enemy king must drop everything to give chase; while it chases, you strike elsewhere. Nurse him toward the eighth rank, where he threatens to become a queen, and that single threat will bend the whole position to your will. The masters put it plainly: a passed pawn must be pushed.",
  'pawn-backward':
    "A backward pawn is the laggard of the line — fallen behind his fellows, unable to advance without being lost, while the square in front of him, which no pawn of his can ever guard, becomes a fortress for the enemy. Fix him in place, occupy the hole before him with a knight, and pile the rooks on the half-open file. He can be defended only so many times before the attackers outnumber the guards. The lesson cuts both ways: never let your own pawns be left behind, and when the enemy leaves one, make his weakness the axis of your whole plan.",
  'pawn-chain':
    "Pawns linked along a diagonal form a chain — each soldier braced by the one behind, the whole line a wall slanting across the board. Do not batter the wall at its head, where it is strongest; strike at its base, the rearmost pawn, for he is the foundation and the rest cannot stand without him. Win the base and the chain crumbles. Guard your own base with equal care, and beware the trade that tears a hole in the pawns sheltering your king — a chain broken before your own fortress is an invitation the enemy will not decline.",
  'end-opposition':
    "In king-and-pawn endings the kings duel without their armies, and the opposition is the whole art of that duel. Stand your king squarely facing the enemy's, one square between them, and it is he who must give way — for the side forced to move first must yield ground. Seize the opposition and you seize the squares; seize the squares and the pawn promotes. This single idea governs nearly every pawn ending there is. Master it before all else, for the player who does not understand the opposition will draw won games and lose drawn ones, and never know why.",
  'end-lucena':
    "The Lucena is the cornerstone of rook endings — the position every master knows by heart, where you hold an extra pawn a step from queening and need only force it home against the enemy rook's checks. The technique, four centuries old and named for the Spaniard who first recorded it, is called building the bridge: march your king out from in front of the pawn, then interpose your own rook to block the checks, and the pawn walks in to promote. Learn this one position cold. It converts a winning endgame that would otherwise slip through your fingers to a draw.",
  'end-rook-7th':
    "A rook on the seventh rank is a raider behind enemy lines. From there it rakes the pawns still sitting on their home squares and pins the enemy king to the back rank, helpless to come to their rescue. Double a second rook beside it — pigs on the seventh, the masters call them — and the attack often outruns even an enemy passed pawn racing to queen. In the endgame the seventh rank is worth a pawn and sometimes the whole game. Seize it, hold it, and let your rooks devour what the enemy cannot defend.",
  'end-two-bishops':
    "Two bishops on an open board are a pair of long-range guns covering both colours of square between them — a battery no lone knight or single bishop can match. They sweep the diagonals, drive the enemy king where you wish, and shepherd a passed pawn home. The bishop pair is a small, lasting advantage: it does not win on its own, but it grinds. Open the position to give the bishops air, deny the enemy knight a secure outpost, and convert with patience. Two bishops reward the patient general as few advantages do.",
  'end-bishop-vs-knight':
    "Bishop and knight are equals on paper, but the ground decides which one rules. In an open position with pawns on both wings, the bishop is king — it strikes at a distance and shifts flanks in a single move, while the knight plods square by square and arrives a tempo late. Lock the position, fix the pawns on one colour, and the verdict flips: the knight reaches squares the bishop never can, and a bishop hemmed by its own pawns becomes a tall pawn. Read the pawns first — they tell you which piece is the master and which the servant.",
  'tac-fork':
    "A fork is one man threatening two — a single piece attacking two enemies at once, so that whichever you save, the other falls. The knight is the born forker, leaping over defenders to strike king and queen together, but pawns, bishops, rooks, even the queen herself can spear two targets in a turn. Hunt for them wherever enemy pieces share a knight's reach or a single line, and guard against them by keeping your valuables off the same fatal square. The fork wins material outright, and material, in the end, wins games.",
  'tac-pin':
    "A pin nails an enemy piece in place: it dares not move, for behind it stands something it must not expose — its king, in an absolute pin, or a greater piece in a relative one. A pinned piece is half a piece; it can neither defend nor attack while it stands frozen. So pile fresh attackers onto it — a pawn thrust, a second piece — and win it where it stands. And when the enemy pins you, break free before the second wave arrives: interpose, drive off the pinning piece, or unpin by counterattack. A pin endured too long is a piece already lost.",
  'tac-discovered':
    "A discovered attack is an ambush sprung by stepping aside. One piece moves out of the way and unmasks another behind it, so two threats arrive at once — the piece that moved makes its own, and the unveiled piece makes a second. When the moving piece gives check as it uncovers the attack, the enemy must answer the check and is powerless to save the other target. It is among the most violent weapons on the board: line up a rook or bishop behind a piece of your own that has a strong move to make, and the discovery wins what no single threat ever could.",
  'tac-double-attack':
    "The double attack is the engine of nearly every combination: make two threats in a single move and the enemy, who can answer only one, must concede the other. A fork is a double attack by one piece; a discovery, a double attack by two. But the idea runs broader than either — a quiet move that threatens mate on one wing and hangs a rook on the other wins as surely as any sacrifice. Train the eye to ask, on every move, what second thing this can also do. The player who threatens two things at once is the player who wins material at will.",
  'tac-decoy':
    "A decoy lures an enemy piece — or the king itself — onto a square where it can be punished. Offer a sacrifice it feels bound to accept, and the captured square becomes the scene of the execution: a fork, a check, a mating net that existed only once the victim stepped onto the fatal square. The decoy's cousin is the deflection — dragging a defender away from the post it must hold. Both rest on one truth: a piece is only as strong as where it stands, and the tactician chooses where the enemy stands for him.",
  'tac-sacrifice':
    "A sacrifice is an investment, not a gift. You surrender material to buy something the scoreboard cannot show — an exposed king, a decisive attack, a runner that queens, a fortress that cannot be broken. The sound sacrifice is calculated to its end, not hoped for; the general who throws away a knight on faith is merely throwing away a knight. Reckon the return before you commit: what lines open, what squares fall, what the enemy cannot prevent. When the gain is real and forced, give the material without a second thought. When it is only a feeling, hold your fire.",
  'pos-center':
    "The four central squares are the high ground of the chessboard, and he who commands them commands the battle. From the centre a piece radiates its power across the whole field; pressed to the edge it withers — a knight on the rim, the old maxim runs, is dim. No serious attack succeeds without first holding the centre, for the side that owns it can swing forces from wing to wing faster than the enemy can answer. Half the manoeuvres of the opening exist for this single end. Win the centre first; the attack comes after.",
  'pos-development':
    "Develop with speed and purpose: bring every piece into the fight before the first shot is fired, and waste not a tempo doing it. Move each man once, to a square where the enemy cannot harass him into moving twice; never march the same piece about the board while the others sleep at home. Knights and bishops out, king castled to safety, rooks joined on the open lines — that is an army ready for war. The player who develops fastest strikes first, and in the opening the first blow is often the last. A lead in development is a debt the enemy pays in blood.",
  'pos-king-safety':
    "Before you dream of attack, house your king. Castle early, keep the pawns before him unmoved and whole, and do not fling them forward chasing shadows — every such advance is a crack in the wall and a tempo stolen from development. A king caught in the centre while the lines tear open is a king already half-mated. Once yours is safe behind its rampart, turn the same gaze on his: where his shelter is broken, there you aim. Half of strategy is keeping your own king sound while you make a ruin of the enemy's.",
  'pos-initiative':
    "The initiative is the right to dictate — to make the threats while the enemy only parries. Hold it, and his every move is forced, spent answering you instead of building a plan of his own. Harass him without pause: press on a weakness, seize the open file, push where he is thin, and never grant him the free move that lets him organise. The initiative is fragile — one idle move and it passes to him — so press while you hold it. The attacker who lets his opponent breathe has already begun to lose.",
  'pos-tempo':
    "A tempo is a single move's worth of time, and in chess time is a currency you spend with every turn. To gain a tempo is to develop a piece while forcing the enemy to react; to lose one is to shuffle a piece twice, or push a pawn that aids no plan, while the opponent builds. Whole openings are won and lost by a single tempo — one extra move of development that lets the attack arrive before the defence is ready. Count your tempi as a quartermaster counts rations. The player who is always one move ahead is the player who is never too late.",
  'pos-open-file':
    "An open file is a highway for the rooks, and a rook is half-useless until it has one. Seize the file before the enemy does: double the rooks upon it and they bear down the board to the seventh rank and the heart of his camp. Where no file is open, make one — the timely pawn break that trades and clears a lane is often the deepest move in the position. In queen's-pawn openings especially, an extra pawn move is the price of admission to an open file. Pay it, take the file, and let the rooks do the work they were built for.",
  'pos-weak-squares':
    "A weak square is a hole no pawn can ever again defend — and the enemy will plant a knight there and never leave. Such squares are made by pawn moves, for every pawn that advances surrenders forever the squares it used to guard; advance them with thought. Hunt the holes in the enemy camp, above all those before his king, and manoeuvre a piece to occupy them — an outpost knight, fed by a pawn and immune to eviction, is worth more than its name. Guard your own structure the same way: the move that looks like progress often leaves a wound that never closes.",
  'att-kingside-storm':
    "When the kings castle on opposite wings, the game becomes a race of pawn-storms — each side hurls the pawns before the enemy king forward like infantry, careless of their own shelter because their king lives elsewhere. Speed is everything; the attack that lands one move sooner wins, and there is no time for caution. Open a file against his king and pour the rooks down it behind the pawns. But choose your wing with judgement — a storm launched a tempo too slow becomes a funeral for the one who launched it.",
  'att-greek-gift':
    "The Greek gift is the classic bishop sacrifice — bishop takes the pawn before the castled king, check, and the king is dragged into the open. If a knight can then leap to the king's flank with check and the queen swing across to join the hunt, the mate is often forced. But it is a gift to be examined, never given on faith: it works only when the defending pieces cannot scramble back in time, when your own forces stand ready to follow up. Count it to the end. When the lines are there, the sacrifice is crushing; when they are not, you have simply thrown away a bishop.",
};

// ── Opening leads (page 1) + optional second pages ───────────────────────────
// Keyed by openingId. `src` picks which public-domain classic the retelling
// is credited to (slug must exist in the bundle's `sources`).
const S = {
  cap: 'capablanca-chess-fundamentals',
  strat: 'edward-lasker-chess-strategy',
  staunton: 'staunton-blue-book-of-chess',
  candc: 'edward-lasker-chess-and-checkers',
  young: 'young-chess-generalship',
  edge: 'edge-paul-morphy-exploits',
  bird: 'bird-chess-history-reminiscences',
};

const OPENINGS = {
  'ruy-lopez': [
    { src: S.strat, text:
      "The Ruy Lopez is a siege, not a skirmish. Your bishop fixes its gaze on the c6-knight and refuses to release the tension until the terms favour you. When you push the a-pawn to a4, you are not grabbing ground — you are forcing the question: Black must lock the queenside with ...b4 or concede the file. But beware over-reaching. If he answers ...b4, a further pawn thrust is wasted breath, and worse, it leaves your own rook's pawn a mark for the long campaign of the endgame. Guard the bishop's diagonal as you would a mountain pass: should a black knight ever plant itself on f5, you cannot evict it but by the ugly g3 — a wound before your own king that never heals. Patience wins this opening. Restrain ...d5, bring up every piece, then open the kingside once the centre is yours." },
    { src: S.cap, text:
      "The deepest truth of the Ruy is that White plays for a small, lasting edge and a superior endgame, not a quick kill. By trading the bishop for the c6-knight at the right moment, White can saddle Black with a backward c-pawn and a half-open file to besiege it — a structural wound a master converts with patience over forty moves. So do not hurry. Build the broad pawn centre, restrain Black's freeing breaks, and keep the pieces coiled. Every champion of the modern age has been a master of exactly this: the slow accumulation of small advantages until the endgame quietly collects them. Learn to handle the Ruy and you have learned a great deal about chess itself." },
  ],
  'french-defence': [
    { src: S.strat, text:
      "The French is a defence for the patient and the stubborn. Black answers the king's pawn not by contesting the centre head-on but by building a wall — pawns at e6 and d5 — and inviting White to advance and overextend. The board divides along a diagonal: White takes the greater space and the attacking chances on the kingside, Black the counterattack on the queenside, aimed at the base of White's pawn chain. The one sorrow of the French is the queen's bishop, hemmed in behind its own pawns; solving that bishop is Black's lifelong problem in this opening. Strike the chain at its base with ...c5 and ...f6, and what looked a cramped position uncoils like a spring." },
    { src: S.strat, text:
      "Understand the French as a battle of pawn chains. White's chain slants upward from its base; Black does not assault its head but undermines its foundation, knowing that when the base falls the whole structure totters. White, for his part, must use the extra space to mass forces on the kingside before Black's counterstroke arrives — for this is a race of opposite ambitions on opposite wings. The side that strikes the base of the enemy chain first, with pieces already massed behind the break, wins the argument. Time your break; never launch it before the army stands behind it." },
  ],
  'caro-kann': [
    { src: S.strat, text:
      "The Caro-Kann is the French built on firmer ground. Black again challenges the centre with ...d5, but prepares it with ...c6 instead of ...e6 — and so keeps the diagonal open for the queen's bishop, the very piece the French leaves entombed. That single difference buys Black a sound, solid game with no chronic weakness, at the cost of a tempo. It is the choice of the player who would sooner suffer a small disadvantage in space than carry a lasting one in structure. Develop the light bishop outside the pawn chain before you close it, weather White's spatial pressure, and steer for an endgame where a flawless structure tells." },
    { src: S.strat, text:
      "The Caro's whole philosophy is structure over speed. By preparing ...d5 with the modest ...c6, Black accepts a tempo's delay in return for a camp with no organic weakness and a healthy light-squared bishop developed before the centre closes. Against White's space the plan is endurance: trade off the attackers, blunt the initiative, and head for an endgame where a sound house outlasts a furious siege. This is why the Caro is the weapon of patient, technically minded players — it concedes the early initiative on purpose, trusting that good structure has the last word. Develop the bishop, hold the centre, and play for the long game." },
  ],
  'petrov-defence': [
    { src: S.staunton, text:
      "The Petroff answers aggression with symmetry: where White attacks the king's pawn, Black does not defend it but counterattacks White's in turn. The result is one of the soundest, most equalising defences in all of chess — the choice of the disciplined player content to neutralise White's first-move edge and play for the long, level middlegame. Do not mistake its calm for passivity; behind the symmetry lie sharp traps for the careless, and Black must know the precise retreats that hold the balance. The Petroff is a fortress, not a battering ram — and against an impatient opponent, an unbreakable one." },
  ],
  'two-knights-defence': [
    { src: S.strat, text:
      "The Two Knights is the weapon of the fighter — Black invites White's sharpest tries and answers a pawn-grab with a storm of activity. Where a quieter defence plays for equality, this one plays for the initiative, often offering a pawn to seize the open lines and chase the enemy king before it can castle. It is theory-heavy and double-edged, no place for the faint-hearted. But the player who knows the lines cold gets exactly the kind of game where preparation and nerve decide: open, tactical, and unforgiving. Know your forced sequences to the move, and let the activity do the talking." },
  ],
  'four-knights-game': [
    { src: S.cap, text:
      "The Four Knights is the most natural opening in chess — both sides bring the knights to their best squares and the position breathes symmetry and good sense. For generations it was dismissed as drawish, fit only for a quiet day. The modern verdict is kinder: behind the calm surface lie real plans, and one in particular rewards study — to manoeuvre a knight to the f5 outpost, pry open the f-file with a pawn break, and turn a placid centre into a kingside attack. Develop soundly, castle, then choose a plan with purpose. Even the quietest opening rewards the player who knows what he is building toward." },
  ],
  'italian-game': [
    { src: S.cap, text:
      "The Italian Game is the oldest road in chess, and it still leads to good country. Bishop to c4 trains its sights on f7, the softest point in the enemy camp before the king has castled. The modern handling is the quiet one — a slow build with the pawn on d3, the pieces brought up patiently, the central break held in reserve until the army is ready. Do not be deceived by the calm: from this slow centre grows a lasting initiative, and many a quiet Italian has ended in a furious assault on the castled king. Develop with aim, keep the eye fixed on f7, and let the pressure build." },
  ],
  'vienna-game': [
    { src: S.strat, text:
      "The Vienna is the King's Gambit's patient cousin — White develops the queen's knight first, keeps the f-pawn thrust in reserve, and asks Black to commit before the storm breaks. It can settle into quiet positional play or erupt into a gambit attack, and that flexibility is its charm: White chooses the weather. Hold the f4-break in hand like a sheathed blade, develop with a plan, and draw it only when Black's setup offers the most return. Against the unprepared it is a trap; against the well-booked it is a sound, flexible system that keeps the first move's edge." },
  ],
  'kings-gambit': [
    { src: S.staunton, text:
      "The King's Gambit is the most romantic opening in chess — White offers a pawn on the second move to rip open the f-file and hurl every piece at the enemy king. For two centuries it was the proving ground of attacking genius. Modern defence has tamed its wildest claims, but in a practical game it remains a loaded pistol: Black must defend with precision or be swept from the board. The price is real — a pawn, and a weakened king of one's own — so this is a wager, not a free lunch. Bring the rooks to the open file and attack before the debt comes due. Fortune favours the bold here, but only the bold who calculate." },
    { src: S.staunton, text:
      "The logic of the King's Gambit is brutal and clear: give a pawn to open the f-file, post the bishop on the diagonal that points at f7, castle the rook into the attack, and reach the enemy king before he reaches safety. Every tempo is mortgaged to the assault, so there is no turning back — a King's Gambit played half-heartedly is merely a pawn down. Black's defence rests on giving the pawn back at the right moment to blunt the attack and reach an endgame where the extra structure tells. So it is a duel of clocks: White must break through before the storm spends itself; Black must survive the first wave and consolidate." },
  ],
  'evans-gambit': [
    { src: S.staunton, text:
      "The Evans Gambit, the invention of a Welsh sea-captain in 1830, is aggression distilled — White flings a wing pawn to wrench the enemy bishop offside, then seizes the centre with tempo and bears down on f7 before Black can draw breath. For a generation it crushed all comers; the masters of the romantic age wielded it like a sabre. Black may decline it, or hand the pawn back for safety, but accept it greedily and the initiative becomes a torrent. Take the centre, develop with threats, and do not pause to count pawns while the enemy king stands in the open. This is a gambit for the player who would rather attack than eat." },
  ],
  'philidor-defence': [
    { src: S.strat, text:
      "The Philidor is solid and cramped — Black props up the king's pawn with the modest ...d6 rather than a knight, choosing safety and a sound structure over space. It carries the name of the greatest player of the eighteenth century, who taught that the pawns are the soul of chess. Its danger is passivity: handled carelessly, Black is simply squeezed for room and never breathes. Handled well, it is a tough nut — a coiled defensive setup that invites White to overreach and then breaks free with a timely central thrust. Develop patiently, keep the position sound, and wait for the overconfident attacker to hand you the counterstroke." },
  ],
  'queens-gambit': [
    { src: S.candc, text:
      "The Queen's Gambit is no true gambit at all — the offered c-pawn cannot be safely held, and White knows it. The real aim is to lure Black's d-pawn away from the centre, win a free hand in development, and command the greater space. It is the most respected of all queen's-pawn openings, the battleground of world championships, precisely because its ideas are deep and lasting rather than tactical fireworks. Decline it soundly, free the cramped queen's bishop — Black's eternal task in these structures — and contest the centre with ...c5 once the pieces stand ready. This is positional chess at its purest: space, structure, and the slow squeeze." },
    { src: S.cap, text:
      "The heart of the Queen's Gambit is the fight for the open file and the freeing break. White, holding the centre and the greater space, often turns to the minority attack — pushing the b-pawn forward on the queenside to force a trade that leaves Black a weak, backward pawn to besiege for the rest of the game. Black's salvation is counterplay in the centre: the breaks ...c5 and ...e5, prepared with care, that free the position and give the cramped pieces air before the squeeze turns fatal. So the struggle is plain — White grinds on the wing, Black breaks in the centre. Whoever reaches his plan a move sooner writes the story of the game." },
  ],
  'qgd': [
    { src: S.cap, text:
      "The Queen's Gambit Declined is the bedrock of classical defence — Black braces the centre with ...e6, declines the offered pawn, and builds a sound, slightly cramped position with no weaknesses to attack. The price, as ever in these structures, is the queen's bishop shut behind the e6-pawn; freeing it is the whole strategic struggle. White enjoys the greater space and presses with the minority attack — advancing the queenside pawns to manufacture a weakness in Black's camp — while Black seeks the freeing breaks ...c5 or ...e5. It is the most reliable answer to the queen's pawn there is: hard to break, deep to master, the choice of champions for a hundred years." },
    { src: S.cap, text:
      "In the Declined, everything turns on a single piece: Black's queen's bishop, walled in behind the e6-pawn from the first moves. The whole middlegame is the campaign to set it free — by ...dxc4 and ...e5, by the manoeuvre ...b6 and ...Bb7 onto the long diagonal, or by trading it off at the first clean chance. Solve the bishop and Black stands fully equal; fail, and he is condemned to defend a cramped position a piece short of his real strength. White, meanwhile, presses exactly where Black is slow. Grasp this one strategic thread and you understand the QGD better than the man who has memorised twenty moves of theory." },
  ],
  'dutch-defence': [
    { src: S.strat, text:
      "The Dutch is Black's fighting answer to the queen's pawn — ...f5 on the first move, staking a claim to the e4-square and the kingside, refusing the symmetrical quiet White invites. It is double-edged by nature: the f-pawn's advance grants Black attacking chances and a foothold in the centre, but it loosens the king's own shelter, and White may give a pawn early to blast the position open. Choose a setup — the solid Stonewall, or the flexible Leningrad with its fianchettoed bishop — and commit to the kingside ambitions it implies. The Dutch rewards the player who wants to attack with the black pieces, and punishes the one who forgets the cost to his own king." },
  ],
  'old-indian-defence': [
    { src: S.candc, text:
      "The Old Indian is the patient elder of the king's-pawn-d6 defences — Black sets up a solid, modest structure with ...d6 and ...e5, content to cede the centre for a time and strike back later. It is the conservative cousin of the King's Indian, trading that opening's fierce kingside storms for sound, flexible, low-risk development. The plan is restraint, then rupture: complete the setup, choose the right moment for ...e5 or ...c5, and uncoil against an opponent who has overextended in the broad centre you allowed him. It asks for patience and a cool head, and rewards both." },
  ],
  'reti-opening': [
    { src: S.strat, text:
      "The Réti is the hypermodern creed in action — White declines to plant pawns in the centre at once and instead besieges it from afar, fianchettoing the bishop and inviting Black to occupy the middle so it can be undermined and attacked. It carries the name of the master who, a century ago, overturned the old dogma that the centre must be seized by pawns. Flexible and transpositional, it can become an English, a Catalan, or a king's-pawn-less squeeze. Play it as a war of restraint: let the enemy advance, strike at his centre with pawn and bishop, and win the ground he overreached to take. Subtlety, not brute force, is the weapon here." },
  ],
  'scandinavian-defence': [
    { src: S.strat, text:
      "The Scandinavian is the most direct defence there is — Black challenges the king's pawn at once with ...d5, trades it off, and brings the queen into the open early. The old objection is that the queen, recaptured on d5, is chased about and loses time; the modern answer is that she retreats to a safe, useful post and Black emerges with a sound, simple structure and an easily developed bishop. It is a practical weapon — little theory to memorise, the same clear plans against everything. Develop with tempo, tuck the queen away, and play a solid game free of the cramped bishop that plagues its French and Caro cousins." },
  ],
};

function loadJson(p) { return JSON.parse(readFileSync(p, 'utf8')); }
function srcMeta(bundleSources, slug) {
  const s = bundleSources.find((x) => x.slug === slug);
  if (!s) throw new Error(`unknown source slug: ${slug}`);
  return s;
}

// ── Rewrite opening-book-pages.json ──────────────────────────────────────────
const pagesBundle = loadJson(PAGES_PATH);
let pageCount = 0;
for (const [openingId, pages] of Object.entries(OPENINGS)) {
  // Only openings that actually have a reader page section in this file.
  if (!Object.prototype.hasOwnProperty.call(pagesBundle.pages, openingId)) continue;
  pagesBundle.pages[openingId] = pages.map(({ src, text }) => {
    const m = srcMeta(pagesBundle.sources, src);
    return {
      bookSlug: m.slug,
      bookTitle: m.title,
      author: m.author,
      gutenbergId: m.gutenbergId,
      chapter: null,
      section: null,
      text,
      wordCount: wc(text),
    };
  });
  pageCount += pages.length;
}
pagesBundle.generatedAt = new Date().toISOString();
writeFileSync(PAGES_PATH, JSON.stringify(pagesBundle, null, 2) + '\n');

// ── Rewrite chess-concepts.json ──────────────────────────────────────────────
const conceptsBundle = loadJson(CONCEPTS_PATH);

// Concepts: swap passages[0].text, keep its provenance, keep one passage.
let conceptCount = 0;
for (const c of conceptsBundle.concepts) {
  const newText = CONCEPTS[c.id];
  if (!newText) continue; // fallback-only concept; leave its modern definition
  if (!c.passages || c.passages.length === 0) continue;
  const keep = { ...c.passages[0], text: newText, wordCount: wc(newText) };
  c.passages = [keep];
  conceptCount += 1;
}

// Opening passages (coach grounding): swap passages[0].text where we have a
// lead, keep provenance, keep one passage.
let openingPassCount = 0;
for (const [openingId, pages] of Object.entries(OPENINGS)) {
  const list = conceptsBundle.openings?.[openingId];
  if (!list || list.length === 0) continue;
  const lead = pages[0].text;
  const keep = { ...list[0], text: lead, wordCount: wc(lead) };
  conceptsBundle.openings[openingId] = [keep];
  openingPassCount += 1;
}

conceptsBundle.generatedAt = new Date().toISOString();
writeFileSync(CONCEPTS_PATH, JSON.stringify(conceptsBundle, null, 2) + '\n');

console.log(`rewrote ${pageCount} opening pages across ${Object.keys(OPENINGS).filter(id => pagesBundle.pages[id]).length} openings`);
console.log(`rewrote ${conceptCount} concept passages`);
console.log(`rewrote ${openingPassCount} opening grounding passages`);
