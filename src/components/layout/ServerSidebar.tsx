'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useServers } from '@/hooks/useServer';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip } from '@/components/ui/Tooltip';
import { CreateServerModal } from '@/components/server/CreateServerModal';
import { JoinServerModal } from '@/components/server/JoinServerModal';
import { ProfilePanel } from '@/components/user/ProfilePanel';
import { AdminPanel } from '@/components/admin/AdminPanel';

interface ServerSidebarProps {
  activeServerId?: string;
}

export function ServerSidebar({ activeServerId }: ServerSidebarProps) {
  const router = useRouter();
  const { servers, loading } = useServers();
  const { user, signOut } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/admin/check');
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.isAdmin);
        }
      } catch {
        setIsAdmin(false);
      }
    };
    if (user) checkAdmin();
  }, [user]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.ethscription_name ||
    (user?.wallet_address ? `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}` : 'User');

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
          servers.map(server => {
            const isActive = server.id === activeServerId;
            return (
              <Tooltip key={server.id} content={server.name} side="right">
                <button
                  onClick={() => {
                    if (!isActive) {
                      router.push(`/servers/${server.id}`);
                    }
                  }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:rounded-xl ${
                    isActive
                      ? 'bg-[#c3ff00] text-black'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {server.icon_url ? (
                    <img
                      src={server.icon_url}
                      alt={server.name}
                      className="w-full h-full rounded-2xl object-cover"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <span className="text-lg font-semibold">
                      {server.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </button>
              </Tooltip>
            );
          })
        )}

        <div className="w-8 h-px bg-border my-1" />

        {/* Add server button - admin only */}
        {isAdmin && (
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
        )}

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

        {/* Discover servers button */}
        <Tooltip content="Discover Servers" side="right">
          <Link
            href="/servers/discover"
            className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-zinc-700 hover:text-white hover:rounded-xl transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>
        </Tooltip>

        {/* Spacer to push user menu to bottom */}
        <div className="flex-1" />

        {/* User menu */}
        {user && (
          <div className="relative" ref={menuRef}>
            <Tooltip content={displayName} side="right">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden hover:rounded-xl transition-all ring-2 ring-transparent hover:ring-[#c3ff00]/50"
                style={{ imageRendering: 'pixelated' }}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <span className="text-sm font-semibold text-zinc-400">
                    {displayName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </button>
            </Tooltip>

            {/* Dropdown menu */}
            {showUserMenu && (
              <div className="absolute bottom-0 left-full ml-2 w-56 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50">
                {/* User info header */}
                <div className="p-3 border-b border-zinc-700">
                  <p className="font-semibold text-[#c3ff00] truncate">{displayName}</p>
                  <p className="text-xs text-zinc-500 truncate">{user.wallet_address}</p>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowProfilePanel(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </button>

                  <button
                    onClick={() => setShowUserMenu(false)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Notifications
                    <span className="ml-auto text-xs text-zinc-500">Soon</span>
                  </button>

                  {isAdmin && (
                    <>
                      <div className="h-px bg-zinc-700 my-1" />
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowAdminPanel(true);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#c3ff00] hover:bg-zinc-800 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Admin Panel
                      </button>
                    </>
                  )}

                  <div className="h-px bg-zinc-700 my-1" />

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <CreateServerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <JoinServerModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />

      <ProfilePanel
        isOpen={showProfilePanel}
        onClose={() => setShowProfilePanel(false)}
      />

      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />
    </>
  );
}
