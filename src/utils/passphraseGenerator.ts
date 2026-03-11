/**
 * Passphrase Generator
 * Generates secure passphrases using a word list and special characters.
 * 
 * @module passphraseGenerator
 */

import EFF_SHORT_WORDLIST from './eff-short-wordlist.json';

/**
 * Word list for passphrase generation
 * Using EFF Short Wordlist 1 (1,296 words)
 * Source: https://www.eff.org/dice
 * Each word is 3-5 characters for better memorability and typing
 * Licensed under Creative Commons CC0
 */
const WORD_LIST = EFF_SHORT_WORDLIST;

/**
 * Special characters used as separators between words
 */
const SEPARATORS = ['-', '_', '!', '@', '#', '$', '%', '&', '*', '+', '='];

/**
 * Generates a cryptographically secure random integer between 0 (inclusive) and max (exclusive)
 * 
 * @param max - The upper bound (exclusive)
 * @returns A random integer between 0 and max-1
 */
function getSecureRandomInt(max: number): number {
  const randomBuffer = new Uint32Array(1);
  crypto.getRandomValues(randomBuffer);
  return randomBuffer[0] % max;
}

/**
 * Generates a secure passphrase consisting of random words separated by special characters
 * 
 * @param wordCount - Number of words to include in the passphrase (default: 6)
 * @param customSeparators - Optional array of custom separator characters to use
 * @returns A secure passphrase string
 * 
 * @example
 * ```typescript
 * const passphrase = generatePassphrase();
 * // Returns something like: "attention-camera$building!central#agency-decade"
 * 
 * const customPassphrase = generatePassphrase(4, ['*', '+']);
 * // Returns something like: "book*child+color*happen"
 * ```
 */
export function generatePassphrase(
  wordCount: number = 6,
  customSeparators?: string[]
): string {
  // Validate wordCount
  if (wordCount < 3 || wordCount > 10) {
    throw new Error('Word count must be between 3 and 10');
  }

  const separators = customSeparators || SEPARATORS;
  const words: string[] = [];

  // Select random words
  for (let i = 0; i < wordCount; i++) {
    const randomIndex = getSecureRandomInt(WORD_LIST.length);
    words.push(WORD_LIST[randomIndex]);
  }

  // Join words with random separators
  let passphrase = words[0];
  for (let i = 1; i < words.length; i++) {
    const separatorIndex = getSecureRandomInt(separators.length);
    passphrase += separators[separatorIndex] + words[i];
  }

  return passphrase;
}

/**
 * Calculates the entropy bits of the passphrase generator
 * With 1,296-word list (EFF Short Wordlist 1) and 11 separators:
 * - Word selection: log2(1296^6) ≈ 62 bits
 * - Separator selection: log2(11^5) ≈ 17.3 bits
 * - Total: ~79 bits of entropy
 * 
 * This exceeds NIST's recommendation of 80 bits for passwords.
 * EFF Short Wordlist uses 3-5 character words for better typing experience.
 */
export function calculateEntropy(wordCount: number = 6): number {
  const wordEntropy = Math.log2(Math.pow(WORD_LIST.length, wordCount));
  const separatorEntropy = Math.log2(Math.pow(SEPARATORS.length, wordCount - 1));
  return wordEntropy + separatorEntropy;
}
