'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteCode: string;
}

export function InviteModal({ isOpen, onClose, inviteCode }: InviteModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite People">
      <div className="space-y-4">
        <p className="text-sm text-zinc-400">
          Share this invite code with friends so they can join your server.
        </p>

        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl font-mono text-lg text-center">
            {inviteCode}
          </div>
          <Button onClick={handleCopy} variant="secondary">
            {copied ? (
              <svg className="w-5 h-5 text-[#c3ff00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </Button>
        </div>

        <p className="text-xs text-zinc-500 text-center">
          This code never expires
        </p>
      </div>
    </Modal>
  );
}
