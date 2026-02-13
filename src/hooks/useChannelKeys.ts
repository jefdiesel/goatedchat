'use client';

import { useState, useCallback } from 'react';
import { useCrypto } from '@/contexts/CryptoContext';
import {
  generateChannelKey,
  createKeyShares,
  storeChannelKey,
  fetchChannelMemberKeys,
  uploadKeyShares,
  requestKeyRotation,
} from '@/lib/crypto';
import { decodeBase64 } from 'tweetnacl-util';

export function useChannelKeys() {
  const { getPublicKeys, isReady } = useCrypto();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initializes encryption for a newly created channel.
   * Generates a channel key and distributes it to all members.
   */
  const initializeChannelEncryption = useCallback(async (channelId: string) => {
    if (!isReady) {
      setError('Encryption not ready');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the user's secret key from storage
      const { getIdentityKeys } = await import('@/lib/crypto');
      const storedKeys = await getIdentityKeys();

      if (!storedKeys) {
        throw new Error('No identity keys found');
      }

      // Generate a new channel key
      const channelKey = generateChannelKey();
      const keyVersion = 1;

      // Fetch all member public keys
      const members = await fetchChannelMemberKeys(channelId);

      if (members.length === 0) {
        throw new Error('No members found for channel');
      }

      // Convert member public keys to Uint8Array
      const membersWithKeys = members.map((m) => ({
        userId: m.userId,
        publicKey: decodeBase64(m.publicKey),
      }));

      // Create encrypted key shares for each member
      const keyShares = createKeyShares(
        channelKey,
        keyVersion,
        membersWithKeys,
        storedKeys.identitySecretKey
      );

      // Upload key shares to server
      await uploadKeyShares(channelId, keyShares);

      // Store the channel key locally
      await storeChannelKey(channelId, channelKey, keyVersion);

      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error initializing channel encryption:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize encryption');
      setLoading(false);
      return false;
    }
  }, [isReady]);

  /**
   * Adds encryption key shares for new members joining a channel.
   */
  const addMemberToChannel = useCallback(async (
    channelId: string,
    newMemberUserId: string,
    newMemberPublicKey: string
  ) => {
    if (!isReady) {
      setError('Encryption not ready');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the user's secret key
      const { getIdentityKeys, getChannelKey } = await import('@/lib/crypto');
      const storedKeys = await getIdentityKeys();

      if (!storedKeys) {
        throw new Error('No identity keys found');
      }

      // Get the current channel key
      const keyInfo = await getChannelKey(channelId);
      if (!keyInfo) {
        throw new Error('No channel key found');
      }

      // Create key share for the new member
      const keyShares = createKeyShares(
        keyInfo.key,
        keyInfo.keyVersion,
        [{ userId: newMemberUserId, publicKey: decodeBase64(newMemberPublicKey) }],
        storedKeys.identitySecretKey
      );

      // Upload the new key share
      await uploadKeyShares(channelId, keyShares);

      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error adding member to channel encryption:', err);
      setError(err instanceof Error ? err.message : 'Failed to add member');
      setLoading(false);
      return false;
    }
  }, [isReady]);

  /**
   * Rotates the encryption key for a channel.
   * Should be called when a member is removed.
   */
  const rotateChannelKey = useCallback(async (channelId: string) => {
    if (!isReady) {
      setError('Encryption not ready');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the user's secret key
      const { getIdentityKeys } = await import('@/lib/crypto');
      const storedKeys = await getIdentityKeys();

      if (!storedKeys) {
        throw new Error('No identity keys found');
      }

      // Request rotation info from server (gets current version and remaining members)
      const res = await fetch(`/api/channels/${channelId}/rotate-key`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to request key rotation');
      }

      const { newVersion, members } = await res.json();

      if (!members || members.length === 0) {
        throw new Error('No members found for rotation');
      }

      // Generate new channel key
      const newChannelKey = generateChannelKey();

      // Convert member public keys to Uint8Array
      const membersWithKeys = members.map((m: { userId: string; publicKey: string }) => ({
        userId: m.userId,
        publicKey: decodeBase64(m.publicKey),
      }));

      // Create encrypted key shares for each remaining member
      const keyShares = createKeyShares(
        newChannelKey,
        newVersion,
        membersWithKeys,
        storedKeys.identitySecretKey
      );

      // Upload new key shares
      await uploadKeyShares(channelId, keyShares);

      // Store the new channel key locally
      await storeChannelKey(channelId, newChannelKey, newVersion);

      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error rotating channel key:', err);
      setError(err instanceof Error ? err.message : 'Failed to rotate key');
      setLoading(false);
      return false;
    }
  }, [isReady]);

  return {
    initializeChannelEncryption,
    addMemberToChannel,
    rotateChannelKey,
    loading,
    error,
    isReady,
  };
}
