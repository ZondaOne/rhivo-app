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
  description
}: ImageUploadProps) {
  const t = useTranslations('onboard.branding');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState(value);

  useEffect(() => {
    setPreviewUrl(value);
  }, [value]);

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
    <div className="border border-gray-200 rounded-xl p-4 bg-white hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">{label}</h4>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {t('optional')}
        </span>
      </div>

      {/* Upload Area or Preview */}
      {previewUrl ? (
        // Preview mode
        <div className="space-y-2">
          <div className={`relative w-full ${aspectRatio === 'profile' ? 'h-32' : 'h-24'} rounded-lg overflow-hidden bg-gray-100`}>
            <img
              src={previewUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="w-full px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <X className="h-4 w-4" />
            {t('removeImage')}
          </button>
        </div>
      ) : (
        // Upload mode
        <div>
          <label
            className={`block w-full ${aspectRatio === 'profile' ? 'h-32' : 'h-24'} border-2 border-dashed border-gray-300 rounded-lg hover:border-teal-400 hover:bg-teal-50/50 transition-all cursor-pointer ${uploading ? 'opacity-50 pointer-events-none bg-gray-50' : 'bg-gray-50'}`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <div className="h-full flex flex-col items-center justify-center gap-2 px-4">
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent"></div>
                  <p className="text-sm text-gray-600">{t('uploading')}</p>
                </>
              ) : (
                <>
                  <div className="p-2.5 bg-teal-100 rounded-full">
                    {aspectRatio === 'profile' ? (
                      <ImageIcon className="h-5 w-5 text-teal-600" />
                    ) : (
                      <Upload className="h-5 w-5 text-teal-600" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">
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
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
          <X className="h-3 w-3" />
          {error}
        </p>
      )}

      {/* Cloudinary warning */}
      {!cloudName || !uploadPreset ? (
        <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>Setup required:</strong> Cloudinary not configured. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to your .env.local file.
          </p>
        </div>
      ) : null}
    </div>
  );
}
