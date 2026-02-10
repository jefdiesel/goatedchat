'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useChannels } from '@/hooks/useChannel';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';

export default function ServerPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params.serverId as string;
  const { channels, loading } = useChannels(serverId);

  useEffect(() => {
    // Redirect to first channel if available
    if (!loading && channels.length > 0) {
      const firstTextChannel = channels.find(c => c.type === 'text');
      if (firstTextChannel) {
        router.replace(`/servers/${serverId}/channels/${firstTextChannel.id}`);
      }
    }
  }, [loading, channels, serverId, router]);

  return (
    <AppShell serverId={serverId}>
      <div className="flex-1 flex items-center justify-center">
        {loading ? (
          <Spinner />
        ) : channels.length === 0 ? (
          <div className="text-center">
            <p className="text-zinc-400">No channels yet</p>
            <p className="text-sm text-zinc-500 mt-1">Create a channel to get started</p>
          </div>
        ) : (
          <Spinner />
        )}
      </div>
    </AppShell>
  );
}
