'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useServer } from '@/hooks/useServer';
import { useChannels, Channel } from '@/hooks/useChannel';
import { CreateChannelModal } from '@/components/channel/CreateChannelModal';
import { Spinner } from '@/components/ui/Spinner';

interface ChannelSidebarProps {
  serverId: string;
  activeChannelId?: string;
}

export function ChannelSidebar({ serverId, activeChannelId }: ChannelSidebarProps) {
  const { server } = useServer(serverId);
  const { channels, loading } = useChannels(serverId);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Organize channels by category
  const categories = channels.filter(c => c.type === 'category');
  const uncategorizedChannels = channels.filter(c => c.type === 'text' && !c.parent_id);

  const getChannelsByCategory = (categoryId: string) => {
    return channels.filter(c => c.type === 'text' && c.parent_id === categoryId);
  };

  return (
    <>
      <div className="w-60 bg-surface flex flex-col border-r border-border">
        {/* Server header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-border">
          <h2 className="font-semibold truncate">{server?.name || 'Loading...'}</h2>
          {server?.is_owner && (
            <button className="p-1 text-zinc-400 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : (
            <>
              {/* Uncategorized channels */}
              {uncategorizedChannels.map(channel => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  serverId={serverId}
                  isActive={channel.id === activeChannelId}
                />
              ))}

              {/* Categorized channels */}
              {categories.map(category => (
                <div key={category.id} className="mt-4 first:mt-0">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center gap-1 px-1 py-1 text-xs font-semibold text-zinc-400 hover:text-zinc-300 uppercase tracking-wide"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${
                        collapsedCategories.has(category.id) ? '-rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {category.name}
                  </button>

                  {!collapsedCategories.has(category.id) && (
                    <div className="mt-1">
                      {getChannelsByCategory(category.id).map(channel => (
                        <ChannelItem
                          key={channel.id}
                          channel={channel}
                          serverId={serverId}
                          isActive={channel.id === activeChannelId}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {channels.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4">No channels yet</p>
              )}
            </>
          )}
        </div>

        {/* Create channel button */}
        {server?.is_owner && (
          <div className="p-2 border-t border-border">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Channel
            </button>
          </div>
        )}
      </div>

      <CreateChannelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        serverId={serverId}
      />
    </>
  );
}

function ChannelItem({
  channel,
  serverId,
  isActive,
}: {
  channel: Channel;
  serverId: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={`/servers/${serverId}/channels/${channel.id}`}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
        isActive
          ? 'bg-zinc-800 text-white'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
      }`}
    >
      <span className="text-zinc-500">#</span>
      <span className="truncate text-sm">{channel.name}</span>
      {channel.is_private && (
        <svg className="w-3 h-3 text-zinc-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )}
    </Link>
  );
}
