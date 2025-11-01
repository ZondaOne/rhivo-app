'use client';

import { useState } from 'react';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

interface UseUpgradeOptions {
  currentTier: string;
}

export function useUpgrade({ currentTier }: UseUpgradeOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalProps, setModalProps] = useState<{
    suggestedTier?: string;
    featureName?: string;
    message?: string;
  }>({});

  const showUpgrade = (options?: {
    suggestedTier?: string;
    featureName?: string;
    message?: string;
  }) => {
    setModalProps(options || {});
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setModalProps({});
  };

  const UpgradeModalComponent = () => (
    <UpgradeModal
      isOpen={isOpen}
      onClose={closeModal}
      currentTier={currentTier}
      {...modalProps}
    />
  );

  return {
    showUpgrade,
    UpgradeModal: UpgradeModalComponent,
  };
}
