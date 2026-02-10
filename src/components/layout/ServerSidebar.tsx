'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useServers } from '@/hooks/useServer';
import { Tooltip } from '@/components/ui/Tooltip';
import { CreateServerModal } from '@/components/server/CreateServerModal';
import { JoinServerModal } from '@/components/server/JoinServerModal';

interface ServerSidebarProps {
  activeServerId?: string;
}

export function ServerSidebar({ activeServerId }: ServerSidebarProps) {
  const { servers, loading } = useServers();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  return (
    <>
      <div className="w-[72px] bg-surface flex flex-col items-center py-3 gap-2 border-r border-border">
        {/* Home button */}
        <Tooltip content="Home" side="right">
          <Link
            href="/servers"
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:rounded-xl ${
              !activeServerId
                ? 'bg-[#c3ff00] text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
        </Tooltip>

        <div className="w-8 h-px bg-border my-1" />

        {/* Server list */}
        {loading ? (
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 animate-pulse" />
        ) : (
          servers.map(server => (
            <Tooltip key={server.id} content={server.name} side="right">
              <Link
                href={`/servers/${server.id}`}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:rounded-xl ${
                  server.id === activeServerId
                    ? 'bg-[#c3ff00] text-black'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                {server.icon_url ? (
                  <img
                    src={server.icon_url}
                    alt={server.name}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold">
                    {server.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </Link>
            </Tooltip>
          ))
        )}

        <div className="w-8 h-px bg-border my-1" />

        {/* Add server button */}
        <Tooltip content="Create Server" side="right">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-12 h-12 rounded-2xl bg-zinc-800 text-[#c3ff00] flex items-center justify-center hover:bg-[#c3ff00] hover:text-black hover:rounded-xl transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </Tooltip>

        {/* Join server button */}
        <Tooltip content="Join Server" side="right">
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-zinc-700 hover:text-white hover:rounded-xl transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
        </Tooltip>
      </div>

      <CreateServerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <JoinServerModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
    </>
  );
}
