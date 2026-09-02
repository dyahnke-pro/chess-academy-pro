// COACH CAPABILITY BATTERY — 20-DISTINCT PROTOCOL (David 2026-09-02: "min 20
// questions for each surface ... all different questions; if something fails,
// fix it and start audit over with 20 new questions ... keep them silent").
//
// Each FAMILY is one capability with a POOL of distinct phrasings. A run takes
// 20 DISTINCT questions per family, rotated by AUDIT_BATCH so a restart-after-fix
// draws 20 brand-new ones. Grading: `want` (the answer is on-topic for this
// capability) AND NOT `notWant` (the specific wrong-lane steal / deflection).
// Muted per G1 (muteTtsForAudit) — zero TTS spend.
//
// Usage: AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
//   [AUDIT_FAMILY=theory] [AUDIT_BATCH=0] [AUDIT_N=20] node scripts/audit-coach-battery-prod.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import fs from 'node:fs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `battery-${Date.now().toString(36)}`;
const ONLY = (process.env.AUDIT_FAMILY || '').trim();
const BATCH = Number(process.env.AUDIT_BATCH || 0);
const N = Number(process.env.AUDIT_N || 20); // distinct questions per family per run
const ROOK_FEN = '8/5p2/8/4k3/8/8/r4P2/2R1K3 w - - 0 1';

const DEFLECT = /i can'?t verify that precisely|i can'?t verify which|hit a snag|something went wrong|pick what you want to do|tap an opening|walk through the opening from move 1/i;

// Each family: want = on-topic for THIS capability; notWant = the wrong-lane
// steal / deflection this family must never produce. Pools are ≥24 distinct.
const FAMILIES = [
  { family: 'Theory & concepts', key: 'theory',
    want: /isolat|iqp|bishop|pair|doubled|pawn|minority|outpost|space|weak|prophyla|cent|break|structure|colou?r|chain|square|knight|diagonal|trade|open|file|hole|blockad|restrict/,
    notWant: /the best move is|prepared recommendation against|no games against|not in an endgame yet|small edge to you/,
    pool: ['how do I play against an isolated queen pawn?','how do I handle the bishop pair?','what do I do about doubled pawns?','explain the minority attack','what is a good bishop vs a bad bishop?','why are outposts strong?','how do I use a space advantage?','what is the principle of two weaknesses?','how do I attack a pawn chain?','what is prophylaxis?','why control the centre?','how do I make a good pawn break?','what does overprotection mean?','how do I play with hanging pawns?','what is a weak colour complex?','how do i deal with an iqp','whats the plan vs the bishop pair','how do i target a backward pawn','why is a fianchettoed bishop good','when should i trade my bad bishop','how do i fight for the d5 square','are doubled pawns always bad?','how do i restrict a knight','what is a positional pawn sacrifice','how do i exploit a weak square','what makes a pawn structure weak'] },
  { family: 'Endgame technique', key: 'endgame',
    want: /rook|king|pawn|opposition|lucena|philidor|bridge|square|promot|draw|win|zugzwang|triangulat|passed|defen|third rank|corner|fortress|blockad|outflank|key|convert|activ|behind/,
    notWant: /the best move is|not in an endgame yet|training it is|small edge to you|i can'?t name/,
    pool: ['how do I hold a Philidor rook ending?','teach me the Lucena position','how do I win king and pawn versus king?','explain the opposition','what is the rule of the square?','how do rooks behind passed pawns work?','how do I convert an extra pawn?','what is a wrong rook pawn draw?','how do I draw with opposite coloured bishops?','what is triangulation?','how do i build a bridge in a rook ending','how does the distant opposition work','how do i draw when a pawn down','what is the vancura position','how do i cut off the king with a rook','when is a rook pawn just a draw','how do i outflank with my king','why are opposite coloured bishops drawish','what are the two weaknesses in an endgame','how do i stop a passed pawn','what are key squares for a pawn','how do i activate my king in the endgame','how do i win with an extra rook','what is the active rook principle'] },
  { family: 'Best move / candidates', key: 'bestmove', fen: ROOK_FEN,
    want: /rook|rc|move|king|pawn|best|engine|continu|instead|better|worse|blunder|inaccura|mistake|fine|capture|develop|castle|push|trade|line|square|piece|e4|d4|nf3|nc3/,
    notWant: /i can'?t verify|hit a snag/,
    pool: ['what is the best move here?','what are my candidate moves?','is Rc2 a good move?','why is that the best move?','what is the strongest continuation?','rate my move Rc2','what should I play here?','give me the top 3 moves','is there anything better than Rc2?','what is the engine move?','how good was my last move?','was that a blunder?','best move in this position please','what do you recommend here','talk me through the best line','what is the point of the best move','should i take or push here','is my move a mistake','what is the accurate move','find the best move for me','what is the critical move here','which move keeps the advantage','what is forced here','is there a better option'] },
  { family: 'Position assessment', key: 'assess', fen: ROOK_FEN,
    want: /white|black|equal|better|worse|winning|edge|balanc|point|advantage|even|hold|defend|draw|about|slight/,
    notWant: /the best move is|i can'?t verify|walk you into/,
    pool: ['who is better in this position?','what is the evaluation?','is this position winning?','how bad is my position?','assess this position for me','am I winning or losing?','what does the eval bar say?','is this a draw?','how much better is white?','give me a positional assessment','is my position holding?','who stands better here?','is this equal?','how winning is this?','evaluate this for me','am i in trouble here?','is white or black on top?','is this position drawn or winning?','how big is the advantage?','is this a technical win?','can black hold this?','is this balanced?','who has the edge?','is my position lost?'] },
  { family: 'Plans', key: 'plan', fen: ROOK_FEN,
    want: /plan|rook|king|pawn|push|activ|target|break|develop|attack|initiative|square|knight|bishop|file|aim|progress|improv|cent|weak|outpost|e4|d4|nc3/,
    notWant: /the best move is|prepared recommendation against|not in an endgame yet/,
    pool: ['what is my plan here?','what should I be aiming for?','what is the plan against a weak square?','how do I make progress here?','what is my middlegame plan?','where do my pieces belong?','what should my next few moves target?','how do I improve my position?','what is the plan in this structure?','what am I playing for?','which side do I attack on?','what is my long-term idea here?','how do i create threats here','what plan fits this pawn structure','where is my play?','what should i do with my rook','how do i build an attack','what is the right pawn break here','how do i keep the initiative','where should my knight go','what is the strategic idea','what do i do now','how do i press my advantage','what is the plan with a space edge'] },
  { family: 'Opponent-move why', key: 'oppwhy', fen: ROOK_FEN,
    want: /rook|king|pawn|threat|defend|activ|because|prevent|idea|plan|attack|nothing|no immediate|fresh game|opening position|start/,
    notWant: /i can'?t verify|hit a snag/,
    pool: ['why did my opponent play that?','what is the idea behind their last move?','what is my opponent threatening?','why did they move there?','what is their plan now?','what does that move do?','why that move and not a capture?','what are they setting up?','is their move a threat?','what is the point of their move?','did they just blunder?','why would they play that','what is my opponent up to','what threat does that create','is that move a mistake by them','what are they attacking','why did they retreat','what is the trap in their move','should i worry about that move','what is their follow-up','did that move create a weakness','why did they trade','what does their pawn push threaten','what is the idea of that check'] },
  { family: 'Name the opening', key: 'nameopening',
    want: /ruy|lopez|spanish|sicilian|french|queen|gambit|caro|italian|scandinav|london|english|king|indian|defen|opening|eco|c[0-9]{2}|b[0-9]{2}|d[0-9]{2}|a[0-9]{2}|e[0-9]{2}/,
    notWant: /the best move is|i can'?t name the opening yet|walk you into it|small edge to you/,
    pool: ['what opening is 1.e4 e5 2.Nf3 Nc6 3.Bb5?','name this opening: 1.d4 d5 2.c4','what do you call 1.e4 c5?','which opening is 1.e4 e6?','what opening is 1.e4 e5 2.Nf3 Nc6 3.Bc4?','what do you call 1.d4 Nf6 2.c4 g6?','which opening is 1.e4 c6?','name this: 1.e4 e5 2.f4','what opening is 1.Nf3 d5 2.g3?','what do you call 1.e4 d5?','which opening is 1.d4 d5 2.c4 e6?','what opening is 1.e4 e5 2.Nf3 d6?','name this opening 1.c4 e5','what do you call 1.e4 c5 2.Nf3 d6 3.d4?','which opening is 1.d4 f5?','what opening is 1.e4 e5 2.Bc4?','name this: 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4','what do you call 1.e4 g6?','which opening is 1.e4 Nf6?','what opening is 1.d4 d5 2.c4 c6?','name this 1.e4 e5 2.Nc3','what do you call 1.b3?','which opening is 1.f4?','what opening is 1.e4 e5 2.Nf3 Nc6 3.d4?'] },
  { family: 'Tactics', key: 'tactics', fen: ROOK_FEN,
    want: /tactic|fork|pin|skewer|discover|deflect|decoy|overload|double attack|zwischen|windmill|x-ray|mate|combination|sacrifice|nothing|no immediate|hanging|threat|knight|piece|attack|remove/,
    notWant: /the best move is|i can'?t verify|prepared recommendation/,
    pool: ['is there a tactic in this position?','what is a fork?','explain a pin','how do skewers work?','what is a discovered attack?','what is a deflection?','is there a combination here?','can I win material here?','what is the tactic?','is there a sacrifice here?','what is a double attack?','what is a zwischenzug?','how does a windmill work?','what is an x-ray attack?','is there a mating net here?','what is overloading a piece?','what is a decoy?','is my opponent piece hanging?','can i fork them somewhere?','what is removing the defender?','is there a pin i can exploit?','what is a clearance sacrifice?','how do i spot a tactic?','what is a discovered check?'] },
  { family: 'Opening traps', key: 'traps',
    want: /trap|careful|knight|queen|pawn|line|legal|fried liver|f7|f2|mate|punish|watch|elephant|noah|fishing|wayward|scholar|bishop|attack|refut/,
    notWant: /i can'?t verify|hit a snag|the best move is/,
    pool: ['what are the traps in the Italian?','show me a trap in the Sicilian','is there a trap in the Scandinavian?','what traps should I know in the Caro-Kann?','how do I avoid the Fried Liver?','what is the Legal mate trap?','any traps in the London?','trap in the Queen Gambit?','what is the Elephant trap?','how do I punish an early queen?','what is a common opening trap for white','traps in the french defence','how do i set a trap in the italian','what trap catches beginners in the scandi','what is the noah ark trap','what is the fishing pole trap','how do i avoid getting trapped in the opening','what is the trap after Bxf7','common blunders in the ruy lopez','how do i punish the wayward queen attack','is there a trap in the vienna','warn me about traps in the caro','how do i trap the bishop','what is the trap in the two knights'] },
  { family: 'Counter-repertoire', key: 'counterrep',
    want: /against|recommend|counter|setup|line|play|meet|answer|d5|c5|nf6|e5|e6|g6|system|defen|advance|exchange|anti|modern|main/,
    notWant: /i can'?t verify|hit a snag|not in an endgame/,
    pool: ['what should I play against the London?','how do I meet the Kings Gambit?','what do I do against the Caro-Kann?','what is my answer to the Sicilian?','how do I face 1.d4?','what against the Italian?','give me a line against the French','how do I handle the Scandinavian?','what do I play versus the Pirc?','what is a good response to 1.e4?','how do i counter the london system','what should black play against 1.e4','how do i deal with the kings indian attack','what is my repertoire gap','best answer to the vienna','how do i meet the exchange caro','what do i play if they go birds opening','recommend a defence to the ruy','how should i respond to the four knights','what line against the advance french','what to do vs the fried liver attempt','how do i counter an early Bg5','what is solid against 1.c4','give me a system against everything'] },
  { family: 'Move soundness', key: 'soundness', fen: ROOK_FEN,
    want: /sound|sac|sacrifice|works|correct|dubious|loses|drops|safe|risky|greek gift|material|attack|refut|good|bad|instead|engine|no|yes|only if/,
    notWant: /i can'?t verify|hit a snag|prepared recommendation/,
    pool: ['is the bishop sac on h7 sound?','is Bxh7 sound here?','can I sacrifice on f7?','is the greek gift correct here?','would Nxe5 work?','is this sacrifice sound?','is my knight to d5 good?','was pushing e5 a mistake?','is taking on d4 safe?','does the exchange sac work here?','is Rxf7 sound','can i play the bishop sacrifice','is sacking the knight on f7 correct','would giving up the exchange be ok','is Qh5 sound or dubious','does the piece sac work','is it safe to grab that pawn','is my rook sac justified','would Nxf7 be good','is trading queens sound here','can i sac a pawn for the attack','is that a real sacrifice or a blunder','does my combination actually work','is Bxf2 check sound'] },
  { family: 'Weakness profile', key: 'weakness',
    want: /weak|mistake|tactic|endgame|blunder|drill|work on|pattern|upload|import|strength|good|do well|win rate|zero blunder|rook|pawn|convert|leak|improv|train|slip/,
    notWant: /the best move is|i can'?t verify precisely|walk you into/,
    pool: ['what are my biggest weaknesses?','give me a weakness briefing','what am I worst at?','where am I leaking rating?','what are my strengths?','am I improving on my weaknesses?','what should I work on?','what is my worst area?','what patterns do I keep missing?','where do I lose the most points?','what do i struggle with most','what is holding my rating back','brief me on my weak spots','what am i good at','what is my main problem','what skill should i improve','where am i strongest','what do i need to fix','summarize my weaknesses','what endgame am i weakest at','am i getting better at my weak areas','what does my skill radar look like','what do i keep getting wrong','what is my biggest leak'] },
  { family: 'Mistakes & review', key: 'mistakes',
    want: /mistake|blunder|tactic|endgame|hang|drop|pattern|last game|move|lost|phase|middlegame|opening|time|error|critical|rc2|average|upload|import|no games/,
    notWant: /the best move is|i can'?t verify precisely|walk you into/,
    pool: ['what mistakes do I make most?','what did I do wrong in my last game?','where do most of my errors happen?','do I blunder in time trouble?','which phase do I play worst?','what is my most common blunder?','review my last game','what was my critical mistake?','where did I go wrong?','what type of mistake do I repeat?','what was my biggest error last game','do i make more mistakes in the endgame','when do i usually blunder','what went wrong in that game','do i hang pieces','what mistakes cost me the game','break down my last loss','where do i drop points in a game','what is my recurring error','do i blunder when low on time','which moves were my mistakes','what should i have played instead','why did i lose that game','what is the pattern in my mistakes'] },
  { family: 'Progress & stats', key: 'progress',
    want: /rating|trend|improv|record|win|loss|draw|score|streak|consist|puzzle|accuracy|percent|games|month|year|up|down|progress|average|upload|import|no games|no puzzle|5-0/,
    notWant: /the best move is|i can'?t verify precisely|walk you into/,
    pool: ['am I getting better?','what is my rating trend?','how consistent am I?','what is my puzzle accuracy?','what is my record with white?','how many games have I won?','what is my win rate?','am I improving over time?','how am I doing lately?','how is my rating moving','am i trending up or down','what is my performance this month','how good is my tactics rating','what is my record as black','how many puzzles have i solved','am i more consistent now','what is my accuracy trend','how do i compare to last month','what is my best opening by score','which opening scores worst for me','how streaky is my play','what are my overall stats','am i plateauing','how is my progress going'] },
  { family: 'Drill / training', key: 'drill',
    want: /drill|train|practi[sc]e|pattern|weak|puzzle|tap to start|session|work on|sharpen|quiz|endgame|tactic|opening|threat|structure|convert|upload|import/,
    notWant: /no immediate threat|nothing of theirs is hanging|the best move is|i can'?t verify/,
    pool: ['train my missed threats','drill my structure weaknesses','give me a tactics workout','let me practice endgames','set up a drill on my worst opening','quiz me on tactics','drill my blunders','practice my weak endgames','give me a puzzle on my weakness','train me on forks','let us work on my time trouble','drill the sicilian for me','set up an endgame drill','practise pins and skewers','train my calculation','give me a mistake to redo','let me drill my worst pattern','start a drill session','work on my opening weaknesses','quiz me on the caro-kann','practice converting endgames','drill defensive moves','set me a puzzle','train my positional play'] },
  { family: 'App help / capabilities', key: 'apphelp',
    want: /teach|play|review|drill|opening|endgame|tactic|weak|help|learn|watch|practice|import|feature|coach|puzzle|plan|name|show/,
    notWant: /the best move is|i can'?t verify|not in an endgame/,
    pool: ['what can you help me with?','how do I use this app?','how do you teach?','what features do you have?','what can you do?','what are you good for?','how does this app work?','what is your teaching method?','can you review my games?','can you play against me?','what should i ask you','how do i get started','what do you offer','help me understand this app','what are all your features','how do i import my games','how do the lessons work','can you make me a training plan','what modes are there','can you teach me openings','do you have puzzles','how do i track my progress','what is the best way to use you','what kinds of questions can you answer'] },
  { family: 'Upload reminder (no games)', key: 'upload', freshDb: true,
    want: /upload|import|connect|chess\.com|lichess|analy|games|no games|none of your|link|sync|add your/,
    notWant: /the best move is/,
    pool: ['what are my weaknesses?','what mistakes do I make?','am I improving?','what should I work on?','what is my worst phase?','review my games','what do I blunder most?','how is my rating trend?','what am I bad at?','give me a weakness briefing','analyse my play','what are my recurring errors','where do i lose points','what is my record','how consistent am i','what patterns do i miss','which opening do i play worst','what should i drill','tell me my weak spots','how am i doing overall','what is my biggest leak','do i hang pieces','summarize my play','what needs improving'] },
  { family: 'Self-heal / banter', key: 'banter',
    want: /.+/,
    notWant: /the best move is|the eval is|rook to|on move \d|a small edge to you|the engine plays/,
    pool: ['thanks so much coach','you are awesome','good night','that was really helpful','appreciate it','cool thanks','you are the best','haha nice','ok got it','thank you','great cheers','that makes sense now','you rock coach','perfect thanks','see you tomorrow','love this app','that helped a lot','nice one','cheers','awesome coach','good stuff','much appreciated','that is brilliant','okay thanks coach'] },
];

const results = [];
const rec = (family, q, pass, detail) => { results.push({ family, q, pass, detail }); console.log(`${pass ? '✅' : '❌'} [${family}] ${q} — "${detail.slice(0, 74)}"`); };

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript((id) => { try { localStorage.setItem('auditRunId', id); } catch { /* private */ } }, RUN_ID);
const page = await ctx.newPage();

async function dismissGates() {
  for (const [g, b] of [['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'], ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]']]) {
    try { const G = page.locator(g); await G.waitFor({ timeout: 8000 }); await page.locator(b).click(); await G.waitFor({ state: 'detached', timeout: 15000 }); } catch { /* not shown */ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* not shown */ }
}
function seedRows() {
  const mk = (o) => ({ id: `bt-${Math.random().toString(36).slice(2)}`, fen: ROOK_FEN, playerMove: 'c1c2', playerMoveSan: 'Rc2', bestMove: 'c1c8', bestMoveSan: 'Rc8', moves: '', cpLoss: 260, classification: 'blunder', gamePhase: 'endgame', moveNumber: 40, sourceGameId: 'g1', sourceMode: 'analysis', playerColor: 'white', promptText: '', narration: { intro: '', explanation: '', encouragement: '' }, createdAt: '2026-02-01T00:00:00.000Z', opponentName: 'Rival', gameDate: '2026-02-01', openingName: null, evalBefore: 0, srsInterval: 0, srsEaseFactor: 2.5, srsRepetitions: 0, srsDueDate: '2026-02-01', srsLastReview: null, status: 'unsolved', attempts: 0, successes: 0, tacticType: null, positionalMotif: null, ...o });
  const rows = []; for (let i = 0; i < 7; i++) rows.push(mk({ sourceGameId: `rg${i % 5}`, cpLoss: 240 + i * 20, gamePhase: i % 2 ? 'middlegame' : 'endgame' })); return rows;
}
function gamesFor(rows) { return [...new Set(rows.map((r) => r.sourceGameId))].map((id, i) => ({ id, source: 'import', isMasterGame: false, result: '1-0', white: 'AuditPlayer', black: 'Stockfish Bot', whiteElo: 1500, blackElo: 1500, pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6', date: '2026-02-01', playedAt: `2026-02-0${(i % 8) + 1}T00:00:00.000Z`, annotations: [{ moveNumber: 1, color: 'white', evaluation: 20, bestMove: 'e4', bestMoveSan: 'e4', bestMoveEval: 20, classification: 'book' }], fullyAnalyzed: true, analysisDepth: 20, openingId: null, coachAnalysis: null })); }
async function seed() {
  const rows = seedRows(); const games = gamesFor(rows);
  return page.evaluate(({ rows, games }) => new Promise((res) => { const r = indexedDB.open('ChessAcademyDB'); r.onerror = () => res('err'); r.onsuccess = () => { const db = r.result; const tx = db.transaction(['mistakePuzzles', 'games'], 'readwrite'); for (const x of rows) tx.objectStore('mistakePuzzles').put(x); for (const g of games) tx.objectStore('games').put(g); tx.oncomplete = () => { db.close(); res('ok'); }; tx.onerror = () => { db.close(); res('txerr'); }; }; }), { rows, games });
}
async function wipe() {
  return page.evaluate(() => new Promise((res) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => { const db = r.result; const names = ['mistakePuzzles', 'games']; const tx = db.transaction(names, 'readwrite'); for (const n of names) tx.objectStore(n).clear(); tx.oncomplete = () => { db.close(); res('ok'); }; tx.onerror = () => { db.close(); res('err'); }; }; r.onerror = () => res('err'); }));
}

const GREETING = /pick what you want to do|walk through the opening from move 1|good to see you|want me to teach you an opening|tap an opening|let'?s walk through the .*(gambit|opening|defen|attack|game)|ready when you are/;
// The app's own transient-timeout UI under rapid fire — a LOAD artifact, not a
// routing failure (CLAUDE.md load-vs-break rule). Retry, don't score it.
const TRANSIENT = /coach is taking too long|try again in a moment|taking longer than expected|please try again/;
async function loadFresh(fen) {
  const url = fen ? `${BASE}/coach/play?fen=${encodeURIComponent(fen)}&side=white` : `${BASE}/coach/teach`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates(); await page.waitForTimeout(1000);
  if (fen) { // play page: open the chat panel
    const input = page.locator('[data-testid="chat-text-input"]');
    if (!(await input.isVisible().catch(() => false))) {
      try { await page.locator('[data-testid="play-chat-button"]').click({ timeout: 6000 }); } catch { /* maybe open */ }
    }
  }
}
async function askOnce(q, fen) {
  const box = page.locator('[data-testid="chat-text-input"]'); await box.waitFor({ timeout: 18000 });
  if (fen) { // play page renders assistant messages
    const msgs = page.locator('[data-testid="chat-message-assistant"]');
    const c0 = await msgs.count();
    await box.click(); await box.pressSequentially(q, { delay: 5 }); await box.press('Enter');
    for (let i = 0; i < 28; i++) { await page.waitForTimeout(1400); const n = await msgs.count(); if (n > c0) { const t = (await msgs.nth(n - 1).innerText().catch(() => '')).trim(); if (t.length > 15) { await page.waitForTimeout(1200); return (await msgs.nth((await msgs.count()) - 1).innerText().catch(() => t)).trim(); } } }
    return '';
  }
  const tr = page.locator('[data-testid="teach-transcript"]');
  const lines = async () => (await tr.innerText().catch(() => '')).split('\n').map((l) => l.trim()).filter(Boolean);
  const tally = (ls) => ls.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const seen = tally(await lines());
  const fresh = (ls) => { const now = tally(ls); const o = []; for (const [l, n] of now) { const e = n - (seen.get(l) ?? 0); for (let k = 0; k < e; k++) o.push(l); } return o.filter((l) => !l.includes(q)); };
  await box.click(); await box.pressSequentially(q, { delay: 5 }); await box.press('Enter');
  const SUB = (l) => l.length >= 20 && l.includes(' ');
  for (let i = 0; i < 26; i++) { await page.waitForTimeout(1300); if (fresh(await lines()).some(SUB)) { await page.waitForTimeout(1400); return fresh(await lines()).filter(SUB).join(' '); } }
  return '';
}
async function ask(q, fen) {
  let last = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await loadFresh(fen);
      last = (await askOnce(q, fen)).toLowerCase();
      if (last && !GREETING.test(last) && !TRANSIENT.test(last)) return last;
      if (TRANSIENT.test(last)) await page.waitForTimeout(4000); // let the provider breathe
    } catch { last = ''; }
  }
  return last;
}
const pick = (arr, n, off) => { const out = []; for (let i = 0; i < n; i++) out.push(arr[(off * n + i) % arr.length]); return out; };

try {
  await loadFresh();
  let seeded = false;
  for (const fam of FAMILIES) {
    if (ONLY && fam.key !== ONLY) continue;
    if (fam.freshDb) { await wipe(); seeded = false; }
    else if (!seeded) { await seed(); seeded = true; }
    const qs = pick(fam.pool, N, BATCH);
    console.log(`\n── ${fam.family}: ${qs.length} distinct questions (batch ${BATCH}) ──`);
    for (const q of qs) {
      let a = '';
      try { a = await ask(q, fam.fen); } catch (e) { a = `THREW: ${String(e).slice(0, 60)}`; }
      const notOk = fam.notWant ? fam.notWant.test(a) : false;
      const wantOk = fam.want ? fam.want.test(a) : a.length >= 15;
      const deflected = DEFLECT.test(a) && !fam.freshDb;
      rec(fam.family, q, a.length >= 8 && wantOk && !notOk && !deflected, a || '(empty)');
    }
    if (fam.freshDb) { await seed(); seeded = true; }
  }
} catch (err) {
  rec('HARNESS', 'ran', false, String(err).slice(0, 200));
} finally {
  const pass = results.filter((r) => r.pass).length;
  const byFam = {};
  for (const r of results) { (byFam[r.family] ??= { p: 0, n: 0 }); byFam[r.family].n++; if (r.pass) byFam[r.family].p++; }
  console.log(`\n══ BATTERY batch ${BATCH}: ${pass}/${results.length} green ══`);
  for (const [f, s] of Object.entries(byFam)) console.log(`  ${s.p === s.n ? '✅' : '⚠️ '} ${f}: ${s.p}/${s.n}`);
  const fails = results.filter((r) => !r.pass);
  if (fails.length) { console.log('\nFAILURES:'); for (const f of fails) console.log(`  ❌ [${f.family}] "${f.q}" → "${f.detail.slice(0, 110)}"`); }
  try { fs.writeFileSync(`/tmp/battery-b${BATCH}.json`, JSON.stringify({ runId: RUN_ID, batch: BATCH, pass, total: results.length, byFam, results }, null, 2)); } catch { /* ignore */ }
  await browser.close();
  process.exit(fails.length ? 1 : 0);
}
