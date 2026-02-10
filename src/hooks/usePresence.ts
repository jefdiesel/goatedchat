'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  status: 'online' | 'idle' | 'dnd' | 'offline';
  typing?: boolean;
  channel_id?: string;
}

export function usePresence(channelId?: string) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceState>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    const supabase = getSupabaseClient();
    const presenceChannel = supabase.channel('presence');

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = new Map<string, PresenceState>();

        Object.entries(state).forEach(([_, presence]) => {
          if (Array.isArray(presence) && presence.length > 0) {
            const p = presence[0] as any;
            users.set(p.user_id, {
              status: p.status,
              typing: p.typing,
              channel_id: p.channel_id,
            });
          }
        });

        setOnlineUsers(users);

        // Update typing users for current channel
        if (channelId) {
          const typing = new Set<string>();
          users.forEach((state, userId) => {
            if (state.typing && state.channel_id === channelId && userId !== user.id) {
              typing.add(userId);
            }
          });
          setTypingUsers(typing);
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        // Handle joins
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // Handle leaves
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            status: 'online',
            typing: false,
            channel_id: channelId,
          });
        }
      });

    channelRef.current = presenceChannel;

    // Update user status in database
    updateUserStatus('online');

    // Handle visibility change for idle detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateUserStatus('idle');
        presenceChannel.track({
          user_id: user.id,
          status: 'idle',
          typing: false,
          channel_id: channelId,
        });
      } else {
        updateUserStatus('online');
        presenceChannel.track({
          user_id: user.id,
          status: 'online',
          typing: false,
          channel_id: channelId,
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      presenceChannel.unsubscribe();
      updateUserStatus('offline');
    };
  }, [user, channelId]);

  const updateUserStatus = async (status: 'online' | 'idle' | 'offline') => {
    try {
      await fetch('/api/users/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const setTyping = useCallback((isTyping: boolean) => {
    if (!user || !channelRef.current) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    channelRef.current.track({
      user_id: user.id,
      status: 'online',
      typing: isTyping,
      channel_id: channelId,
    });

    // Auto-clear typing after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.track({
          user_id: user.id,
          status: 'online',
          typing: false,
          channel_id: channelId,
        });
      }, 3000);
    }
  }, [user, channelId]);

  const setStatus = useCallback(async (status: 'online' | 'idle') => {
    if (!user || !channelRef.current) return;

    await updateUserStatus(status);
    channelRef.current.track({
      user_id: user.id,
      status,
      typing: false,
      channel_id: channelId,
    });
  }, [user, channelId]);

  return {
    onlineUsers,
    typingUsers,
    setTyping,
    setStatus,
    isUserOnline: (userId: string) => onlineUsers.has(userId),
    getUserStatus: (userId: string) => onlineUsers.get(userId)?.status || 'offline',
  };
}
