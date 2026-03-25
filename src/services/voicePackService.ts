// Download and install pre-generated voice packs from GitHub Releases.
// Voice packs are binary files containing pre-generated WAV/MP3 audio clips.
// Format: [count(uint32)] then repeated [hashLen(uint16)][hash][audioLen(uint32)][audioData]

import { db } from '../db/schema';

const VOICE_PACK_BASE_URL = 'https://github.com/dyahnke-pro/chess-academy-pro/releases/download/voice-packs-v1';

type ProgressCallback = (done: number, total: number) => void;

/** Download and install a voice pack, storing MP3 clips in audioCache */
export async function installVoicePack(
  voiceId: string,
  onProgress?: ProgressCallback,
): Promise<{ installed: number }> {
  const url = `${VOICE_PACK_BASE_URL}/${voiceId}.bin`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download voice pack: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const dataView = new DataView(arrayBuffer);
  let offset = 0;

  // Read count
  const count = dataView.getUint32(offset, true);
  offset += 4;

  onProgress?.(0, count);

  // Clear existing clips for this voice
  await db.audioCache.where('voiceId').equals(voiceId).delete();

  // Read and store each clip in batches
  let installed = 0;
  const BATCH_SIZE = 100;
  let batch: Array<{ textHash: string; audio: ArrayBuffer; voiceId: string; timestamp: number }> = [];

  for (let i = 0; i < count; i++) {
    // Read hash
    const hashLen = dataView.getUint16(offset, true);
    offset += 2;
    const hashBytes = new Uint8Array(arrayBuffer, offset, hashLen);
    const hash = new TextDecoder().decode(hashBytes);
    offset += hashLen;

    // Read MP3 data (audioLen is byte length of MP3)
    const audioLen = dataView.getUint32(offset, true);
    offset += 4;

    // Copy MP3 bytes into a new ArrayBuffer
    const mp3Data = arrayBuffer.slice(offset, offset + audioLen);
    offset += audioLen;

    batch.push({
      textHash: hash,
      audio: mp3Data,
      voiceId,
      timestamp: Date.now(),
    });

    if (batch.length >= BATCH_SIZE || i === count - 1) {
      await db.audioCache.bulkPut(batch);
      installed += batch.length;
      batch = [];
      onProgress?.(installed, count);
    }
  }

  return { installed };
}

/** Check if a voice pack is available on the server */
export async function isVoicePackAvailable(voiceId: string): Promise<boolean> {
  try {
    const response = await fetch(`${VOICE_PACK_BASE_URL}/${voiceId}.bin`, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/** Check how many clips are cached for a given voice */
export async function getVoiceCacheCount(voiceId: string): Promise<number> {
  return db.audioCache.where('voiceId').equals(voiceId).count();
}
