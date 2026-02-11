'use client';

import { ReactNode, useState, createContext, useContext } from 'react';
import { ServerSidebar } from './ServerSidebar';
import { ChannelSidebar } from './ChannelSidebar';
import { MemberSidebar } from './MemberSidebar';

interface AppShellContextType {
  showMembers: boolean;
  setShowMembers: (show: boolean) => void;
}

const AppShellContext = createContext<AppShellContextType>({
  showMembers: true,
  setShowMembers: () => {},
});

export function useAppShell() {
  return useContext(AppShellContext);
}

interface AppShellProps {
  serverId?: string;
  channelId?: string;
  children: ReactNode;
}

export function AppShell({ serverId, channelId, children }: AppShellProps) {
  const [showMembers, setShowMembers] = useState(true);

  return (
    <AppShellContext.Provider value={{ showMembers, setShowMembers }}>
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

        {/* Member sidebar - collapsible */}
        {serverId && channelId && (
          <div className={`transition-all duration-300 ease-in-out ${showMembers ? 'w-60' : 'w-0'} overflow-hidden`}>
            <MemberSidebar serverId={serverId} />
          </div>
        )}
      </div>
    </AppShellContext.Provider>
  );
}
