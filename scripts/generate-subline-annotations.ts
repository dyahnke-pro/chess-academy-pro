#!/usr/bin/env npx tsx
/**
 * Generate sub-line annotations for all 40 openings via Claude API.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/generate-subline-annotations.ts
 *
 * Options:
 *   --dry-run     Print what would be generated without calling API
 *   --opening=ID  Only generate for a specific opening (e.g., --opening=italian-game)
 *   --model=MODEL Use a specific model (default: claude-sonnet-4-20250514)
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { OPENING_ANNOTATION_ADDITION } from '../src/services/coachPrompts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ANNOTATIONS_DIR = path.join(__dirname, '../src/data/annotations');
const REPERTOIRE_PATH = path.join(__dirname, '../src/data/repertoire.json');

const GREEN_ARROW = 'rgba(0, 180, 80, 0.8)';
const BLUE_ARROW = 'rgba(0, 120, 255, 0.8)';
const RED_ARROW = 'rgba(255, 50, 50, 0.8)';
const ORANGE_ARROW = 'rgba(255, 165, 0, 0.8)';
const YELLOW_HIGHLIGHT = 'rgba(255, 255, 0, 0.4)';
const RED_HIGHLIGHT = 'rgba(255, 50, 50, 0.3)';
const GREEN_HIGHLIGHT = 'rgba(0, 180, 80, 0.3)';

interface Arrow {
  from: string;
  to: string;
  color: string;
}

interface Highlight {
  square: string;
  color: string;
}

interface MoveAnnotation {
  san: string;
  annotation: string;
  pawnStructure?: string;
  plans?: string[];
  alternatives?: string[];
  arrows: Arrow[];
  highlights: Highlight[];
}

interface SubLineAnnotation {
  name: string;
  moveAnnotations: MoveAnnotation[];
}

interface OpeningAnnotations {
  openingId: string;
  moveAnnotations: MoveAnnotation[];
  subLines?: SubLineAnnotation[];
}

interface Variation {
  name: string;
  pgn: string;
  explanation?: string;
}

interface Opening {
  id: string;
  name: string;
  pgn: string;
  variations?: Variation[];
}

const SYSTEM_PROMPT = `You are an expert chess instructor creating detailed move-by-move annotations for chess openings. Your annotations will be displayed in a training app alongside an interactive chessboard.

${OPENING_ANNOTATION_ADDITION}

For EACH move in the PGN, provide:
1. **annotation**: Follow the 3-part structure above (name the opening/variation, explain the move's concrete purpose, give one actionable next idea). Keep to 2-3 sentences.
2. **pawnStructure** (optional): If the move changes or defines the pawn structure, explain what it looks like and its implications
3. **plans** (optional): 1-2 bullet points about what comes next strategically
4. **alternatives** (optional): 1-2 notable alternative moves and why they lead to different positions
5. **arrows**: 1-3 arrows showing the key idea visually (piece targets, control lines, future plans)
6. **highlights**: 0-2 square highlights for key squares (controlled squares, weak points, outposts)

Arrow colors (use these exact RGBA values):
- Green "rgba(0, 180, 80, 0.8)" — main purpose of the move (piece targeting a square, pawn controlling center)
- Blue "rgba(0, 120, 255, 0.8)" — future plans (where pieces will go, planned pawn breaks)
- Red "rgba(255, 50, 50, 0.8)" — threats (attacks, opponent dangers)
- Orange "rgba(255, 165, 0, 0.8)" — alternatives

Highlight colors:
- Yellow "rgba(255, 255, 0, 0.4)" — key contested/controlled squares
- Red "rgba(255, 50, 50, 0.3)" — weak squares, vulnerabilities
- Green "rgba(0, 180, 80, 0.3)" — strong outposts, safe positions

CRITICAL RULES:
- Arrow squares MUST be valid for the CURRENT board position (after the move is played)
- Track piece positions mentally as you go through the PGN
- The "from" and "to" in arrows must reference squares where pieces actually are, or squares being controlled/targeted
- Don't be generic — reference specific squares, pieces, and concrete plans

Return ONLY valid JSON matching this exact structure:
{
  "moveAnnotations": [
    {
      "san": "e4",
      "annotation": "...",
      "pawnStructure": "...",
      "plans": ["...", "..."],
      "alternatives": ["..."],
      "arrows": [{"from": "e4", "to": "d5", "color": "rgba(0, 180, 80, 0.8)"}],
      "highlights": [{"square": "d5", "color": "rgba(255, 255, 0, 0.4)"}]
    }
  ]
}`;

function parsePgnMoves(pgn: string): string[] {
  // Remove move numbers and dots, split into individual moves
  return pgn
    .replace(/\d+\.\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(m => m.length > 0 && m !== '...');
}

async function generateAnnotations(
  client: Anthropic,
  openingName: string,
  variationName: string,
  pgn: string,
  explanation: string | undefined,
  model: string
): Promise<MoveAnnotation[]> {
  const moves = parsePgnMoves(pgn);

  // Build per-move context: move number, whose turn, and the last 4 moves in SAN
  const moveContextLines: string[] = [];
  for (let i = 0; i < moves.length; i++) {
    const fullMoveNum = Math.floor(i / 2) + 1;
    const isWhite = i % 2 === 0;
    const turn = isWhite ? 'White' : 'Black';
    const last4Start = Math.max(0, i - 3);
    const last4 = moves.slice(last4Start, i + 1).join(' ');
    moveContextLines.push(`  Move ${i + 1}: ${moves[i]} (${turn}, move ${fullMoveNum}) — recent moves: ${last4}`);
  }

  const userPrompt = `Annotate every move in this chess opening variation:

Opening: ${openingName}
Variation: ${variationName}
PGN: ${pgn}
${explanation ? `Context: ${explanation}` : ''}

There are ${moves.length} moves. You must return exactly ${moves.length} annotations, one per move, in order.

Per-move context (use this to track whose turn it is and recent move history):
${moveContextLines.join('\n')}

IMPORTANT REMINDERS:
- For each annotation, ALWAYS start by naming "${openingName}" and the "${variationName}" variation
- Explain what THIS specific move accomplishes tactically or strategically (no generic phrases)
- End with one concrete, actionable idea for the next 2-3 moves
- Track the board position as you annotate. Arrows must reference valid squares for the current position.`;

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON found in response for ${openingName} / ${variationName}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const annotations: MoveAnnotation[] = parsed.moveAnnotations;

  // Validate move count matches
  if (annotations.length !== moves.length) {
    console.warn(`  ⚠️  Expected ${moves.length} annotations, got ${annotations.length} for ${variationName}`);
  }

  // Ensure san fields match
  for (let i = 0; i < Math.min(annotations.length, moves.length); i++) {
    if (annotations[i].san !== moves[i]) {
      console.warn(`  ⚠️  Move mismatch at index ${i}: expected "${moves[i]}", got "${annotations[i].san}"`);
      annotations[i].san = moves[i]; // Fix it
    }
  }

  return annotations;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const openingFilter = args.find(a => a.startsWith('--opening='))?.split('=')[1];
  const model = args.find(a => a.startsWith('--model='))?.split('=')[1] || 'claude-sonnet-4-20250514';

  if (!dryRun && !process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Set ANTHROPIC_API_KEY environment variable');
    process.exit(1);
  }

  const client = dryRun ? null : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Load repertoire
  const repertoire: Opening[] = JSON.parse(fs.readFileSync(REPERTOIRE_PATH, 'utf-8'));

  // Filter openings
  const openings = openingFilter
    ? repertoire.filter(o => o.id === openingFilter)
    : repertoire.filter(o => o.variations && o.variations.length > 0);

  if (openings.length === 0) {
    console.error('❌ No openings found' + (openingFilter ? ` matching "${openingFilter}"` : ' with variations'));
    process.exit(1);
  }

  // Count total work
  let totalVariations = 0;
  let totalMoves = 0;
  for (const opening of openings) {
    for (const v of opening.variations || []) {
      totalVariations++;
      totalMoves += parsePgnMoves(v.pgn).length;
    }
  }

  console.log(`\n🎯 Generating annotations for ${totalVariations} sub-lines across ${openings.length} openings`);
  console.log(`📝 Total moves to annotate: ${totalMoves}`);
  console.log(`🤖 Model: ${model}`);
  console.log(`💰 Estimated cost: ~$${(totalMoves * 0.003).toFixed(2)} (rough estimate)\n`);

  if (dryRun) {
    for (const opening of openings) {
      console.log(`${opening.name} (${opening.id}):`);
      for (const v of opening.variations || []) {
        const moves = parsePgnMoves(v.pgn);
        console.log(`  - ${v.name}: ${moves.length} moves`);
      }
    }
    console.log('\n✅ Dry run complete. Remove --dry-run to generate.');
    return;
  }

  const CONCURRENCY = args.find(a => a.startsWith('--concurrency='))
    ? parseInt(args.find(a => a.startsWith('--concurrency='))!.split('=')[1])
    : 5;

  let completed = 0;
  let failed = 0;
  let skipped = 0;
  const startTime = Date.now();

  // Process a single opening (all its variations sequentially, then save)
  async function processOpening(opening: Opening): Promise<void> {
    const annotationFile = path.join(ANNOTATIONS_DIR, `${opening.id}.json`);

    let existingData: OpeningAnnotations;
    if (fs.existsSync(annotationFile)) {
      existingData = JSON.parse(fs.readFileSync(annotationFile, 'utf-8'));
    } else {
      console.warn(`⚠️  No annotation file for ${opening.id}, skipping`);
      return;
    }

    const existingSubLines = Array.isArray(existingData.subLines) ? existingData.subLines : [];
    const variations = opening.variations || [];

    // Check if ALL variations are already done
    const allDone = variations.every(v => {
      const existing = existingSubLines.find(s => s.name === v.name);
      return existing && existing.moveAnnotations && existing.moveAnnotations.length > 0;
    });
    if (allDone) {
      skipped += variations.length;
      console.log(`⏭️  ${opening.name} — all ${variations.length} variations already done`);
      return;
    }

    console.log(`\n📖 ${opening.name} (${variations.length} variations)`);

    const newSubLines: SubLineAnnotation[] = [];

    for (const variation of variations) {
      const existing = existingSubLines.find(s => s.name === variation.name);
      if (existing && existing.moveAnnotations && existing.moveAnnotations.length > 0) {
        console.log(`  ✅ ${variation.name} — already done (${existing.moveAnnotations.length} moves)`);
        newSubLines.push(existing);
        skipped++;
        continue;
      }

      const moves = parsePgnMoves(variation.pgn);
      console.log(`  🔄 ${variation.name} (${moves.length} moves)...`);

      try {
        const annotations = await generateAnnotations(
          client!,
          opening.name,
          variation.name,
          variation.pgn,
          variation.explanation,
          model
        );

        newSubLines.push({
          name: variation.name,
          moveAnnotations: annotations,
        });

        completed++;
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        const total = completed + failed;
        const remaining = totalVariations - total - skipped;
        const avgTime = (Date.now() - startTime) / total / 1000;
        const etaMins = ((remaining * avgTime) / 60 / CONCURRENCY).toFixed(0);
        console.log(`  ✅ ${variation.name} — ${annotations.length} annotations | Progress: ${total}/${totalVariations - skipped} (${Math.round(total/(totalVariations-skipped)*100)}%) | ETA: ~${etaMins}min`);

      } catch (err: unknown) {
        failed++;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ❌ ${variation.name} — FAILED: ${message}`);

        newSubLines.push({
          name: variation.name,
          moveAnnotations: [],
        });
      }
    }

    existingData.subLines = newSubLines;
    fs.writeFileSync(annotationFile, JSON.stringify(existingData, null, 2) + '\n');
    console.log(`  💾 Saved ${opening.id}.json`);
  }

  // Process openings in batches of CONCURRENCY
  console.log(`\n🚀 Running with concurrency: ${CONCURRENCY}\n`);

  for (let i = 0; i < openings.length; i += CONCURRENCY) {
    const batch = openings.slice(i, i + CONCURRENCY);
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`📦 Batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(openings.length / CONCURRENCY)}: ${batch.map(o => o.id).join(', ')}`);
    console.log(`${'─'.repeat(50)}`);

    await Promise.all(batch.map(opening => processOpening(opening)));
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Completed: ${completed}`);
  console.log(`⏭️  Skipped (already done): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total time: ${totalTime} minutes`);
  console.log(`📊 Total: ${completed + skipped} / ${totalVariations}`);
  console.log(`${'='.repeat(50)}\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
