import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

/**
 * Performs X25519 ECDH key exchange.
 * Returns the shared secret.
 */
export function x25519(
  privateKey: Uint8Array,
  publicKey: Uint8Array
): Uint8Array {
  return nacl.scalarMult(privateKey, publicKey);
}

/**
 * Signs a message using Ed25519.
 */
export function sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
  return nacl.sign.detached(message, secretKey);
}

/**
 * Verifies an Ed25519 signature.
 */
export function verify(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
): boolean {
  return nacl.sign.detached.verify(message, signature, publicKey);
}

/**
 * Generates an ephemeral X25519 keypair for one-time use.
 */
export function generateEphemeralKeyPair(): nacl.BoxKeyPair {
  return nacl.box.keyPair();
}

/**
 * Derives a shared key from an X25519 shared secret using HKDF.
 */
export async function deriveSharedKey(
  sharedSecret: Uint8Array,
  info: string = 'gated-chat-shared-key'
): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret.buffer as ArrayBuffer,
    'HKDF',
    false,
    ['deriveBits']
  );

  const salt = new Uint8Array(32);
  const infoBytes = new TextEncoder().encode(info);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt.buffer as ArrayBuffer,
      info: infoBytes.buffer as ArrayBuffer,
    },
    baseKey,
    256
  );

  return new Uint8Array(derivedBits);
}

/**
 * Encrypts data to a recipient using their X25519 public key.
 * Uses NaCl's box (Curve25519-XSalsa20-Poly1305).
 */
export function boxEncrypt(
  message: Uint8Array,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): { ciphertext: Uint8Array; nonce: Uint8Array } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const ciphertext = nacl.box(message, nonce, recipientPublicKey, senderSecretKey);
  return { ciphertext, nonce };
}

/**
 * Decrypts data from a sender using their X25519 public key.
 */
export function boxDecrypt(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): Uint8Array | null {
  return nacl.box.open(ciphertext, nonce, senderPublicKey, recipientSecretKey);
}

/**
 * Encrypts data to a recipient's public key and returns Base64 encoded result.
 */
export function encryptToPublicKey(
  data: Uint8Array,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): string {
  const { ciphertext, nonce } = boxEncrypt(data, recipientPublicKey, senderSecretKey);

  // Concatenate nonce + ciphertext for easy transmission
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce);
  combined.set(ciphertext, nonce.length);

  return encodeBase64(combined);
}

/**
 * Decrypts Base64 encoded data from a sender.
 */
export function decryptFromPublicKey(
  encryptedData: string,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): Uint8Array | null {
  const combined = decodeBase64(encryptedData);
  const nonce = combined.slice(0, nacl.box.nonceLength);
  const ciphertext = combined.slice(nacl.box.nonceLength);

  return boxDecrypt(ciphertext, nonce, senderPublicKey, recipientSecretKey);
}

/**
 * Creates a signed prekey bundle for X3DH.
 */
export function createSignedPrekey(
  identitySigningKey: Uint8Array
): {
  prekeyPair: nacl.BoxKeyPair;
  prekeyPublic: string;
  prekeySignature: string;
} {
  const prekeyPair = nacl.box.keyPair();
  const signature = sign(prekeyPair.publicKey, identitySigningKey);

  return {
    prekeyPair,
    prekeyPublic: encodeBase64(prekeyPair.publicKey),
    prekeySignature: encodeBase64(signature),
  };
}

/**
 * Verifies a signed prekey.
 */
export function verifySignedPrekey(
  prekeyPublic: string,
  prekeySignature: string,
  signingPublicKey: Uint8Array
): boolean {
  const prekey = decodeBase64(prekeyPublic);
  const signature = decodeBase64(prekeySignature);
  return verify(prekey, signature, signingPublicKey);
}
