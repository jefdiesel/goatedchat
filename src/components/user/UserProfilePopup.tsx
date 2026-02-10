'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface UserProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    wallet_address: string;
    ethscription_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    status?: string;
  };
  onUpdate?: () => void;
}

interface EthscriptionName {
  name: string;
  tx_hash: string;
}

interface EthscriptionImage {
  tx_hash: string;
  content_uri: string;
  mimetype: string;
}

export function UserProfilePopup({ isOpen, onClose, user, onUpdate }: UserProfilePopupProps) {
  const { user: currentUser, refreshUser } = useAuth();
  const isOwner = currentUser?.id === user.id;

  const [isEditing, setIsEditing] = useState(false);
  const [ethscriptionNames, setEthscriptionNames] = useState<EthscriptionName[]>([]);
  const [loadingNames, setLoadingNames] = useState(false);
  const [selectedName, setSelectedName] = useState(user.ethscription_name || '');
  const [pfpTxHash, setPfpTxHash] = useState('');
  const [pfpPreview, setPfpPreview] = useState<string | null>(user.avatar_url);
  const [loadingPfp, setLoadingPfp] = useState(false);
  const [pfpError, setPfpError] = useState('');
  const [pfpSuccess, setPfpSuccess] = useState(false);
  const [imageEthscriptions, setImageEthscriptions] = useState<EthscriptionImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imagePage, setImagePage] = useState(1);
  const [hasMoreImages, setHasMoreImages] = useState(false);
  const [bio, setBio] = useState(user.bio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch ethscription names and images when editing
  useEffect(() => {
    if (isEditing && isOwner) {
      fetchEthscriptionNames();
      fetchImageEthscriptions();
    }
  }, [isEditing, isOwner, user.wallet_address]);

  const fetchImageEthscriptions = async (page = 1, append = false) => {
    setLoadingImages(true);
    try {
      const res = await fetch(
        `https://api.ethscriptions.com/v2/ethscriptions?current_owner=${user.wallet_address}&media_type=image&per_page=25&page=${page}`
      );
      const data = await res.json();
      const images = (data.result || data.ethscriptions || [])
        .map((e: any) => ({
          tx_hash: e.transaction_hash,
          content_uri: e.content_uri,
          mimetype: e.mimetype,
        }))
        .filter((img: EthscriptionImage) => img.content_uri && img.content_uri.startsWith('data:image/'));

      if (append) {
        setImageEthscriptions(prev => [...prev, ...images]);
      } else {
        setImageEthscriptions(images);
      }
      setHasMoreImages(images.length === 25);
      setImagePage(page);
    } catch (err) {
      console.error('Failed to fetch image ethscriptions:', err);
    } finally {
      setLoadingImages(false);
    }
  };

  const loadMoreImages = () => {
    fetchImageEthscriptions(imagePage + 1, true);
  };

  const fetchEthscriptionNames = async () => {
    setLoadingNames(true);
    try {
      const res = await fetch(
        `https://api.ethscriptions.com/v2/ethscriptions?current_owner=${user.wallet_address}&content_type=text/plain&per_page=100`
      );
      const data = await res.json();

      // Parse ethscription content - handles both "data:,content" and "data:text/plain;base64,content"
      const parseContent = (contentUri: string): string => {
        if (!contentUri) return '';
        if (contentUri.startsWith('data:,')) {
          return decodeURIComponent(contentUri.slice(6));
        }
        if (contentUri.includes('base64,')) {
          try {
            return atob(contentUri.split('base64,')[1]);
          } catch {
            return '';
          }
        }
        return '';
      };

      // Get all text ethscriptions as potential names
      const names = (data.result || data.ethscriptions || [])
        .map((e: any) => {
          const content = parseContent(e.content_uri);
          return {
            name: content,
            tx_hash: e.transaction_hash,
          };
        })
        .filter((n: any) => n.name && n.name.length > 0 && n.name.length <= 32);

      setEthscriptionNames(names);
    } catch (err) {
      console.error('Failed to fetch ethscription names:', err);
    } finally {
      setLoadingNames(false);
    }
  };

  const handlePfpTxHashChange = async (txHash: string) => {
    setPfpTxHash(txHash);
    setPfpError('');
    setPfpSuccess(false);

    if (txHash && txHash.length === 66) {
      setLoadingPfp(true);
      try {
        const res = await fetch(`https://api.ethscriptions.com/v2/ethscriptions/${txHash}`);
        if (!res.ok) {
          setPfpError('Ethscription not found');
          setLoadingPfp(false);
          return;
        }
        const data = await res.json();
        const contentUri = data.result?.content_uri || data.ethscription?.content_uri;
        const mimetype = data.result?.mimetype || data.ethscription?.mimetype || '';

        if (!contentUri) {
          setPfpError('No content found');
        } else if (!mimetype.startsWith('image/')) {
          setPfpError('Not an image ethscription');
        } else {
          setPfpPreview(contentUri);
          setPfpSuccess(true);
        }
      } catch (err) {
        console.error('Failed to fetch ethscription:', err);
        setPfpError('Failed to fetch ethscription');
      } finally {
        setLoadingPfp(false);
      }
    } else if (txHash && txHash.length > 0) {
      setPfpPreview(user.avatar_url);
    }
  };

  const selectImageEthscription = (img: EthscriptionImage) => {
    setPfpTxHash(img.tx_hash);
    setPfpPreview(img.content_uri);
    setPfpSuccess(true);
    setPfpError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      // Use pfpPreview which contains the content_uri fetched from ethscription
      const avatarUrl = pfpTxHash && pfpPreview
        ? pfpPreview
        : user.avatar_url;

      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: selectedName || null,
          bio: bio || null,
          avatar_url: avatarUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      await refreshUser();
      onUpdate?.();
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const displayName = user.ethscription_name ||
    `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Profile' : 'Profile'}>
      <div className="space-y-4">
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            <div
              className="w-24 h-24 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden"
              style={{ imageRendering: 'pixelated' }}
            >
              {pfpPreview || user.avatar_url ? (
                <img
                  src={pfpPreview || user.avatar_url || ''}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <span className="text-3xl font-bold text-zinc-400">
                  {displayName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            {user.status && (
              <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-zinc-900 ${
                user.status === 'online' ? 'bg-green-500' :
                user.status === 'idle' ? 'bg-yellow-500' :
                user.status === 'dnd' ? 'bg-red-500' : 'bg-zinc-500'
              }`} />
            )}
          </div>
        </div>

        {/* Display Name */}
        <div className="text-center">
          <h3 className="text-xl font-bold text-[#c3ff00]">{displayName}</h3>
          <p className="text-sm text-zinc-500 font-mono">
            {user.wallet_address.slice(0, 10)}...{user.wallet_address.slice(-8)}
          </p>
        </div>

        {/* Bio */}
        {!isEditing && user.bio && (
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-sm text-zinc-300">{user.bio}</p>
          </div>
        )}

        {/* Edit Mode */}
        {isEditing && isOwner && (
          <div className="space-y-4 pt-2 border-t border-zinc-700">
            {/* Ethscription Name Picker */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Ethscription Name</label>
              {loadingNames ? (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <div className="w-4 h-4 border-2 border-zinc-600 border-t-[#c3ff00] rounded-full animate-spin" />
                  Loading names...
                </div>
              ) : ethscriptionNames.length > 0 ? (
                <select
                  value={selectedName}
                  onChange={e => setSelectedName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-[#c3ff00]"
                >
                  <option value="">Select a name...</option>
                  {ethscriptionNames.map(n => (
                    <option key={n.tx_hash} value={n.name}>
                      {n.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-zinc-500">No .eths names found in wallet</p>
              )}
            </div>

            {/* PFP from Ethscription */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Profile Picture
              </label>

              {/* Image ethscription picker */}
              {loadingImages ? (
                <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                  <div className="w-4 h-4 border-2 border-zinc-600 border-t-[#c3ff00] rounded-full animate-spin" />
                  Loading your image ethscriptions...
                </div>
              ) : imageEthscriptions.length > 0 ? (
                <div className="mb-3">
                  <p className="text-xs text-zinc-500 mb-2">Select from your collection:</p>
                  <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto">
                    {imageEthscriptions.map(img => (
                      <button
                        key={img.tx_hash}
                        type="button"
                        onClick={() => selectImageEthscription(img)}
                        className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                          pfpTxHash === img.tx_hash
                            ? 'border-[#c3ff00]'
                            : 'border-zinc-700 hover:border-zinc-500'
                        }`}
                        style={{ imageRendering: 'pixelated' }}
                      >
                        <img
                          src={img.content_uri}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </button>
                    ))}
                  </div>
                  {hasMoreImages && (
                    <button
                      type="button"
                      onClick={loadMoreImages}
                      disabled={loadingImages}
                      className="mt-2 text-xs text-[#c3ff00] hover:underline disabled:opacity-50"
                    >
                      {loadingImages ? 'Loading...' : 'Load more'}
                    </button>
                  )}
                </div>
              ) : null}

              {/* Or paste tx hash */}
              <p className="text-xs text-zinc-500 mb-1.5">Or paste a tx hash:</p>
              <Input
                value={pfpTxHash}
                onChange={e => handlePfpTxHashChange(e.target.value)}
                placeholder="0x..."
              />
              {loadingPfp && (
                <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
                  <div className="w-3 h-3 border-2 border-zinc-600 border-t-[#c3ff00] rounded-full animate-spin" />
                  Loading ethscription...
                </div>
              )}
              {pfpError && (
                <p className="text-xs text-red-400 mt-1">{pfpError}</p>
              )}
              {pfpSuccess && !loadingPfp && (
                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Image loaded!
                </p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm resize-none focus:outline-none focus:border-[#c3ff00] h-20"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {isOwner && !isEditing && (
            <Button onClick={() => setIsEditing(true)} className="flex-1">
              Edit Profile
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving} disabled={loadingPfp} className="flex-1">
                Save Changes
              </Button>
            </>
          )}
          {!isEditing && (
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Close
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
