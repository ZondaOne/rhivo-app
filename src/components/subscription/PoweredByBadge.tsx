'use client';

import { useEffect, useState } from 'react';

interface PoweredByBadgeProps {
  businessId: string;
  className?: string;
}

export function PoweredByBadge({ businessId, className = '' }: PoweredByBadgeProps) {
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    // Check if business should show watermark
    const checkWatermark = async () => {
      try {
        const response = await fetch(`/api/business/info?id=${businessId}`);
        const data = await response.json();

        // Show badge if remove_watermark is false (free tier)
        setShowBadge(!data.business?.remove_watermark);
      } catch (error) {
        console.error('Failed to check watermark status:', error);
        // Default to showing badge on error
        setShowBadge(true);
      }
    };

    if (businessId) {
      checkWatermark();
    }
  }, [businessId]);

  if (!showBadge) return null;

  return (
    <div className={`flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 border-t border-gray-200 ${className}`}>
      <span className="text-sm text-gray-600">Powered by</span>
      <a
        href="https://rhivo.app"
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold text-blue-600 hover:text-blue-700 transition-colors text-sm"
      >
        Rhivo
      </a>
    </div>
  );
}

/**
 * Simplified version that doesn't make API calls
 * Use this when you already know the tier/watermark status
 */
export function PoweredByBadgeSimple({ show, className = '' }: { show: boolean; className?: string }) {
  if (!show) return null;

  return (
    <div className={`flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 border-t border-gray-200 ${className}`}>
      <span className="text-sm text-gray-600">Powered by</span>
      <a
        href="https://rhivo.app"
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold text-blue-600 hover:text-blue-700 transition-colors text-sm"
      >
        Rhivo
      </a>
    </div>
  );
}
