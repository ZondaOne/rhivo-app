'use client';

import { useState } from 'react';
import { UpgradeModal } from './UpgradeModal';

interface LockedFeatureProps {
  featureName: string;
  description: string;
  currentTier: string;
  suggestedTier?: string;
  icon?: string;
  className?: string;
  onUpgrade?: () => void;
}

export function LockedFeature({
  featureName,
  description,
  currentTier,
  suggestedTier = 'basic',
  icon = '🔒',
  className = '',
  onUpgrade,
}: LockedFeatureProps) {
  const [showModal, setShowModal] = useState(false);

  const handleUpgradeClick = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <div className={`relative bg-white border border-gray-200/60 rounded-2xl p-8 shadow-sm ${className}`}>
        {/* Subtle blur overlay to indicate locked state */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] rounded-2xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full min-h-[320px]">
          {/* Lock Icon - Simple and clean */}
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>

          {/* Feature name - Bold typography for hierarchy */}
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">{featureName}</h3>

          {/* Description - Secondary text */}
          <p className="text-sm text-gray-500 mb-6 max-w-md text-center">{description}</p>

          {/* Tier requirement - Subtle indication */}
          <p className="text-sm text-gray-500 mb-6">
            Available in <span className="font-semibold text-gray-900">{suggestedTier === 'basic' ? 'Professional' : suggestedTier === 'pro' ? 'Growth' : 'Enterprise'}</span> plan
          </p>

          {/* Primary CTA following style guide */}
          <button
            onClick={handleUpgradeClick}
            className="px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            View Plans
          </button>
        </div>
      </div>

      {!onUpgrade && (
        <UpgradeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          currentTier={currentTier}
          suggestedTier={suggestedTier}
          featureName={featureName}
        />
      )}
    </>
  );
}
