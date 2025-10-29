'use client';

import { useEffect, useState } from 'react';
import { Logo } from './Logo';
import { LogoIcon } from './LogoIcon';

interface LoadingAnimationProps {
  fullScreen?: boolean;
  variant?: 'logo' | 'icon';
  onComplete?: () => void;
  duration?: number; // Duration in milliseconds before calling onComplete
}

export function LoadingAnimation({
  fullScreen = true,
  variant = 'logo',
  onComplete,
  duration = 2000,
}: LoadingAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (onComplete) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 500); // Wait for fade out animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [onComplete, duration]);

  const containerClasses = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-white z-50'
    : 'flex items-center justify-center p-8';

  return (
    <div
      className={`${containerClasses} transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <style jsx>{`
        @keyframes pulse-scale {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-pulse-scale {
          animation: pulse-scale 2s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>

      <div className="animate-fade-in animate-pulse-scale">
        {variant === 'icon' ? (
          <LogoIcon size={120} />
        ) : (
          <Logo size="xl" />
        )}
      </div>
    </div>
  );
}
