"use client";

import { useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspectRatio?: 'profile' | 'banner'; // profile = 1:1, banner = 16:9 or wider
  description?: string;
  fetchedUrl?: string; // Auto-fetched URL (e.g., from Instagram) - shown as default
  onFetchedUrlAccept?: () => void; // Called when user accepts the fetched URL
  isLoadingFetched?: boolean; // Loading state for fetched URL
}

/**
 * ImageUpload Component
 *
 * Free frontend-only image upload using Cloudinary's unsigned upload.
 * No transformations are used to stay within the free tier.
 *
 * Setup required:
 * 1. Create a free Cloudinary account at https://cloudinary.com
 * 2. Go to Settings > Upload > Add upload preset
 * 3. Set signing mode to "Unsigned"
 * 4. Add the following to your .env.local:
 *    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
 *
 * Features:
 * - Compact, responsive UI
 * - Direct upload to Cloudinary (no backend)
 * - Image preview with remove option
 * - 5MB file size limit
 * - Object-cover fit for preview display
 *
 * Alternative free options if Cloudinary doesn't work:
 * - imgbb.com (no signup required, but less reliable)
 * - uploadcare.com (3GB free tier)
 */
export default function ImageUpload({
  label,
  value,
  onChange,
  aspectRatio = 'profile',
  description,
  fetchedUrl,
  onFetchedUrlAccept,
  isLoadingFetched = false
}: ImageUploadProps) {
  const t = useTranslations('onboard.branding');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState(value || fetchedUrl || '');
  const [showFetchedPreview, setShowFetchedPreview] = useState(!!fetchedUrl && !value);

  useEffect(() => {
    if (value) {
      setPreviewUrl(value);
      setShowFetchedPreview(false);
    } else if (fetchedUrl) {
      setPreviewUrl(fetchedUrl);
      setShowFetchedPreview(true);
    }
  }, [value, fetchedUrl]);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Check if Cloudinary is configured
      if (!cloudName || !uploadPreset) {
        // Fallback: Use local preview (data URL)
        // NOTE: This won't work for production, just for testing
        console.warn('Cloudinary not configured. Using local preview only.');
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          setPreviewUrl(dataUrl);
          onChange(dataUrl);
          setUploading(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      // Note: Transformations removed - they require paid plan
      // Images are uploaded as-is, Cloudinary will optimize them automatically

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const imageUrl = data.secure_url;

      setPreviewUrl(imageUrl);
      onChange(imageUrl);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl('');
    onChange('');
    setError(null);
  };

  return (
    <div>
      {/* Header */}
      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
        {label}
        {description && (
          <span className="block text-xs text-gray-500 font-normal mt-0.5">{description}</span>
        )}
      </label>

      {/* Upload Area or Preview */}
      {isLoadingFetched ? (
        // Loading state for fetched image
        <div className="relative">
          <div className={`relative ${aspectRatio === 'profile' ? 'aspect-square w-40 sm:w-48' : 'w-full aspect-[3/1]'} rounded-xl overflow-hidden bg-gray-50 border-2 border-gray-200 flex items-center justify-center`}>
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-gray-700"></div>
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      ) : previewUrl ? (
        // Preview mode - different layouts for profile vs banner
        aspectRatio === 'profile' ? (
          // Profile: compact inline display
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-gray-200 flex-shrink-0">
              <img
                src={previewUrl}
                alt={label}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              {showFetchedPreview ? (
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-gray-600">
                    Loaded from Instagram
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onChange(fetchedUrl || '');
                        setShowFetchedPreview(false);
                        onFetchedUrlAccept?.();
                      }}
                      className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
                    >
                      Use This
                    </button>
                    <button
                      type="button"
                      onClick={handleRemove}
                      className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                    >
                      Upload Different
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ) : (
          // Banner: full width preview with remove button below
          <div className="space-y-3">
            <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden border-2 border-gray-200">
              <img
                src={previewUrl}
                alt={label}
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
            >
              Remove
            </button>
          </div>
        )
      ) : (
        // Upload mode - simplified
        aspectRatio === 'profile' ? (
          <div className="w-40 sm:w-48">
            <label className="relative block aspect-square w-full border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 transition-colors cursor-pointer group">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-700"></div>
                    <p className="text-xs sm:text-sm text-gray-600">{t('uploading')}</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    <div className="text-center">
                      <p className="text-xs sm:text-sm font-medium text-gray-700">
                        {t('uploadButton')}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t('imageSizeHint')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </label>
          </div>
        ) : (
          <label className="relative block w-full h-32 sm:h-40 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 transition-colors cursor-pointer group">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-700"></div>
                  <p className="text-xs sm:text-sm text-gray-600">{t('uploading')}</p>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  <div className="text-center">
                    <p className="text-xs sm:text-sm font-medium text-gray-700">
                      {t('uploadButton')}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('imageSizeHint')}
                    </p>
                  </div>
                </>
              )}
            </div>
          </label>
        )
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs sm:text-sm text-red-600 mt-2 flex items-center gap-1.5">
          <X className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      )}

      {/* Cloudinary warning */}
      {!cloudName || !uploadPreset ? (
        <div className="mt-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-amber-50 border-2 border-amber-200 rounded-xl">
          <p className="text-xs sm:text-sm text-amber-800">
            <strong className="font-semibold">Setup required:</strong> Cloudinary not configured. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to your .env.local file.
          </p>
        </div>
      ) : null}
    </div>
  );
}
