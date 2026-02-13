import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import { x25519, deriveSharedKey, generateEphemeralKeyPair, verifySignedPrekey } from './keyExchange';
import { storeSessionKey, getSessionKey } from './storage';
import type { DerivedKeys } from './keyDerivation';

export interface PrekeyBundle {
  identityPublicKey: string;  // Base64
  signingPublicKey: string;   // Base64
  prekeyPublic: string;       // Base64
  prekeySignature: string;    // Base64
}

export interface X3DHResult {
  sharedKey: Uint8Array;
  ephemeralPublicKey: string;  // Base64, to send with first message
}

export interface DMSessionInfo {
  key: Uint8Array;
  keyVersion: number;
}

/**
 * Initiates an X3DH key exchange (sender side).
 * Used when starting a new DM conversation.
 */
export async function initiateX3DH(
  senderKeys: DerivedKeys,
  recipientBundle: PrekeyBundle
): Promise<X3DHResult> {
  const recipientIdentityKey = decodeBase64(recipientBundle.identityPublicKey);
  const recipientSigningKey = decodeBase64(recipientBundle.signingPublicKey);
  const recipientPrekey = decodeBase64(recipientBundle.prekeyPublic);

  // Verify the prekey signature
  if (!verifySignedPrekey(
    recipientBundle.prekeyPublic,
    recipientBundle.prekeySignature,
    recipientSigningKey
  )) {
    throw new Error('Invalid prekey signature');
  }

  // Generate ephemeral keypair
  const ephemeralKeyPair = generateEphemeralKeyPair();

  // Compute X3DH shared secrets
  // DH1 = X25519(IK_A, SPK_B)
  const dh1 = x25519(senderKeys.identityKeyPair.secretKey, recipientPrekey);

  // DH2 = X25519(EK_A, IK_B)
  const dh2 = x25519(ephemeralKeyPair.secretKey, recipientIdentityKey);

  // DH3 = X25519(EK_A, SPK_B)
  const dh3 = x25519(ephemeralKeyPair.secretKey, recipientPrekey);

  // Concatenate shared secrets
  const combinedSecret = new Uint8Array(dh1.length + dh2.length + dh3.length);
  combinedSecret.set(dh1, 0);
  combinedSecret.set(dh2, dh1.length);
  combinedSecret.set(dh3, dh1.length + dh2.length);

  // Derive final shared key using HKDF
  const sharedKey = await deriveSharedKey(combinedSecret, 'gated-chat-x3dh-v1');

  return {
    sharedKey,
    ephemeralPublicKey: encodeBase64(ephemeralKeyPair.publicKey),
  };
}

/**
 * Completes X3DH key exchange (recipient side).
 * Used when receiving the first message in a DM.
 */
export async function completeX3DH(
  recipientKeys: DerivedKeys,
  prekeySecretKey: Uint8Array,
  senderIdentityKey: Uint8Array,
  senderEphemeralKey: Uint8Array
): Promise<Uint8Array> {
  // Compute X3DH shared secrets (reciprocal)
  // DH1 = X25519(SPK_B, IK_A)
  const dh1 = x25519(prekeySecretKey, senderIdentityKey);

  // DH2 = X25519(IK_B, EK_A)
  const dh2 = x25519(recipientKeys.identityKeyPair.secretKey, senderEphemeralKey);

  // DH3 = X25519(SPK_B, EK_A)
  const dh3 = x25519(prekeySecretKey, senderEphemeralKey);

  // Concatenate shared secrets
  const combinedSecret = new Uint8Array(dh1.length + dh2.length + dh3.length);
  combinedSecret.set(dh1, 0);
  combinedSecret.set(dh2, dh1.length);
  combinedSecret.set(dh3, dh1.length + dh2.length);

  // Derive final shared key
  return deriveSharedKey(combinedSecret, 'gated-chat-x3dh-v1');
}

/**
 * Stores a DM session key.
 */
export async function storeDMSessionKey(
  dmChannelId: string,
  otherUserId: string,
  key: Uint8Array,
  keyVersion: number = 1
): Promise<void> {
  // Store by channel ID for message encryption
  await storeSessionKey(`dm:${dmChannelId}`, key, keyVersion);
  // Also store by user ID for quick lookup
  await storeSessionKey(`dm-user:${otherUserId}`, key, keyVersion);
}

/**
 * Gets a DM session key by channel ID.
 */
export async function getDMSessionKey(
  dmChannelId: string
): Promise<DMSessionInfo | null> {
  return getSessionKey(`dm:${dmChannelId}`);
}

/**
 * Gets a DM session key by other user ID.
 */
export async function getDMSessionKeyByUser(
  otherUserId: string
): Promise<DMSessionInfo | null> {
  return getSessionKey(`dm-user:${otherUserId}`);
}

/**
 * Fetches a user's prekey bundle from the server.
 */
export async function fetchPrekeyBundle(
  userId: string
): Promise<PrekeyBundle | null> {
  const response = await fetch(`/api/crypto/prekey-bundle/${userId}`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch prekey bundle');
  }

  return response.json();
}

/**
 * Uploads a prekey bundle to the server.
 */
export async function uploadPrekeyBundle(
  prekeyPublic: string,
  prekeySignature: string
): Promise<void> {
  const response = await fetch('/api/crypto/prekey-bundle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prekeyPublic, prekeySignature }),
  });

  if (!response.ok) {
    throw new Error('Failed to upload prekey bundle');
  }
}

/**
 * Creates and uploads a new prekey bundle.
 */
export async function createAndUploadPrekeyBundle(
  signingSecretKey: Uint8Array
): Promise<nacl.BoxKeyPair> {
  const prekeyPair = nacl.box.keyPair();
  const signature = nacl.sign.detached(prekeyPair.publicKey, signingSecretKey);

  await uploadPrekeyBundle(
    encodeBase64(prekeyPair.publicKey),
    encodeBase64(signature)
  );

  return prekeyPair;
}

/**
 * Stores the prekey secret key locally (needed to complete X3DH).
 */
export async function storePrekeySecret(
  prekeySecretKey: Uint8Array
): Promise<void> {
  await storeSessionKey('prekey-secret', prekeySecretKey, 1);
}

/**
 * Gets the prekey secret key.
 */
export async function getPrekeySecret(): Promise<Uint8Array | null> {
  const result = await getSessionKey('prekey-secret');
  return result?.key ?? null;
}
