'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Channel } from '@/hooks/useChannel';

interface ChannelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel;
  serverId: string;
  onUpdate: () => void;
}

export function ChannelSettingsModal({ isOpen, onClose, channel, serverId, onUpdate }: ChannelSettingsModalProps) {
  const router = useRouter();
  const [name, setName] = useState(channel.name);
  const [isPrivate, setIsPrivate] = useState(channel.is_private);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim().toLowerCase().replace(/\s+/g, '-'),
          is_private: isPrivate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update channel');
      }

      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');

    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete channel');
      }

      onUpdate();
      onClose();
      // Navigate to server root if we're on the deleted channel
      router.push(`/servers/${serverId}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete');
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Channel Settings">
      <div className="space-y-6">
        {/* Channel Name */}
        <Input
          label="Channel Name"
          value={name}
          onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
          placeholder="general"
        />

        {/* Private Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isPrivate ? 'bg-[#c3ff00] border-[#c3ff00]' : 'border-zinc-600'
            }`}
          >
            {isPrivate && (
              <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={e => setIsPrivate(e.target.checked)}
            className="sr-only"
          />
          <div>
            <span className="text-sm font-medium">Private Channel</span>
            <p className="text-xs text-zinc-500">Only selected members can see this channel</p>
          </div>
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} className="flex-1">
            Save Changes
          </Button>
        </div>

        {/* Danger Zone */}
        <div className="pt-4 border-t border-zinc-700">
          <h3 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h3>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-zinc-400 hover:text-red-400"
            >
              Delete this channel
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-zinc-400">
                Are you sure? All messages in this channel will be deleted.
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, delete channel'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
