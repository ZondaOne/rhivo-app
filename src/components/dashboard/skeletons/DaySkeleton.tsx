import { Fragment } from 'react';

/**
 * DaySkeleton - Loading state for day calendar view
 *
 * Design: Matches actual day view timeline structure
 * - 2-column layout: hour labels (100px) + timeline
 * - 16 hour rows (6 AM - 10 PM) at 140px each
 * - Scattered appointment bars at varying heights and positions
 * - Shimmer animation for loading feedback
 */
export function DaySkeleton() {
  const START_HOUR = 6;
  const END_HOUR = 22;
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

  // Generate random appointment-like skeletons
  const appointmentSkeletons = [
    { hour: 9, heightPercent: 60, topOffset: 0 },    // 9:00 AM, 1 hour
    { hour: 10, heightPercent: 40, topOffset: 30 },  // 10:30 AM, 30 min
    { hour: 11, heightPercent: 80, topOffset: 0 },   // 11:00 AM, 1.5 hours (spans into next)
    { hour: 14, heightPercent: 60, topOffset: 0 },   // 2:00 PM, 1 hour
    { hour: 15, heightPercent: 40, topOffset: 40 },  // 3:30 PM, 30 min
    { hour: 17, heightPercent: 90, topOffset: 0 },   // 5:00 PM, ~1.5 hours
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden flex flex-col h-full">
      {/* Scrollable timeline container */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[100px_1fr] relative">
          {/* Hour rows */}
          {hours.map((hour, index) => {
            const isLast = index === hours.length - 1;

            // Format hour (e.g., "9:00 AM")
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;

            return (
              <Fragment key={hour}>
                {/* Hour label column */}
                <div className={`p-3 border-b border-r border-gray-200/60 ${isLast ? 'border-b-0' : ''}`}>
                  <div className="h-4 w-16 bg-gray-200 rounded skeleton-shimmer" />
                </div>

                {/* Timeline column */}
                <div
                  className={`min-h-[140px] h-[140px] border-b border-gray-200/60 ${isLast ? 'border-b-0' : ''} relative bg-white`}
                >
                  {/* Appointment skeletons for this hour */}
                  {appointmentSkeletons
                    .filter((apt) => apt.hour === hour)
                    .map((apt, aptIndex) => (
                      <div
                        key={aptIndex}
                        className="absolute left-1 rounded-lg bg-gray-200 skeleton-shimmer"
                        style={{
                          top: `${apt.topOffset}%`,
                          height: `${apt.heightPercent}%`,
                          width: 'calc(100% - 8px)',
                        }}
                      />
                    ))}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
