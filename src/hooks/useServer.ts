'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Server {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  icon_url: string | null;
  created_at: string;
  is_owner?: boolean;
  nickname?: string;
  joined_at?: string;
}

export function useServers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/servers');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setServers(data.servers || []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch servers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const createServer = async (name: string, icon_url?: string) => {
    const res = await fetch('/api/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon_url }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error);
    }

    await fetchServers();
    return data.server;
  };

  const joinServer = async (invite_code: string) => {
    const res = await fetch('/api/servers/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error);
    }

    await fetchServers();
    return data.server;
  };

  return {
    servers,
    loading,
    error,
    fetchServers,
    createServer,
    joinServer,
  };
}

export function useServer(serverId: string | null) {
  const [server, setServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServer = useCallback(async () => {
    if (!serverId) {
      setServer(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/servers/${serverId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setServer(data.server);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch server');
      setServer(null);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchServer();
  }, [fetchServer]);

  const updateServer = async (updates: Partial<Server>) => {
    if (!serverId) return;

    const res = await fetch(`/api/servers/${serverId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error);
    }

    setServer(data.server);
    return data.server;
  };

  const deleteServer = async () => {
    if (!serverId) return;

    const res = await fetch(`/api/servers/${serverId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
  };

  return {
    server,
    loading,
    error,
    fetchServer,
    updateServer,
    deleteServer,
  };
}
