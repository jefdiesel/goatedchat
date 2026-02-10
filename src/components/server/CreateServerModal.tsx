'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useServers } from '@/hooks/useServer';

interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateServerModal({ isOpen, onClose }: CreateServerModalProps) {
  const router = useRouter();
  const { createServer } = useServers();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const server = await createServer(name.trim());
      onClose();
      setName('');
      router.push(`/servers/${server.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create a Server">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-zinc-400">
          Give your new server a name. You can always change it later.
        </p>

        <Input
          label="Server Name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="My Awesome Server"
          error={error}
          autoFocus
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={!name.trim()}>
            Create Server
          </Button>
        </div>
      </form>
    </Modal>
  );
}
