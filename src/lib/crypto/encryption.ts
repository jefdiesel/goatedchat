import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits for AES-GCM
const KEY_LENGTH = 256; // bits

export interface EncryptedData {
  ciphertext: string;  // Base64 encoded
  iv: string;          // Base64 encoded
}

export interface EncryptedMessage {
  v: 1;                 // Protocol version
  ct: string;           // Base64 ciphertext
  iv: string;           // Base64 nonce (12 bytes)
  kv: number;           // Key version
  ek?: string;          // Ephemeral key (DMs only)
}

/**
 * Generates a random AES-256 key.
 */
export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generates random bytes (for channel keys, etc).
 */
export function generateRandomBytes(length: number = 32): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Imports a raw key for AES-GCM.
 */
export async function importKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    rawKey.buffer as ArrayBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Exports a CryptoKey to raw bytes.
 */
export async function exportKey(key: CryptoKey): Promise<Uint8Array> {
  const rawKey = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(rawKey);
}

/**
 * Derives a message-specific key from a channel key using HKDF.
 */
export async function deriveMessageKey(
  channelKey: Uint8Array,
  messageId: string
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    channelKey.buffer as ArrayBuffer,
    'HKDF',
    false,
    ['deriveBits']
  );

  const info = new TextEncoder().encode(`message:${messageId}`);
  const salt = new Uint8Array(32);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt.buffer as ArrayBuffer,
      info: info.buffer as ArrayBuffer,
    },
    baseKey,
    KEY_LENGTH
  );

  return crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plaintext using AES-GCM.
 */
export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  return {
    ciphertext: encodeBase64(new Uint8Array(ciphertext)),
    iv: encodeBase64(iv),
  };
}

/**
 * Decrypts ciphertext using AES-GCM.
 */
export async function decrypt(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<string> {
  const ciphertext = decodeBase64(encryptedData.ciphertext);
  const iv = decodeBase64(encryptedData.iv);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(plaintext);
}

/**
 * Encrypts a message with metadata for storage.
 */
export async function encryptMessage(
  content: string,
  channelKey: Uint8Array,
  messageId: string,
  keyVersion: number,
  ephemeralKey?: string
): Promise<EncryptedMessage> {
  const key = await deriveMessageKey(channelKey, messageId);
  const { ciphertext, iv } = await encrypt(content, key);

  const message: EncryptedMessage = {
    v: 1,
    ct: ciphertext,
    iv,
    kv: keyVersion,
  };

  if (ephemeralKey) {
    message.ek = ephemeralKey;
  }

  return message;
}

/**
 * Decrypts a message.
 */
export async function decryptMessage(
  encryptedMessage: EncryptedMessage,
  channelKey: Uint8Array,
  messageId: string
): Promise<string> {
  const key = await deriveMessageKey(channelKey, messageId);
  return decrypt(
    { ciphertext: encryptedMessage.ct, iv: encryptedMessage.iv },
    key
  );
}

/**
 * Encrypts raw bytes using AES-GCM (for key wrapping).
 */
export async function encryptBytes(
  data: Uint8Array,
  key: CryptoKey
): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    data.buffer as ArrayBuffer
  );

  return {
    ciphertext: encodeBase64(new Uint8Array(ciphertext)),
    iv: encodeBase64(iv),
  };
}

/**
 * Decrypts raw bytes using AES-GCM.
 */
export async function decryptBytes(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<Uint8Array> {
  const ciphertext = decodeBase64(encryptedData.ciphertext);
  const iv = decodeBase64(encryptedData.iv);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  );

  return new Uint8Array(plaintext);
}
