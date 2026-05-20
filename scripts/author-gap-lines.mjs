#!/usr/bin/env node
/**
 * Hand-authored trap/pitfall fillers for openings the puzzle DB
 * couldn't cover. Each candidate is a PGN from move 1 (walks from
 * move 1 natively — no setupFen / lead-in fetch needed).
 *
 * Every candidate is Stockfish-verified before write:
 *   trap    → student (opening color) ends >= +150cp or mate
 *   pitfall → student ends <= -150cp or mated
 * chess.js validates legality. Only verified candidates merge into
 * repertoire.json. Over-provided so survivors meet the 3+3 quota.
 *
 *   node scripts/author-gap-lines.mjs            # verify + report
 *   node scripts/author-gap-lines.mjs --write    # merge survivors
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

const STOCKFISH='/usr/games/stockfish', DEPTH=18, CONC=4, THRESH=150;
const WRITE = process.argv.includes('--write');

// role: 'trap' (student wins) | 'pitfall' (student loses)
// pgn: full game from move 1, ending on the decisive move
const CANDIDATES = [
  // ── Budapest Gambit (black) ──────────────────────────────────
  { opening:'budapest-gambit', role:'trap', name:'Kieninger Trap', desc:"The famous Budapest trap. After 8.axb4?? Nd3 is smothered mate — the knight on d3 mates with the b4-pawn and e5-knight covering escape squares.",
    pgn:'d4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5 axb4 Nd3#' },
  { opening:'budapest-gambit', role:'trap', name:'Rubinstein f2 Strike', desc:"Black's pieces swarm f2. The bishop + knight battery wins material against careless White development.",
    pgn:'d4 Nf6 c4 e5 dxe5 Ng4 e4 Nxe5 f4 Nec6 Be3 Bb4+ Nc3 Qh4+ g3 Qf6' },
  { opening:'budapest-gambit', role:'pitfall', name:'Fajarowicz Overreach', desc:"3...Ne4 (Fajarowicz) is greedy. After accurate development White consolidates the extra pawn and Black has nothing.",
    pgn:'d4 Nf6 c4 e5 dxe5 Ne4 Nf3 Nc6 Nbd2 Nxd2 Bxd2 Qe7 a3 Qxe5 Nxe5 Nxe5' },

  // ── Old Indian (black) ───────────────────────────────────────
  { opening:'old-indian-defence', role:'trap', name:'Central Counter-Strike', desc:"Black's ...exd4 and piece pressure on e4 wins the overextended center pawn.",
    pgn:'d4 Nf6 c4 d6 Nc3 e5 Nf3 Nbd7 g3 e4 Nd2 Nxc4 Nxc4 d5' },
  { opening:'old-indian-defence', role:'pitfall', name:'Premature exd4', desc:"Surrendering the center too early with ...exd4 hands White a dominant position and the bishop pair.",
    pgn:'d4 Nf6 c4 d6 Nc3 e5 Nf3 exd4 Nxd4 g6 e4 Bg7 Be2 O-O O-O Re8 f3' },

  // ── Queens Gambit (white) ────────────────────────────────────
  { opening:'queens-gambit', role:'pitfall', name:'Elephant Trap', desc:"White's tempting 6.Nxd5?? loses a piece to 6...Nxd5 7.Bxd8 Bb4+ winning the bishop back with interest.",
    pgn:'d4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 cxd5 exd5 Nxd5 Nxd5 Bxd8 Bb4+ Qd2 Bxd2+ Kxd2 Kxd8' },
  { opening:'queens-gambit', role:'trap', name:'QGA b5 Overextension', desc:"Black tries to hold the gambit pawn with ...b5?; White's a4 break rips open the queenside and wins material.",
    pgn:'d4 d5 c4 dxc4 e3 b5 a4 c6 axb5 cxb5 Qf3' },
  { opening:'queens-gambit', role:'trap', name:'Central Fork Trick', desc:"After Black mishandles the center, White's e4 break opens lines and the pieces win material on the weak light squares.",
    pgn:'d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 b6 cxd5 exd5 Bd3 Bb7 O-O Nbd7 Qe2' },

  // ── Catalan (white) ──────────────────────────────────────────
  { opening:'catalan-opening', role:'trap', name:'Long Diagonal Bind', desc:"The Bg2 fires down the long diagonal; after Black's loose ...dxc4 and slow play, White regains the pawn with a dominant bind.",
    pgn:'d4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 Ne5 c5 dxc5 Qxd1+ Kxd1' },
  { opening:'catalan-opening', role:'pitfall', name:'Holding c4 Too Long', desc:"Clinging to the extra c-pawn with ...b5? lets White's a4 break shatter Black's queenside.",
    pgn:'d4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 b5 Ne5 Nd5 a4 c6 axb5 cxb5 Nc3' },

  // ── Benko Gambit (black) ─────────────────────────────────────
  { opening:'benko-gambit', role:'trap', name:'Queenside File Avalanche', desc:"Black's open a- and b-files crash through; the rooks and queen overwhelm White's queenside.",
    pgn:'d4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 Nf3 g6 g3 Bg7 Bg2 O-O O-O Nbd7 Rb1 Nb6 Re1 Bxe2' },
  { opening:'benko-gambit', role:'pitfall', name:'Greedy Pawn Retention', desc:"Trying to keep the gambit pawn with ...b5? after the exchange lets White consolidate a clean extra pawn.",
    pgn:'d4 Nf6 c4 c5 d5 b5 cxb5 a6 e3 axb5 Bxb5 Qa5+ Nc3 Bb7 Nf3 Bxd5 Nxd5 Nxd5 Bd2' },

  // ── Grunfeld (black) — pitfalls ──────────────────────────────
  { opening:'grunfeld-defence', role:'pitfall', name:'Premature Center Grab', desc:"Snatching on c3 and grabbing the rook with ...Bxa1? lets White trap the bishop in the corner with a winning attack.",
    pgn:'d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 cxd4 cxd4 Bxd4 Nxd4 Qxd4 Bxf7+ Kxf7 Qxd4' },
  { opening:'grunfeld-defence', role:'pitfall', name:'Qa5 Pin Misfire', desc:"The ...Qa5 pin backfires; White unpins with tempo and the queen is chased into a losing position.",
    pgn:'d4 Nf6 c4 g6 Nc3 d5 Qb3 dxc4 Qxc4 Bg7 e4 O-O Be2 Nfd7 Be3 Nb6 Qb3 Nc6 O-O-O' },
  { opening:'grunfeld-defence', role:'pitfall', name:'Exchange Line Drift', desc:"Passive play in the Exchange Grunfeld lets White's big center roll forward and crush Black's position.",
    pgn:'d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 O-O Be2 b6 O-O Bb7 Qd3 c5 e5' },

  // ── Semi-Slav (black) — pitfall ──────────────────────────────
  { opening:'semi-slav', role:'pitfall', name:'Botvinnik Without Prep', desc:"Entering the razor-sharp Botvinnik unprepared; one inaccuracy and White's pawn storm decides.",
    pgn:'d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 dxc4 e4 b5 e5 h6 Bh4 g5 Nxg5 hxg5 Bxg5 Nbd7 exf6 Bb7 g3 c5 d5 Qb6 Bg2 O-O-O dxe6' },

  // ── Queen's Indian (black) — pitfall ─────────────────────────
  { opening:'queens-indian', role:'pitfall', name:'Ceding e4 Too Soon', desc:"Playing ...d5 too early cedes e4 permanently; White's Bg2 + central pawns build a lasting bind.",
    pgn:'d4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 d5 cxd5 exd5 O-O Be7 Nc3 O-O Ne5 c5 dxc5 bxc5 Nxd5' },

  // ── Evans Gambit (white) — pitfall ───────────────────────────
  { opening:'evans-gambit', role:'pitfall', name:'Declining Into Passivity', desc:"Declining with 4...Bb6 and drifting lets White's a4-a5 harass the bishop and seize a dominant center.",
    pgn:'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bb6 a4 a6 a5 Ba7 b5 axb5 Bxb5 Nge7 O-O O-O d4' },

  // ── Sicilian Sveshnikov (black) ──────────────────────────────
  { opening:'sicilian-sveshnikov', role:'trap', name:'b5 Knight Trap', desc:"After White's Na3 is stranded, Black's ...b5 followed by ...b4 can trap the offside knight on the rim.",
    pgn:'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7 Bxf6 Bxf6 c4 b4 Nc2 Rb8' },
  { opening:'sicilian-sveshnikov', role:'trap', name:'f5 Counterpunch', desc:"Black's thematic ...f5 break opens the f-file and the bishop pair generates a decisive kingside attack.",
    pgn:'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Bxf6 gxf6 Nd5 f5 c3 Bg7 exf5 Bxf5' },
  { opening:'sicilian-sveshnikov', role:'trap', name:'d5-square Domination', desc:"Black contests the d5 square; trading the wrong piece lets Black's central majority and bishop pair take over.",
    pgn:'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Bxf6 gxf6 Nd5 Bg7 Bd3 Ne7 Nxe7 Qxe7' },
  { opening:'sicilian-sveshnikov', role:'pitfall', name:'a6 One Move Early', desc:"6...a6? before defending d6 loses a pawn to Nd6+ forking the position open.",
    pgn:'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 a6 Nd6+ Bxd6 Qxd6 Qe7 Qxe7+ Ngxe7' },
  { opening:'sicilian-sveshnikov', role:'pitfall', name:'Premature d5 Push', desc:"6...d5? overextends; White's exchanges leave Black with a shattered center.",
    pgn:'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Nf3 d5 exd5 Nxd5 Nxd5 Qxd5 Qxd5' },

  // ── Alekhine (black) ─────────────────────────────────────────
  { opening:'alekhine-defence', role:'trap', name:'Overextended Center Bust', desc:"White's Four Pawns Attack overreaches; Black's ...c5 and ...Nc6 hit the center and win an overextended pawn.",
    pgn:'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5 Nc3 e6 Nf3 Qd7 Be2 O-O-O' },
  { opening:'alekhine-defence', role:'trap', name:'Exchange Variation Equalizer', desc:"Against the Exchange line Black's pieces hit d4 and e5; careless play drops the center pawn.",
    pgn:'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 cxd6 Nc3 g6 Be3 Bg7 Rc1 O-O d5 e6' },
  { opening:'alekhine-defence', role:'pitfall', name:'Greedy Knight Chase', desc:"Chasing with too many pawns leaves the knight kicked around and Black's development fatally behind.",
    pgn:'e4 Nf6 e5 Nd5 c4 Nb6 c5 Nd5 Nc3 Nxc3 dxc3 d6 exd6 exd6 Qxd6 Qxd6 cxd6' },
  { opening:'alekhine-defence', role:'pitfall', name:'Passive Modern Drift', desc:"Drifting in the Modern Alekhine lets White's space advantage smother Black.",
    pgn:'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 g6 Bc4 c6 O-O Bg7 Re1 O-O Nc3 Nd7 Nxf7 Rxf7 Bxd5' },
];

async function analyze(fen){
  return new Promise(res=>{
    const sf=spawn(STOCKFISH); let buf='',ev=null,seen=false;
    sf.stdout.on('data',d=>{buf+=d;const ls=buf.split('\n');buf=ls.pop()??'';for(const l of ls){if(l.startsWith('info depth ')){const c=l.match(/score cp (-?\d+)/),m=l.match(/score mate (-?\d+)/);if(m)ev={type:'mate',value:+m[1]};else if(c)ev={type:'cp',value:+c[1]};}if(l.startsWith('bestmove')){seen=true;sf.kill();res(ev);}}});
    sf.on('error',()=>res(null)); sf.on('close',()=>{if(!seen)res(ev);});
    sf.stdin.write(`uci\nposition fen ${fen}\ngo depth ${DEPTH}\n`);
    setTimeout(()=>{try{sf.stdin.write('stop\nquit\n');}catch{}},11000);
  });
}
function studentPersp(raw,stm,color){ if(!raw)return null; const flip=stm!==color; return raw.type==='cp'?{type:'cp',value:flip?-raw.value:raw.value}:{type:'mate',value:flip?-raw.value:raw.value}; }

const rep=JSON.parse(readFileSync('src/data/repertoire.json','utf-8'));
const arr=Array.isArray(rep)?rep:Object.values(rep);
const colorOf=Object.fromEntries(arr.map(o=>[o.id,o.color]));

async function verify(cand){
  const color=colorOf[cand.opening];
  const c=new Chess(); const toks=cand.pgn.trim().split(/\s+/);
  for(const t of toks){ try{c.move(t.replace(/[+#!?]+$/,''));}catch(e){return{...cand,ok:false,why:`illegal ${t}`};} }
  const stm=c.turn()==='w'?'white':'black';
  // checkmate on board?
  if(c.isCheckmate()){
    const loser=stm; // side to move is mated
    const se = loser===color ? {type:'mate',value:-1} : {type:'mate',value:1};
    const good = cand.role==='trap' ? se.value>0 : se.value<0;
    return {...cand,ok:good,color,eval:`mate (${loser} mated)`,studentColor:color};
  }
  const raw=await analyze(c.fen());
  const se=studentPersp(raw,stm,color);
  let good=false,desc='?';
  if(se?.type==='mate'){ good = cand.role==='trap' ? se.value>0 : se.value<0; desc=`M${se.value}`; }
  else if(se?.type==='cp'){ good = cand.role==='trap' ? se.value>=THRESH : se.value<=-THRESH; desc=`${se.value}cp`; }
  return {...cand,ok:good,color,eval:desc,studentColor:color};
}

async function pconc(items,fn,n){const r=new Array(items.length);let i=0;await Promise.all(Array.from({length:n},async()=>{while(i<items.length){const k=i++;r[k]=await fn(items[k]);}}));return r;}

const results=await pconc(CANDIDATES,verify,CONC);
console.log('=== AUTHORED LINE VERIFICATION ===');
const byOp={};
for(const r of results){
  console.log(`  [${r.ok?'PASS':'FAIL'}] ${r.opening} ${r.role} "${r.name}" -> ${r.eval}${r.why?' ('+r.why+')':''}`);
  if(r.ok){(byOp[r.opening]=byOp[r.opening]||[]).push(r);}
}
const passed=results.filter(r=>r.ok);
console.log(`\nPassed: ${passed.length}/${results.length}`);

if(WRITE){
  for(const op of arr){
    for(const r of (byOp[op.id]||[])){
      const list = r.role==='trap' ? (op.trapLines=op.trapLines||[]) : (op.warningLines=op.warningLines||[]);
      if(list.some(x=>x.name===r.name)) continue;
      list.push({ name:r.name, pgn:r.pgn, explanation:r.desc, source:'authored-verified', verifiedEval:r.eval });
    }
  }
  writeFileSync('src/data/repertoire.json', JSON.stringify(rep,null,2)+'\n');
  console.log('\nWROTE survivors to repertoire.json');
  // coverage
  let gaps=[];
  for(const op of arr){const t=(op.trapLines||[]).length,w=(op.warningLines||[]).length;if(t<3||w<3)gaps.push(`  ${op.id}: ${t} traps, ${w} pitfalls`);}
  if(gaps.length===0)console.log('ALL openings >= 3 traps + 3 pitfalls');
  else{console.log('STILL SHORT:');gaps.forEach(g=>console.log(g));}
}
