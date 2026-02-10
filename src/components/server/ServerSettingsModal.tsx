'use client';

import { useState } from 'react';
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
    invite_code: string;
  };
  onUpdate: () => void;
}

export function ServerSettingsModal({ isOpen, onClose, server, onUpdate }: ServerSettingsModalProps) {
  const router = useRouter();
  const [name, setName] = useState(server.name);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showRoleManagement, setShowRoleManagement] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/servers/${server.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
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
        {/* Server Name */}
        <Input
          label="Server Name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="My Server"
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
