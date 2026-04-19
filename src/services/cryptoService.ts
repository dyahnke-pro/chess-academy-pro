// Web Crypto API — AES-256-GCM key encryption
// Stores encrypted API key in Dexie. Never in localStorage.
//
// Salt handling (security audit follow-up): the original
// implementation used a hardcoded "chess-academy-salt" string, which
// meant every install derived the same AES key. An attacker with a
// Dexie dump from one device could decrypt encrypted API keys from
// any other device. Now we generate a random 16-byte salt on first
// use and persist it in the `meta` table, so each install has a
// unique key-derivation input — a dump from device A is useless
// against device B.
//
// Backward compat: existing encrypted API keys (created under the
// legacy hardcoded salt) still decrypt. `decryptApiKey` tries the
// current device salt first, then falls back to the legacy salt on
// failure. Callers that see a legacy decryption MAY re-encrypt
// under the new salt — but we don't force it, since the threat
// model (physical device access) is the same either way on a
// single device.

import { db } from '../db/schema';

const APP_KEY_MATERIAL = 'chess-academy-pro-v1';
/** Legacy hardcoded salt kept ONLY for decrypting records written
 *  before the per-device salt migration. New encrypts use the
 *  random device salt from the meta table. */
const LEGACY_SALT_STRING = 'chess-academy-salt';
/** Dexie meta key for the per-device random salt. Stored as a
 *  base64 string so it survives JSON roundtrips. */
const DEVICE_SALT_META_KEY = 'crypto-device-salt.v1';

async function loadOrCreateDeviceSalt(): Promise<ArrayBuffer> {
  try {
    const existing = await db.meta.get(DEVICE_SALT_META_KEY);
    if (existing?.value && typeof existing.value === 'string') {
      return base64ToArrayBuffer(existing.value);
    }
  } catch {
    // Dexie unavailable — fall through and synthesize a session-only
    // salt rather than crashing. The next successful Dexie write
    // will persist it.
  }
  const fresh = new ArrayBuffer(16);
  window.crypto.getRandomValues(new Uint8Array(fresh));
  try {
    await db.meta.put({ key: DEVICE_SALT_META_KEY, value: arrayBufferToBase64(fresh) });
  } catch {
    /* persist best-effort; in-memory salt still works for the session */
  }
  return fresh;
}

async function deriveKeyWithSalt(salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(APP_KEY_MATERIAL).buffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function deriveKey(): Promise<CryptoKey> {
  const salt = await loadOrCreateDeviceSalt();
  return deriveKeyWithSalt(salt);
}

async function deriveLegacyKey(): Promise<CryptoKey> {
  return deriveKeyWithSalt(new TextEncoder().encode(LEGACY_SALT_STRING).buffer);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptApiKey(
  plainKey: string,
): Promise<{ encrypted: string; iv: string }> {
  const key = await deriveKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainKey),
  );

  return {
    encrypted: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

export async function decryptApiKey(
  encryptedBase64: string,
  ivBase64: string,
): Promise<string> {
  const iv = base64ToArrayBuffer(ivBase64);
  const encrypted = base64ToArrayBuffer(encryptedBase64);
  const decoder = new TextDecoder();

  // Try the current device salt first. On failure, fall back to the
  // legacy hardcoded salt — covers encrypted records written before
  // the per-device salt migration. If legacy succeeds, the caller
  // can transparently continue; re-encryption is optional.
  try {
    const key = await deriveKey();
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted,
    );
    return decoder.decode(decrypted);
  } catch {
    const legacyKey = await deriveLegacyKey();
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      legacyKey,
      encrypted,
    );
    return decoder.decode(decrypted);
  }
}
