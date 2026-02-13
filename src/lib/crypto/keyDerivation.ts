import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import { mnemonicToSeedSync } from '@scure/bip39';

export interface DerivedKeys {
  identityKeyPair: nacl.BoxKeyPair;      // X25519 for encryption
  signingKeyPair: nacl.SignKeyPair;      // Ed25519 for signing
}

export interface PublicKeys {
  identityPublicKey: string;   // Base64 encoded
  signingPublicKey: string;    // Base64 encoded
}

const ENCRYPTION_KEY_INFO = new TextEncoder().encode('gated-chat-identity-v1');
const SIGNING_KEY_INFO = new TextEncoder().encode('gated-chat-signing-v1');

async function hkdfDerive(
  inputKey: Uint8Array,
  info: Uint8Array,
  length: number = 32
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    inputKey.buffer as ArrayBuffer,
    'HKDF',
    false,
    ['deriveBits']
  );

  const salt = new Uint8Array(32); // Zero salt for deterministic derivation

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt.buffer as ArrayBuffer,
      info: info.buffer as ArrayBuffer,
    },
    cryptoKey,
    length * 8
  );

  return new Uint8Array(derivedBits);
}

/**
 * Derives encryption keys from a wallet signature.
 * The signature message is: "Derive encryption keys for Gated Chat\nVersion: 1"
 */
export async function deriveKeysFromSignature(signature: string): Promise<DerivedKeys> {
  // Remove 0x prefix if present and decode hex signature
  const sigHex = signature.startsWith('0x') ? signature.slice(2) : signature;
  const sigBytes = new Uint8Array(
    sigHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );

  // Derive identity key seed (for X25519)
  const identitySeed = await hkdfDerive(sigBytes, ENCRYPTION_KEY_INFO, 32);
  const identityKeyPair = nacl.box.keyPair.fromSecretKey(identitySeed);

  // Derive signing key seed (for Ed25519)
  const signingSeed = await hkdfDerive(sigBytes, SIGNING_KEY_INFO, 32);
  const signingKeyPair = nacl.sign.keyPair.fromSeed(signingSeed);

  return {
    identityKeyPair,
    signingKeyPair,
  };
}

/**
 * Derives encryption keys from a BIP39 seed phrase.
 */
export async function deriveKeysFromMnemonic(mnemonic: string): Promise<DerivedKeys> {
  // Convert mnemonic to seed (64 bytes)
  const seed = mnemonicToSeedSync(mnemonic);

  // Derive identity key seed (for X25519)
  const identitySeed = await hkdfDerive(seed, ENCRYPTION_KEY_INFO, 32);
  const identityKeyPair = nacl.box.keyPair.fromSecretKey(identitySeed);

  // Derive signing key seed (for Ed25519)
  const signingSeed = await hkdfDerive(seed, SIGNING_KEY_INFO, 32);
  const signingKeyPair = nacl.sign.keyPair.fromSeed(signingSeed);

  return {
    identityKeyPair,
    signingKeyPair,
  };
}

/**
 * Gets the public keys from derived keys in Base64 format for storage/transmission.
 */
export function getPublicKeys(keys: DerivedKeys): PublicKeys {
  return {
    identityPublicKey: encodeBase64(keys.identityKeyPair.publicKey),
    signingPublicKey: encodeBase64(keys.signingKeyPair.publicKey),
  };
}

/**
 * Decodes Base64 public keys to Uint8Array for crypto operations.
 */
export function decodePublicKeys(publicKeys: PublicKeys): {
  identityPublicKey: Uint8Array;
  signingPublicKey: Uint8Array;
} {
  return {
    identityPublicKey: decodeBase64(publicKeys.identityPublicKey),
    signingPublicKey: decodeBase64(publicKeys.signingPublicKey),
  };
}

/**
 * The message that users sign to derive their encryption keys.
 */
export const KEY_DERIVATION_MESSAGE = 'Derive encryption keys for Gated Chat\nVersion: 1';
