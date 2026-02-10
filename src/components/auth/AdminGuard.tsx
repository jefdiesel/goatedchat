'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from './AuthGuard';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/admin/check');
        const data = await res.json();
        setIsAdmin(data.isAdmin);
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, [user]);

  return (
    <AuthGuard>
      {loading ? (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-zinc-600 border-t-[#c3ff00] rounded-full animate-spin" />
            <p className="text-muted">Checking permissions...</p>
          </div>
        </div>
      ) : isAdmin ? (
        children
      ) : (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="max-w-md w-full mx-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-4">403</div>
              <h1 className="text-xl font-bold mb-2">Access Denied</h1>
              <p className="text-muted">You don&apos;t have permission to access this area.</p>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
