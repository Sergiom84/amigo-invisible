import { describe, expect, it } from 'vitest';
import { canSolveDraw, solveSecretSanta } from '../draw';
import { decryptPayload, encryptPayload } from '../crypto';
import { buildWhatsAppShareUrl, normalizePhoneForWhatsApp } from '../phone';

describe('solveSecretSanta', () => {
  it('creates a valid derangement for 7 participants', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    const result = solveSecretSanta(ids);
    expect(result).not.toBeNull();
    if (!result) return;

    const receivers = new Set<string>();
    for (const giver of ids) {
      const receiver = result[giver];
      expect(receiver).toBeDefined();
      expect(receiver).not.toBe(giver);
      receivers.add(receiver);
    }
    expect(receivers.size).toBe(ids.length);
  });

  it('respects mutual and asymmetric exclusions', () => {
    const ids = ['ana', 'carlos', 'lucia', 'mario', 'elena', 'pablo', 'sofia'];
    const exclusions = {
      ana: ['carlos'],
      carlos: ['ana'],
      lucia: ['mario', 'elena'],
      mario: ['lucia'],
    };

    for (let i = 0; i < 30; i++) {
      const result = solveSecretSanta(ids, exclusions);
      expect(result).not.toBeNull();
      if (!result) continue;

      expect(result.ana).not.toBe('carlos');
      expect(result.carlos).not.toBe('ana');
      expect(result.lucia).not.toBe('mario');
      expect(result.lucia).not.toBe('elena');
      expect(result.mario).not.toBe('lucia');
    }
  });

  it('returns null when exclusions make a valid draw impossible', () => {
    const ids = ['a', 'b', 'c'];
    const impossible = {
      a: ['b', 'c'],
    };
    expect(canSolveDraw(ids, impossible)).toBe(false);
    expect(solveSecretSanta(ids, impossible)).toBeNull();
  });

  it('solves tightly constrained graphs where naive shuffling often fails', () => {
    // Only one possible cycle: a->b->c->d->a
    const ids = ['a', 'b', 'c', 'd'];
    const exclusions = {
      a: ['c', 'd'],
      b: ['a', 'd'],
      c: ['a', 'b'],
      d: ['b', 'c'],
    };
    const result = solveSecretSanta(ids, exclusions);
    expect(result).toEqual({
      a: 'b',
      b: 'c',
      c: 'd',
      d: 'a',
    });
  });
});

describe('crypto encryptPayload / decryptPayload', () => {
  it('round-trips payload with AES-GCM without leaking plain names in token', async () => {
    const payload = {
      v: 1 as const,
      g: 'Ana María',
      r: 'Tío Carlos',
      t: 'Navidad Familia García',
      b: '25 €',
      d: '24 de diciembre',
      n: 'No valen calcetines',
    };

    const token = await encryptPayload(payload);
    expect(token.startsWith('v1.')).toBe(true);
    expect(token).not.toContain('Ana');
    expect(token).not.toContain('Carlos');

    const decrypted = await decryptPayload(token);
    expect(decrypted).toEqual(payload);
  });

  it('produces similar token lengths for short and long names', async () => {
    const shortToken = await encryptPayload({ v: 1, g: 'Bo', r: 'Lu' });
    const longToken = await encryptPayload({ v: 1, g: 'Alejandro', r: 'Montserrat' });
    expect(shortToken.length).toBe(longToken.length);
  });

  it('returns null on tampered or malformed tokens', async () => {
    const token = await encryptPayload({ v: 1, g: 'Ana', r: 'Luis' });
    const tampered = `${token.slice(0, -3)}xyz`;
    expect(await decryptPayload(tampered)).toBeNull();
    expect(await decryptPayload('invalid-token')).toBeNull();
  });
});

describe('phone normalization and WhatsApp URL builder', () => {
  it('prepends +34 for local Spanish numbers', () => {
    expect(normalizePhoneForWhatsApp('612 345 678', '34')).toBe('34612345678');
    expect(normalizePhoneForWhatsApp('34612345678', '34')).toBe('34612345678');
    expect(normalizePhoneForWhatsApp('+34 612-345-678', '34')).toBe('34612345678');
    expect(normalizePhoneForWhatsApp('0034 612345678', '34')).toBe('34612345678');
  });

  it('supports international numbers with + prefix regardless of default', () => {
    expect(normalizePhoneForWhatsApp('+52 55 1234 5678', '34')).toBe('525512345678');
  });

  it('rejects too-short or empty phone numbers', () => {
    expect(normalizePhoneForWhatsApp('', '34')).toBeNull();
    expect(normalizePhoneForWhatsApp('12345', '34')).toBeNull();
  });

  it('builds a wa.me URL without leaking any receiver info', () => {
    const url = buildWhatsAppShareUrl({
      normalizedPhone: '34612345678',
      giverName: 'Ana',
      secretUrl: 'https://example.pages.dev/#s=v1.abc',
      eventTitle: 'Navidad',
    });
    expect(url.startsWith('https://wa.me/34612345678?text=')).toBe(true);
    const decoded = decodeURIComponent(url.split('?text=')[1]);
    expect(decoded).toContain('¡Hola Ana!');
    expect(decoded).toContain('https://example.pages.dev/#s=v1.abc');
  });
});
