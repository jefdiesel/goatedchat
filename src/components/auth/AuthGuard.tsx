'use client';

import { useAuth } from '@/hooks/useAuth';
import { ConnectButton } from './ConnectButton';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-zinc-600 border-t-[#c3ff00] rounded-full animate-spin" />
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-bold mb-2">Goat Chat</h1>
            <p className="text-muted mb-8">Connect your wallet to continue</p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
