'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ConnectButton } from '@/components/auth/ConnectButton';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/servers');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-[#c3ff00]">Gated</span> Chat
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
