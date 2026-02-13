// Key Derivation
export {
  deriveKeysFromSignature,
  deriveKeysFromMnemonic,
  getPublicKeys,
  decodePublicKeys,
  KEY_DERIVATION_MESSAGE,
  type DerivedKeys,
  type PublicKeys,
} from './keyDerivation';

// Encryption
export {
  encrypt,
  decrypt,
  encryptMessage,
  decryptMessage,
  generateKey,
  generateRandomBytes,
  importKey,
  exportKey,
  deriveMessageKey,
  encryptBytes,
  decryptBytes,
  type EncryptedData,
  type EncryptedMessage,
} from './encryption';

// Key Exchange
export {
  x25519,
  sign,
  verify,
  generateEphemeralKeyPair,
  deriveSharedKey,
  boxEncrypt,
  boxDecrypt,
  encryptToPublicKey,
  decryptFromPublicKey,
  createSignedPrekey,
  verifySignedPrekey,
} from './keyExchange';

// Seed Phrase
export {
  generateSeedPhrase,
  validateSeedPhrase,
  normalizeMnemonic,
  splitMnemonic,
  getSeed,
  generateStorageKey,
} from './seedPhrase';

// Storage
export {
  storeMnemonic,
  getMnemonic,
  deleteMnemonic,
  storeSessionKey,
  getSessionKey,
  deleteSessionKey,
  storeIdentityKeys,
  getIdentityKeys,
  clearAllCryptoData,
  hasStoredKeys,
} from './storage';

// Channel Keys
export {
  generateChannelKey,
  createKeyShares,
  decryptKeyShare,
  storeChannelKey,
  getChannelKey,
  getChannelKeyVersion,
  fetchChannelKeyShare,
  uploadKeyShares,
  requestKeyRotation,
  fetchChannelMemberKeys,
  rotateChannelKey,
  type ChannelKeyShare,
  type ChannelKeyInfo,
} from './channelKeys';

// DM Sessions
export {
  initiateX3DH,
  completeX3DH,
  storeDMSessionKey,
  getDMSessionKey,
  getDMSessionKeyByUser,
  fetchPrekeyBundle,
  uploadPrekeyBundle,
  createAndUploadPrekeyBundle,
  storePrekeySecret,
  getPrekeySecret,
  type PrekeyBundle,
  type X3DHResult,
  type DMSessionInfo,
} from './dmSession';
