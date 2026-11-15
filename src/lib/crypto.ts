import type { SecretPayload } from '../types';

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function xorFallbackEncrypt(plainBytes: Uint8Array): string {
  const key = getRandomBytes(16);
  const out = new Uint8Array(16 + plainBytes.length);
  out.set(key, 0);
  for (let i = 0; i < plainBytes.length; i++) {
    out[16 + i] = plainBytes[i] ^ key[i % 16] ^ ((i * 31) & 0xff);
  }
  return `v0.${toBase64Url(out)}`;
}

function xorFallbackDecrypt(encoded: string): Uint8Array {
  const data = fromBase64Url(encoded);
  if (data.length < 17) {
    throw new Error('Invalid token length');
  }
  const key = data.subarray(0, 16);
  const plain = new Uint8Array(data.length - 16);
  for (let i = 0; i < plain.length; i++) {
    plain[i] = data[16 + i] ^ key[i % 16] ^ ((i * 31) & 0xff);
  }
  return plain;
}

function isValidPayload(value: unknown): value is SecretPayload {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.v === 1 &&
    typeof obj.g === 'string' &&
    obj.g.trim().length > 0 &&
    typeof obj.r === 'string' &&
    obj.r.trim().length > 0
  );
}

/**
 * Encrypts a SecretPayload into an opaque URL-safe token so the organizer
 * cannot read who got whom from the URL. Uses AES-128-GCM via Web Crypto API
 * (with a stream fallback only when `crypto.subtle` is unavailable, e.g. HTTP LAN).
 */
export async function encryptPayload(payload: SecretPayload): Promise<string> {
  // Pad JSON so URLs have uniform minimum length regardless of name length
  const paddedJson = JSON.stringify(payload).padEnd(112, ' ');
  const plainBytes = new TextEncoder().encode(paddedJson);

  if (!globalThis.crypto?.subtle) {
    return xorFallbackEncrypt(plainBytes);
  }

  const rawKey = getRandomBytes(16);
  const iv = getRandomBytes(12);
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    rawKey as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );
  const cipherBuffer = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    cryptoKey,
    plainBytes as BufferSource,
  );
  const cipherBytes = new Uint8Array(cipherBuffer);

  const combined = new Uint8Array(16 + 12 + cipherBytes.length);
  combined.set(rawKey, 0);
  combined.set(iv, 16);
  combined.set(cipherBytes, 28);

  return `v1.${toBase64Url(combined)}`;
}

/**
 * Decrypts a token produced by `encryptPayload`. Returns `null` if invalid/corrupted.
 */
export async function decryptPayload(token: string): Promise<SecretPayload | null> {
  try {
    const trimmed = token.trim();
    if (trimmed.startsWith('v0.')) {
      const plainBytes = xorFallbackDecrypt(trimmed.slice(3));
      const parsed: unknown = JSON.parse(new TextDecoder().decode(plainBytes));
      return isValidPayload(parsed) ? parsed : null;
    }

    if (!trimmed.startsWith('v1.') || !globalThis.crypto?.subtle) {
      return null;
    }

    const combined = fromBase64Url(trimmed.slice(3));
    if (combined.length < 29) {
      return null;
    }

    const rawKey = combined.subarray(0, 16);
    const iv = combined.subarray(16, 28);
    const cipherBytes = combined.subarray(28);

    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'raw',
      rawKey as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    );

    const plainBuffer = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      cryptoKey,
      cipherBytes as BufferSource,
    );

    const parsed: unknown = JSON.parse(new TextDecoder().decode(plainBuffer));
    return isValidPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
