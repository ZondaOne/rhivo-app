/**
 * ListSkeleton - Loading state for list calendar view
 *
 * Design: Matches actual list view structure
 * - Rows of appointments with consistent height
 * - 3-column layout: time, customer/service info, actions
 * - 10-15 rows for realistic loading appearance
 * - Shimmer animation for loading feedback
 */
export function ListSkeleton() {
  // Generate 12 skeleton rows for variety
  const skeletonRows = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[140px_1fr_100px] gap-4 p-4 border-b border-gray-200/60 bg-gray-50/30">
        <div className="h-4 w-16 bg-gray-200 rounded skeleton-shimmer" />
        <div className="h-4 w-32 bg-gray-200 rounded skeleton-shimmer" />
        <div className="h-4 w-16 bg-gray-200 rounded skeleton-shimmer" />
      </div>

      {/* Appointment rows */}
      <div className="divide-y divide-gray-200/60">
        {skeletonRows.map((index) => (
          <div
            key={index}
            className="grid grid-cols-[140px_1fr_100px] gap-4 p-4 hover:bg-gray-50/50 transition-colors"
          >
            {/* Time column */}
            <div className="flex flex-col gap-2">
              <div className="h-4 w-20 bg-gray-200 rounded skeleton-shimmer" />
              <div className="h-3 w-16 bg-gray-200 rounded skeleton-shimmer" />
            </div>

            {/* Info column */}
            <div className="flex flex-col gap-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded skeleton-shimmer" />
              <div className="h-3 w-1/2 bg-gray-200 rounded skeleton-shimmer" />
            </div>

            {/* Actions column */}
            <div className="flex items-center justify-end gap-2">
              <div className="h-8 w-8 bg-gray-200 rounded-lg skeleton-shimmer" />
              <div className="h-8 w-8 bg-gray-200 rounded-lg skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
