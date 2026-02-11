'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useServers } from '@/hooks/useServer';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { CreateServerModal } from '@/components/server/CreateServerModal';
import { JoinServerModal } from '@/components/server/JoinServerModal';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function ServersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { servers, loading, joinServer } = useServers();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [shouldShowList, setShouldShowList] = useState(false);
  const [joiningServer, setJoiningServer] = useState(false);

  // Handle join code from URL first
  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (!joinCode || joiningServer) return;

    const handleJoin = async () => {
      setJoiningServer(true);
      try {
        const server = await joinServer(joinCode);
        if (server) {
          router.replace(`/servers/${server.id}`);
        }
      } catch (err) {
        console.error('Failed to join server:', err);
        // Clear the join param and show the list
        router.replace('/servers');
        setShouldShowList(true);
      }
    };

    handleJoin();
  }, [searchParams, joinServer, router, joiningServer]);

  // Auto-redirect to default server (only if no join code)
  useEffect(() => {
    if (loading || joiningServer) return;

    // Don't redirect if there's a join code in the URL
    if (searchParams.get('join')) return;

    // If user has a default server and it's in their server list, go there
    if (user?.default_server_id) {
      const defaultServer = servers.find(s => s.id === user.default_server_id);
      if (defaultServer) {
        router.replace(`/servers/${defaultServer.id}`);
        return;
      }
    }

    // If user has exactly 1 server, go there
    if (servers.length === 1) {
      router.replace(`/servers/${servers[0].id}`);
      return;
    }

    // Otherwise show the server selection page
    setShouldShowList(true);
  }, [loading, servers, user?.default_server_id, router, searchParams, joiningServer]);

  // Show loading until we know we need to show the list
  if (!shouldShowList || joiningServer) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <Spinner />
          {joiningServer && <p className="ml-3 text-zinc-400">Joining server...</p>}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome to Goat Chat</h1>
          <p className="text-zinc-400 mb-4">
            Select a server from the sidebar or create a new one
          </p>
          <Link
            href="/servers/discover"
            className="inline-flex items-center gap-2 text-[#c3ff00] hover:underline mb-8"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Browse all servers
          </Link>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : servers.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">No servers yet</h2>
              <p className="text-zinc-400 mb-6">
                Create your own server or join an existing one with an invite code
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setShowCreateModal(true)}>
                  Create Server
                </Button>
                <Button variant="secondary" onClick={() => setShowJoinModal(true)}>
                  Join Server
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {servers.map(server => {
                const isDefault = user?.default_server_id === server.id;
                return (
                  <div
                    key={server.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors relative group"
                  >
                    <Link href={`/servers/${server.id}`} className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        {server.icon_url ? (
                          <img
                            src={server.icon_url}
                            alt={server.name}
                            className="w-full h-full rounded-2xl object-cover"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        ) : (
                          <span className="text-xl font-bold text-zinc-400">
                            {server.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{server.name}</h3>
                        <p className="text-sm text-zinc-500">
                          {server.is_owner ? 'Owner' : 'Member'}
                          {isDefault && <span className="text-[#c3ff00] ml-2">• Default</span>}
                        </p>
                      </div>
                    </Link>
                    {/* Set as default button */}
                    {!isDefault && servers.length > 1 && (
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          await fetch('/api/users/profile', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ default_server_id: server.id }),
                          });
                          window.location.reload();
                        }}
                        className="absolute top-3 right-3 p-2 text-zinc-500 hover:text-[#c3ff00] opacity-0 group-hover:opacity-100 transition-all"
                        title="Set as default"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CreateServerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      <JoinServerModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
    </AppShell>
  );
}
