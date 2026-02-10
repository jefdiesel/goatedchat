'use client';

import { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow } from '@/lib/utils';

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: any;
  created_at: string;
  admin: {
    id: string;
    wallet_address: string;
    ethscription_name: string | null;
  };
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/audit?page=${page}`);
      const data = await res.json();

      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const getActionColor = (action: string) => {
    if (action.includes('add') || action.includes('create')) return 'text-green-400';
    if (action.includes('remove') || action.includes('delete') || action.includes('ban')) return 'text-red-400';
    return 'text-blue-400';
  };

  return (
    <div className="flex-1 p-8">
      <h1 className="text-2xl font-bold mb-8">Audit Log</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <p className="text-zinc-400">No audit logs yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {logs.map(log => {
              const adminName = log.admin.ethscription_name ||
                `${log.admin.wallet_address.slice(0, 6)}...${log.admin.wallet_address.slice(-4)}`;

              return (
                <div
                  key={log.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{adminName}</span>
                        <span className={`font-mono text-sm ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400">
                        Target: {log.target_type} ({log.target_id.slice(0, 8)}...)
                      </p>
                      {log.metadata && (
                        <pre className="mt-2 text-xs text-zinc-500 bg-zinc-800 rounded p-2 overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                    <span className="text-sm text-zinc-500 whitespace-nowrap">
                      {formatDistanceToNow(log.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
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
