// Web Crypto API — AES-256-GCM key encryption
// Stores encrypted API key in Dexie. Never in localStorage.

const APP_KEY_MATERIAL = 'chess-academy-pro-v1';

async function deriveKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(APP_KEY_MATERIAL),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('chess-academy-salt'),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
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
  const key = await deriveKey();
  const iv = base64ToArrayBuffer(ivBase64);
  const encrypted = base64ToArrayBuffer(encryptedBase64);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted,
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
