'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { SiweMessage } from 'siwe';

export interface User {
  id: string;
  wallet_address: string;
  ethscription_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  status: 'online' | 'offline' | 'idle' | 'dnd';
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Check existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();

      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: !!data.user,
      });
    } catch {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const signIn = useCallback(async () => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    setState(s => ({ ...s, isLoading: true }));

    try {
      // Get nonce
      const nonceRes = await fetch('/api/auth/nonce');
      const { nonce } = await nonceRes.json();

      // Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Gated Chat',
        uri: window.location.origin,
        version: '1',
        chainId: chainId || 1,
        nonce,
        issuedAt: new Date().toISOString(),
      });

      const messageToSign = message.prepareMessage();
      console.log('SIWE message:', messageToSign);

      // Sign message
      const signature = await signMessageAsync({ message: messageToSign });

      // Verify with backend
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSign, signature }),
      });

      const data = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: true,
      });

      return data.user;
    } catch (error) {
      setState(s => ({ ...s, isLoading: false }));
      throw error;
    }
  }, [address, isConnected, chainId, signMessageAsync]);

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      disconnect();
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [disconnect]);

  const refreshUser = useCallback(async () => {
    await checkSession();
  }, [checkSession]);

  return {
    ...state,
    signIn,
    signOut,
    refreshUser,
    address,
    isConnected,
  };
}
