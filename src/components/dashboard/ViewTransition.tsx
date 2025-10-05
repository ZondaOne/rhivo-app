'use client';

import { ReactNode, useEffect, useState } from 'react';

interface ViewTransitionProps {
  children: ReactNode;
  transitionKey: string; // Change this to trigger transition
  direction?: 'expand' | 'focus' | 'fade'; // View transition type
  className?: string;
}

/**
 * ViewTransition - Smooth transition wrapper for calendar view changes
 *
 * Design Philosophy: Functional Minimalism
 * - Subtle animations that enhance without distracting
 * - GPU-accelerated transforms for 60fps performance
 * - Respects prefers-reduced-motion accessibility preference
 *
 * Transition Types:
 * - 'expand': Vertical slide down (month → week/day) - content expanding
 * - 'focus': Subtle scale (week → day) - zooming in to focus
 * - 'fade': Opacity only (list ↔ others) - different layout paradigm
 *
 * Timing: 250ms - fast enough for responsiveness, slow enough for smoothness
 */
export function ViewTransition({
  children,
  transitionKey,
  direction = 'fade',
  className = ''
}: ViewTransitionProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentKey, setCurrentKey] = useState(transitionKey);
  const [displayContent, setDisplayContent] = useState(children);

  useEffect(() => {
    // Trigger transition when key changes
    if (transitionKey !== currentKey) {
      setIsTransitioning(true);

      // Wait for exit animation to complete before updating content
      const exitTimeout = setTimeout(() => {
        setCurrentKey(transitionKey);
        setDisplayContent(children);

        // Trigger enter animation
        const enterTimeout = setTimeout(() => {
          setIsTransitioning(false);
        }, 10); // Small delay to ensure DOM update before enter animation

        return () => clearTimeout(enterTimeout);
      }, 250); // Match CSS transition duration

      return () => clearTimeout(exitTimeout);
    } else {
      // Update content immediately if key hasn't changed
      setDisplayContent(children);
    }
  }, [transitionKey, children, currentKey]);

  // Animation style based on direction
  const getTransitionStyle = (): string => {
    // 250ms = duration-[250ms] in Tailwind v4
    // motion-safe: prefix respects prefers-reduced-motion
    const baseClasses = 'transition-opacity duration-[250ms] ease-out motion-safe:transition-all';

    if (isTransitioning) {
      // Exit state - fade out with directional motion
      switch (direction) {
        case 'expand':
          // Reduced motion: fade only. Full motion: fade + slide
          return `${baseClasses} opacity-0 motion-safe:-translate-y-2`;
        case 'focus':
          // Reduced motion: fade only. Full motion: fade + scale
          return `${baseClasses} opacity-0 motion-safe:scale-[0.98]`;
        case 'fade':
        default:
          // Always just fade (accessible for all users)
          return `${baseClasses} opacity-0`;
      }
    } else {
      // Enter state - fade in from directional motion
      return `${baseClasses} opacity-100 motion-safe:translate-y-0 motion-safe:scale-100`;
    }
  };

  return (
    <div className={`${getTransitionStyle()} ${className}`}>
      {displayContent}
    </div>
  );
}

/**
 * Hook to determine transition direction based on view changes
 *
 * Usage:
 * const direction = useViewTransitionDirection(previousView, currentView);
 */
export function useViewTransitionDirection(
  previousView: string,
  currentView: string
): 'expand' | 'focus' | 'fade' {
  // Month → Week/Day: Expanding detail
  if (previousView === 'month' && (currentView === 'week' || currentView === 'day')) {
    return 'expand';
  }

  // Week → Day: Focusing further
  if (previousView === 'week' && currentView === 'day') {
    return 'focus';
  }

  // Any transition involving list view: Different paradigm
  if (previousView === 'list' || currentView === 'list') {
    return 'fade';
  }

  // Default: Simple fade for reverse transitions or same-level changes
  return 'fade';
}
