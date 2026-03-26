#!/usr/bin/env node
// Voice Pack Coverage Audit
// Compares required TTS phrases from app data against clips in a .bin voice pack.
//
// Usage:
//   npm run audit:voice                          # audit default voice (af_bella)
//   npm run audit:voice -- --voice af_heart      # audit a specific voice
//   npm run audit:voice -- --bin path/to/file.bin # audit a specific .bin file
//
// Output:
//   - Coverage report to stdout
//   - voice_packs/missing_clips.txt (one phrase per line)

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');
const VOICE_PACKS_DIR = join(ROOT, 'voice_packs');

// ---------- Hash function (must match voicePackService.ts hashText) ----------

function hashText(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h = ((h << 5) - h) + code;
    h |= 0; // signed 32-bit
  }
  return String(h);
}

// ---------- Parse .bin voice pack to extract stored hashes ----------

function parseBinHashes(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const hashes = new Set();
  let offset = 0;

  const count = view.getUint32(offset, true);
  offset += 4;

  for (let i = 0; i < count; i++) {
    const hashLen = view.getUint16(offset, true);
    offset += 2;

    const hashBytes = buffer.subarray(offset, offset + hashLen);
    const hash = new TextDecoder().decode(hashBytes);
    hashes.add(hash);
    offset += hashLen;

    const audioLen = view.getUint32(offset, true);
    offset += 4;
    offset += audioLen; // skip audio data
  }

  return hashes;
}

// ---------- Collect phrases from data sources ----------

function collectOpeningPhrases(opening) {
  const phrases = new Set();

  if (opening.overview) phrases.add(opening.overview);

  for (const idea of opening.keyIdeas ?? []) phrases.add(idea);
  for (const trap of opening.traps ?? []) phrases.add(trap);
  for (const warning of opening.warnings ?? []) phrases.add(warning);

  for (const v of opening.variations ?? []) {
    if (v.explanation) phrases.add(v.explanation.replace(/\*/g, ''));
    phrases.add(`Well done! You've completed the ${v.name} line.`);
    phrases.add(`Line discovered! You've learned the ${v.name}.`);
    phrases.add(`Line perfected! You know the ${v.name} by heart.`);
  }

  for (const t of opening.trapLines ?? []) {
    if (t.explanation) phrases.add(t.explanation.replace(/\*/g, ''));
    phrases.add(`Well done! You've completed the ${t.name} line.`);
    phrases.add(`Line discovered! You've learned the ${t.name}.`);
  }

  for (const w of opening.warningLines ?? []) {
    if (w.explanation) phrases.add(w.explanation.replace(/\*/g, ''));
    phrases.add(`Well done! You've completed the ${w.name} line.`);
    phrases.add(`Line discovered! You've learned the ${w.name}.`);
  }

  phrases.add(`Let's play the ${opening.name}. Remember your key ideas and play confidently.`);

  return phrases;
}

function collectAllPhrases() {
  const phrases = new Set();

  // 1. Curated repertoire openings
  const repertoire = JSON.parse(readFileSync(join(DATA_DIR, 'repertoire.json'), 'utf-8'));
  let repCount = 0;
  for (const opening of repertoire) {
    const p = collectOpeningPhrases(opening);
    repCount += p.size;
    for (const phrase of p) phrases.add(phrase);
  }

  // 2. Pro repertoire openings
  let proCount = 0;
  const proPath = join(DATA_DIR, 'pro-repertoires.json');
  if (existsSync(proPath)) {
    const proData = JSON.parse(readFileSync(proPath, 'utf-8'));
    for (const opening of proData.openings ?? []) {
      const p = collectOpeningPhrases(opening);
      proCount += p.size;
      for (const phrase of p) phrases.add(phrase);
    }
  }

  // 3. Walkthrough annotations (individual JSON files)
  let annoCount = 0;
  const annotationsDir = join(DATA_DIR, 'annotations');
  if (existsSync(annotationsDir)) {
    const files = readdirSync(annotationsDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const data = JSON.parse(readFileSync(join(annotationsDir, file), 'utf-8'));
      for (const move of data.moveAnnotations ?? []) {
        if (move.annotation) {
          phrases.add(move.annotation);
          annoCount++;
        }
      }
    }
  }

  // 4. annotations-all.json (if present, e.g. built for Colab)
  const annoAllPath = join(DATA_DIR, 'annotations-all.json');
  if (existsSync(annoAllPath)) {
    const annoAll = JSON.parse(readFileSync(annoAllPath, 'utf-8'));
    for (const moves of Object.values(annoAll)) {
      for (const move of moves) {
        if (move.annotation) {
          phrases.add(move.annotation);
          annoCount++;
        }
      }
    }
  }

  // 5. Generic drill hints (same as Colab notebook)
  const genericHints = [
    'Castle to safety.',
    'Develop your knight.',
    'Develop your bishop.',
    'Bring your queen out.',
    'Activate your rook.',
    'Continue with the plan.',
  ];
  for (const hint of genericHints) phrases.add(hint);

  return { phrases, repCount, proCount, annoCount, genericCount: genericHints.length };
}

// ---------- CLI ----------

function parseArgs() {
  const args = process.argv.slice(2);
  let voice = 'af_bella';
  let binPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--voice' && args[i + 1]) {
      voice = args[++i];
    } else if (args[i] === '--bin' && args[i + 1]) {
      binPath = args[++i];
    }
  }

  if (!binPath) {
    binPath = join(VOICE_PACKS_DIR, `${voice}.bin`);
  }

  return { voice, binPath };
}

function main() {
  const { voice, binPath } = parseArgs();

  console.log('Voice Pack Coverage Audit');
  console.log('========================\n');

  // Collect all required phrases
  console.log('Collecting phrases from app data...');
  const { phrases, repCount, proCount, annoCount, genericCount } = collectAllPhrases();
  const phraseList = [...phrases].sort();

  console.log(`  Repertoire openings:     ${repCount} phrases (before dedup)`);
  console.log(`  Pro repertoire openings: ${proCount} phrases (before dedup)`);
  console.log(`  Walkthrough annotations: ${annoCount} phrases (before dedup)`);
  console.log(`  Generic hints:           ${genericCount}`);
  console.log(`  Total unique phrases:    ${phraseList.length}\n`);

  // Hash all phrases
  const requiredHashes = new Map();
  for (const phrase of phraseList) {
    requiredHashes.set(hashText(phrase), phrase);
  }

  // Check voice pack
  if (!existsSync(binPath)) {
    console.log(`Voice pack not found: ${binPath}`);
    console.log('Generating missing_clips.txt with ALL phrases (0% coverage).\n');

    if (!existsSync(VOICE_PACKS_DIR)) mkdirSync(VOICE_PACKS_DIR, { recursive: true });
    writeFileSync(join(VOICE_PACKS_DIR, 'missing_clips.txt'), phraseList.join('\n') + '\n');
    console.log(`Wrote ${phraseList.length} phrases to voice_packs/missing_clips.txt`);
    process.exit(0);
  }

  console.log(`Parsing voice pack: ${binPath}`);
  const binData = readFileSync(binPath);
  const packHashes = parseBinHashes(binData);
  console.log(`  Clips in pack: ${packHashes.size}\n`);

  // Compare
  const missing = [];
  let covered = 0;
  for (const [hash, phrase] of requiredHashes) {
    if (packHashes.has(hash)) {
      covered++;
    } else {
      missing.push(phrase);
    }
  }

  // Extra clips in pack but not in required set
  let extraClips = 0;
  for (const hash of packHashes) {
    if (!requiredHashes.has(hash)) extraClips++;
  }

  const total = requiredHashes.size;
  const pct = total > 0 ? ((covered / total) * 100).toFixed(1) : '0.0';

  console.log('Coverage Report');
  console.log('---------------');
  console.log(`  Voice:           ${voice}`);
  console.log(`  Required clips:  ${total}`);
  console.log(`  Found clips:     ${covered}`);
  console.log(`  Missing clips:   ${missing.length}`);
  console.log(`  Extra clips:     ${extraClips} (in pack but not in current data)`);
  console.log(`  Coverage:        ${pct}%\n`);

  // Write missing clips
  if (!existsSync(VOICE_PACKS_DIR)) mkdirSync(VOICE_PACKS_DIR, { recursive: true });
  const missingPath = join(VOICE_PACKS_DIR, 'missing_clips.txt');
  writeFileSync(missingPath, missing.join('\n') + (missing.length > 0 ? '\n' : ''));
  console.log(`Wrote ${missing.length} missing phrases to voice_packs/missing_clips.txt`);

  if (missing.length > 0) {
    console.log('\nFirst 10 missing phrases:');
    for (const phrase of missing.slice(0, 10)) {
      console.log(`  - "${phrase.slice(0, 80)}${phrase.length > 80 ? '...' : ''}"`);
    }
    if (missing.length > 10) {
      console.log(`  ... and ${missing.length - 10} more`);
    }
  }

  // Exit with non-zero if coverage < 100%
  if (missing.length > 0) {
    process.exit(1);
  }
}

main();
