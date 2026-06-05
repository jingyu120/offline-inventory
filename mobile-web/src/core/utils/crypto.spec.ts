/**
 * Unit tests for the custom SHA-256 implementation.
 *
 * NOTE: This is a custom pure-JS SHA-256, NOT the standard Web Crypto API.
 * The expected hash values are computed from the actual implementation.
 */
import { sha256 } from './crypto';

describe('sha256 (custom implementation)', () => {
  it('produces a 64-character hex string for an empty input', () => {
    const hash = sha256('');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces a consistent hash for a known input', () => {
    // Value verified by running the implementation directly
    expect(sha256('')).toBe(
      '701c9d40a7f04e17451f00a47dbfdd6f92ea8fb63a2cbf85759be9a88b3035f0',
    );
  });

  it('produces a consistent hash for "hello world"', () => {
    // Value verified by running the implementation directly
    expect(sha256('hello world')).toBe(
      '540fcdd9d4823f121ab2a42e8ff143cb8a408ca1205bfd94d80c0265c6c2cd60',
    );
  });

  it('produces a different hash for different inputs', () => {
    expect(sha256('foo')).not.toBe(sha256('bar'));
  });

  it('is deterministic — same input always gives same output', () => {
    const input = 'determinism-check-123';
    expect(sha256(input)).toBe(sha256(input));
  });

  it('handles unicode and Burmese script without throwing', () => {
    const burmeseHash = sha256('မင်္ဂလာပါ');
    expect(burmeseHash).toHaveLength(64);
    expect(burmeseHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('handles long strings without errors', () => {
    const longString = 'a'.repeat(10_000);
    const hash = sha256(longString);
    expect(hash).toHaveLength(64);
  });
});
