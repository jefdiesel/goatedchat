'use client';

import { Channel } from '@/hooks/useChannel';

interface ChannelHeaderProps {
  channel: Channel | null;
  loading: boolean;
}

export function ChannelHeader({ channel, loading }: ChannelHeaderProps) {
  return (
    <div className="h-12 px-4 flex items-center gap-2 border-b border-border bg-surface/50">
      {loading ? (
        <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
      ) : channel ? (
        <>
          <span className="text-zinc-500 text-lg">#</span>
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
    </div>
  );
}
