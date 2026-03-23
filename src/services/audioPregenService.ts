// Pre-generate Kokoro TTS audio for all opening phrases and cache in IndexedDB.
// Runs silently in the background after the Kokoro model loads.

import { kokoroService } from './kokoroService';
import { db } from '../db/schema';
/** Simple hash matching voiceService */
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return String(hash);
}

type ProgressCallback = (done: number, total: number) => void;

/** Collect all deterministic phrases spoken in openings */
async function collectOpeningPhrases(): Promise<string[]> {
  const openings = await db.openings.filter(o => o.isRepertoire === true).toArray();
  const phrases: string[] = [];

  for (const opening of openings) {
    // Overview
    if (opening.overview) {
      phrases.push(opening.overview);
    }

    // Variation explanations + completion messages
    if (opening.variations) {
      for (const v of opening.variations) {
        if (v.explanation) {
          // Strip italic markers for speech (same as DrillMode)
          phrases.push(v.explanation.replace(/\*/g, ''));
        }
        // Line completion messages
        phrases.push(`Well done! You've completed the ${v.name} line.`);
        phrases.push(`Line discovered! You've learned the ${v.name}.`);
        phrases.push(`Line perfected! You know the ${v.name} by heart.`);
      }
    }

    // Trap line explanations
    if (opening.trapLines) {
      for (const t of opening.trapLines) {
        if (t.explanation) {
          phrases.push(t.explanation.replace(/\*/g, ''));
        }
        phrases.push(`Well done! You've completed the ${t.name} line.`);
        phrases.push(`Line discovered! You've learned the ${t.name}.`);
      }
    }

    // Warning line explanations
    if (opening.warningLines) {
      for (const w of opening.warningLines) {
        if (w.explanation) {
          phrases.push(w.explanation.replace(/\*/g, ''));
        }
        phrases.push(`Well done! You've completed the ${w.name} line.`);
        phrases.push(`Line discovered! You've learned the ${w.name}.`);
      }
    }

    // Play mode intro
    const displayName = opening.name;
    phrases.push(`Let's play the ${displayName}. Remember your key ideas and play confidently.`);
  }

  // Auto-generated move explanations (common templates)
  const commonMoves = [
    'Castle to safety.',
    'Develop your knight.',
    'Develop your bishop.',
    'Bring your queen out.',
    'Activate your rook.',
    'Continue with the plan.',
  ];
  phrases.push(...commonMoves);

  // Deduplicate
  return [...new Set(phrases)];
}

/** Pre-generate audio for all phrases, skipping already-cached ones */
export async function pregenerateOpeningAudio(
  voiceId: string,
  speed: number = 1.0,
  onProgress?: ProgressCallback,
): Promise<{ generated: number; skipped: number; failed: number }> {
  if (!kokoroService.isReady()) {
    throw new Error('Kokoro model not loaded');
  }

  const phrases = await collectOpeningPhrases();
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < phrases.length; i++) {
    const text = phrases[i];
    const textHash = hashText(text);

    // Skip if already cached
    const existing = await db.audioCache.get(textHash);
    if (existing) {
      skipped++;
      onProgress?.(i + 1, phrases.length);
      continue;
    }

    // Generate and cache
    try {
      const result = await kokoroService.generate(text, voiceId, speed);
      const audioBuffer = result.audio.buffer as ArrayBuffer;

      await db.audioCache.put({
        textHash,
        audio: audioBuffer,
        voiceId,
        timestamp: Date.now(),
      });

      generated++;
    } catch (error) {
      console.warn(`[AudioPregen] Failed to generate "${text.slice(0, 50)}...":`, error);
      failed++;
    }

    onProgress?.(i + 1, phrases.length);
  }

  return { generated, skipped, failed };
}

/** Get total phrases that need generation */
export async function getPregenerationStats(): Promise<{ total: number; cached: number }> {
  const phrases = await collectOpeningPhrases();
  let cached = 0;

  for (const text of phrases) {
    const existing = await db.audioCache.get(hashText(text));
    if (existing) cached++;
  }

  return { total: phrases.length, cached };
}

/** Export for testing */
export { collectOpeningPhrases };
