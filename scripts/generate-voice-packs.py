#!/usr/bin/env python3
"""
Generate pre-built voice packs for all voices using Edge TTS (Microsoft Neural TTS).
Outputs per-voice binary packs to public/voices/{voiceId}.bin

Binary format:
  [count: uint32-LE]
  repeated: [hashLen: uint16-LE][hash: utf8][audioLen: uint32-LE][mp3Data: bytes]

Usage:
  python3 scripts/generate-voice-packs.py                  # all voices
  python3 scripts/generate-voice-packs.py --voice af_bella  # single voice
  python3 scripts/generate-voice-packs.py --test            # 5 phrases only
"""

import asyncio
import json
import os
import struct
import sys
import time

import edge_tts

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(SCRIPT_DIR, "..")
REPERTOIRE_PATH = os.path.join(ROOT, "src/data/repertoire.json")
OUT_DIR = os.path.join(ROOT, "public/voices")

# ---------------------------------------------------------------------------
# Voice mapping: Kokoro voice ID -> Edge TTS voice name
# ---------------------------------------------------------------------------
VOICE_MAP = {
    "af_heart":    "en-US-JennyNeural",
    "af_bella":    "en-US-AvaNeural",
    "af_nicole":   "en-US-AriaNeural",
    "af_sarah":    "en-US-MichelleNeural",
    "af_nova":     "en-US-EmmaNeural",
    "am_adam":     "en-US-AndrewNeural",
    "am_eric":     "en-US-EricNeural",
    "am_michael":  "en-US-ChristopherNeural",
    "am_liam":     "en-US-GuyNeural",
    "bf_emma":     "en-GB-SoniaNeural",
    "bf_isabella": "en-GB-LibbyNeural",
    "bm_daniel":   "en-GB-RyanNeural",
    "bm_george":   "en-GB-ThomasNeural",
}


# ---------------------------------------------------------------------------
# Hash function — MUST match voiceService.ts hashText() exactly
# ---------------------------------------------------------------------------
def hash_text(text: str) -> str:
    h = 0
    for ch in text:
        code = ord(ch)
        h = ((h << 5) - h) + code
        h &= 0xFFFFFFFF  # keep 32-bit
        if h >= 0x80000000:
            h -= 0x100000000  # sign
    return str(h)


# ---------------------------------------------------------------------------
# Collect phrases
# ---------------------------------------------------------------------------
def collect_phrases() -> list[str]:
    with open(REPERTOIRE_PATH, "r") as f:
        repertoire = json.load(f)

    phrases: set[str] = set()

    for opening in repertoire:
        # Overview (used in OpeningDetailPage narration)
        if opening.get("overview"):
            phrases.add(opening["overview"])

        # Key ideas
        for idea in opening.get("keyIdeas", []):
            phrases.add(idea)

        # Traps (text descriptions)
        for trap in opening.get("traps", []):
            phrases.add(trap)

        # Warnings (text descriptions)
        for warning in opening.get("warnings", []):
            phrases.add(warning)

        # Variation explanations + template messages
        for v in opening.get("variations", []):
            if v.get("explanation"):
                phrases.add(v["explanation"].replace("*", ""))
            phrases.add(f"Well done! You've completed the {v['name']} line.")
            phrases.add(f"Line discovered! You've learned the {v['name']}.")
            phrases.add(f"Line perfected! You know the {v['name']} by heart.")

        # Trap line explanations
        for t in opening.get("trapLines", []):
            if t.get("explanation"):
                phrases.add(t["explanation"].replace("*", ""))
            phrases.add(f"Well done! You've completed the {t['name']} line.")
            phrases.add(f"Line discovered! You've learned the {t['name']}.")

        # Warning line explanations
        for w in opening.get("warningLines", []):
            if w.get("explanation"):
                phrases.add(w["explanation"].replace("*", ""))
            phrases.add(f"Well done! You've completed the {w['name']} line.")
            phrases.add(f"Line discovered! You've learned the {w['name']}.")

        # Opening-level messages
        phrases.add(
            f"Let's play the {opening['name']}. Remember your key ideas and play confidently."
        )

    # Generic drill hints
    for hint in [
        "Castle to safety.",
        "Develop your knight.",
        "Develop your bishop.",
        "Bring your queen out.",
        "Activate your rook.",
        "Continue with the plan.",
    ]:
        phrases.add(hint)

    return sorted(phrases)


# ---------------------------------------------------------------------------
# Generate a single MP3 clip via Edge TTS
# ---------------------------------------------------------------------------
async def generate_clip(text: str, edge_voice: str) -> bytes:
    comm = edge_tts.Communicate(text, edge_voice)
    data = b""
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            data += chunk["data"]
    return data


# ---------------------------------------------------------------------------
# Pack clips into binary format (MP3 version)
# ---------------------------------------------------------------------------
def pack_voice_pack(clips: list[dict]) -> bytes:
    parts: list[bytes] = []
    # Header: count
    parts.append(struct.pack("<I", len(clips)))

    for clip in clips:
        hash_bytes = clip["hash"].encode("utf-8")
        mp3_data = clip["audio"]

        parts.append(struct.pack("<H", len(hash_bytes)))
        parts.append(hash_bytes)
        parts.append(struct.pack("<I", len(mp3_data)))
        parts.append(mp3_data)

    return b"".join(parts)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
async def main():
    args = sys.argv[1:]
    test_mode = "--test" in args
    voice_arg = None
    for i, a in enumerate(args):
        if a == "--voice" and i + 1 < len(args):
            voice_arg = args[i + 1]

    voices_to_gen = [voice_arg] if voice_arg else list(VOICE_MAP.keys())

    phrases = collect_phrases()
    print(f"Collected {len(phrases)} phrases")

    if test_mode:
        phrases = phrases[:5]
        print("TEST MODE — only 5 phrases")

    os.makedirs(OUT_DIR, exist_ok=True)

    for voice_id in voices_to_gen:
        edge_voice = VOICE_MAP.get(voice_id)
        if not edge_voice:
            print(f"Unknown voice: {voice_id}, skipping")
            continue

        print(f"\n{'='*60}")
        print(f"Generating: {voice_id} -> {edge_voice}")
        print(f"{'='*60}")

        clips = []
        start = time.time()
        errors = 0

        for i, text in enumerate(phrases):
            text_hash = hash_text(text)
            try:
                mp3_data = await generate_clip(text, edge_voice)
                clips.append({"hash": text_hash, "audio": mp3_data})
            except Exception as e:
                errors += 1
                print(f"  ERROR [{i+1}]: {str(e)[:80]}")
                continue

            if (i + 1) % 100 == 0 or i == len(phrases) - 1:
                elapsed = time.time() - start
                rate = (i + 1) / elapsed * 60
                eta = (len(phrases) - i - 1) / (rate / 60) / 60
                print(
                    f"  [{i+1}/{len(phrases)}] {elapsed:.0f}s elapsed, "
                    f"{rate:.0f}/min, ETA {eta:.1f}min"
                )

        elapsed = time.time() - start
        print(f"\n  Generated {len(clips)} clips in {elapsed:.0f}s ({errors} errors)")

        # Pack and write
        packed = pack_voice_pack(clips)
        out_path = os.path.join(OUT_DIR, f"{voice_id}.bin")
        with open(out_path, "wb") as f:
            f.write(packed)
        size_mb = len(packed) / 1024 / 1024
        print(f"  Written: {out_path} ({size_mb:.1f} MB, {len(clips)} clips)")

    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
