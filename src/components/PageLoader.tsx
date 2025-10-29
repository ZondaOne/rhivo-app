'use client';

import { useEffect, useState } from 'react';
import { LoadingAnimation } from './LoadingAnimation';

interface PageLoaderProps {
  children: React.ReactNode;
  minLoadTime?: number; // Minimum time to show loader (ms)
}

export function PageLoader({ children, minLoadTime = 1500 }: PageLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial page load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, minLoadTime);

    return () => clearTimeout(timer);
  }, [minLoadTime]);

  if (isLoading) {
    return <LoadingAnimation variant="logo" duration={minLoadTime} />;
  }

  return <>{children}</>;
}
