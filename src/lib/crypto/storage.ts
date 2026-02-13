import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import { encrypt, decrypt, importKey, exportKey, generateKey } from './encryption';

const DB_NAME = 'gated-chat-crypto';
const DB_VERSION = 1;
const KEYS_STORE = 'keys';
const SESSIONS_STORE = 'sessions';

interface StoredKeyData {
  id: string;
  encryptedData: string;
  iv: string;
  createdAt: number;
}

interface StoredSession {
  id: string;  // Format: channelId or dmChannelId
  encryptedKey: string;
  iv: string;
  keyVersion: number;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Opens the IndexedDB database.
 */
function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(KEYS_STORE)) {
        db.createObjectStore(KEYS_STORE, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        const sessionsStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
        sessionsStore.createIndex('keyVersion', 'keyVersion');
      }
    };
  });

  return dbPromise;
}

/**
 * Gets the device encryption key, creating one if it doesn't exist.
 * This key is used to encrypt data stored in IndexedDB.
 */
async function getDeviceKey(): Promise<CryptoKey> {
  const db = await openDatabase();

  return new Promise(async (resolve, reject) => {
    const tx = db.transaction(KEYS_STORE, 'readonly');
    const store = tx.objectStore(KEYS_STORE);
    const request = store.get('device-key');

    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      if (request.result) {
        // Import existing key
        const keyData = decodeBase64(request.result.keyData);
        const key = await importKey(keyData);
        resolve(key);
      } else {
        // Generate new device key
        const key = await generateKey();
        const keyData = await exportKey(key);

        const writeTx = db.transaction(KEYS_STORE, 'readwrite');
        const writeStore = writeTx.objectStore(KEYS_STORE);
        writeStore.put({
          id: 'device-key',
          keyData: encodeBase64(keyData),
          createdAt: Date.now(),
        });

        resolve(key);
      }
    };
  });
}

/**
 * Stores encrypted mnemonic in IndexedDB.
 */
export async function storeMnemonic(mnemonic: string): Promise<void> {
  const db = await openDatabase();
  const deviceKey = await getDeviceKey();
  const { ciphertext, iv } = await encrypt(mnemonic, deviceKey);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEYS_STORE, 'readwrite');
    const store = tx.objectStore(KEYS_STORE);

    store.put({
      id: 'mnemonic',
      encryptedData: ciphertext,
      iv,
      createdAt: Date.now(),
    } as StoredKeyData);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieves and decrypts the mnemonic from IndexedDB.
 */
export async function getMnemonic(): Promise<string | null> {
  const db = await openDatabase();
  const deviceKey = await getDeviceKey();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEYS_STORE, 'readonly');
    const store = tx.objectStore(KEYS_STORE);
    const request = store.get('mnemonic');

    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      if (!request.result) {
        resolve(null);
        return;
      }

      const { encryptedData, iv } = request.result as StoredKeyData;
      const mnemonic = await decrypt({ ciphertext: encryptedData, iv }, deviceKey);
      resolve(mnemonic);
    };
  });
}

/**
 * Deletes the stored mnemonic.
 */
export async function deleteMnemonic(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEYS_STORE, 'readwrite');
    const store = tx.objectStore(KEYS_STORE);
    store.delete('mnemonic');

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Stores an encrypted channel/DM key.
 */
export async function storeSessionKey(
  sessionId: string,
  key: Uint8Array,
  keyVersion: number
): Promise<void> {
  const db = await openDatabase();
  const deviceKey = await getDeviceKey();
  const { ciphertext, iv } = await encrypt(encodeBase64(key), deviceKey);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, 'readwrite');
    const store = tx.objectStore(SESSIONS_STORE);

    store.put({
      id: sessionId,
      encryptedKey: ciphertext,
      iv,
      keyVersion,
      updatedAt: Date.now(),
    } as StoredSession);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieves a session key.
 */
export async function getSessionKey(
  sessionId: string
): Promise<{ key: Uint8Array; keyVersion: number } | null> {
  const db = await openDatabase();
  const deviceKey = await getDeviceKey();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, 'readonly');
    const store = tx.objectStore(SESSIONS_STORE);
    const request = store.get(sessionId);

    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      if (!request.result) {
        resolve(null);
        return;
      }

      const { encryptedKey, iv, keyVersion } = request.result as StoredSession;
      const keyBase64 = await decrypt({ ciphertext: encryptedKey, iv }, deviceKey);
      const key = decodeBase64(keyBase64);
      resolve({ key, keyVersion });
    };
  });
}

/**
 * Deletes a session key.
 */
export async function deleteSessionKey(sessionId: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, 'readwrite');
    const store = tx.objectStore(SESSIONS_STORE);
    store.delete(sessionId);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Stores identity keypair data (encrypted).
 */
export async function storeIdentityKeys(
  identitySecretKey: Uint8Array,
  signingSecretKey: Uint8Array
): Promise<void> {
  const db = await openDatabase();
  const deviceKey = await getDeviceKey();

  const keysData = JSON.stringify({
    identitySecretKey: encodeBase64(identitySecretKey),
    signingSecretKey: encodeBase64(signingSecretKey),
  });

  const { ciphertext, iv } = await encrypt(keysData, deviceKey);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEYS_STORE, 'readwrite');
    const store = tx.objectStore(KEYS_STORE);

    store.put({
      id: 'identity-keys',
      encryptedData: ciphertext,
      iv,
      createdAt: Date.now(),
    } as StoredKeyData);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieves identity keypair data.
 */
export async function getIdentityKeys(): Promise<{
  identitySecretKey: Uint8Array;
  signingSecretKey: Uint8Array;
} | null> {
  const db = await openDatabase();
  const deviceKey = await getDeviceKey();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEYS_STORE, 'readonly');
    const store = tx.objectStore(KEYS_STORE);
    const request = store.get('identity-keys');

    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      if (!request.result) {
        resolve(null);
        return;
      }

      const { encryptedData, iv } = request.result as StoredKeyData;
      const keysJson = await decrypt({ ciphertext: encryptedData, iv }, deviceKey);
      const keys = JSON.parse(keysJson);

      resolve({
        identitySecretKey: decodeBase64(keys.identitySecretKey),
        signingSecretKey: decodeBase64(keys.signingSecretKey),
      });
    };
  });
}

/**
 * Clears all stored crypto data.
 */
export async function clearAllCryptoData(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([KEYS_STORE, SESSIONS_STORE], 'readwrite');
    tx.objectStore(KEYS_STORE).clear();
    tx.objectStore(SESSIONS_STORE).clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Checks if crypto keys are set up.
 */
export async function hasStoredKeys(): Promise<boolean> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEYS_STORE, 'readonly');
    const store = tx.objectStore(KEYS_STORE);
    const request = store.get('identity-keys');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(!!request.result);
  });
}
