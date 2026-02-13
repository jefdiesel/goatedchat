'use client';

import { Tooltip } from '@/components/ui/Tooltip';

interface EncryptionIndicatorProps {
  isEncrypted: boolean;
  size?: 'sm' | 'md';
}

export function EncryptionIndicator({ isEncrypted, size = 'sm' }: EncryptionIndicatorProps) {
  const sizeClasses = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  if (!isEncrypted) {
    return null;
  }

  return (
    <Tooltip content="End-to-end encrypted">
      <div className="inline-flex items-center text-[#c3ff00]">
        <svg
          className={sizeClasses}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
        </svg>
      </div>
    </Tooltip>
  );
}

export function EncryptionBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#c3ff00]/10 text-[#c3ff00] text-xs rounded-full">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
      </svg>
      <span>Encrypted</span>
    </div>
  );
}
