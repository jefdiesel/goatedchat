'use client';

import { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface User {
  id: string;
  wallet_address: string;
  ethscription_name: string | null;
  avatar_url: string | null;
  status: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString() });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();

      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string, displayName: string) => {
    if (!confirm(`Delete user "${displayName}"? This will remove all their data.`)) return;

    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  return (
    <div className="flex-1 p-8">
      <h1 className="text-2xl font-bold mb-8">Users</h1>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search by wallet or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {/* Users table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Wallet</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Joined</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-semibold text-zinc-400">
                              {(user.ethscription_name || user.wallet_address).slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="font-medium">
                          {user.ethscription_name || 'Anonymous'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-sm text-zinc-400">
                        {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                        user.status === 'online'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-zinc-700 text-zinc-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          user.status === 'online' ? 'bg-green-400' : 'bg-zinc-500'
                        }`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(user.id, user.ethscription_name || user.wallet_address)}
                        className="text-sm text-zinc-400 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-zinc-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
