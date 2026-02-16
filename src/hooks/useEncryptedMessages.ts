'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useCrypto } from '@/contexts/CryptoContext';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { EncryptedMessage } from '@/lib/crypto';
import { applyCorruption, normalizeAge } from '@/lib/entropy';

export interface Message {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  type: 'default' | 'system' | 'reply';
  reply_to_id: string | null;
  edited_at: string | null;
  created_at: string;
  is_encrypted?: boolean;
  encrypted_content?: string;
  encryption_iv?: string;
  key_version?: number;
  author: {
    id: string;
    wallet_address: string;
    ethscription_name: string | null;
    avatar_url: string | null;
  };
  attachments?: {
    id: string;
    url: string;
    content_type: string;
    size: number;
    filename: string;
  }[];
  reactions?: {
    id: string;
    emoji: string;
    user_id: string;
  }[];
  reply_to?: {
    id: string;
    content: string;
    author: {
      id: string;
      ethscription_name: string | null;
      wallet_address: string;
    };
  } | null;
  // Client-side decryption state
  _decrypted?: boolean;
  _decryptionFailed?: boolean;
  // Entropy corruption state
  _corruptionLevel?: number;
  _isCorrupted?: boolean;
}

export interface EntropyParams {
  enabled: boolean;
  corruptionPass: number;
  globalPressure: number;
}

export function useEncryptedMessages(
  channelId: string | null,
  entropyParams?: EntropyParams
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { encryptChannelMessage, decryptChannelMessage, isReady, initializeChannelKey } = useCrypto();

  // Track which messages have been decrypted
  const decryptedIds = useRef<Set<string>>(new Set());

  // Decrypt a single message
  const decryptMessage = useCallback(async (message: Message): Promise<Message> => {
    if (!message.is_encrypted || message._decrypted || !message.encrypted_content || !message.encryption_iv) {
      return message;
    }

    if (decryptedIds.current.has(message.id)) {
      return message;
    }

    try {
      const encrypted: EncryptedMessage = {
        v: 1,
        ct: message.encrypted_content,
        iv: message.encryption_iv,
        kv: message.key_version || 1,
      };

      const decrypted = await decryptChannelMessage(message.channel_id, message.id, encrypted);

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
  }, [decryptChannelMessage]);

  // Decrypt all messages in the list
  const decryptMessages = useCallback(async (msgs: Message[]): Promise<Message[]> => {
    return Promise.all(msgs.map(decryptMessage));
  }, [decryptMessage]);

  // Apply entropy corruption to a message (client-side, after decryption)
  const applyEntropyCorruption = useCallback((message: Message): Message => {
    if (!entropyParams?.enabled || message._decryptionFailed) {
      return message;
    }

    const messageAge = normalizeAge(message.created_at);
    const corruption = applyCorruption(
      message.content,
      message.id,
      entropyParams.corruptionPass,
      messageAge,
      entropyParams.globalPressure
    );

    return {
      ...message,
      content: corruption.text,
      _corruptionLevel: corruption.corruptionLevel,
      _isCorrupted: corruption.corruptionLevel > 0,
    };
  }, [entropyParams]);

  // Apply corruption to all messages
  const applyCorruptionToMessages = useCallback((msgs: Message[]): Message[] => {
    if (!entropyParams?.enabled) return msgs;
    return msgs.map(applyEntropyCorruption);
  }, [entropyParams, applyEntropyCorruption]);

  const fetchMessages = useCallback(async (before?: string) => {
    if (!channelId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      if (!before) {
        setLoading(true);
      }

      // Initialize channel key if needed
      if (isReady) {
        await initializeChannelKey(channelId);
      }

      const url = before
        ? `/api/channels/${channelId}/messages?before=${before}&limit=50`
        : `/api/channels/${channelId}/messages?limit=50`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      let newMessages = data.messages || [];
      setHasMore(newMessages.length === 50);

      // Decrypt messages
      if (isReady) {
        newMessages = await decryptMessages(newMessages);
      }

      // Apply entropy corruption (client-side, after decryption)
      newMessages = applyCorruptionToMessages(newMessages);

      if (before) {
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
      }

      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [channelId, isReady, initializeChannelKey, decryptMessages, applyCorruptionToMessages]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    fetchMessages();

    // Set up realtime subscription
    if (channelId) {
      const supabase = getSupabaseClient();

      // Subscribe to new messages
      const channel = supabase
        .channel(`messages:${channelId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `channel_id=eq.${channelId}`,
          },
          async (payload) => {
            // Fetch the full message with author info
            const res = await fetch(`/api/channels/${channelId}/messages?limit=1`);
            const data = await res.json();
            if (data.messages?.length > 0) {
              let newMsg = data.messages[data.messages.length - 1];

              // Decrypt if needed
              if (isReady && newMsg.is_encrypted) {
                newMsg = await decryptMessage(newMsg);
              }

              // Apply entropy corruption
              newMsg = applyEntropyCorruption(newMsg);

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
            table: 'messages',
            filter: `channel_id=eq.${channelId}`,
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
            table: 'messages',
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
  }, [channelId, fetchMessages, isReady, decryptMessage, applyEntropyCorruption]);

  // Re-apply corruption when entropy params change (e.g., corruption pass advances)
  useEffect(() => {
    if (!entropyParams?.enabled) return;

    setMessages(prev => prev.map(applyEntropyCorruption));
  }, [entropyParams?.corruptionPass, entropyParams?.enabled, applyEntropyCorruption]);

  const sendMessage = useCallback(async (
    content: string,
    reply_to_id?: string,
    attachments?: any[]
  ) => {
    if (!channelId) return;

    let body: Record<string, unknown> = { content, reply_to_id, attachments };

    // Encrypt if ready
    if (isReady) {
      // Generate a temporary ID for encryption (will be replaced by server)
      const tempId = crypto.randomUUID();
      const encrypted = await encryptChannelMessage(channelId, tempId, content);

      if (encrypted) {
        body = { encrypted, reply_to_id, attachments };
      }
    }

    const res = await fetch(`/api/channels/${channelId}/messages`, {
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

    // Apply entropy corruption
    message = applyEntropyCorruption(message);

    // Optimistically add message
    setMessages(prev => [...prev, message]);

    return message;
  }, [channelId, isReady, encryptChannelMessage, decryptMessage, applyEntropyCorruption]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    const res = await fetch(`/api/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error);
    }

    setMessages(prev =>
      prev.map(m => (m.id === messageId ? data.message : m))
    );

    return data.message;
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    const res = await fetch(`/api/messages/${messageId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }

    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    const res = await fetch(`/api/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error);
    }

    // Refetch messages to get updated reactions
    await fetchMessages();
  }, [fetchMessages]);

  const loadMore = useCallback(() => {
    if (messages.length > 0 && hasMore) {
      fetchMessages(messages[0].created_at);
    }
  }, [messages, hasMore, fetchMessages]);

  return {
    messages,
    loading,
    hasMore,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    loadMore,
    refetch: fetchMessages,
    isEncryptionReady: isReady,
  };
}
