'use client';

import { useState, useCallback } from 'react';

interface UploadResult {
  url: string;
  key: string;
  filename: string;
  contentType: string;
  size: number;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(null);
    setError(null);

    try {
      // Get signed upload URL
      const signRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      const signData = await signRes.json();

      if (!signRes.ok) {
        throw new Error(signData.error || 'Failed to get upload URL');
      }

      // Upload to R2
      const uploadRes = await fetch(signData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      setProgress({ loaded: file.size, total: file.size, percent: 100 });

      return {
        url: signData.publicUrl,
        key: signData.key,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      };
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const uploadMultiple = useCallback(async (files: File[]): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];

    for (const file of files) {
      const result = await upload(file);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }, [upload]);

  return {
    upload,
    uploadMultiple,
    uploading,
    progress,
    error,
  };
}

// Client-side image compression utility
export async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Create canvas and draw
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to WebP if supported, otherwise JPEG
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
