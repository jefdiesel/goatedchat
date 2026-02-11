'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface DiscoverServer {
  id: string;
  name: string;
  icon_url: string | null;
  description: string | null;
  website_url: string | null;
  created_at: string;
  owner: {
    id: string;
    ethscription_name: string | null;
    wallet_address: string;
  };
  member_count: number;
  is_member: boolean;
}

export default function DiscoverServersPage() {
  const router = useRouter();
  const [servers, setServers] = useState<DiscoverServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const res = await fetch('/api/servers/discover');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setServers(data.servers || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (serverId: string) => {
    setJoining(serverId);
    try {
      const res = await fetch('/api/servers/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_id: serverId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/servers/${serverId}`);
    } catch (err: any) {
      setError(err.message);
      setJoining(null);
    }
  };

  const getOwnerName = (owner: DiscoverServer['owner']) => {
    return owner.ethscription_name ||
      `${owner.wallet_address.slice(0, 6)}...${owner.wallet_address.slice(-4)}`;
  };

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Discover Servers</h1>
              <p className="text-zinc-400 mt-1">Find communities to join</p>
            </div>
            <Link href="/servers">
              <Button variant="secondary">Back to My Servers</Button>
            </Link>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">No servers found</h2>
              <p className="text-zinc-400">Be the first to create a server!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {servers.map(server => (
                <div
                  key={server.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Server Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {server.icon_url ? (
                        <img
                          src={server.icon_url}
                          alt={server.name}
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      ) : (
                        <span className="text-2xl font-bold text-zinc-400">
                          {server.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Server Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-semibold truncate">{server.name}</h3>
                        {server.website_url && (
                          <a
                            href={server.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-[#c3ff00] transition-colors"
                            title="Website"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>

                      {server.description && (
                        <p className="text-zinc-400 mb-2 line-clamp-2">{server.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-zinc-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {server.member_count} {server.member_count === 1 ? 'member' : 'members'}
                        </span>
                        <span>
                          by {getOwnerName(server.owner)}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0">
                      {server.is_member ? (
                        <Link href={`/servers/${server.id}`}>
                          <Button variant="secondary">Open</Button>
                        </Link>
                      ) : (
                        <Button
                          onClick={() => handleJoin(server.id)}
                          disabled={joining === server.id}
                        >
                          {joining === server.id ? 'Joining...' : 'Join'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
