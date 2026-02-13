'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCrypto } from '@/contexts/CryptoContext';
import { KeySetupModal } from './KeySetupModal';

interface CryptoSetupGuardProps {
  children: React.ReactNode;
}

export function CryptoSetupGuard({ children }: CryptoSetupGuardProps) {
  const { isAuthenticated } = useAuth();
  const { setupStatus, hasKeys } = useCrypto();
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show modal if authenticated but no keys and not dismissed
    if (isAuthenticated && setupStatus === 'needed' && !hasKeys && !dismissed) {
      // Small delay to let the main app render first
      const timer = setTimeout(() => {
        setShowSetupModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, setupStatus, hasKeys, dismissed]);

  const handleClose = () => {
    setShowSetupModal(false);
    setDismissed(true);
  };

  const handleComplete = () => {
    setShowSetupModal(false);
  };

  return (
    <>
      {children}
      <KeySetupModal
        isOpen={showSetupModal}
        onClose={handleClose}
        onComplete={handleComplete}
      />
    </>
  );
}
