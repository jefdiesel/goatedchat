'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useSignMessage } from 'wagmi';
import { useAuth } from './AuthContext';
import {
  deriveKeysFromSignature,
  deriveKeysFromMnemonic,
  getPublicKeys,
  KEY_DERIVATION_MESSAGE,
  type DerivedKeys,
  type PublicKeys,
  hasStoredKeys,
  getIdentityKeys,
  storeIdentityKeys,
  storeMnemonic,
  getMnemonic,
  clearAllCryptoData,
  encryptMessage,
  decryptMessage,
  type EncryptedMessage,
  generateSeedPhrase,
  validateSeedPhrase,
  getChannelKey,
  storeChannelKey,
  decryptKeyShare,
  getDMSessionKey,
  storeDMSessionKey,
  initiateX3DH,
  completeX3DH,
  fetchPrekeyBundle,
  createAndUploadPrekeyBundle,
  storePrekeySecret,
  getPrekeySecret,
} from '@/lib/crypto';
import { decodeBase64 } from 'tweetnacl-util';
import nacl from 'tweetnacl';

type AuthMethod = 'wallet' | 'seedphrase';
type SetupStatus = 'unknown' | 'needed' | 'in_progress' | 'complete';

interface CryptoState {
  isReady: boolean;
  hasKeys: boolean;
  setupStatus: SetupStatus;
  authMethod: AuthMethod | null;
}

interface CryptoContextValue extends CryptoState {
  // Key setup
  setupWithWallet: () => Promise<void>;
  setupWithSeedPhrase: (mnemonic?: string) => Promise<{ mnemonic: string }>;
  generateNewSeedPhrase: () => string;
  validateMnemonic: (mnemonic: string) => boolean;
  clearKeys: () => Promise<void>;

  // Encryption
  encryptChannelMessage: (
    channelId: string,
    messageId: string,
    content: string
  ) => Promise<EncryptedMessage | null>;
  decryptChannelMessage: (
    channelId: string,
    messageId: string,
    encrypted: EncryptedMessage
  ) => Promise<string | null>;

  // DM encryption
  encryptDMMessage: (
    dmChannelId: string,
    otherUserId: string,
    messageId: string,
    content: string
  ) => Promise<EncryptedMessage | null>;
  decryptDMMessage: (
    dmChannelId: string,
    otherUserId: string,
    messageId: string,
    encrypted: EncryptedMessage,
    senderIdentityKey?: string
  ) => Promise<string | null>;

  // Key access
  getPublicKeys: () => PublicKeys | null;

  // Channel key setup
  initializeChannelKey: (channelId: string) => Promise<boolean>;
}

const CryptoContext = createContext<CryptoContextValue | null>(null);

export function CryptoProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { signMessageAsync } = useSignMessage();

  const [state, setState] = useState<CryptoState>({
    isReady: false,
    hasKeys: false,
    setupStatus: 'unknown',
    authMethod: null,
  });

  const [derivedKeys, setDerivedKeys] = useState<DerivedKeys | null>(null);
  const [publicKeys, setPublicKeys] = useState<PublicKeys | null>(null);

  // Check for existing keys on mount
  useEffect(() => {
    const checkKeys = async () => {
      if (!isAuthenticated || !user) {
        setState({
          isReady: false,
          hasKeys: false,
          setupStatus: 'unknown',
          authMethod: null,
        });
        setDerivedKeys(null);
        setPublicKeys(null);
        return;
      }

      try {
        const hasKeys = await hasStoredKeys();

        if (hasKeys) {
          // Try to restore keys from storage
          const storedKeys = await getIdentityKeys();
          if (storedKeys) {
            const identityKeyPair = nacl.box.keyPair.fromSecretKey(
              storedKeys.identitySecretKey
            );
            const signingKeyPair = nacl.sign.keyPair.fromSeed(
              storedKeys.signingSecretKey.slice(0, 32)
            );

            const keys: DerivedKeys = {
              identityKeyPair,
              signingKeyPair,
            };

            setDerivedKeys(keys);
            setPublicKeys(getPublicKeys(keys));

            setState({
              isReady: true,
              hasKeys: true,
              setupStatus: 'complete',
              authMethod: null, // Could fetch from server if needed
            });
            return;
          }
        }

        // Check if user has registered keys on server
        const response = await fetch('/api/crypto/register-keys');
        const data = await response.json();

        if (data.keys) {
          // User has keys on server but not locally - need to re-derive
          setState({
            isReady: false,
            hasKeys: false,
            setupStatus: 'needed',
            authMethod: null,
          });
        } else {
          // No keys anywhere - need setup
          setState({
            isReady: false,
            hasKeys: false,
            setupStatus: 'needed',
            authMethod: null,
          });
        }
      } catch (error) {
        console.error('Error checking crypto keys:', error);
        setState({
          isReady: false,
          hasKeys: false,
          setupStatus: 'needed',
          authMethod: null,
        });
      }
    };

    checkKeys();
  }, [isAuthenticated, user]);

  // Register keys with server
  const registerKeys = useCallback(
    async (keys: DerivedKeys, authMethod: AuthMethod) => {
      const pubKeys = getPublicKeys(keys);

      const response = await fetch('/api/crypto/register-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityPublicKey: pubKeys.identityPublicKey,
          signingPublicKey: pubKeys.signingPublicKey,
          authMethod,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register keys with server');
      }

      // Create and upload prekey bundle for DMs
      const prekeyPair = await createAndUploadPrekeyBundle(
        keys.signingKeyPair.secretKey
      );
      await storePrekeySecret(prekeyPair.secretKey);

      return pubKeys;
    },
    []
  );

  // Setup with wallet signature
  const setupWithWallet = useCallback(async () => {
    setState((s) => ({ ...s, setupStatus: 'in_progress' }));

    try {
      const signature = await signMessageAsync({
        message: KEY_DERIVATION_MESSAGE,
      });

      const keys = await deriveKeysFromSignature(signature);

      // Store locally
      await storeIdentityKeys(
        keys.identityKeyPair.secretKey,
        keys.signingKeyPair.secretKey
      );

      // Register with server
      const pubKeys = await registerKeys(keys, 'wallet');

      setDerivedKeys(keys);
      setPublicKeys(pubKeys);

      setState({
        isReady: true,
        hasKeys: true,
        setupStatus: 'complete',
        authMethod: 'wallet',
      });
    } catch (error) {
      console.error('Error setting up with wallet:', error);
      setState((s) => ({ ...s, setupStatus: 'needed' }));
      throw error;
    }
  }, [signMessageAsync, registerKeys]);

  // Setup with seed phrase
  const setupWithSeedPhrase = useCallback(
    async (existingMnemonic?: string) => {
      setState((s) => ({ ...s, setupStatus: 'in_progress' }));

      try {
        const mnemonic = existingMnemonic || generateSeedPhrase();

        if (!validateSeedPhrase(mnemonic)) {
          throw new Error('Invalid seed phrase');
        }

        const keys = await deriveKeysFromMnemonic(mnemonic);

        // Store mnemonic encrypted locally
        await storeMnemonic(mnemonic);

        // Store keys locally
        await storeIdentityKeys(
          keys.identityKeyPair.secretKey,
          keys.signingKeyPair.secretKey
        );

        // Register with server
        const pubKeys = await registerKeys(keys, 'seedphrase');

        setDerivedKeys(keys);
        setPublicKeys(pubKeys);

        setState({
          isReady: true,
          hasKeys: true,
          setupStatus: 'complete',
          authMethod: 'seedphrase',
        });

        return { mnemonic };
      } catch (error) {
        console.error('Error setting up with seed phrase:', error);
        setState((s) => ({ ...s, setupStatus: 'needed' }));
        throw error;
      }
    },
    [registerKeys]
  );

  // Clear all crypto data
  const clearKeys = useCallback(async () => {
    await clearAllCryptoData();
    setDerivedKeys(null);
    setPublicKeys(null);
    setState({
      isReady: false,
      hasKeys: false,
      setupStatus: 'needed',
      authMethod: null,
    });
  }, []);

  // Initialize channel key (fetch and decrypt key share)
  const initializeChannelKey = useCallback(
    async (channelId: string): Promise<boolean> => {
      if (!derivedKeys) return false;

      try {
        // Check if we already have the key
        const existingKey = await getChannelKey(channelId);
        if (existingKey) return true;

        // Fetch key share from server
        const response = await fetch(`/api/channels/${channelId}/keys`);
        if (!response.ok) {
          if (response.status === 404) {
            // No key share yet - channel might not have E2EE enabled
            return false;
          }
          throw new Error('Failed to fetch channel key');
        }

        const { encryptedKey, keyVersion, senderPublicKey } =
          await response.json();

        if (!encryptedKey || !senderPublicKey) {
          return false;
        }

        // Decrypt the key share
        const senderPubKey = decodeBase64(senderPublicKey);
        const channelKey = decryptKeyShare(
          encryptedKey,
          senderPubKey,
          derivedKeys.identityKeyPair.secretKey
        );

        if (!channelKey) {
          console.error('Failed to decrypt channel key');
          return false;
        }

        // Store locally
        await storeChannelKey(channelId, channelKey, keyVersion);
        return true;
      } catch (error) {
        console.error('Error initializing channel key:', error);
        return false;
      }
    },
    [derivedKeys]
  );

  // Encrypt channel message
  const encryptChannelMessage = useCallback(
    async (
      channelId: string,
      messageId: string,
      content: string
    ): Promise<EncryptedMessage | null> => {
      try {
        const keyInfo = await getChannelKey(channelId);
        if (!keyInfo) {
          // Try to initialize
          const success = await initializeChannelKey(channelId);
          if (!success) return null;
          const newKeyInfo = await getChannelKey(channelId);
          if (!newKeyInfo) return null;

          return encryptMessage(
            content,
            newKeyInfo.key,
            messageId,
            newKeyInfo.keyVersion
          );
        }

        return encryptMessage(
          content,
          keyInfo.key,
          messageId,
          keyInfo.keyVersion
        );
      } catch (error) {
        console.error('Error encrypting channel message:', error);
        return null;
      }
    },
    [initializeChannelKey]
  );

  // Decrypt channel message
  const decryptChannelMessage = useCallback(
    async (
      channelId: string,
      messageId: string,
      encrypted: EncryptedMessage
    ): Promise<string | null> => {
      try {
        const keyInfo = await getChannelKey(channelId);
        if (!keyInfo) {
          // Try to initialize
          const success = await initializeChannelKey(channelId);
          if (!success) return null;
          const newKeyInfo = await getChannelKey(channelId);
          if (!newKeyInfo) return null;

          return decryptMessage(encrypted, newKeyInfo.key, messageId);
        }

        return decryptMessage(encrypted, keyInfo.key, messageId);
      } catch (error) {
        console.error('Error decrypting channel message:', error);
        return null;
      }
    },
    [initializeChannelKey]
  );

  // Encrypt DM message
  const encryptDMMessage = useCallback(
    async (
      dmChannelId: string,
      otherUserId: string,
      messageId: string,
      content: string
    ): Promise<EncryptedMessage | null> => {
      if (!derivedKeys) return null;

      try {
        // Check for existing session
        let sessionInfo = await getDMSessionKey(dmChannelId);

        if (!sessionInfo) {
          // Need to establish new session via X3DH
          const bundle = await fetchPrekeyBundle(otherUserId);
          if (!bundle) {
            console.error('Recipient has no prekey bundle');
            return null;
          }

          const { sharedKey, ephemeralPublicKey } = await initiateX3DH(
            derivedKeys,
            bundle
          );

          // Store session key
          await storeDMSessionKey(dmChannelId, otherUserId, sharedKey);
          sessionInfo = { key: sharedKey, keyVersion: 1 };

          // Encrypt with ephemeral key included
          return encryptMessage(
            content,
            sharedKey,
            messageId,
            1,
            ephemeralPublicKey
          );
        }

        // Use existing session
        return encryptMessage(
          content,
          sessionInfo.key,
          messageId,
          sessionInfo.keyVersion
        );
      } catch (error) {
        console.error('Error encrypting DM message:', error);
        return null;
      }
    },
    [derivedKeys]
  );

  // Decrypt DM message
  const decryptDMMessage = useCallback(
    async (
      dmChannelId: string,
      otherUserId: string,
      messageId: string,
      encrypted: EncryptedMessage,
      senderIdentityKey?: string
    ): Promise<string | null> => {
      if (!derivedKeys) return null;

      try {
        // Check for existing session
        let sessionInfo = await getDMSessionKey(dmChannelId);

        if (!sessionInfo && encrypted.ek && senderIdentityKey) {
          // This is the first message - complete X3DH
          const prekeySecret = await getPrekeySecret();
          if (!prekeySecret) {
            console.error('No prekey secret found');
            return null;
          }

          const senderIdKey = decodeBase64(senderIdentityKey);
          const ephemeralKey = decodeBase64(encrypted.ek);

          const sharedKey = await completeX3DH(
            derivedKeys,
            prekeySecret,
            senderIdKey,
            ephemeralKey
          );

          // Store session key
          await storeDMSessionKey(dmChannelId, otherUserId, sharedKey);
          sessionInfo = { key: sharedKey, keyVersion: 1 };
        }

        if (!sessionInfo) {
          console.error('No session key and cannot establish one');
          return null;
        }

        return decryptMessage(encrypted, sessionInfo.key, messageId);
      } catch (error) {
        console.error('Error decrypting DM message:', error);
        return null;
      }
    },
    [derivedKeys]
  );

  return (
    <CryptoContext.Provider
      value={{
        ...state,
        setupWithWallet,
        setupWithSeedPhrase,
        generateNewSeedPhrase: generateSeedPhrase,
        validateMnemonic: validateSeedPhrase,
        clearKeys,
        encryptChannelMessage,
        decryptChannelMessage,
        encryptDMMessage,
        decryptDMMessage,
        getPublicKeys: () => publicKeys,
        initializeChannelKey,
      }}
    >
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto() {
  const context = useContext(CryptoContext);
  if (!context) {
    throw new Error('useCrypto must be used within a CryptoProvider');
  }
  return context;
}
