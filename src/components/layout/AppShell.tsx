'use client';

import { ReactNode } from 'react';
import { ServerSidebar } from './ServerSidebar';
import { ChannelSidebar } from './ChannelSidebar';
import { MemberSidebar } from './MemberSidebar';

interface AppShellProps {
  serverId?: string;
  channelId?: string;
  children: ReactNode;
}

export function AppShell({ serverId, channelId, children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-black">
      {/* Server sidebar */}
      <ServerSidebar activeServerId={serverId} />

      {/* Channel sidebar */}
      {serverId && (
        <ChannelSidebar serverId={serverId} activeChannelId={channelId} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>

      {/* Member sidebar */}
      {serverId && channelId && (
        <MemberSidebar serverId={serverId} />
      )}
    </div>
  );
}
