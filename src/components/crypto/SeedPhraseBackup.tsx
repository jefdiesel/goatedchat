'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { splitMnemonic } from '@/lib/crypto';

interface SeedPhraseBackupProps {
  mnemonic: string;
  onComplete: () => void;
  onBack: () => void;
  loading?: boolean;
  error?: string | null;
}

export function SeedPhraseBackup({
  mnemonic,
  onComplete,
  onBack,
  loading,
  error,
}: SeedPhraseBackupProps) {
  const [step, setStep] = useState<'view' | 'verify'>('view');
  const [verifyWord, setVerifyWord] = useState('');
  const [verifyIndex, setVerifyIndex] = useState(0);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const words = splitMnemonic(mnemonic);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = () => {
    // Pick a random word to verify (between index 2 and 10 for better UX)
    const randomIndex = Math.floor(Math.random() * 8) + 2;
    setVerifyIndex(randomIndex);
    setStep('verify');
  };

  const handleVerify = () => {
    const normalizedInput = verifyWord.toLowerCase().trim();
    const expectedWord = words[verifyIndex];

    if (normalizedInput === expectedWord) {
      onComplete();
    } else {
      setVerifyError('Incorrect word. Please check your backup and try again.');
    }
  };

  if (step === 'verify') {
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Verify Your Backup</h3>
          <p className="text-sm text-zinc-400">
            Enter word #{verifyIndex + 1} from your recovery phrase to confirm you've backed it up.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Word #{verifyIndex + 1}
          </label>
          <input
            type="text"
            value={verifyWord}
            onChange={(e) => {
              setVerifyWord(e.target.value);
              setVerifyError(null);
            }}
            placeholder="Enter the word..."
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#c3ff00]"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>

        {(verifyError || error) && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {verifyError || error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setStep('view')}
            disabled={loading}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleVerify}
            loading={loading}
            disabled={!verifyWord.trim()}
            className="flex-1"
          >
            Verify & Continue
          </Button>
        </div>
      </div>
    );
  }

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
        <h3 className="text-lg font-semibold mb-2">Your Recovery Phrase</h3>
        <p className="text-sm text-zinc-400">
          Write down these 12 words in order and keep them in a safe place.
        </p>
      </div>

      <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-xl">
        <div className="grid grid-cols-3 gap-2">
          {words.map((word, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-zinc-900 rounded-lg"
            >
              <span className="text-xs text-zinc-500 w-4">{index + 1}.</span>
              <span className="font-mono text-sm">{word}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        {copied ? (
          <>
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Copy to clipboard
          </>
        )}
      </button>

      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div className="flex gap-2 text-red-400">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm">
            <strong>Never share this phrase!</strong> Anyone with these words can read your
            encrypted messages.
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={onBack}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleContinue}
          className="flex-1"
        >
          I've Saved It
        </Button>
      </div>
    </div>
  );
}
