'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface MessageInputProps {
  channelId: string;
  onSend: (content: string, reply_to_id?: string) => Promise<any>;
}

const EMOJI_LIST = ['🤙', '😀', '😂', '🥲', '😍', '🤔', '😎', '🔥', '❤️', '👎', '👀', '🎉', '💀', '🙏', '💯', '✨'];

export function MessageInput({ channelId, onSend }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!content.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      await onSend(content.trim());
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const { publicUrl } = await res.json();

      // Send message with the file URL
      const isImage = file.type.startsWith('image/');
      const messageContent = isImage ? `![${file.name}](${publicUrl})` : `[${file.name}](${publicUrl})`;
      await onSend(messageContent);
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const insertEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="px-4 pb-4">
      {error && (
        <div className="mb-2 px-3 py-2 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}
      <div className="flex items-end gap-2 bg-zinc-800 border border-zinc-700 rounded-xl p-2">
        {/* File input as label */}
        <label className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          {uploading ? (
            <div className="w-5 h-5 border-2 border-zinc-400/30 border-t-zinc-400 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </label>

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
        <div className="relative">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
            title="Add emoji"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Emoji picker dropdown */}
          {showEmoji && (
            <div className="absolute bottom-full right-0 mb-2 p-3 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50">
              <div className="grid grid-cols-4 gap-2" style={{ width: '160px' }}>
                {EMOJI_LIST.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="w-9 h-9 flex items-center justify-center hover:bg-zinc-700 rounded text-xl"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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
