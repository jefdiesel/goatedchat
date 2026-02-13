import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import { generateRandomBytes } from './encryption';
import { encryptToPublicKey, decryptFromPublicKey } from './keyExchange';
import { storeSessionKey, getSessionKey } from './storage';

export interface ChannelKeyShare {
  userId: string;
  encryptedKey: string;  // Base64 encoded
  keyVersion: number;
}

export interface ChannelKeyInfo {
  key: Uint8Array;
  keyVersion: number;
}

/**
 * Generates a new channel encryption key.
 */
export function generateChannelKey(): Uint8Array {
  return generateRandomBytes(32);
}

/**
 * Creates encrypted key shares for all channel members.
 */
export function createKeyShares(
  channelKey: Uint8Array,
  keyVersion: number,
  members: Array<{ userId: string; publicKey: Uint8Array }>,
  senderSecretKey: Uint8Array
): ChannelKeyShare[] {
  return members.map(({ userId, publicKey }) => ({
    userId,
    encryptedKey: encryptToPublicKey(channelKey, publicKey, senderSecretKey),
    keyVersion,
  }));
}

/**
 * Decrypts a key share intended for the current user.
 */
export function decryptKeyShare(
  encryptedKey: string,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): Uint8Array | null {
  return decryptFromPublicKey(encryptedKey, senderPublicKey, recipientSecretKey);
}

/**
 * Stores a channel key locally.
 */
export async function storeChannelKey(
  channelId: string,
  key: Uint8Array,
  keyVersion: number
): Promise<void> {
  await storeSessionKey(`channel:${channelId}:v${keyVersion}`, key, keyVersion);
  // Also store as current version
  await storeSessionKey(`channel:${channelId}:current`, key, keyVersion);
}

/**
 * Gets the current channel key.
 */
export async function getChannelKey(
  channelId: string
): Promise<ChannelKeyInfo | null> {
  return getSessionKey(`channel:${channelId}:current`);
}

/**
 * Gets a specific version of a channel key (for decrypting old messages).
 */
export async function getChannelKeyVersion(
  channelId: string,
  keyVersion: number
): Promise<Uint8Array | null> {
  const result = await getSessionKey(`channel:${channelId}:v${keyVersion}`);
  return result?.key ?? null;
}

/**
 * Fetches encrypted channel key share from the server.
 */
export async function fetchChannelKeyShare(
  channelId: string
): Promise<{ encryptedKey: string; keyVersion: number; senderPublicKey: string } | null> {
  const response = await fetch(`/api/channels/${channelId}/keys`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch channel key');
  }

  return response.json();
}

/**
 * Uploads key shares after rotation.
 */
export async function uploadKeyShares(
  channelId: string,
  keyShares: ChannelKeyShare[]
): Promise<void> {
  const response = await fetch(`/api/channels/${channelId}/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyShares }),
  });

  if (!response.ok) {
    throw new Error('Failed to upload key shares');
  }
}

/**
 * Requests key rotation for a channel.
 */
export async function requestKeyRotation(channelId: string): Promise<void> {
  const response = await fetch(`/api/channels/${channelId}/rotate-key`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to request key rotation');
  }
}

/**
 * Gets all member public keys for a channel.
 */
export async function fetchChannelMemberKeys(
  channelId: string
): Promise<Array<{ userId: string; publicKey: string }>> {
  const response = await fetch(`/api/channels/${channelId}/member-keys`);

  if (!response.ok) {
    throw new Error('Failed to fetch member keys');
  }

  const data = await response.json();
  return data.members;
}

/**
 * Performs channel key rotation.
 * Should be called when a member is removed.
 */
export async function rotateChannelKey(
  channelId: string,
  currentKeyVersion: number,
  members: Array<{ userId: string; publicKey: Uint8Array }>,
  senderSecretKey: Uint8Array
): Promise<void> {
  const newKey = generateChannelKey();
  const newVersion = currentKeyVersion + 1;

  const keyShares = createKeyShares(newKey, newVersion, members, senderSecretKey);

  await uploadKeyShares(channelId, keyShares);
  await storeChannelKey(channelId, newKey, newVersion);
}
