'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';

interface DMChannel {
  id: string;
  is_group: boolean;
  name: string | null;
  participants: {
    id: string;
    wallet_address: string;
    ethscription_name: string | null;
    avatar_url: string | null;
    status: 'online' | 'offline' | 'idle' | 'dnd';
  }[];
  updated_at: string;
}

export default function DMListPage() {
  const [channels, setChannels] = useState<DMChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDMs() {
      try {
        const res = await fetch('/api/dm');
        const data = await res.json();
        setChannels(data.channels || []);
      } catch (error) {
        console.error('Error fetching DMs:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDMs();
  }, []);

  return (
    <AppShell>
      <div className="flex-1 flex flex-col">
        <div className="h-12 px-4 flex items-center border-b border-border">
          <h1 className="font-semibold">Direct Messages</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-1">No messages yet</h2>
              <p className="text-zinc-400">Start a conversation with someone</p>
            </div>
          ) : (
            <div className="space-y-2">
              {channels.map(channel => {
                const displayUser = channel.participants[0];
                const displayName = channel.is_group
                  ? channel.name
                  : displayUser?.ethscription_name ||
                    `${displayUser?.wallet_address.slice(0, 6)}...${displayUser?.wallet_address.slice(-4)}`;

                return (
                  <Link
                    key={channel.id}
                    href={`/dm/${channel.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                        {displayUser?.avatar_url ? (
                          <img
                            src={displayUser.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-zinc-400">
                            {(displayName || '?').slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {displayUser && (
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-black ${
                            displayUser.status === 'online'
                              ? 'bg-green-500'
                              : displayUser.status === 'idle'
                              ? 'bg-yellow-500'
                              : displayUser.status === 'dnd'
                              ? 'bg-red-500'
                              : 'bg-zinc-500'
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{displayName}</h3>
                      {channel.is_group && (
                        <p className="text-sm text-zinc-500">
                          {channel.participants.length + 1} members
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
