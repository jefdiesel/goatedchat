'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ChannelHeader } from '@/components/channel/ChannelHeader';
import { MessageList } from '@/components/message/MessageList';
import { MessageInput } from '@/components/message/MessageInput';
import { useChannel } from '@/hooks/useChannel';
import { useMessages, Message } from '@/hooks/useMessages';
import { useEntropyChannel } from '@/hooks/useEntropyChannel';

export default function ChannelPage() {
  const params = useParams();
  const serverId = params.serverId as string;
  const channelId = params.channelId as string;
  const { channel, loading } = useChannel(channelId);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Entropy channel state - initially fetch without message count
  const entropyHook = useEntropyChannel(channelId, 0);

  // Build entropy params for message hook
  const entropyParams = useMemo(() => ({
    enabled: entropyHook.entropyEnabled,
    corruptionPass: entropyHook.corruptionPass,
    globalPressure: entropyHook.globalPressure,
  }), [entropyHook.entropyEnabled, entropyHook.corruptionPass, entropyHook.globalPressure]);

  const messagesHook = useMessages(channelId, entropyParams);

  return (
    <AppShell serverId={serverId} channelId={channelId}>
      <div className="flex-1 flex flex-col min-h-0">
        <ChannelHeader
          channel={channel}
          loading={loading}
          entropyEnabled={entropyHook.entropyEnabled}
          integrityPercent={entropyHook.integrityPercent}
          isDestroyed={entropyHook.isDestroyed}
        />
        <MessageList
          channelId={channelId}
          messages={messagesHook.messages}
          loading={messagesHook.loading}
          hasMore={messagesHook.hasMore}
          onLoadMore={messagesHook.loadMore}
          onEdit={messagesHook.editMessage}
          onDelete={messagesHook.deleteMessage}
          onReact={messagesHook.addReaction}
          onReply={setReplyTo}
        />
        <MessageInput
          channelId={channelId}
          onSend={messagesHook.sendMessage}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
    </AppShell>
  );
}
