'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface MessageInputProps {
  channelId: string;
  onSend: (content: string, reply_to_id?: string) => Promise<any>;
}

export function MessageInput({ channelId, onSend }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!content.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      await onSend(content.trim());
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  };

  return (
    <div className="px-4 pb-4">
      {error && (
        <div className="mb-2 px-3 py-2 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}
      <div className="flex items-end gap-2 bg-zinc-800 border border-zinc-700 rounded-xl p-2">
        {/* Attachment button */}
        <button
          className="p-2 text-zinc-400 hover:text-white transition-colors"
          title="Add attachment"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          className="flex-1 bg-transparent resize-none focus:outline-none text-white placeholder-zinc-500 max-h-[200px]"
          rows={1}
          disabled={sending}
        />

        {/* Emoji button */}
        <button
          className="p-2 text-zinc-400 hover:text-white transition-colors"
          title="Add emoji"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || sending}
          className="p-2 text-[#c3ff00] hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send message"
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
  );
}
