'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Channel } from '@/hooks/useChannel';

interface ExtendedChannel extends Channel {
  entropy_enabled?: boolean;
}

interface ChannelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel;
  serverId: string;
  onUpdate: () => void;
}

// Convert ethscription tx ID to content URL via local proxy (avoids CORS)
const getEthscriptionUrl = (txId: string) => {
  let cleanId = txId.trim().toLowerCase();
  // Add 0x prefix if missing
  if (cleanId.match(/^[a-f0-9]{64}$/)) {
    cleanId = '0x' + cleanId;
  }
  if (cleanId.match(/^0x[a-f0-9]{64}$/)) {
    return `/api/ethscription/${cleanId}`;
  }
  return null;
};

export function ChannelSettingsModal({ isOpen, onClose, channel, serverId, onUpdate }: ChannelSettingsModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(channel.name);
  const [isPrivate, setIsPrivate] = useState(channel.is_private);
  const [entropyEnabled, setEntropyEnabled] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(channel.icon_url);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [ethscriptionId, setEthscriptionId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resettingEntropy, setResettingEntropy] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch entropy state when modal opens
  useEffect(() => {
    if (isOpen && channel.id) {
      fetch(`/api/channels/${channel.id}/entropy`)
        .then(res => res.json())
        .then(data => {
          setEntropyEnabled(data.entropy_enabled || false);
        })
        .catch(() => {
          setEntropyEnabled(false);
        });
    }
  }, [isOpen, channel.id]);

  // Reset form when channel changes
  useEffect(() => {
    setName(channel.name);
    setIsPrivate(channel.is_private);
    setIconPreview(channel.icon_url);
    setIconFile(null);
    setEthscriptionId('');
  }, [channel]);

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      setEthscriptionId('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEthscriptionChange = (value: string) => {
    setEthscriptionId(value);
    const url = getEthscriptionUrl(value);
    if (url) {
      setIconPreview(url);
      setIconFile(null);
    }
  };

  const clearIcon = () => {
    setIconPreview(null);
    setIconFile(null);
    setEthscriptionId('');
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');

    try {
      let iconUrl = channel.icon_url;

      // If ethscription ID provided, use that
      if (ethscriptionId) {
        const ethUrl = getEthscriptionUrl(ethscriptionId);
        if (ethUrl) {
          iconUrl = ethUrl;
        }
      }
      // Otherwise upload file if provided
      else if (iconFile) {
        const formData = new FormData();
        formData.append('file', iconFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          iconUrl = uploadData.publicUrl;
        }
      }
      // If cleared
      else if (!iconPreview) {
        iconUrl = null;
      }

      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim().toLowerCase().replace(/\s+/g, '-'),
          is_private: isPrivate,
          icon_url: iconUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update channel');
      }

      // Update entropy mode separately
      await fetch(`/api/channels/${channel.id}/entropy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entropy_enabled: entropyEnabled }),
      });

      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleResetEntropy = async () => {
    setResettingEntropy(true);
    setError('');

    try {
      const res = await fetch(`/api/channels/${channel.id}/entropy/reset`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset entropy');
      }

      onUpdate();
    } catch (err: any) {
      setError(err?.message || 'Failed to reset');
    } finally {
      setResettingEntropy(false);
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
        {/* Channel Icon */}
        <div>
          <label className="block text-sm font-medium mb-2">Channel Icon</label>
          <div className="flex items-start gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-xl bg-zinc-700 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group flex-shrink-0"
              style={{ imageRendering: 'pixelated' }}
            >
              {iconPreview ? (
                <img src={iconPreview} alt="Icon" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
              ) : (
                <span className="text-xl text-zinc-400">#</span>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleIconChange}
              className="hidden"
            />
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={ethscriptionId}
                onChange={e => handleEthscriptionChange(e.target.value)}
                placeholder="Or paste ethscription tx ID (0x...)"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm font-mono focus:outline-none focus:border-[#c3ff00]"
              />
              {iconPreview && (
                <button
                  type="button"
                  onClick={clearIcon}
                  className="text-xs text-zinc-500 hover:text-red-400"
                >
                  Remove icon
                </button>
              )}
            </div>
          </div>
        </div>

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

        {/* Entropy Mode Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              entropyEnabled ? 'bg-red-500 border-red-500' : 'border-zinc-600'
            }`}
          >
            {entropyEnabled && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <input
            type="checkbox"
            checked={entropyEnabled}
            onChange={e => setEntropyEnabled(e.target.checked)}
            className="sr-only"
          />
          <div>
            <span className="text-sm font-medium text-red-400">Entropy Mode</span>
            <p className="text-xs text-zinc-500">Messages decay over time. The tower always falls.</p>
          </div>
        </label>

        {/* Entropy Reset Button */}
        {entropyEnabled && (
          <div className="pl-8">
            <button
              onClick={handleResetEntropy}
              disabled={resettingEntropy}
              className="text-sm text-zinc-400 hover:text-[#c3ff00] disabled:opacity-50"
            >
              {resettingEntropy ? 'Resetting...' : 'Reset tower to 100%'}
            </button>
          </div>
        )}

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
