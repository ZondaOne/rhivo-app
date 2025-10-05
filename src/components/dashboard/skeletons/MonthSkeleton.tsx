/**
 * MonthSkeleton - Loading state for month calendar view
 *
 * Design: Matches actual month view layout structure
 * - 7-column grid (weekday headers)
 * - 5-6 rows of day cells (140px each to match actual cells)
 * - 2-3 gray bars per cell representing appointments
 * - Shimmer animation for perceived loading progress
 */
export function MonthSkeleton() {
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Generate 5 weeks of skeleton cells (35 cells)
  const skeletonCells = Array.from({ length: 35 }, (_, i) => i);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden">
      {/* Weekday headers - match actual styling */}
      <div className="grid grid-cols-7 border-b border-gray-200/60">
        {weekdays.map((day) => (
          <div
            key={day}
            className="p-4 text-center border-r border-gray-200/60 last:border-r-0"
          >
            <div className="h-4 w-12 bg-gray-200 rounded mx-auto skeleton-shimmer" />
          </div>
        ))}
      </div>

      {/* Day cells grid - 7 columns, 140px height to match actual */}
      <div className="grid grid-cols-7">
        {skeletonCells.map((cellIndex) => {
          const isLastRow = cellIndex >= 28; // Last 7 cells
          const isWeekend = cellIndex % 7 >= 5; // Saturday & Sunday

          return (
            <div
              key={cellIndex}
              className={`h-[140px] min-h-[140px] max-h-[140px] relative border-r border-b border-gray-200/60 last:border-r-0 ${
                isLastRow ? 'border-b-0' : ''
              } ${isWeekend ? 'bg-gray-50/30' : 'bg-white'}`}
            >
              {/* Cell content */}
              <div className="p-3 h-full flex flex-col">
                {/* Day number skeleton */}
                <div className="mb-2">
                  <div className="h-5 w-6 bg-gray-200 rounded skeleton-shimmer" />
                </div>

                {/* Appointment skeletons - 0-3 per cell for variety */}
                <div className="flex-1 flex flex-col gap-1.5">
                  {/* Vary number of appointments per cell for realism */}
                  {cellIndex % 3 !== 0 && (
                    <div className="h-6 bg-gray-200 rounded skeleton-shimmer" />
                  )}
                  {cellIndex % 2 === 0 && (
                    <div className="h-6 bg-gray-200 rounded skeleton-shimmer" />
                  )}
                  {cellIndex % 5 === 0 && (
                    <div className="h-6 bg-gray-200 rounded skeleton-shimmer" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
