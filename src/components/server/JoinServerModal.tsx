'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useServers } from '@/hooks/useServer';

interface JoinServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinServerModal({ isOpen, onClose }: JoinServerModalProps) {
  const router = useRouter();
  const { joinServer } = useServers();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError('');

    try {
      const server = await joinServer(inviteCode.trim());
      onClose();
      setInviteCode('');
      router.push(`/servers/${server.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to join server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join a Server">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-zinc-400">
          Enter an invite code to join an existing server.
        </p>

        <Input
          label="Invite Code"
          value={inviteCode}
          onChange={e => setInviteCode(e.target.value)}
          placeholder="abc123xy"
          error={error}
          autoFocus
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={!inviteCode.trim()}>
            Join Server
          </Button>
        </div>
      </form>
    </Modal>
  );
}
