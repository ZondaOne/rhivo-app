/**
 * ServiceSelectionSkeleton - Loading state for service selection
 *
 * Design: Matches actual service cards layout structure
 * - Category header skeleton
 * - 2-4 service cards with service details
 * - Shimmer animation for perceived loading progress
 */
export function ServiceSelectionSkeleton() {
  // Generate 2 categories with varying service counts for realism
  const categories = [
    { id: 1, serviceCount: 3 },
    { id: 2, serviceCount: 4 },
  ];

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category.id} className="bg-white rounded-2xl border border-gray-200/60 p-4 sm:p-6">
          {/* Category header skeleton */}
          <div className="mb-4">
            <div className="h-6 w-32 bg-gray-200 rounded skeleton-shimmer mb-2" />
            <div className="h-4 w-48 bg-gray-100 rounded skeleton-shimmer" />
          </div>

          {/* Service cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: category.serviceCount }, (_, i) => (
              <div
                key={i}
                className="p-4 border-2 border-gray-200 rounded-xl"
              >
                {/* Service name */}
                <div className="h-5 w-3/4 bg-gray-200 rounded skeleton-shimmer mb-3" />

                {/* Service description */}
                <div className="space-y-2 mb-3">
                  <div className="h-3 w-full bg-gray-100 rounded skeleton-shimmer" />
                  <div className="h-3 w-5/6 bg-gray-100 rounded skeleton-shimmer" />
                </div>

                {/* Duration and price */}
                <div className="flex items-center gap-3">
                  <div className="h-4 w-16 bg-gray-200 rounded skeleton-shimmer" />
                  <div className="h-4 w-1 bg-gray-200 rounded skeleton-shimmer" />
                  <div className="h-4 w-20 bg-gray-200 rounded skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
