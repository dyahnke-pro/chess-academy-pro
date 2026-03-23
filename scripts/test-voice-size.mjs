#!/usr/bin/env node
// Quick test: generate 20 phrases with Kokoro and measure actual clip sizes

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const data = JSON.parse(readFileSync(join(ROOT, 'src/data/repertoire.json'), 'utf-8'));

// Mix of short and long phrases
const testPhrases = [
  'Castle to safety.',
  'Develop your knight.',
  "Well done! You've completed the Vienna Gambit line.",
  "Line discovered! You've learned the Sicilian Dragon.",
  "Line perfected! You know the Queen's Gambit by heart.",
  "Let's play the Vienna Game. Remember your key ideas and play confidently.",
  data[0].variations[0].explanation.replace(/\*/g, ''),
  data[0].variations[1].explanation.replace(/\*/g, ''),
  data[1].variations[0].explanation.replace(/\*/g, ''),
  data[2].variations[0].explanation.replace(/\*/g, ''),
  data[5].variations[0].explanation.replace(/\*/g, ''),
  data[10].variations[0].explanation.replace(/\*/g, ''),
  data[15].variations[0].explanation.replace(/\*/g, ''),
  data[20].variations[0].explanation.replace(/\*/g, ''),
  data[25].variations[0].explanation.replace(/\*/g, ''),
  data[30].variations[0].explanation.replace(/\*/g, ''),
  data[0].overview,
  data[5].overview,
  data[10].overview,
  data[20].overview,
];

async function main() {
  console.log('Loading Kokoro model...');
  const { KokoroTTS } = await import('kokoro-js');
  const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
    dtype: 'q8',
    device: 'cpu',
  });
  console.log('Model loaded!\n');

  let totalSamples = 0;
  let totalChars = 0;
  const startTime = Date.now();

  for (let i = 0; i < testPhrases.length; i++) {
    const text = testPhrases[i];
    const t0 = Date.now();
    const result = await tts.generate(text, { voice: 'af_bella', speed: 1.0 });
    const elapsed = Date.now() - t0;

    const samples = result.audio.length;
    const durationSec = samples / 24000;
    const rawSizeKB = (samples * 2) / 1024; // Int16
    const float32KB = (samples * 4) / 1024;

    totalSamples += samples;
    totalChars += text.length;

    console.log(`[${i+1}/${testPhrases.length}] ${text.length} chars → ${durationSec.toFixed(1)}s audio, ${rawSizeKB.toFixed(0)}KB Int16, generated in ${elapsed}ms`);
  }

  const totalElapsed = (Date.now() - startTime) / 1000;
  const avgSamplesPerPhrase = totalSamples / testPhrases.length;
  const avgDuration = avgSamplesPerPhrase / 24000;
  const avgInt16KB = (avgSamplesPerPhrase * 2) / 1024;

  console.log(`\n=== SUMMARY ===`);
  console.log(`Phrases tested: ${testPhrases.length}`);
  console.log(`Total generation time: ${totalElapsed.toFixed(1)}s (${(totalElapsed / testPhrases.length).toFixed(2)}s/phrase)`);
  console.log(`Avg chars: ${(totalChars / testPhrases.length).toFixed(0)}`);
  console.log(`Avg audio duration: ${avgDuration.toFixed(1)}s`);
  console.log(`Avg clip size (Int16): ${avgInt16KB.toFixed(0)} KB`);
  console.log(`\n=== EXTRAPOLATION (7105 phrases) ===`);
  console.log(`Est generation time: ${((totalElapsed / testPhrases.length) * 7105 / 3600).toFixed(1)} hours per voice`);
  console.log(`Est raw pack size (Int16): ${(avgInt16KB * 7105 / 1024).toFixed(0)} MB per voice`);
  console.log(`Est total for 13 voices: ${(avgInt16KB * 7105 * 13 / 1024 / 1024).toFixed(1)} GB`);
}

main().catch(console.error);
