'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useCrypto } from '@/contexts/CryptoContext';
import { useAuth } from '@/contexts/AuthContext';
import { SeedPhraseBackup } from './SeedPhraseBackup';
import { SeedPhraseRestore } from './SeedPhraseRestore';

type SetupMode = 'choose' | 'wallet' | 'seedphrase_new' | 'seedphrase_restore' | 'backup';

interface KeySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function KeySetupModal({ isOpen, onClose, onComplete }: KeySetupModalProps) {
  const { isConnected } = useAuth();
  const { setupWithWallet, setupWithSeedPhrase, generateNewSeedPhrase } = useCrypto();

  const [mode, setMode] = useState<SetupMode>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string | null>(null);

  const handleWalletSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      await setupWithWallet();
      onComplete?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup encryption keys');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSeedPhrase = () => {
    const mnemonic = generateNewSeedPhrase();
    setGeneratedMnemonic(mnemonic);
    setMode('backup');
  };

  const handleSeedPhraseBackupComplete = async () => {
    if (!generatedMnemonic) return;

    setLoading(true);
    setError(null);

    try {
      await setupWithSeedPhrase(generatedMnemonic);
      onComplete?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup encryption keys');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreSeedPhrase = async (mnemonic: string) => {
    setLoading(true);
    setError(null);

    try {
      await setupWithSeedPhrase(mnemonic);
      onComplete?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore encryption keys');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMode('choose');
    setError(null);
    setGeneratedMnemonic(null);
    onClose();
  };

  const renderContent = () => {
    switch (mode) {
      case 'choose':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#c3ff00]/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[#c3ff00]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Setup End-to-End Encryption</h3>
              <p className="text-sm text-zinc-400">
                Your messages will be encrypted so only you and the recipients can read them.
              </p>
            </div>

            <div className="space-y-3">
              {isConnected && (
                <button
                  onClick={() => setMode('wallet')}
                  className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#c3ff00]/10 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-[#c3ff00]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium">Use Wallet Signature</div>
                      <div className="text-sm text-zinc-400">
                        Sign a message to derive your encryption keys
                      </div>
                    </div>
                  </div>
                </button>
              )}

              <button
                onClick={() => setMode('seedphrase_new')}
                className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Create Seed Phrase</div>
                    <div className="text-sm text-zinc-400">
                      Generate a recovery phrase for your encryption keys
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode('seedphrase_restore')}
                className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Restore from Seed Phrase</div>
                    <div className="text-sm text-zinc-400">
                      Enter an existing recovery phrase
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        );

      case 'wallet':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#c3ff00]/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[#c3ff00]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Sign to Generate Keys</h3>
              <p className="text-sm text-zinc-400">
                Sign a message with your wallet to derive your encryption keys. This signature
                will not be sent anywhere and will only be used locally.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setMode('choose')}
                disabled={loading}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleWalletSetup}
                loading={loading}
                className="flex-1"
              >
                Sign Message
              </Button>
            </div>
          </div>
        );

      case 'seedphrase_new':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Create Recovery Phrase</h3>
              <p className="text-sm text-zinc-400">
                A 12-word recovery phrase will be generated. You must back it up to recover
                your messages on a new device.
              </p>
            </div>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex gap-2 text-yellow-400">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm">
                  <strong>Important:</strong> If you lose this phrase, you will not be able to
                  read your encrypted messages on a new device.
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setMode('choose')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleGenerateSeedPhrase}
                className="flex-1"
              >
                Generate Phrase
              </Button>
            </div>
          </div>
        );

      case 'backup':
        return (
          <SeedPhraseBackup
            mnemonic={generatedMnemonic!}
            onComplete={handleSeedPhraseBackupComplete}
            onBack={() => setMode('seedphrase_new')}
            loading={loading}
            error={error}
          />
        );

      case 'seedphrase_restore':
        return (
          <SeedPhraseRestore
            onRestore={handleRestoreSeedPhrase}
            onBack={() => setMode('choose')}
            loading={loading}
            error={error}
          />
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Encryption Setup"
    >
      {renderContent()}
    </Modal>
  );
}
