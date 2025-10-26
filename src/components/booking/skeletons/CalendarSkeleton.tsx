/**
 * CalendarSkeleton - Loading state for booking calendar
 *
 * Design: Matches actual calendar layout structure
 * - Month/year header skeleton
 * - 7-column grid (weekday headers)
 * - 5-6 rows of day cells
 * - Shimmer animation for perceived loading progress
 */
export function CalendarSkeleton() {
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Generate 5 weeks of skeleton cells (35 cells)
  const skeletonCells = Array.from({ length: 35 }, (_, i) => i);

  return (
    <div className="space-y-4">
      {/* Month/Year header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-8 w-40 bg-gray-200 rounded skeleton-shimmer" />
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-gray-200 rounded skeleton-shimmer" />
          <div className="h-8 w-8 bg-gray-200 rounded skeleton-shimmer" />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-200/60 bg-gray-50">
          {weekdays.map((day) => (
            <div
              key={day}
              className="p-2 text-center border-r border-gray-200/60 last:border-r-0"
            >
              <div className="h-4 w-8 bg-gray-200 rounded mx-auto skeleton-shimmer" />
            </div>
          ))}
        </div>

        {/* Day cells grid */}
        <div className="grid grid-cols-7">
          {skeletonCells.map((cellIndex) => {
            const isLastRow = cellIndex >= 28; // Last 7 cells
            const isWeekend = cellIndex % 7 >= 5; // Saturday & Sunday

            return (
              <div
                key={cellIndex}
                className={`h-14 relative border-r border-b border-gray-200/60 last:border-r-0 ${
                  isLastRow ? 'border-b-0' : ''
                } ${isWeekend ? 'bg-gray-50/30' : 'bg-white'}`}
              >
                {/* Cell content */}
                <div className="p-2 h-full flex items-center justify-center">
                  {/* Day number skeleton */}
                  <div className="h-4 w-6 bg-gray-200 rounded skeleton-shimmer" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
