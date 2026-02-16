'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
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
  // Entropy corruption state
  _corruptionLevel?: number;
  _isCorrupted?: boolean;
}

export interface EntropyParams {
  enabled: boolean;
  corruptionPass: number;
  globalPressure: number;
}

export function useMessages(channelId: string | null, entropyParams?: EntropyParams) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Apply entropy corruption to a message (client-side)
  const applyEntropyCorruption = useCallback((message: Message): Message => {
    if (!entropyParams?.enabled) {
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

      // Apply entropy corruption (client-side)
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
  }, [channelId, applyCorruptionToMessages]);

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
  }, [channelId, fetchMessages, applyEntropyCorruption]);

  // Re-apply corruption when entropy params change (e.g., corruption pass advances)
  useEffect(() => {
    if (!entropyParams?.enabled) return;

    setMessages(prev => prev.map(applyEntropyCorruption));
  }, [entropyParams?.corruptionPass, entropyParams?.enabled, applyEntropyCorruption]);

  const sendMessage = async (content: string, reply_to_id?: string, attachments?: any[]) => {
    if (!channelId) return;

    const res = await fetch(`/api/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, reply_to_id, attachments }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error);
    }

    // Apply entropy corruption and optimistically add message
    const corruptedMessage = applyEntropyCorruption(data.message);
    setMessages(prev => [...prev, corruptedMessage]);

    return corruptedMessage;
  };

  const editMessage = async (messageId: string, content: string) => {
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
  };

  const deleteMessage = async (messageId: string) => {
    const res = await fetch(`/api/messages/${messageId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }

    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const addReaction = async (messageId: string, emoji: string) => {
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
  };

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
  };
}
