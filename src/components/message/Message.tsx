'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/hooks/useAuth';
import { Message as MessageType } from '@/hooks/useMessages';
import { formatDistanceToNow } from '@/lib/utils';

interface MessageProps {
  message: MessageType;
  isGrouped: boolean;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onReact: (messageId: string, emoji: string) => Promise<void>;
}

const REACTION_EMOJIS = ['🤙', '❤️', '😂', '😮', '😢', '🔥', '🎉', '💯'];

export function Message({ message, isGrouped, onEdit, onDelete, onReact }: MessageProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState(false);

  const isAuthor = user?.id === message.author_id;
  const displayName = message.author?.ethscription_name ||
    (message.author?.wallet_address
      ? `${message.author.wallet_address.slice(0, 6)}...${message.author.wallet_address.slice(-4)}`
      : 'Unknown');

  const handleSaveEdit = async () => {
    if (editContent.trim() !== message.content) {
      await onEdit(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      setEditContent(message.content);
      setIsEditing(false);
    }
  };

  // Group reactions by emoji
  const reactionGroups = message.reactions?.reduce((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = { count: 0, hasReacted: false };
    }
    acc[r.emoji].count++;
    if (r.user_id === user?.id) {
      acc[r.emoji].hasReacted = true;
    }
    return acc;
  }, {} as Record<string, { count: number; hasReacted: boolean }>) || {};

  return (
    <div
      className={`relative flex gap-4 px-2 py-0.5 hover:bg-zinc-800/30 rounded ${isGrouped ? 'mt-0' : 'mt-4'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar or spacer */}
      {isGrouped ? (
        <div className="w-10 flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ imageRendering: 'pixelated' }}>
          {message.author?.avatar_url ? (
            <img
              src={message.author.avatar_url}
              alt={displayName}
              className="w-full h-full object-cover"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <span className="text-sm font-semibold text-zinc-400">
              {displayName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      )}

      {/* Message content */}
      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-white hover:underline cursor-pointer">
              {displayName}
            </span>
            <span className="text-xs text-zinc-500">
              {formatDistanceToNow(message.created_at)}
            </span>
          </div>
        )}

        {/* Reply preview - only show if reply_to has actual content */}
        {message.reply_to && message.reply_to.id && message.reply_to.content && (
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1 pl-2 border-l-2 border-zinc-700">
            <span className="font-medium">
              {message.reply_to.author?.ethscription_name ||
                (message.reply_to.author?.wallet_address
                  ? `${message.reply_to.author.wallet_address.slice(0, 6)}...`
                  : 'Unknown')}
            </span>
            <span className="truncate">{message.reply_to.content}</span>
          </div>
        )}

        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm resize-none focus:outline-none focus:border-[#c3ff00]"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-1 text-xs">
              <span className="text-zinc-500">escape to cancel</span>
              <span className="text-zinc-500">enter to save</span>
            </div>
          </div>
        ) : (
          <div className="text-zinc-100 break-words whitespace-pre-wrap">
            <ReactMarkdown
              components={{
                img: (props) => {
                  const imgSrc = typeof props.src === 'string' ? props.src : '';
                  if (!imgSrc) return null;
                  return (
                    <a href={imgSrc} target="_blank" rel="noopener noreferrer">
                      <img
                        src={imgSrc}
                        alt={props.alt || 'image'}
                        className="max-w-sm max-h-80 rounded-lg mt-1"
                      />
                    </a>
                  );
                },
                a: (props) => (
                  <a
                    href={props.href || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#c3ff00] hover:underline"
                  >
                    {props.children}
                  </a>
                ),
                p: ({ children }) => <span>{children}</span>,
              }}
            >
              {message.content}
            </ReactMarkdown>
            {message.edited_at && (
              <span className="text-xs text-zinc-500 ml-1">(edited)</span>
            )}
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map(att => (
              <div key={att.id}>
                {att.content_type.startsWith('image/') ? (
                  <a href={att.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={att.url}
                      alt={att.filename}
                      className="max-w-sm max-h-80 rounded-lg"
                    />
                  </a>
                ) : (
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700"
                  >
                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm">{att.filename}</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reactions */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(reactionGroups).map(([emoji, { count, hasReacted }]) => (
              <button
                key={emoji}
                onClick={() => onReact(message.id, emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-colors ${
                  hasReacted
                    ? 'bg-[#c3ff00]/20 border border-[#c3ff00]/50'
                    : 'bg-zinc-800 border border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <span>{emoji}</span>
                <span className="text-xs text-zinc-400">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && !isEditing && (
        <div className="absolute right-2 -top-3 flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg p-1">
          <div className="relative">
            <button
              onClick={() => setShowReactPicker(!showReactPicker)}
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded"
              title="React"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {showReactPicker && (
              <div className="absolute bottom-full right-0 mb-1 p-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl flex gap-1">
                {REACTION_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(message.id, emoji);
                      setShowReactPicker(false);
                    }}
                    className="w-7 h-7 flex items-center justify-center hover:bg-zinc-700 rounded text-base"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isAuthor && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded"
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
