'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

const CACHE_KEY = 'gated_chat_token_gate';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  hasAccess: boolean;
  balance: number;
  timestamp: number;
}

interface TokenGate {
  contract_address: string;
  chain: 'eth' | 'base' | 'appchain';
  min_balance: number;
}

function getCacheKey(wallet: string, gates: TokenGate[]): string {
  const gatesKey = gates
    .map(g => `${g.contract_address}:${g.chain}:${g.min_balance}`)
    .sort()
    .join(',');
  return `${wallet}:${gatesKey}`;
}

function getCache(key: string): CacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(CACHE_KEY);
    if (!data) return null;
    const cache = JSON.parse(data);
    const entry = cache[key];
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry;
    }
  } catch {}
  return null;
}

function setCache(key: string, hasAccess: boolean, balance: number) {
  if (typeof window === 'undefined') return;
  try {
    const data = localStorage.getItem(CACHE_KEY);
    const cache = data ? JSON.parse(data) : {};
    cache[key] = { hasAccess, balance, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

export function useTokenGate(gates: TokenGate[]) {
  const { address } = useAccount();
  const wallet = address?.toLowerCase() ?? null;

  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = useCallback(async () => {
    if (!wallet || gates.length === 0) {
      setHasAccess(gates.length === 0); // No gates = access granted
      setLoading(false);
      return;
    }

    const cacheKey = getCacheKey(wallet, gates);

    // Check cache first
    const cached = getCache(cacheKey);
    if (cached) {
      setHasAccess(cached.hasAccess);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/token-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, gates }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setHasAccess(data.hasAccess);
      setCache(cacheKey, data.hasAccess, 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to check token gate');
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }, [wallet, gates]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  const refresh = useCallback(() => {
    // Clear cache and re-check
    if (wallet && gates.length > 0) {
      const cacheKey = getCacheKey(wallet, gates);
      try {
        const data = localStorage.getItem(CACHE_KEY);
        if (data) {
          const cache = JSON.parse(data);
          delete cache[cacheKey];
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        }
      } catch {}
    }
    checkAccess();
  }, [wallet, gates, checkAccess]);

  return {
    hasAccess,
    loading,
    error,
    refresh,
  };
}
