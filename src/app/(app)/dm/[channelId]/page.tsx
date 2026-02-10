'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from '@/lib/utils';

interface DMMessage {
  id: string;
  dm_channel_id: string;
  author_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  author: {
    id: string;
    wallet_address: string;
    ethscription_name: string | null;
    avatar_url: string | null;
  };
}

export default function DMPage() {
  const params = useParams();
  const channelId = params.channelId as string;
  const { user } = useAuth();

  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/dm/${channelId}/messages`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!content.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/dm/${channelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, data.message]);
        setContent('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AppShell>
      <div className="flex-1 flex flex-col">
        <div className="h-12 px-4 flex items-center border-b border-border">
          <h1 className="font-semibold">Direct Message</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-1">Start the conversation</h2>
              <p className="text-zinc-400">Send the first message!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const prevMessage = messages[index - 1];
                const isGrouped =
                  prevMessage &&
                  prevMessage.author_id === message.author_id &&
                  new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() < 5 * 60 * 1000;

                const displayName = message.author.ethscription_name ||
                  `${message.author.wallet_address.slice(0, 6)}...${message.author.wallet_address.slice(-4)}`;

                return (
                  <div
                    key={message.id}
                    className={`flex gap-4 px-2 py-0.5 hover:bg-zinc-800/30 rounded ${isGrouped ? 'mt-0' : 'mt-4'}`}
                  >
                    {isGrouped ? (
                      <div className="w-10 flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {message.author.avatar_url ? (
                          <img
                            src={message.author.avatar_url}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-zinc-400">
                            {displayName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {!isGrouped && (
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-white">
                            {displayName}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {formatDistanceToNow(message.created_at)}
                          </span>
                        </div>
                      )}
                      <p className="text-zinc-100 break-words whitespace-pre-wrap">
                        {message.content}
                        {message.edited_at && (
                          <span className="text-xs text-zinc-500 ml-1">(edited)</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-end gap-2 bg-zinc-800 border border-zinc-700 rounded-xl p-2">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => {
                setContent(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              className="flex-1 bg-transparent resize-none focus:outline-none text-white placeholder-zinc-500 max-h-[200px]"
              rows={1}
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!content.trim() || sending}
              className="p-2 text-[#c3ff00] hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-[#c3ff00]/30 border-t-[#c3ff00] rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
