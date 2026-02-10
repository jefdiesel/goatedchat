'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useServer } from '@/hooks/useServer';
import { useChannels, Channel } from '@/hooks/useChannel';
import { CreateChannelModal } from '@/components/channel/CreateChannelModal';
import { ServerSettingsModal } from '@/components/server/ServerSettingsModal';
import { ChannelSettingsModal } from '@/components/channel/ChannelSettingsModal';
import { Spinner } from '@/components/ui/Spinner';

interface ChannelSidebarProps {
  serverId: string;
  activeChannelId?: string;
}

export function ChannelSidebar({ serverId, activeChannelId }: ChannelSidebarProps) {
  const { server, fetchServer } = useServer(serverId);
  const { channels, loading, fetchChannels } = useChannels(serverId);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showServerMenu, setShowServerMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowServerMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        <div className="h-12 px-4 flex items-center justify-between border-b border-border relative" ref={menuRef}>
          <button
            onClick={() => setShowServerMenu(!showServerMenu)}
            className="flex-1 flex items-center justify-between hover:bg-zinc-800/50 -mx-2 px-2 py-1 rounded transition-colors"
          >
            <h2 className="font-semibold truncate">{server?.name || 'Loading...'}</h2>
            <svg className={`w-4 h-4 text-zinc-400 transition-transform ${showServerMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Server dropdown menu */}
          {showServerMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 mx-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50">
              {(server?.is_owner || server?.is_admin) && (
                <button
                  onClick={() => {
                    setShowServerMenu(false);
                    setShowServerSettings(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Server Settings
                </button>
              )}
              <button
                onClick={() => {
                  setShowServerMenu(false);
                  if (server?.invite_code) {
                    navigator.clipboard.writeText(`${window.location.origin}/servers?join=${server.invite_code}`);
                  }
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy Invite Link
              </button>
            </div>
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
                  canManage={server?.is_owner || server?.can_manage_channels || false}
                  onSettings={() => setEditingChannel(channel)}
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
                          canManage={server?.is_owner || server?.can_manage_channels || false}
                          onSettings={() => setEditingChannel(channel)}
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
        {(server?.is_owner || server?.can_manage_channels) && (
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
        onCreated={fetchChannels}
      />

      {server && (
        <ServerSettingsModal
          isOpen={showServerSettings}
          onClose={() => setShowServerSettings(false)}
          server={{
            id: server.id,
            name: server.name,
            icon_url: server.icon_url,
            description: server.description,
            website_url: server.website_url,
            invite_code: server.invite_code,
          }}
          onUpdate={fetchServer}
        />
      )}

      {editingChannel && (
        <ChannelSettingsModal
          isOpen={!!editingChannel}
          onClose={() => setEditingChannel(null)}
          channel={editingChannel}
          serverId={serverId}
          onUpdate={fetchChannels}
        />
      )}
    </>
  );
}

function ChannelItem({
  channel,
  serverId,
  isActive,
  canManage,
  onSettings,
}: {
  channel: Channel;
  serverId: string;
  isActive: boolean;
  canManage: boolean;
  onSettings: () => void;
}) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShowSettings(true)}
      onMouseLeave={() => setShowSettings(false)}
    >
      <Link
        href={`/servers/${serverId}/channels/${channel.id}`}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
          isActive
            ? 'bg-zinc-800 text-white'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
        }`}
      >
        {channel.icon_url ? (
          <img
            src={channel.icon_url}
            alt=""
            className="w-4 h-4 rounded object-cover flex-shrink-0"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <span className="text-zinc-500">#</span>
        )}
        <span className="truncate text-sm flex-1">{channel.name}</span>
        {channel.is_private && (
          <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}
      </Link>
      {canManage && showSettings && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSettings();
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded"
          title="Channel Settings"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
    </div>
  );
}
