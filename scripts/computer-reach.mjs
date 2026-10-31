#!/usr/bin/env node
/**
 * computer-reach — WHICH TEACHING COMPUTER REACHES WHICH SURFACE, read off the
 * code (WO-STORY-MATRIX-01 P1-0).
 *
 * David 2026-10-30: "All of this is built! Why is it not wired in?" The answer
 * had to be counted, not recalled: a hand census undercounts (CLAUDE.md, THE
 * FOUR LEVELS, III). The 2026-10-30 map found 355 teaching computers and 51 of
 * them wired to no surface at all. That map was a scratch tool; this is it,
 * committed, so Phase 1 can show the number falling and P1-13 can gate on it.
 *
 * WIRED = a static call path, symbol by symbol, from a surface's root to the
 * computer: a TypeScript AST graph of function-level references (an import
 * alone is not wiring), dynamic `import()` narrowed to the names it uses, and
 * `readBoard('id')` resolved to that registry id. Paths that cross into another
 * surface are cut (chat dispatch, lesson generation, the tapped read,
 * background analysis), and so is every record writer: a computer reached only
 * to WRITE the record reaches no eyes or ears.
 *
 * Learn is yes / held / no. Learn free play is always a tactics-focus game, so
 * its door holds every lane (CLAUDE.md § LEARN FOCUS): "held" = computed in a
 * Learn turn and held by the door; "yes" = reaches the student through the
 * focus runner.
 *
 * Limits, named: static paths only, so runtime switches are not modelled
 * (Play's PLAY_VOLUNTEERS_COACHING=false is handled by leaving Play's live
 * coach out of every root). A module row counts as reached when any export is.
 *
 * The computer list is data: scripts/computer-reach/computers.json (one row
 * per computer: its function, or its module, and the registry ids that reach
 * it). The reach is recomputed from the code every run.
 *
 *   node scripts/computer-reach.mjs           → writes docs/computer-reach.json
 *   node scripts/computer-reach.mjs --verify  → regenerates it in memory and
 *     FAILS when the committed report is stale or a catalog row names a
 *     computer the code no longer has (ship-check runs this, the way it runs
 *     `surface-map --verify`: a reach report nobody regenerates reports
 *     wiring that is not there — 2026-10-31, 12 wired computers read as
 *     unreached for a day after the registry became a `satisfies` literal).
 */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const LIST = path.join(ROOT, 'scripts/computer-reach/computers.json');
const OUT = path.join(ROOT, 'docs/computer-reach.json');

// ── 1. the symbol graph of production src: node = "file#name" ──────────────

const SKIP_DIRS = new Set(['test', '__fixtures__', '__tests__', '__mocks__']);
const NOT_PRODUCTION = /\.(test|measure|gate|eval|integration|live|real|spec)\./;

function productionFiles() {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(p); continue; }
      if (/\.(ts|tsx)$/.test(e.name) && !NOT_PRODUCTION.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p);
    }
  };
  walk(SRC);
  return out;
}

const rel = (f) => path.relative(SRC, f).split(path.sep).join('/');

function resolveSpec(from, spec) {
  let s = spec;
  if (s.startsWith('@/')) s = path.join(SRC, s.slice(2));
  else if (!s.startsWith('.')) return null;
  const b = path.isAbsolute(s) ? s : path.resolve(path.dirname(from), s);
  for (const c of [b, `${b}.ts`, `${b}.tsx`, path.join(b, 'index.ts'), path.join(b, 'index.tsx')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return rel(c);
  }
  return null;
}

function buildGraph() {
  const files = productionFiles();
  /** file → { decls, exports (exported → local name, or {file,name}), starFrom, imports (local → {file,name}) } */
  const info = {};
  /** node → the declarations that make up its body */
  const bodies = {};
  for (const f of files) {
    const r = rel(f);
    const sf = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const I = { decls: new Set(), exports: new Map(), starFrom: [], imports: new Map() };
    info[r] = I;
    const addBody = (name, node) => { (bodies[`${r}#${name}`] ||= []).push(node); };
    for (const st of sf.statements) {
      if (ts.isImportDeclaration(st)) {
        const tgt = resolveSpec(f, st.moduleSpecifier.text);
        if (!tgt) continue;
        const ic = st.importClause;
        if (!ic) { addBody('<module>', st); I.imports.set(`<side:${tgt}>`, { file: tgt, name: '<module>' }); continue; }
        if (ic.isTypeOnly) continue;
        if (ic.name) I.imports.set(ic.name.text, { file: tgt, name: 'default' });
        const nb = ic.namedBindings;
        if (nb && ts.isNamespaceImport(nb)) I.imports.set(nb.name.text, { file: tgt, name: '*' });
        if (nb && ts.isNamedImports(nb)) {
          for (const el of nb.elements) { if (!el.isTypeOnly) I.imports.set(el.name.text, { file: tgt, name: (el.propertyName || el.name).text }); }
        }
        continue;
      }
      if (ts.isExportDeclaration(st)) {
        if (st.isTypeOnly) continue;
        const tgt = st.moduleSpecifier ? resolveSpec(f, st.moduleSpecifier.text) : null;
        if (!st.exportClause) { if (tgt) I.starFrom.push(tgt); continue; }
        if (ts.isNamedExports(st.exportClause)) {
          for (const el of st.exportClause.elements) {
            if (el.isTypeOnly) continue;
            const local = (el.propertyName || el.name).text;
            I.exports.set(el.name.text, tgt ? { file: tgt, name: local } : local);
          }
        }
        continue;
      }
      const mods = st.modifiers ?? [];
      const isExp = mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      const isDefault = mods.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
      if (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) {
        const name = st.name ? st.name.text : 'default';
        I.decls.add(name); addBody(name, st);
        if (isExp) I.exports.set(isDefault ? 'default' : name, name);
        continue;
      }
      if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          const names = [];
          const collect = (b) => { if (ts.isIdentifier(b)) names.push(b.text); else if (b.elements) for (const e of b.elements) if (e.name) collect(e.name); };
          collect(d.name);
          for (const n of names) { I.decls.add(n); addBody(n, d); if (isExp) I.exports.set(n, n); }
        }
        continue;
      }
      if (ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isModuleDeclaration(st)) continue;
      if (ts.isExportAssignment(st)) { addBody('default', st); I.exports.set('default', 'default'); I.decls.add('default'); continue; }
      addBody('<module>', st); I.decls.add('<module>');
    }
  }

  /** An exported name of a file, followed through re-exports to its node. */
  function resolveExport(file, name, seen = new Set()) {
    const I = info[file];
    if (!I) return null;
    const key = `${file}#${name}`;
    if (seen.has(key)) return null;
    seen.add(key);
    if (name === '<module>') return `${file}#<module>`;
    const e = I.exports.get(name);
    if (typeof e === 'string') {
      if (!I.decls.has(e) && I.imports.has(e)) { const imp = I.imports.get(e); return imp.name === '*' ? null : resolveExport(imp.file, imp.name, seen); }
      return `${file}#${e}`;
    }
    if (e && typeof e === 'object') return resolveExport(e.file, e.name, seen);
    if (I.decls.has(name)) return `${file}#${name}`;
    for (const s of I.starFrom) { const r = resolveExport(s, name, seen); if (r) return r; }
    return null;
  }
  function allExports(file) {
    const I = info[file];
    if (!I) return [];
    const out = [];
    for (const k of I.exports.keys()) { const r = resolveExport(file, k); if (r) out.push(r); }
    for (const s of I.starFrom) out.push(...allExports(s));
    out.push(`${file}#<module>`);
    return out;
  }
  const collectProps = (root, v) => {
    const out = new Set();
    const w = (x) => { if (ts.isPropertyAccessExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === v) out.add(x.name.text); ts.forEachChild(x, w); };
    w(root);
    return out;
  };
  const bindingNames = (b) => b.elements.map((e) => (e.propertyName || e.name).text);
  /** The names a dynamic `import()` actually uses, or null when it cannot be
   *  narrowed (then every export counts). */
  function dynNames(call) {
    const p = call.parent;
    if (p && ts.isAwaitExpression(p)) {
      let q = p.parent;
      while (q && ts.isParenthesizedExpression(q)) q = q.parent;
      if (q && ts.isPropertyAccessExpression(q)) return [q.name.text];
      if (q && ts.isVariableDeclaration(q)) {
        if (ts.isObjectBindingPattern(q.name)) return bindingNames(q.name);
        if (ts.isIdentifier(q.name)) {
          let scope = q;
          while (scope.parent && !ts.isSourceFile(scope.parent) && !ts.isFunctionLike(scope)) scope = scope.parent;
          return [...collectProps(scope, q.name.text)];
        }
      }
      return null;
    }
    if (p && ts.isPropertyAccessExpression(p) && p.name.text === 'then' && p.parent && ts.isCallExpression(p.parent)) {
      const cb = p.parent.arguments[0];
      if (cb && (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) && cb.parameters[0]) {
        const prm = cb.parameters[0].name;
        if (ts.isObjectBindingPattern(prm)) return bindingNames(prm);
        if (ts.isIdentifier(prm)) return [...collectProps(cb.body, prm.text)];
      }
      return null;
    }
    return null;
  }

  // The board-computer registry: `readBoard('id')` reaches that id's row only.
  const REG = 'services/boardComputers.ts';
  const edges = {};
  const addE = (a, b) => { if (b) (edges[a] ||= new Set()).add(b); };
  for (const [node, list] of Object.entries(bodies)) {
    const [file] = node.split('#');
    const I = info[file];
    for (const [loc, v] of I.imports) if (loc.startsWith('<side:')) addE(`${file}#<module>`, resolveExport(v.file, '<module>'));
    const refFrom = (src) => {
      const visit = (n) => {
        if (!n) return;
        if (ts.isTypeNode(n) && !ts.isExpressionWithTypeArguments(n)) return;
        if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) return;
        if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) {
          const tgt = resolveSpec(path.join(SRC, file), n.arguments[0].text);
          if (tgt) {
            const names = dynNames(n);
            if (names === null) { for (const x of allExports(tgt)) addE(src, x); } else { for (const nm of names) addE(src, resolveExport(tgt, nm)); addE(src, `${tgt}#<module>`); }
          }
        }
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && (n.expression.text === 'readBoard' || n.expression.text === 'readBoardAll') && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) {
          const imp = I.imports.get(n.expression.text);
          if ((imp && imp.file === REG) || file === REG) {
            addE(src, `${REG}#id:${n.arguments[0].text}`);
            for (const a of n.arguments.slice(1)) visit(a);
            return;
          }
        }
        if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression)) {
          const imp = I.imports.get(n.expression.text);
          if (imp && imp.name === '*') { addE(src, resolveExport(imp.file, n.name.text)); return; }
        }
        if (ts.isIdentifier(n)) {
          const t = n.text;
          const p = n.parent;
          if (p && ts.isPropertyAccessExpression(p) && p.name === n) return;
          if (p && ts.isPropertyAssignment(p) && p.name === n) return;
          if (I.imports.has(t)) {
            const imp = I.imports.get(t);
            if (imp.name === '*') { for (const x of allExports(imp.file)) addE(src, x); } else addE(src, resolveExport(imp.file, imp.name));
          } else if (I.decls.has(t) && `${file}#${t}` !== src) addE(src, `${file}#${t}`);
          return;
        }
        ts.forEachChild(n, visit);
      };
      return visit;
    };
    if (file === REG && node === `${REG}#BOARD_COMPUTERS`) {
      // One node per registry id, so a read of one id never reaches the rest.
      for (const decl of list) {
        // `{ … } satisfies T` / `as T` / parentheses wrap the literal (P1-4
        // made it a `satisfies`, and every registry id read as unreached).
        let obj = decl.initializer;
        while (obj && (ts.isSatisfiesExpression(obj) || ts.isAsExpression(obj) || ts.isParenthesizedExpression(obj))) obj = obj.expression;
        if (!obj || !ts.isObjectLiteralExpression(obj)) throw new Error('BOARD_COMPUTERS is not an object literal — teach computer-reach its new shape');
        for (const prop of obj.properties) {
          if (!prop.name) continue;
          const idNode = `${REG}#id:${prop.name.text}`;
          const visit2 = (n) => {
            if (!n) return;
            if (ts.isTypeNode(n)) return;
            if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression)) {
              const imp = I.imports.get(n.expression.text);
              if (imp && imp.name === '*') { addE(idNode, resolveExport(imp.file, n.name.text)); return; }
            }
            if (ts.isIdentifier(n)) {
              const t = n.text;
              const p = n.parent;
              if (p && ts.isPropertyAccessExpression(p) && p.name === n) return;
              if (p && ts.isPropertyAssignment(p) && p.name === n) return;
              if (I.imports.has(t)) { const imp = I.imports.get(t); addE(idNode, resolveExport(imp.file, imp.name)); } else if (I.decls.has(t)) addE(idNode, `${REG}#${t}`);
              return;
            }
            ts.forEachChild(n, visit2);
          };
          visit2(prop);
        }
      }
      continue;
    }
    for (const b of list) refFrom(node)(b);
  }
  // The registry's accessors do not fan out to every computer.
  for (const k of ['readBoard', 'readBoardAll']) edges[`${REG}#${k}`]?.delete(`${REG}#BOARD_COMPUTERS`);
  const E = Object.fromEntries(Object.entries(edges).map(([k, v]) => [k, [...v]]));
  const exportNames = Object.fromEntries(Object.entries(info).map(([f, I]) => [f, [...I.exports.keys()]]));
  return { E, nodes: Object.keys(bodies), exportNames, fileCount: files.length };
}

// ── 2. reach from each surface's root ───────────────────────────────────────

const G = buildGraph();
const E = G.E;
const fileOf = (n) => n.split('#')[0];
const NODES = [...new Set([...G.nodes, ...Object.keys(E)])];
const nodesOfFile = (f) => NODES.filter((n) => fileOf(n) === f);
const files = (fs_) => fs_.flatMap(nodesOfFile);
function reach(rootNodes, barrierFiles = [], barrierNodes = []) {
  const bf = new Set(barrierFiles);
  const bn = new Set(barrierNodes);
  const seen = new Set();
  const st = [...rootNodes];
  while (st.length) {
    const n = st.pop();
    if (seen.has(n)) continue;
    seen.add(n);
    for (const m of E[n] ?? []) { if (!seen.has(m) && !bf.has(fileOf(m)) && !bn.has(m)) st.push(m); }
  }
  return seen;
}
const listDir = (dir, recursive) => {
  const out = [];
  const w = (d) => {
    for (const e of fs.readdirSync(path.join(SRC, d), { withFileTypes: true })) {
      if (e.isDirectory()) { if (recursive) w(`${d}/${e.name}`); } else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|measure|gate)\./.test(e.name)) out.push(`${d}/${e.name}`);
    }
  };
  w(dir);
  return out;
};

// The cuts: a path through another surface's door belongs to that surface.
const CHAT_BARRIER = ['coach/dispatchCoachTurn.ts', 'coach/coachService.ts', 'services/coachSessionRouter.ts', 'components/Coach/GameChatPanel.tsx', 'components/Coach/ChatInput.tsx'];
const CHAT_API_NODES = ['services/coachApi.ts#getCoachChatResponse'];
const BG = ['services/reviewNarrationBuild.ts', 'services/gameAnalysisService.ts', 'services/autoAnalyzeGame.ts'];
const BG_NODES = ['services/coachFeatureService.ts#generateReviewNarration'];
// Every record writer: reached only to write the record is not reached.
const REC = ['services/takenBackPuzzles.ts', 'services/learnGameRecord.ts', 'services/recordReprice.ts', 'services/misconceptionRulesBackfill.ts', 'services/liveStrength.ts', 'services/gameStrength.ts', 'hooks/useReviewBlunderCapture.ts', 'components/Coach/GameReviewWeaknessCapture.tsx', 'services/autoAnalyzeGame.ts'];
const REC_NODES = ['services/mistakePuzzleService.ts#generateMistakePuzzlesFromGame', 'services/mistakePuzzleService.ts#generateMistakePuzzlesForBatch', 'services/mistakePuzzleService.ts#addMistakePuzzleFromCapture', 'services/mistakePuzzleService.ts#addTakenBackMistakePuzzle', 'services/mistakePuzzleService.ts#buildMistakePuzzleFromCapture', 'services/mistakePuzzleService.ts#attachCalcLines', 'services/capabilityEvidence.ts#recordCapabilityEvidence', 'services/capabilityEvidence.ts#recordLaneEvidence', 'services/capabilityEvidence.ts#recordAnswerEvidence', 'services/capabilityEvidence.ts#capabilitiesPosed', 'services/capabilityEvidence.ts#capabilityOutcomes', 'services/misconceptionService.ts#logMisconception', 'services/discussionPractice.ts#captureMisconception', 'services/learnFocusRecord.ts#recordFocusAnswer', 'services/learnFocusRecord.ts#recordDecidingMiss', 'services/learnFocusRecord.ts#writeLearnFocusResult'];
const LESSON_FILES = ['services/openingGenerator.ts', 'hooks/useTeachWalkthrough.ts', 'services/generatedLesson.ts', 'services/walkthroughLesson.ts', 'components/Openings/GeneratedWatch.tsx', 'components/Openings/GeneratedReplyPlayer.tsx', 'components/Openings/GeneratedLinePlayer.tsx', 'services/narratedContinuation.ts', 'services/continuationMoveNarration.ts', 'services/walkthroughLlmNarrator.ts'];
const TAPPED = ['hooks/usePositionNarration.ts', 'services/positionReadComposer.ts', 'services/whyBestMove.ts', 'hooks/useHintSystem.ts'];
// The Learn page's other rooms (lessons, drills, thinking lessons, the
// Openings Play rung, chat): not Learn free play.
const LEARN_OTHER = ['hooks/useThinkingLesson.ts', 'components/Coach/ThinkingLessonBoard.tsx', 'components/Openings/OpeningPlayMode.tsx', 'components/Coach/MiddlegamePlanInline.tsx', 'services/middlegamePlanner.ts', 'services/coachDrillService.ts', 'services/puzzleService.ts', 'services/puzzleConceptExplanation.ts', 'services/mistakePuzzleService.ts', 'services/trainingAidRouter.ts', 'services/coachAgent.ts', 'services/walkthroughAdapter.ts', 'services/masterclassWalkthroughAdapter.ts', 'services/proForkWalkthrough.ts', 'data/voicedWalkthroughs.ts', 'services/sharedOpeningCache.ts', 'services/openingMatchup.ts', 'services/customLessonPlan.ts', 'services/coachCurriculumService.ts', 'services/playerGameRequest.ts', 'coach/tools/cerebellum/lookupPlayerGames.ts', 'services/walkthroughControlIntent.ts', 'services/coachMoveCommand.ts', 'services/danyaTeachingService.ts', 'services/coachApi.ts', 'services/openingIntentCapture.ts', 'services/coachNonAnswer.ts', 'services/navigationRouter.ts', 'services/classroomOpener.ts', 'services/stageEntryValidity.ts'];
const MISSIONS = [...listDir('missions', true), ...listDir('components/Campaign', false)];
const FOCUS = [...listDir('coach/focus', false), 'components/Coach/TeachGameOverCard.tsx', 'components/Coach/FocusBanner.tsx', 'components/Coach/LearnRewardBar.tsx'];

const S = {
  learnAll: reach(files(['components/Coach/CoachTeachPage.tsx']), [...REC, ...BG, ...CHAT_BARRIER, ...LESSON_FILES, ...TAPPED, ...LEARN_OTHER, ...MISSIONS], [...CHAT_API_NODES, ...BG_NODES, ...REC_NODES]),
  learnWired: reach(files(FOCUS), [...REC, ...BG, ...CHAT_BARRIER, ...LESSON_FILES, ...TAPPED, ...MISSIONS], [...CHAT_API_NODES, ...BG_NODES, ...REC_NODES]),
  review: reach(files(['components/Coach/CoachGameReview.tsx', 'components/Coach/CoachReviewSessionPage.tsx']), [...REC, ...CHAT_BARRIER, ...TAPPED, ...LESSON_FILES, 'components/Coach/CoachTeachPage.tsx'], [...CHAT_API_NODES, ...REC_NODES]),
  lesson: reach(files(LESSON_FILES), [...REC, ...BG, ...CHAT_BARRIER, 'components/Coach/CoachTeachPage.tsx'], [...CHAT_API_NODES, ...BG_NODES, ...REC_NODES]),
  chat: reach(['coach/dispatchCoachTurn.ts#dispatchCoachTurn', 'coach/coachService.ts#coachService', 'services/coachApi.ts#getCoachChatResponse', ...files(['coach/coachService.ts', 'coach/dispatchCoachTurn.ts', 'coach/chatTurnAnswers.ts', 'coach/boardTurnAnswer.ts'])], [...REC, ...BG, ...LESSON_FILES, 'components/Coach/CoachTeachPage.tsx'], [...BG_NODES, ...REC_NODES]),
  tapped: reach(files(TAPPED), [...REC, ...BG, ...CHAT_BARRIER, ...LESSON_FILES], [...CHAT_API_NODES, ...BG_NODES, ...REC_NODES]),
  tactics: reach(files([...listDir('components/Puzzles', false), ...listDir('components/Tactics', false)]), [...REC, ...BG, ...CHAT_BARRIER, ...LESSON_FILES, ...TAPPED], [...CHAT_API_NODES, ...BG_NODES, ...REC_NODES]),
  app: reach(files(['main.tsx'])),
};
// Screens outside the six — named so a "wired nowhere" row says where it does go.
const OTHER = {
  openingsPage: reach(files(listDir('components/Openings', true).filter((f) => !/Generated/.test(f))), [...REC, ...BG, ...CHAT_BARRIER, ...LESSON_FILES, ...TAPPED], [...CHAT_API_NODES, ...BG_NODES, ...REC_NODES]),
  kid: reach(files(listDir('components/Kid', true)), [...REC, ...BG], REC_NODES),
  campaign: reach(files(MISSIONS), [...REC, ...BG, ...CHAT_BARRIER], REC_NODES),
  playSilent: reach(files(['components/Coach/CoachGamePage.tsx']), [...REC, ...BG, ...CHAT_BARRIER, ...TAPPED], [...CHAT_API_NODES, ...REC_NODES]),
  insights: reach(files([...listDir('components/Insights', true), ...listDir('components/Dashboard', true)]), [...REC, ...BG, ...CHAT_BARRIER, ...TAPPED], [...CHAT_API_NODES, ...REC_NODES]),
  endgame: reach(files(['components/Coach/CoachEndgamePage.tsx', 'components/Coach/EndgameTrainerPage.tsx', 'components/Coach/EndgameLessonTab.tsx', 'components/Coach/EndgameTablebaseTrainer.tsx']), [...REC, ...BG, ...CHAT_BARRIER, ...TAPPED], [...CHAT_API_NODES, ...REC_NODES]),
};

// ── 3. each computer's standing ─────────────────────────────────────────────

const SURFACES = ['learn', 'review', 'lesson', 'chat', 'tapped', 'tactics'];
const REC_MARK = ['services/mistakePuzzleService.ts#generateMistakePuzzles', 'services/capabilityEvidence.ts#record', 'services/discussionPractice.ts#captureMisconception', 'services/learnFocusRecord.ts#record', 'services/takenBackPuzzles.ts', 'services/autoAnalyzeGame.ts', 'services/gameAnalysisService.ts', 'services/chesscomService.ts', 'services/lichessService.ts'];

/** The shortest app path to a computer, for a row on none of the six. */
function firstPath(targets) {
  const want = new Set(targets);
  const prev = new Map([['main.tsx#mountApp', null]]);
  const q = ['main.tsx#mountApp'];
  while (q.length) {
    const n = q.shift();
    if (want.has(n)) { const p = []; let x = n; while (x) { p.push(x); x = prev.get(x); } return p.reverse(); }
    for (const m of E[n] ?? []) { if (!prev.has(m)) { prev.set(m, n); q.push(m); } }
  }
  return null;
}

const computers = JSON.parse(fs.readFileSync(LIST, 'utf8'));
const known = new Set(NODES);
const rows = [];
const missing = [];
for (const c of computers) {
  const nodes = c.fn === '(module)' ? (G.exportNames[c.file] ?? []).map((e) => `${c.file}#${e}`) : c.nodes;
  // A row whose function or module is gone from the code is reported, never
  // silently counted as dead.
  if (nodes.length === 0 || !nodes.some((n) => known.has(n))) missing.push(`${c.file}#${c.fn}`);
  const any = (set) => nodes.some((n) => set.has(n));
  const st = {
    learn: any(S.learnWired) ? 'yes' : any(S.learnAll) ? 'held' : 'no',
    review: any(S.review) ? 'yes' : 'no',
    lesson: any(S.lesson) ? 'yes' : 'no',
    chat: any(S.chat) ? 'yes' : 'no',
    tapped: any(S.tapped) ? 'yes' : 'no',
    tactics: any(S.tactics) ? 'yes' : 'no',
  };
  // A standing read in the code that no static path shows (each carries why).
  if (c.learnOverride) st.learn = c.learnOverride.state;
  const app = any(S.app);
  const row = {
    key: `${c.file}#${c.fn}`, name: c.name, file: c.file, fn: c.fn, says: c.says, origin: c.origin,
    ...st, app, other: Object.keys(OTHER).filter((k) => any(OTHER[k])),
  };
  if (c.registry) row.registry = c.registry;
  if (c.folded) row.folded = c.folded;
  if (c.learnOverride) row.learnOverride = c.learnOverride.why;
  if (!SURFACES.some((s) => st[s] === 'yes')) {
    const p = app ? firstPath(nodes) : null;
    if (!p) row.where = 'dead (no production caller)';
    else {
      const page = p.find((x) => x.startsWith('components/') || x.startsWith('hooks/'));
      const rec = p.some((x) => REC_MARK.some((m) => x.startsWith(m)));
      row.where = `${rec ? 'record path only (' : ''}${page || p[2] || p[1]}${rec ? ')' : ''}`;
    }
  }
  rows.push(row);
}
rows.sort((a, b) => a.file.localeCompare(b.file) || a.fn.localeCompare(b.fn));

const count = (s, v) => rows.filter((r) => r[s] === v).length;
const nowhere = rows.filter((r) => SURFACES.every((s) => r[s] !== 'yes'));
const heldOnly = nowhere.filter((r) => r.learn === 'held');
const dead = nowhere.filter((r) => !r.app);
const elsewhere = nowhere.filter((r) => r.learn !== 'held' && r.app);
const report = {
  about: 'Which teaching computer reaches which surface, by a static call path from each surface root (scripts/computer-reach.mjs; the list is scripts/computer-reach/computers.json). learn: yes = through the focus runner, held = computed in a Learn turn and held by the door.',
  graph: { files: G.fileCount, nodes: NODES.length },
  totals: {
    computers: rows.length,
    wiredNowhere: nowhere.length,
    heldByLearnOnly: heldOnly.length,
    otherScreensOnly: elsewhere.length,
    dead: dead.length,
    missingFromCode: missing.length,
    surfaces: Object.fromEntries(SURFACES.map((s) => [s, { yes: count(s, 'yes'), ...(s === 'learn' ? { held: count(s, 'held') } : {}), no: count(s, 'no') }])),
  },
  wiredNowhere: {
    heldByLearnOnly: heldOnly.map((r) => r.key),
    otherScreensOnly: elsewhere.map((r) => r.key),
    dead: dead.map((r) => r.key),
  },
  missingFromCode: missing,
  computers: rows,
};
const text = `${JSON.stringify(report, null, 1)}\n`;
if (process.argv.includes('--verify')) {
  // The graph's size moves with any file added anywhere; only REACH is
  // gated, so a new file elsewhere never fails a push here.
  const reachOnly = (t) => (t ? JSON.stringify({ ...JSON.parse(t), graph: null }) : '');
  const committed = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const problems = [];
  if (missing.length) problems.push(`${missing.length} catalog row(s) name a computer the code no longer has: ${missing.join(', ')} — drop them from scripts/computer-reach/computers.json`);
  if (reachOnly(committed) !== reachOnly(text)) {
    const was = committed ? JSON.parse(committed) : { computers: [] };
    const old = new Map(was.computers.map((c) => [c.key, c]));
    const moved = [];
    for (const c of rows) {
      const o = old.get(c.key);
      if (!o) { moved.push(`${c.key} (new row)`); continue; }
      for (const s of SURFACES) if (o[s] !== c[s]) moved.push(`${c.key} ${s}: ${o[s]} → ${c[s]}`);
    }
    for (const k of old.keys()) if (!rows.some((c) => c.key === k)) moved.push(`${k} (row removed)`);
    problems.push(`docs/computer-reach.json is stale — run node scripts/computer-reach.mjs and commit it${moved.length ? `:\n    ${moved.slice(0, 40).join('\n    ')}${moved.length > 40 ? `\n    … and ${moved.length - 40} more` : ''}` : ' (totals or ordering moved)'}`);
  }
  if (problems.length) {
    console.error(`computer-reach --verify FAILED:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`computer-reach --verify: fresh (${rows.length} computers, ${nowhere.length} wired nowhere)`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, text);
console.log(`computer-reach: ${rows.length} computers, ${nowhere.length} wired nowhere (${heldOnly.length} held by Learn only, ${elsewhere.length} other screens only, ${dead.length} dead)${missing.length ? `, ${missing.length} MISSING from the code: ${missing.join(', ')}` : ''}`);
for (const s of SURFACES) console.log(`  ${s.padEnd(8)} yes ${count(s, 'yes')}${s === 'learn' ? ` held ${count(s, 'held')}` : ''} no ${count(s, 'no')}`);
console.log(`→ ${path.relative(ROOT, OUT)}`);
