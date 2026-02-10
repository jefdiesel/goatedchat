'use client';

import { useState } from 'react';
import { useServers } from '@/hooks/useServer';
import { AppShell } from '@/components/layout/AppShell';
import { CreateServerModal } from '@/components/server/CreateServerModal';
import { JoinServerModal } from '@/components/server/JoinServerModal';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function ServersPage() {
  const { servers, loading } = useServers();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  return (
    <AppShell>
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome to Goat Chat</h1>
          <p className="text-zinc-400 mb-8">
            Select a server from the sidebar or create a new one
          </p>

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
              {servers.map(server => (
                <Link
                  key={server.id}
                  href={`/servers/${server.id}`}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-left hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center">
                      {server.icon_url ? (
                        <img
                          src={server.icon_url}
                          alt={server.name}
                          className="w-full h-full rounded-2xl object-cover"
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
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
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
