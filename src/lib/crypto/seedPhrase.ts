import { generateMnemonic, validateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
// @ts-ignore - wordlist types not properly exported
import { wordlist } from '@scure/bip39/wordlists/english.js';

/**
 * Generates a new BIP39 mnemonic (12 words).
 */
export function generateSeedPhrase(): string {
  return generateMnemonic(wordlist, 128); // 128 bits = 12 words
}

/**
 * Validates a BIP39 mnemonic.
 */
export function validateSeedPhrase(mnemonic: string): boolean {
  return validateMnemonic(mnemonic, wordlist);
}

/**
 * Normalizes a mnemonic (lowercase, single spaces).
 */
export function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Splits a mnemonic into individual words.
 */
export function splitMnemonic(mnemonic: string): string[] {
  return normalizeMnemonic(mnemonic).split(' ');
}

/**
 * Gets the seed from a mnemonic (for key derivation).
 */
export function getSeed(mnemonic: string): Uint8Array {
  return mnemonicToSeedSync(normalizeMnemonic(mnemonic));
}

/**
 * Generates a random seed for encrypting the mnemonic in storage.
 */
export function generateStorageKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}
