'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ConnectButton } from '@/components/auth/ConnectButton';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace('/servers');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-600 border-t-[#c3ff00] rounded-full animate-spin" />
      </div>
    );
  }

  // If authenticated, show enter button as fallback
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-md w-full mx-4 text-center">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-[#c3ff00]">Goat</span> Chat
          </h1>
          <p className="text-muted mb-8">
            Welcome back, <span className="text-[#c3ff00]">{user.ethscription_name || user.wallet_address.slice(0, 8)}</span>
          </p>
          <Link
            href="/servers"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#c3ff00] text-black font-semibold rounded-xl hover:bg-[#d4ff4d] transition-colors"
          >
            Enter App
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-y-auto py-8">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-[#c3ff00]">Goat</span> Chat
          </h1>
          <p className="text-muted">
            Real-time messaging with wallet authentication and token gating
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#c3ff00]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#c3ff00]">1</span>
              </div>
              <div>
                <h3 className="font-medium">Connect Wallet</h3>
                <p className="text-sm text-muted">Use your Ethereum wallet to sign in</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#c3ff00]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#c3ff00]">2</span>
              </div>
              <div>
                <h3 className="font-medium">Join Servers</h3>
                <p className="text-sm text-muted">Create or join communities</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#c3ff00]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#c3ff00]">3</span>
              </div>
              <div>
                <h3 className="font-medium">Token Gate Access</h3>
                <p className="text-sm text-muted">Exclusive channels for NFT holders</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <ConnectButton />
          </div>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          Your ethscription name will be used as your display name
        </p>
      </div>
    </div>
  );
}
