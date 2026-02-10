'use client';

import { useState, useEffect, useRef } from 'react';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '@/hooks/useAuth';

export function ConnectButton() {
  const { user, isAuthenticated, isLoading, signIn, signOut, isConnected } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasTriedAutoSign = useRef(false);

  // Auto sign-in when wallet connects
  useEffect(() => {
    if (isConnected && !isAuthenticated && !isLoading && !signingIn && !hasTriedAutoSign.current) {
      hasTriedAutoSign.current = true;
      handleSignIn();
    }
    // Reset when disconnected
    if (!isConnected) {
      hasTriedAutoSign.current = false;
    }
  }, [isConnected, isAuthenticated, isLoading, signingIn]);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signIn();
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in');
    } finally {
      setSigningIn(false);
    }
  };

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="w-4 h-4 border-2 border-zinc-600 border-t-[#c3ff00] rounded-full animate-spin" />
        <span className="text-sm text-muted">Loading...</span>
      </div>
    );
  }

  // If authenticated, show user info
  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="w-2 h-2 bg-[#c3ff00] rounded-full" />
          <span className="text-sm font-medium">
            {user.ethscription_name || `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`}
          </span>
        </div>
        <button
          onClick={signOut}
          className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  // If wallet connected but not signed in, show sign in button
  if (isConnected && !isAuthenticated) {
    return (
      <div className="flex flex-col items-end gap-2">
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#c3ff00] text-black font-semibold rounded-xl hover:bg-[#d4ff4d] transition-colors disabled:opacity-50"
        >
          {signingIn ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  // Show RainbowKit connect button
  return <RainbowConnectButton />;
}
