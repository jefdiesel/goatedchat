'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useChannels } from '@/hooks/useChannel';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
}

export function CreateChannelModal({ isOpen, onClose, serverId }: CreateChannelModalProps) {
  const { createChannel } = useChannels(serverId);
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [hasTokenGate, setHasTokenGate] = useState(false);
  const [contractAddress, setContractAddress] = useState('');
  const [chain, setChain] = useState<'eth' | 'base' | 'appchain'>('eth');
  const [minBalance, setMinBalance] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const tokenGate = hasTokenGate && contractAddress ? {
        contract_address: contractAddress,
        chain,
        min_balance: parseInt(minBalance) || 1,
      } : undefined;

      await createChannel(name.trim(), 'text', isPrivate, tokenGate);
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setName('');
    setIsPrivate(false);
    setHasTokenGate(false);
    setContractAddress('');
    setChain('eth');
    setMinBalance('1');
    setError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Channel">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Channel Name"
          value={name}
          onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
          placeholder="new-channel"
          error={error}
          autoFocus
        />

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

        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              hasTokenGate ? 'bg-[#c3ff00] border-[#c3ff00]' : 'border-zinc-600'
            }`}
          >
            {hasTokenGate && (
              <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <input
            type="checkbox"
            checked={hasTokenGate}
            onChange={e => setHasTokenGate(e.target.checked)}
            className="sr-only"
          />
          <div>
            <span className="text-sm font-medium">Token Gate</span>
            <p className="text-xs text-zinc-500">Require NFT ownership to access</p>
          </div>
        </label>

        {hasTokenGate && (
          <div className="space-y-3 pl-8 border-l-2 border-zinc-700">
            <Input
              label="Contract Address"
              value={contractAddress}
              onChange={e => setContractAddress(e.target.value)}
              placeholder="0x..."
            />

            <div>
              <label className="block text-sm font-medium mb-1.5">Chain</label>
              <select
                value={chain}
                onChange={e => setChain(e.target.value as 'eth' | 'base' | 'appchain')}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-[#c3ff00]"
              >
                <option value="eth">Ethereum</option>
                <option value="base">Base</option>
                <option value="appchain">Appchain</option>
              </select>
            </div>

            <Input
              label="Minimum Balance"
              type="number"
              value={minBalance}
              onChange={e => setMinBalance(e.target.value)}
              placeholder="1"
              min="1"
            />
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={!name.trim()}>
            Create Channel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
