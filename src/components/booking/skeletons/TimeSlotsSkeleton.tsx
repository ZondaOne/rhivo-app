/**
 * TimeSlotsSkeleton - Loading state for available time slots
 *
 * Design: Matches actual time slot buttons layout
 * - Grid of time slot skeletons
 * - Varying widths for realism
 * - Shimmer animation for perceived loading progress
 */
export function TimeSlotsSkeleton() {
  // Generate 12-16 time slot skeletons for realism
  const slots = Array.from({ length: 14 }, (_, i) => i);

  return (
    <div>
      <div className="h-5 w-32 bg-gray-200 rounded skeleton-shimmer mb-3 sm:mb-4" />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        {slots.map((slot) => (
          <div
            key={slot}
            className="h-12 bg-gray-100 border-2 border-gray-200 rounded-xl skeleton-shimmer"
          />
        ))}
      </div>
    </div>
  );
}
