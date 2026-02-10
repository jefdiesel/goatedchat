'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
}

export function useMessages(channelId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

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

      const newMessages = data.messages || [];
      setHasMore(newMessages.length === 50);

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
  }, [channelId]);

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
              const newMsg = data.messages[data.messages.length - 1];
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
  }, [channelId, fetchMessages]);

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

    // Optimistically add message
    setMessages(prev => [...prev, data.message]);

    return data.message;
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
