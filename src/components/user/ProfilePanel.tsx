'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfilePanel({ isOpen, onClose }: ProfilePanelProps) {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [discordHandle, setDiscordHandle] = useState('');
  const [ensName, setEnsName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initialize form when user loads
  useEffect(() => {
    if (user) {
      setDisplayName(user.ethscription_name || '');
      setBio(user.bio || '');
      setTwitterHandle(user.twitter_handle || '');
      setDiscordHandle(user.discord_handle || '');
      setEnsName(user.ens_name?.replace(/\.eth$/, '') || '');
      setAvatarPreview(user.avatar_url || null);
    }
  }, [user]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setError('');
      setSuccess('');
      setAvatarFile(null);
    }
  }, [isOpen]);

  if (!user) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let avatarUrl = user.avatar_url;

      // Upload avatar if changed
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          avatarUrl = uploadData.publicUrl;
        }
      }

      // Update profile
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName || null,
          bio: bio || null,
          avatar_url: avatarUrl,
          twitter_handle: twitterHandle || null,
          discord_handle: discordHandle || null,
          ens_name: ensName || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccess('Profile updated!');
      await refreshUser();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const walletDisplay = `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-zinc-900 border-l border-zinc-800 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold">Profile Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(100%-73px)] space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group"
              style={{ imageRendering: 'pixelated' }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
              ) : (
                <span className="text-2xl font-semibold text-zinc-400">
                  {(displayName || walletDisplay).slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <div>
              <p className="font-medium">Profile Picture</p>
              <p className="text-sm text-zinc-500">Click to upload</p>
            </div>
          </div>

          {/* Wallet Address (read-only) */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Wallet Address</label>
            <div className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-400 font-mono">
              {user.wallet_address}
            </div>
          </div>

          {/* Ethscription Name (read-only if set) */}
          {user.ethscription_name && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Ethscription Name</label>
              <div className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-[#c3ff00]">
                {user.ethscription_name}
              </div>
            </div>
          )}

          {/* Display Name */}
          <Input
            label="Display Name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder={user.ethscription_name || walletDisplay}
          />

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm resize-none focus:outline-none focus:border-[#c3ff00] h-24"
            />
          </div>

          {/* Social Links */}
          <div className="pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-medium mb-4 text-zinc-400">Social Links</h3>

            {/* Twitter */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">Twitter / X</label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-zinc-800 border border-r-0 border-zinc-700 rounded-l-lg text-sm text-zinc-500">@</span>
                <input
                  value={twitterHandle}
                  onChange={e => setTwitterHandle(e.target.value.replace(/^@/, ''))}
                  placeholder="username"
                  className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-r-lg text-sm focus:outline-none focus:border-[#c3ff00]"
                />
              </div>
            </div>

            {/* Discord */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">Discord</label>
              <input
                value={discordHandle}
                onChange={e => setDiscordHandle(e.target.value)}
                placeholder="username"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-[#c3ff00]"
              />
            </div>

            {/* ENS Name */}
            <div>
              <label className="block text-sm font-medium mb-1.5">ENS Name</label>
              <div className="flex items-center">
                <input
                  value={ensName}
                  onChange={e => setEnsName(e.target.value.replace(/\.eth$/, ''))}
                  placeholder="vitalik"
                  className="flex-1 px-3 py-2 bg-zinc-900 border border-r-0 border-zinc-700 rounded-l-lg text-sm focus:outline-none focus:border-[#c3ff00]"
                />
                <span className="px-3 py-2 bg-zinc-800 border border-l-0 border-zinc-700 rounded-r-lg text-sm text-zinc-500">.eth</span>
              </div>
            </div>
          </div>

          {/* Error/Success messages */}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400">{success}</p>}

          {/* Save button */}
          <Button onClick={handleSave} loading={saving} className="w-full">
            Save Changes
          </Button>
        </div>
      </div>
    </>
  );
}
