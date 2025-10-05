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
  const [phase, setPhase] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const [currentKey, setCurrentKey] = useState(transitionKey);
  const [displayContent, setDisplayContent] = useState(children);

  useEffect(() => {
    // Trigger transition when key changes
    if (transitionKey !== currentKey) {
      // Start exit phase
      setPhase('exiting');

      // After exit animation completes, swap content and start enter phase
      const swapTimeout = setTimeout(() => {
        setCurrentKey(transitionKey);
        setDisplayContent(children);
        setPhase('entering');

        // After a brief moment, trigger enter animation
        const enterTimeout = setTimeout(() => {
          setPhase('idle');
        }, 50); // Small delay to ensure DOM update triggers transition

        return () => clearTimeout(enterTimeout);
      }, 250); // Match CSS transition duration

      return () => clearTimeout(swapTimeout);
    } else {
      // Update content immediately if key hasn't changed
      setDisplayContent(children);
    }
  }, [transitionKey, children, currentKey]);

  // Animation style based on direction and phase
  const getTransitionStyle = (): string => {
    // Base transition properties - always applied
    const baseClasses = 'transition-opacity duration-[250ms] ease-out motion-safe:transition-all';

    // Apply different styles based on transition phase
    if (phase === 'exiting') {
      // Exiting state - fade out with directional motion
      switch (direction) {
        case 'expand':
          return `${baseClasses} opacity-0 motion-safe:-translate-y-2`;
        case 'focus':
          return `${baseClasses} opacity-0 motion-safe:scale-[0.98]`;
        case 'fade':
        default:
          return `${baseClasses} opacity-0`;
      }
    } else if (phase === 'entering') {
      // Entering state - prepare for animation (opposite direction)
      switch (direction) {
        case 'expand':
          return `${baseClasses} opacity-0 motion-safe:translate-y-2`;
        case 'focus':
          return `${baseClasses} opacity-0 motion-safe:scale-[1.02]`;
        case 'fade':
        default:
          return `${baseClasses} opacity-0`;
      }
    } else {
      // Idle state - fully visible, neutral position
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
