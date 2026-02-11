'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { RoleManagementModal } from '@/components/roles/RoleManagementModal';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: {
    id: string;
    name: string;
    icon_url: string | null;
    description: string | null;
    website_url: string | null;
    invite_code: string;
  };
  onUpdate: () => void;
}

export function ServerSettingsModal({ isOpen, onClose, server, onUpdate }: ServerSettingsModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description || '');
  const [websiteUrl, setWebsiteUrl] = useState(server.website_url || '');
  const [iconPreview, setIconPreview] = useState<string | null>(server.icon_url);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showRoleManagement, setShowRoleManagement] = useState(false);
  const [ethscriptionTxId, setEthscriptionTxId] = useState('');

  // Reset form when server changes
  useEffect(() => {
    setName(server.name);
    setDescription(server.description || '');
    setWebsiteUrl(server.website_url || '');
    setIconPreview(server.icon_url);
    setIconFile(null);
    setEthscriptionTxId('');
  }, [server]);

  const handleEthscriptionInput = async (input: string) => {
    setEthscriptionTxId(input);
    setIconFile(null);

    // Handle tx hash (0x...) - fetch via our proxy to avoid CORS
    if (input.match(/^0x[a-fA-F0-9]{64}$/)) {
      try {
        const res = await fetch(`/api/ethscription/${input}`);
        const contentType = res.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          // It's a data URI response
          const data = await res.json();
          if (data.dataUri) {
            setIconPreview(data.dataUri);
          }
        } else {
          // It's binary - use the proxy URL directly
          setIconPreview(`/api/ethscription/${input}`);
        }
      } catch {
        // Fallback to proxy URL
        setIconPreview(`/api/ethscription/${input}`);
      }
    }
    // Handle data URI (data:image/...)
    else if (input.startsWith('data:')) {
      setIconPreview(input);
    }
    // Handle regular URL
    else if (input.startsWith('http://') || input.startsWith('https://')) {
      setIconPreview(input);
    }
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');

    try {
      let iconUrl = server.icon_url;

      // Use the preview if we have one from ethscription input (handles fetched data URIs)
      if (ethscriptionTxId && iconPreview && iconPreview !== server.icon_url) {
        iconUrl = iconPreview;
      }
      // Upload icon if changed
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

      const res = await fetch(`/api/servers/${server.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          icon_url: iconUrl,
          description: description.trim() || null,
          website_url: websiteUrl.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update server');
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
      const res = await fetch(`/api/servers/${server.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete server');
      }

      router.push('/servers');
    } catch (err: any) {
      setError(err?.message || 'Failed to delete');
      setDeleting(false);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/servers?join=${server.invite_code}`);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const regenerateInvite = async () => {
    try {
      const res = await fetch(`/api/servers/${server.id}/invite`, {
        method: 'POST',
      });

      if (res.ok) {
        onUpdate();
      }
    } catch (err) {
      console.error('Failed to regenerate invite:', err);
    }
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title="Server Settings">
      <div className="space-y-6">
        {/* Server Icon */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-2xl bg-zinc-700 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group"
          >
            {iconPreview ? (
              <img src={iconPreview} alt="Server icon" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
            ) : (
              <span className="text-2xl font-bold text-zinc-400">
                {name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="flex-1">
            <p className="font-medium">Server Icon</p>
            <p className="text-sm text-zinc-500 mb-2">Click to upload or use ethscription</p>
            <input
              type="text"
              value={ethscriptionTxId}
              onChange={e => handleEthscriptionInput(e.target.value)}
              placeholder="Tx hash, image URL, or data URI"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-[#c3ff00]"
            />
          </div>
        </div>

        {/* Server Name */}
        <Input
          label="Server Name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="My Server"
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1.5">About</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Tell people about this server..."
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm resize-none focus:outline-none focus:border-[#c3ff00] h-20"
            maxLength={500}
          />
          <p className="text-xs text-zinc-500 mt-1">{description.length}/500</p>
        </div>

        {/* Website URL */}
        <Input
          label="Website"
          value={websiteUrl}
          onChange={e => setWebsiteUrl(e.target.value)}
          placeholder="https://example.com"
          type="url"
        />

        {/* Invite Code */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Invite Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/servers?join=${server.invite_code}`}
              readOnly
              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-400"
            />
            <Button type="button" variant="ghost" onClick={copyInviteLink}>
              {inviteCopied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <button
            type="button"
            onClick={regenerateInvite}
            className="text-xs text-zinc-500 hover:text-[#c3ff00] mt-1"
          >
            Regenerate invite code
          </button>
        </div>

        {/* Role Management */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Roles & Members</label>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowRoleManagement(true)}
            className="w-full justify-start"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Manage Roles
          </Button>
        </div>

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
              Delete this server
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-zinc-400">
                Are you sure? This will delete all channels and messages. This cannot be undone.
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
                  {deleting ? 'Deleting...' : 'Yes, delete server'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>

    <RoleManagementModal
      isOpen={showRoleManagement}
      onClose={() => setShowRoleManagement(false)}
      serverId={server.id}
    />
    </>
  );
}
