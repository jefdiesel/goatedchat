'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Channel {
  id: string;
  server_id: string;
  name: string;
  type: 'text' | 'category';
  position: number;
  is_private: boolean;
  parent_id: string | null;
  icon_url: string | null;
  created_at: string;
}

export function useChannels(serverId: string | null) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    if (!serverId) {
      setChannels([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/servers/${serverId}/channels`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setChannels(data.channels || []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch channels');
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  interface TokenGate {
    contract_address: string;
    chain: 'eth' | 'base' | 'appchain';
    min_balance: number;
  }

  const createChannel = async (
    name: string,
    type: 'text' | 'category' = 'text',
    is_private = false,
    token_gate?: TokenGate,
    parent_id?: string
  ) => {
    if (!serverId) return;

    const res = await fetch(`/api/servers/${serverId}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, is_private, parent_id, token_gate }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error);
    }

    await fetchChannels();
    return data.channel;
  };

  const updateChannel = async (channelId: string, updates: Partial<Channel>) => {
    const res = await fetch(`/api/channels/${channelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error);
    }

    await fetchChannels();
    return data.channel;
  };

  const deleteChannel = async (channelId: string) => {
    const res = await fetch(`/api/channels/${channelId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }

    await fetchChannels();
  };

  // Organize channels with categories
  const organizedChannels = channels.reduce((acc, channel) => {
    if (channel.type === 'category') {
      acc.push({
        ...channel,
        children: channels.filter(c => c.parent_id === channel.id),
      });
    } else if (!channel.parent_id) {
      acc.push(channel);
    }
    return acc;
  }, [] as (Channel & { children?: Channel[] })[]);

  return {
    channels,
    organizedChannels,
    loading,
    error,
    fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel,
  };
}

export function useChannel(channelId: string | null) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChannel = useCallback(async () => {
    if (!channelId) {
      setChannel(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/channels/${channelId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setChannel(data.channel);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch channel');
      setChannel(null);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    fetchChannel();
  }, [fetchChannel]);

  return {
    channel,
    loading,
    error,
    fetchChannel,
  };
}
