'use client';

import { Channel } from '@/hooks/useChannel';
import { useAppShell } from '@/components/layout/AppShell';

interface ChannelHeaderProps {
  channel: Channel | null;
  loading: boolean;
}

export function ChannelHeader({ channel, loading }: ChannelHeaderProps) {
  const { showMembers, setShowMembers } = useAppShell();

  return (
    <div className="h-12 px-4 flex items-center gap-2 border-b border-border bg-surface/50">
      {loading ? (
        <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
      ) : channel ? (
        <>
          {channel.icon_url ? (
            <img src={channel.icon_url} alt="" className="w-5 h-5 rounded object-cover" style={{ imageRendering: 'pixelated' }} />
          ) : (
            <span className="text-zinc-500 text-lg">#</span>
          )}
          <h1 className="font-semibold">{channel.name}</h1>
          {channel.is_private && (
            <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </>
      ) : (
        <span className="text-zinc-500">Channel not found</span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Toggle members sidebar */}
      <button
        onClick={() => setShowMembers(!showMembers)}
        className={`p-2 rounded-lg transition-colors ${showMembers ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
        title={showMembers ? 'Hide members' : 'Show members'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>
    </div>
  );
}
