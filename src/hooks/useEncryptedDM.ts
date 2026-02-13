'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useCrypto } from '@/contexts/CryptoContext';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { EncryptedMessage } from '@/lib/crypto';

export interface DMMessage {
  id: string;
  dm_channel_id: string;
  author_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  is_encrypted?: boolean;
  encrypted_content?: string;
  encryption_iv?: string;
  key_version?: number;
  sender_ephemeral_key?: string;
  author: {
    id: string;
    wallet_address: string;
    ethscription_name: string | null;
    avatar_url: string | null;
  };
  // Client-side decryption state
  _decrypted?: boolean;
  _decryptionFailed?: boolean;
}

export function useEncryptedDM(channelId: string | null, otherUserId: string | null) {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { encryptDMMessage, decryptDMMessage, isReady } = useCrypto();

  // Track which messages have been decrypted
  const decryptedIds = useRef<Set<string>>(new Set());

  // Decrypt a single message
  const decryptMessage = useCallback(async (message: DMMessage): Promise<DMMessage> => {
    if (!message.is_encrypted || message._decrypted || !message.encrypted_content || !message.encryption_iv) {
      return message;
    }

    if (decryptedIds.current.has(message.id)) {
      return message;
    }

    if (!otherUserId) {
      return message;
    }

    try {
      const encrypted: EncryptedMessage = {
        v: 1,
        ct: message.encrypted_content,
        iv: message.encryption_iv,
        kv: message.key_version || 1,
        ek: message.sender_ephemeral_key,
      };

      // Get sender's identity key for X3DH completion
      let senderIdentityKey: string | undefined;
      if (message.sender_ephemeral_key && message.author_id !== otherUserId) {
        // Need to fetch sender's identity key
        const keysRes = await fetch(`/api/crypto/user-keys/${message.author_id}`);
        if (keysRes.ok) {
          const keysData = await keysRes.json();
          senderIdentityKey = keysData.identityPublicKey;
        }
      }

      const decrypted = await decryptDMMessage(
        message.dm_channel_id,
        otherUserId,
        message.id,
        encrypted,
        senderIdentityKey
      );

      if (decrypted) {
        decryptedIds.current.add(message.id);
        return {
          ...message,
          content: decrypted,
          _decrypted: true,
        };
      } else {
        return {
          ...message,
          content: '[Unable to decrypt message]',
          _decryptionFailed: true,
        };
      }
    } catch (err) {
      console.error('Decryption error:', err);
      return {
        ...message,
        content: '[Decryption failed]',
        _decryptionFailed: true,
      };
    }
  }, [decryptDMMessage, otherUserId]);

  // Decrypt all messages in the list
  const decryptMessages = useCallback(async (msgs: DMMessage[]): Promise<DMMessage[]> => {
    return Promise.all(msgs.map(decryptMessage));
  }, [decryptMessage]);

  const fetchMessages = useCallback(async () => {
    if (!channelId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/dm/${channelId}/messages`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      let newMessages = data.messages || [];

      // Decrypt messages
      if (isReady) {
        newMessages = await decryptMessages(newMessages);
      }

      setMessages(newMessages);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [channelId, isReady, decryptMessages]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    fetchMessages();

    // Set up realtime subscription
    if (channelId) {
      const supabase = getSupabaseClient();

      const channel = supabase
        .channel(`dm_messages:${channelId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'dm_messages',
            filter: `dm_channel_id=eq.${channelId}`,
          },
          async (payload) => {
            // Fetch the full message with author info
            const res = await fetch(`/api/dm/${channelId}/messages?limit=1`);
            const data = await res.json();
            if (data.messages?.length > 0) {
              let newMsg = data.messages[data.messages.length - 1];

              // Decrypt if needed
              if (isReady && newMsg.is_encrypted) {
                newMsg = await decryptMessage(newMsg);
              }

              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'dm_messages',
            filter: `dm_channel_id=eq.${channelId}`,
          },
          (payload) => {
            setMessages(prev =>
              prev.map(m =>
                m.id === payload.new.id
                  ? { ...m, content: payload.new.content, edited_at: payload.new.edited_at }
                  : m
              )
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'dm_messages',
          },
          (payload) => {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        )
        .subscribe();

      channelRef.current = channel;

      return () => {
        channel.unsubscribe();
      };
    }
  }, [channelId, fetchMessages, isReady, decryptMessage]);

  const sendMessage = useCallback(async (content: string) => {
    if (!channelId || !otherUserId) return;

    let body: Record<string, unknown> = { content };

    // Encrypt if ready
    if (isReady) {
      const tempId = crypto.randomUUID();
      const encrypted = await encryptDMMessage(channelId, otherUserId, tempId, content);

      if (encrypted) {
        body = { encrypted };
      }
    }

    const res = await fetch(`/api/dm/${channelId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error);
    }

    // Decrypt the returned message for display
    let message = data.message;
    if (isReady && message.is_encrypted) {
      message = await decryptMessage(message);
    }

    // Optimistically add message
    setMessages(prev => [...prev, message]);

    return message;
  }, [channelId, otherUserId, isReady, encryptDMMessage, decryptMessage]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    refetch: fetchMessages,
    isEncryptionReady: isReady,
  };
}
