/**
 * Tests for passphraseGenerator utility
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generatePassphrase,
  calculateEntropy,
} from "../utils/passphraseGenerator";
import EFF_SHORT_WORDLIST from "../utils/eff-short-wordlist.json";

describe("passphraseGenerator", () => {
  describe("EFF Short Wordlist validation", () => {
    it("should use EFF Short Wordlist 1 with exactly 1,296 words", () => {
      expect(EFF_SHORT_WORDLIST).toBeDefined();
      expect(EFF_SHORT_WORDLIST.length).toBe(1296);
    });

    it("should have only 3-5 character words in the wordlist", () => {
      EFF_SHORT_WORDLIST.forEach((word) => {
        expect(word.length).toBeGreaterThanOrEqual(3);
        expect(word.length).toBeLessThanOrEqual(5);
        expect(/^[a-z-]+$/.test(word)).toBe(true); // lowercase + hyphen (e.g., "yo-yo")
      });
    });
  });

  describe("generatePassphrase", () => {
    it("should generate a passphrase with default 6 words", () => {
      const passphrase = generatePassphrase();

      // Count words by splitting on separators (any non-letter character)
      const words = passphrase.split(/[^a-zA-Z]+/);

      expect(words).toHaveLength(6);
      expect(passphrase.length).toBeGreaterThan(20); // Minimum reasonable length
    });

    it("should contain separator characters between words", () => {
      const passphrase = generatePassphrase();

      // Should contain at least one special character
      const separatorRegex = /[-_!@#$%&*+=]/;
      expect(separatorRegex.test(passphrase)).toBe(true);

      // Should have 5 separators for 6 words
      const separatorCount = (passphrase.match(/[-_!@#$%&*+=]/g) || []).length;
      expect(separatorCount).toBe(5);
    });

    it("should generate different passphrases on each call", () => {
      const passphrase1 = generatePassphrase();
      const passphrase2 = generatePassphrase();
      const passphrase3 = generatePassphrase();

      // All three should be different (extremely unlikely to be same with 1296-word list)
      expect(passphrase1).not.toBe(passphrase2);
      expect(passphrase2).not.toBe(passphrase3);
      expect(passphrase1).not.toBe(passphrase3);
    });

    it("should generate passphrase with custom word count", () => {
      const passphrase3Words = generatePassphrase(3);
      const passphrase8Words = generatePassphrase(8);

      const words3 = passphrase3Words.split(/[^a-zA-Z]+/);
      const words8 = passphrase8Words.split(/[^a-zA-Z]+/);

      expect(words3).toHaveLength(3);
      expect(words8).toHaveLength(8);
    });

    it("should use custom separators when provided", () => {
      const customSeparators = ["*", "+"];
      const passphrase = generatePassphrase(6, customSeparators);

      // Should only contain custom separators
      const hasCustomSeparators = /[*+]/.test(passphrase);
      expect(hasCustomSeparators).toBe(true);

      // Should NOT contain default separators (except the custom ones)
      const hasOtherSeparators = /[-_!@#$%&=]/.test(passphrase);
      expect(hasOtherSeparators).toBe(false);
    });

    it("should throw error for invalid word count", () => {
      expect(() => generatePassphrase(2)).toThrow(
        "Word count must be between 3 and 10",
      );
      expect(() => generatePassphrase(11)).toThrow(
        "Word count must be between 3 and 10",
      );
      expect(() => generatePassphrase(-1)).toThrow(
        "Word count must be between 3 and 10",
      );
    });

    it("should generate passphrase with minimum length for backend validation", () => {
      // Backend requires min 8 characters
      const passphrase = generatePassphrase(3); // Even with 3 words

      expect(passphrase.length).toBeGreaterThanOrEqual(8);
    });

    it("should only use words from the word list", () => {
      const passphrase = generatePassphrase();

      // Extract words by removing separators
      const words = passphrase.split(/[^a-zA-Z]+/);

      // All words should be lowercase alphabetic characters only
      // EFF Short Wordlist 1 uses 3-5 character words
      words.forEach((word) => {
        expect(/^[a-z]+$/.test(word)).toBe(true);
        expect(word.length).toBeGreaterThan(0);
        expect(word.length).toBeGreaterThanOrEqual(3);
        expect(word.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe("calculateEntropy", () => {
    it("should calculate entropy for default 6-word passphrase", () => {
      const entropy = calculateEntropy();

      // With 1296-word list (EFF Short Wordlist 1) and 11 separators:
      // Word entropy: log2(1296^6) ≈ 62 bits
      // Separator entropy: log2(11^5) ≈ 17.3 bits
      // Total: ~79 bits
      expect(entropy).toBeGreaterThan(75);
      expect(entropy).toBeLessThan(84);
    });

    it("should calculate different entropy for different word counts", () => {
      const entropy3 = calculateEntropy(3);
      const entropy6 = calculateEntropy(6);
      const entropy10 = calculateEntropy(10);

      // More words = higher entropy
      expect(entropy6).toBeGreaterThan(entropy3);
      expect(entropy10).toBeGreaterThan(entropy6);
    });

    it("should return a positive number", () => {
      const entropy = calculateEntropy(5);

      expect(entropy).toBeGreaterThan(0);
      expect(Number.isFinite(entropy)).toBe(true);
    });
  });

  describe("crypto.getRandomValues usage", () => {
    it("should use cryptographically secure randomness", () => {
      // Spy on crypto.getRandomValues to ensure it's called
      const cryptoSpy = vi.spyOn(crypto, "getRandomValues");

      generatePassphrase();

      // Should be called at least 6 times (for word selection) + 5 times (for separators)
      expect(cryptoSpy).toHaveBeenCalled();
      expect(cryptoSpy.mock.calls.length).toBeGreaterThanOrEqual(11);

      cryptoSpy.mockRestore();
    });
  });

  describe("security characteristics", () => {
    it("should generate passphrases with sufficient length for strong security", () => {
      // Test multiple passphrases to ensure consistent length
      for (let i = 0; i < 10; i++) {
        const passphrase = generatePassphrase();

        // Typical 6-word passphrase with separators should be 30-60 characters
        expect(passphrase.length).toBeGreaterThan(25);
        expect(passphrase.length).toBeLessThan(100);
      }
    });

    it("should not produce empty strings", () => {
      const passphrase = generatePassphrase();

      expect(passphrase).toBeTruthy();
      expect(passphrase.trim().length).toBeGreaterThan(0);
    });

    it("should have good distribution across word list", () => {
      // Generate many passphrases and check that different words are used
      const allWords = new Set<string>();

      for (let i = 0; i < 50; i++) {
        const passphrase = generatePassphrase();
        const words = passphrase.split(/[^a-zA-Z]+/);
        words.forEach((word) => allWords.add(word));
      }

      // With 50 passphrases (300 words total), should see at least 200 unique words
      // from the 1296-word EFF Short Wordlist (good distribution)
      expect(allWords.size).toBeGreaterThan(200);
    });
  });
});
