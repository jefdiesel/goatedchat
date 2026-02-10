'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

interface Admin {
  id: string;
  user_id: string;
  role: 'admin' | 'super_admin';
  created_at: string;
  user: {
    wallet_address: string;
    ethscription_name: string | null;
  };
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admin/admins');
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress.trim()) return;

    setAdding(true);
    setError('');

    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress.trim(), role: 'admin' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add admin');
      }

      setWalletAddress('');
      fetchAdmins();
    } catch (err: any) {
      setError(err?.message || 'Failed to add admin');
    } finally {
      setAdding(false);
    }
  };

  const removeAdmin = async (adminId: string) => {
    try {
      const res = await fetch(`/api/admin/admins?id=${adminId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchAdmins();
      }
    } catch (err) {
      console.error('Failed to remove admin:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <h1 className="text-2xl font-bold mb-8">Platform Admins</h1>

      {/* Add Admin Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8 max-w-xl">
        <h2 className="text-lg font-semibold mb-4">Add New Admin</h2>
        <form onSubmit={addAdmin} className="flex gap-3">
          <Input
            value={walletAddress}
            onChange={e => setWalletAddress(e.target.value)}
            placeholder="Wallet address (0x...)"
            className="flex-1"
          />
          <Button type="submit" loading={adding}>
            Add Admin
          </Button>
        </form>
        {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
      </div>

      {/* Admins List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">User</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Wallet</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Role</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Added</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(admin => (
              <tr key={admin.id} className="border-b border-zinc-800 last:border-0">
                <td className="px-6 py-4">
                  <span className="text-[#c3ff00]">
                    {admin.user?.ethscription_name || 'Unknown'}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-zinc-400">
                  {admin.user?.wallet_address
                    ? `${admin.user.wallet_address.slice(0, 6)}...${admin.user.wallet_address.slice(-4)}`
                    : 'Unknown'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    admin.role === 'super_admin'
                      ? 'bg-[#c3ff00]/20 text-[#c3ff00]'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {admin.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">
                  {new Date(admin.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  {admin.role !== 'super_admin' && (
                    <button
                      onClick={() => removeAdmin(admin.id)}
                      className="text-sm text-zinc-400 hover:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                  No admins found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
