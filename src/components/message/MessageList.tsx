'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Message as MessageType } from '@/hooks/useMessages';
import { Message } from './Message';
import { Spinner } from '@/components/ui/Spinner';

interface MessageListProps {
  channelId: string;
  messages: MessageType[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onEdit: (messageId: string, content: string) => Promise<any>;
  onDelete: (messageId: string) => Promise<void>;
  onReact: (messageId: string, emoji: string) => Promise<void>;
  onReply: (message: MessageType) => void;
}

export function MessageList({
  channelId,
  messages,
  loading,
  hasMore,
  onLoadMore,
  onEdit,
  onDelete,
  onReact,
  onReply,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (shouldScrollRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Track scroll position to determine if we should auto-scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    shouldScrollRef.current = isAtBottom;

    // Load more when scrolled to top
    if (scrollTop < 100 && hasMore && !loading) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  // Group messages by author and time
  const groupedMessages = messages.reduce((groups, message, index) => {
    const prevMessage = messages[index - 1];
    const shouldGroup =
      prevMessage &&
      prevMessage.author_id === message.author_id &&
      new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() < 5 * 60 * 1000;

    if (shouldGroup) {
      groups[groups.length - 1].messages.push(message);
    } else {
      groups.push({
        author: message.author,
        messages: [message],
      });
    }

    return groups;
  }, [] as { author: typeof messages[0]['author']; messages: typeof messages }[]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4"
    >
      {hasMore && (
        <div className="flex justify-center py-4">
          {loading ? (
            <Spinner size="sm" />
          ) : (
            <button
              onClick={onLoadMore}
              className="text-sm text-zinc-400 hover:text-white"
            >
              Load more messages
            </button>
          )}
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <span className="text-3xl">#</span>
          </div>
          <h2 className="text-xl font-semibold mb-1">Welcome to the channel!</h2>
          <p className="text-zinc-400">This is the start of the conversation.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex} className="group">
              {group.messages.map((message, messageIndex) => (
                <Message
                  key={message.id}
                  message={message}
                  isGrouped={messageIndex > 0}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReact={onReact}
                  onReply={onReply}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
