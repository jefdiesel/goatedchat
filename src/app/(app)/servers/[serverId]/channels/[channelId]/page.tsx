'use client';

import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ChannelHeader } from '@/components/channel/ChannelHeader';
import { MessageList } from '@/components/message/MessageList';
import { MessageInput } from '@/components/message/MessageInput';
import { useChannel } from '@/hooks/useChannel';

export default function ChannelPage() {
  const params = useParams();
  const serverId = params.serverId as string;
  const channelId = params.channelId as string;
  const { channel, loading } = useChannel(channelId);

  return (
    <AppShell serverId={serverId} channelId={channelId}>
      <div className="flex-1 flex flex-col min-h-0">
        <ChannelHeader channel={channel} loading={loading} />
        <MessageList channelId={channelId} />
        <MessageInput channelId={channelId} />
      </div>
    </AppShell>
  );
}
