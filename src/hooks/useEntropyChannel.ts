'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import { towerToPercent, isTowerFallen, calculateGlobalPressure } from '@/lib/entropy';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface EntropyState {
  id: string;
  channel_id: string;
  integrity_tower: number;
  corruption_pass: number;
  last_decay_tick: string;
  created_at: string;
}

interface UseEntropyChannelResult {
  entropyEnabled: boolean;
  entropyState: EntropyState | null;
  integrityPercent: number;
  corruptionPass: number;
  globalPressure: number;
  isDestroyed: boolean;
  isLeader: boolean;
  loading: boolean;
  error: string | null;
  toggleEntropy: (enabled: boolean) => Promise<void>;
}

const TICK_INTERVAL = 3000; // 3 seconds

export function useEntropyChannel(
  channelId: string | null,
  messageCount: number = 0
): UseEntropyChannelResult {
  const { user } = useAuth();
  const [entropyEnabled, setEntropyEnabled] = useState(false);
  const [entropyState, setEntropyState] = useState<EntropyState | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  // Calculate derived values
  const integrityPercent = entropyState ? towerToPercent(entropyState.integrity_tower) : 100;
  const corruptionPass = entropyState?.corruption_pass || 0;
  const globalPressure = calculateGlobalPressure(messageCount);
  const isDestroyed = entropyState ? isTowerFallen(entropyState.integrity_tower) : false;

  // Fetch initial entropy state
  const fetchEntropyState = useCallback(async () => {
    if (!channelId) {
      setEntropyEnabled(false);
      setEntropyState(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/channels/${channelId}/entropy`);
      const data = await res.json();

      if (res.ok) {
        setEntropyEnabled(data.entropy_enabled || false);
        setEntropyState(data.entropyState || null);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch entropy state');
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  // Process a decay tick
  const processTick = useCallback(async () => {
    if (!channelId || !entropyEnabled || isDestroyed) return;

    try {
      const res = await fetch(`/api/channels/${channelId}/entropy-tick`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.entropyState) {
        setEntropyState(data.entropyState);
      }
    } catch (err) {
      console.error('Entropy tick error:', err);
    }
  }, [channelId, entropyEnabled, isDestroyed]);

  // Toggle entropy mode
  const toggleEntropy = useCallback(async (enabled: boolean) => {
    if (!channelId) return;

    try {
      const res = await fetch(`/api/channels/${channelId}/entropy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entropy_enabled: enabled }),
      });

      const data = await res.json();

      if (res.ok) {
        setEntropyEnabled(data.entropy_enabled);
        setEntropyState(data.entropyState);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle entropy');
      throw err;
    }
  }, [channelId]);

  // Initial fetch
  useEffect(() => {
    fetchEntropyState();
  }, [fetchEntropyState]);

  // Subscribe to entropy state changes via Supabase Realtime
  useEffect(() => {
    if (!channelId) return;

    const supabase = getSupabaseClient();

    const channel = supabase
      .channel(`entropy:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_entropy_state',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setEntropyState(payload.new as EntropyState);
          } else if (payload.eventType === 'DELETE') {
            setEntropyState(null);
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [channelId]);

  // Leader election via Presence
  useEffect(() => {
    if (!channelId || !user || !entropyEnabled) {
      setIsLeader(false);
      return;
    }

    const supabase = getSupabaseClient();
    const presenceChannel = supabase.channel(`entropy-presence:${channelId}`);

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();

        // Get all user IDs in the presence
        const userIds: string[] = [];
        Object.values(state).forEach((presence) => {
          if (Array.isArray(presence)) {
            presence.forEach((p: any) => {
              if (p.user_id) {
                userIds.push(p.user_id);
              }
            });
          }
        });

        // Leader is the user with the lexicographically smallest ID
        const sortedIds = userIds.sort();
        const isCurrentUserLeader = sortedIds.length > 0 && sortedIds[0] === user.id;
        setIsLeader(isCurrentUserLeader);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            joined_at: Date.now(),
          });
        }
      });

    presenceChannelRef.current = presenceChannel;

    return () => {
      presenceChannel.unsubscribe();
      presenceChannelRef.current = null;
    };
  }, [channelId, user, entropyEnabled]);

  // Leader runs decay ticks
  useEffect(() => {
    if (!isLeader || !entropyEnabled || isDestroyed) {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
      return;
    }

    // Start tick interval
    tickIntervalRef.current = setInterval(processTick, TICK_INTERVAL);

    // Run initial tick
    processTick();

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    };
  }, [isLeader, entropyEnabled, isDestroyed, processTick]);

  return {
    entropyEnabled,
    entropyState,
    integrityPercent,
    corruptionPass,
    globalPressure,
    isDestroyed,
    isLeader,
    loading,
    error,
    toggleEntropy,
  };
}
