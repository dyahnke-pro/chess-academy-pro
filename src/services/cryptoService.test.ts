import { describe, it, expect } from 'vitest';
import { encryptApiKey, decryptApiKey } from './cryptoService';

describe('cryptoService', () => {
  describe('encryptApiKey / decryptApiKey round-trip', () => {
    it('encrypts and decrypts a simple key', async () => {
      const plainKey = 'sk-ant-test-key-12345';
      const { encrypted, iv } = await encryptApiKey(plainKey);

      expect(encrypted).toBeTruthy();
      expect(iv).toBeTruthy();
      expect(encrypted).not.toBe(plainKey);

      const decrypted = await decryptApiKey(encrypted, iv);
      expect(decrypted).toBe(plainKey);
    });

    it('encrypts and decrypts a long key', async () => {
      const plainKey = 'sk-ant-' + 'a'.repeat(100);
      const { encrypted, iv } = await encryptApiKey(plainKey);
      const decrypted = await decryptApiKey(encrypted, iv);
      expect(decrypted).toBe(plainKey);
    });

    it('encrypts and decrypts special characters', async () => {
      const plainKey = 'sk-ant-$pecial_chars=123&more!@#%^';
      const { encrypted, iv } = await encryptApiKey(plainKey);
      const decrypted = await decryptApiKey(encrypted, iv);
      expect(decrypted).toBe(plainKey);
    });

    it('generates different encrypted values for same input (random IV)', async () => {
      const plainKey = 'test-key';
      const result1 = await encryptApiKey(plainKey);
      const result2 = await encryptApiKey(plainKey);
      // IVs should be different (random)
      expect(result1.iv).not.toBe(result2.iv);
    });

    it('produces base64-encoded encrypted output', async () => {
      const { encrypted, iv } = await encryptApiKey('test');
      // Base64 characters: A-Z, a-z, 0-9, +, /, =
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
      expect(iv).toMatch(/^[A-Za-z0-9+/=]+$/);
    });
  });

  describe('encryptApiKey', () => {
    it('returns non-empty encrypted and iv fields', async () => {
      const { encrypted, iv } = await encryptApiKey('my-api-key');
      expect(encrypted.length).toBeGreaterThan(0);
      expect(iv.length).toBeGreaterThan(0);
    });
  });

  describe('decryptApiKey', () => {
    it('decrypts back to original value', async () => {
      const original = 'sk-ant-api03-abcdef';
      const { encrypted, iv } = await encryptApiKey(original);
      const result = await decryptApiKey(encrypted, iv);
      expect(result).toBe(original);
    });
  });
});
