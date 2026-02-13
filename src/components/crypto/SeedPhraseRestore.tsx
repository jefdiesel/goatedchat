'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { validateSeedPhrase, normalizeMnemonic } from '@/lib/crypto';

interface SeedPhraseRestoreProps {
  onRestore: (mnemonic: string) => Promise<void>;
  onBack: () => void;
  loading?: boolean;
  error?: string | null;
}

export function SeedPhraseRestore({
  onRestore,
  onBack,
  loading,
  error,
}: SeedPhraseRestoreProps) {
  const [words, setWords] = useState<string[]>(Array(12).fill(''));
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words];
    // Handle paste of full phrase
    if (value.includes(' ') && index === 0) {
      const pastedWords = value.toLowerCase().trim().split(/\s+/).slice(0, 12);
      pastedWords.forEach((word, i) => {
        if (i < 12) newWords[i] = word;
      });
    } else {
      newWords[index] = value.toLowerCase().trim();
    }
    setWords(newWords);
    setValidationError(null);
  };

  const handleRestore = async () => {
    const mnemonic = normalizeMnemonic(words.join(' '));

    if (!validateSeedPhrase(mnemonic)) {
      setValidationError('Invalid recovery phrase. Please check your words and try again.');
      return;
    }

    await onRestore(mnemonic);
  };

  const allWordsFilled = words.every((word) => word.trim().length > 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-blue-400"
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
        <h3 className="text-lg font-semibold mb-2">Restore from Recovery Phrase</h3>
        <p className="text-sm text-zinc-400">
          Enter your 12-word recovery phrase to restore your encryption keys.
        </p>
      </div>

      <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-xl">
        <div className="grid grid-cols-3 gap-2">
          {words.map((word, index) => (
            <div key={index} className="flex items-center gap-1">
              <span className="text-xs text-zinc-500 w-4">{index + 1}.</span>
              <input
                type="text"
                value={word}
                onChange={(e) => handleWordChange(index, e.target.value)}
                placeholder="word"
                className="flex-1 px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm font-mono placeholder-zinc-600 focus:outline-none focus:border-[#c3ff00]"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-zinc-500 text-center">
        Tip: You can paste your entire phrase into the first box
      </p>

      {(validationError || error) && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {validationError || error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={onBack}
          disabled={loading}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          onClick={handleRestore}
          loading={loading}
          disabled={!allWordsFilled}
          className="flex-1"
        >
          Restore Keys
        </Button>
      </div>
    </div>
  );
}
