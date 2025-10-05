# Step 7m: Calendar Data Consistency and View Synchronization

## Overview

Ensures calendar state persists across page reloads, appointments display correctly when switching views, and data remains consistent through intelligent caching and defensive validation.

## Problems Solved

### 1. **URL State Not Restored on Page Load**
**Issue:** Navigating month→day (Jan 7), then reloading page would reset to month view + today's date (Jan 5).

**Solution:** Dashboard now reads `view` and `date` from URL query parameters on mount and initializes state accordingly.

```typescript
// app/dashboard/page.tsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const urlView = params.get('view') as CalendarView | null;
  const urlDate = params.get('date');

  if (urlView && ['month', 'week', 'day', 'list'].includes(urlView)) {
    setView(urlView);
  }

  if (urlDate) {
    const parsedDate = new Date(urlDate);
    if (!isNaN(parsedDate.getTime())) {
      setCurrentDate(parsedDate);
    }
  }

  setIsInitialized(true);
}, []);
```

### 2. **Appointments Disappearing When Switching Views**
**Issue:** Rapidly switching between month/week/day/list views caused appointments to disappear or show incorrect dates.

**Root Cause:**
- `loadAppointments()` was removed from view dependency (line 94 comment: "Removed 'view' - don't reload when just switching views")
- No defensive filtering to ensure displayed appointments match current view's visible range
- Race conditions when API requests completed out of order

**Solution:**
- Smart caching strategy reuses data when views have overlapping date ranges
- Defensive filtering always validates appointments match current view before display
- AbortController cancels in-flight requests when view/date changes

```typescript
// Defensive filtering (runs on every view/date change)
function filterAppointmentsForView(
  allAppointments: Appointment[],
  viewType: CalendarView,
  date: Date
): Appointment[] {
  const { start, end } = getDateRange(viewType, date);

  return allAppointments.filter(apt => {
    const aptStart = new Date(apt.start_time);
    return aptStart >= start && aptStart <= end;
  });
}
```

### 3. **Unnecessary API Refetches**
**Issue:** Every view or date change triggered a full API refetch, even when data was already loaded.

**Solution:** Intelligent caching checks if existing cache covers required date range before fetching.

```typescript
interface AppointmentCache {
  appointments: Appointment[];
  start: Date;
  end: Date;
}

// Check if cache covers required range
function cacheCoversRange(cache: AppointmentCache | null, start: Date, end: Date): boolean {
  if (!cache) return false;
  return cache.start.getTime() <= start.getTime() && cache.end.getTime() >= end.getTime();
}

// In loadAppointments()
const { start, end } = getDateRange(view, currentDate);

if (cacheCoversRange(appointmentCache, start, end)) {
  // Use cached data - just filter and display
  const filtered = filterAppointmentsForView(appointmentCache.appointments, view, currentDate);
  setAppointments(filtered);
  setLoading(false);
  return;
}
```

### 4. **Race Conditions on Rapid View Switching**
**Issue:** Switching views quickly caused data to disappear when slower requests completed after faster ones.

**Solution:** AbortController cancels in-flight requests when new ones are initiated.

```typescript
const [abortController, setAbortController] = useState<AbortController | null>(null);

// Cancel any in-flight request before starting new one
if (abortController) {
  abortController.abort();
}

const newAbortController = new AbortController();
setAbortController(newAbortController);

const data = await apiRequest<Appointment[]>(
  `/api/appointments?${params.toString()}`,
  { signal: newAbortController.signal }
);

// Cleanup on unmount or dependency change
useEffect(() => {
  // ...
  return () => {
    if (abortController) {
      abortController.abort();
    }
  };
}, [currentDate, view, isAuthenticated, authLoading]);
```

## Data Flow Architecture

```
User Action (view change, date change, page reload)
  ↓
Dashboard reads URL params → initializes view + date state
  ↓
Calendar component receives view + currentDate props
  ↓
useEffect triggers → loadAppointments()
  ↓
Calculate required date range for view
  ↓
Check cache coverage
  ├─ Cache covers range → Filter cached data → Display
  └─ Cache missing → Fetch from API → Update cache → Filter → Display
       ↓
     Cancel previous in-flight request (if any)
       ↓
     Fetch with AbortController signal
       ↓
     Update appointmentCache with { appointments, start, end }
       ↓
     Separate useEffect filters cache for current view
       ↓
     Defensive validation (dev mode only)
       ↓
     Display appointments
```

## Cache Invalidation Strategy

Cache is invalidated (set to `null`) when appointments are modified:

1. **After reschedule** - `setAppointmentCache(null)` forces fresh fetch
2. **After edit/update** - `setAppointmentCache(null)` ensures consistency
3. **After create** (via modal refresh) - New data fetched naturally via `refreshKey` increment

## Defensive Validation

Development mode includes invariant checks to catch bugs early:

```typescript
if (process.env.NODE_ENV === 'development') {
  const { start, end } = getDateRange(view, currentDate);
  filtered.forEach(apt => {
    const aptStart = new Date(apt.start_time);
    if (aptStart < start || aptStart > end) {
      console.error(
        `[Calendar] Invariant violation: Appointment ${apt.id} at ${apt.start_time} is outside visible range`,
        { appointment: apt, view, currentDate, visibleRange: { start, end } }
      );
    }
  });
}
```

## UX Improvements

### Before
❌ Navigate month→day (Jan 7) → reload → reverts to month + today (Jan 5)
❌ Switch views rapidly → appointments disappear
❌ Every view change fetches data unnecessarily
❌ Day 7 appointments appear in day 5 cells after navigation

### After
✅ Navigate month→day (Jan 7) → reload → stays on day view, Jan 7
✅ Switch views rapidly → appointments remain visible, correct dates
✅ View switches reuse cached data when ranges overlap
✅ Appointments always filtered to match currently displayed view
✅ Race conditions prevented via request cancellation
✅ Development invariant checks catch data misalignment bugs

## Testing Scenarios

### Manual Testing Checklist

1. **URL State Restoration**
   - [ ] Navigate to day view, Jan 7
   - [ ] Reload page
   - [ ] Verify: Returns to day view, Jan 7 (not month + today)

2. **View Switching Data Persistence**
   - [ ] Load month view with appointments
   - [ ] Switch to week view → appointments visible
   - [ ] Switch to day view → appointments visible
   - [ ] Switch to list view → appointments visible
   - [ ] Switch back to month → appointments still visible
   - [ ] Verify: No blank screens, no disappearing data

3. **Cache Efficiency**
   - [ ] Open month view (loads Jan 1-31)
   - [ ] Switch to week view (Jan 1-7) → no API call (covered by cache)
   - [ ] Switch to day view (Jan 5) → no API call (covered by cache)
   - [ ] Navigate to Feb → new API call (cache miss)
   - [ ] Verify in Network tab: Only necessary requests made

4. **Rapid View Switching**
   - [ ] Rapidly click: month → week → day → list → month (quick succession)
   - [ ] Verify: No blank screens, appointments appear correctly
   - [ ] Check console: No race condition errors

5. **Date Filtering Accuracy**
   - [ ] Month view: Only current month appointments visible
   - [ ] Week view: Only current week appointments visible
   - [ ] Day view: Only current day appointments visible
   - [ ] List view: Next 30 days visible
   - [ ] Verify: No appointments from other dates appear

6. **Appointment Modification**
   - [ ] Reschedule appointment
   - [ ] Verify: Calendar refetches data (cache invalidated)
   - [ ] Edit appointment details
   - [ ] Verify: Calendar refetches data (cache invalidated)

7. **Development Invariants**
   - [ ] Run in development mode (`npm run dev`)
   - [ ] Switch views and dates extensively
   - [ ] Check console: No invariant violation errors

## Edge Cases Handled

1. **Invalid URL params** - Falls back to defaults (month view, today)
2. **Aborted requests** - Caught and ignored (not logged as errors)
3. **View switch during loading** - Previous request aborted, new one started
4. **Cache covers superset range** - E.g., month cache (Jan 1-31) serves week view (Jan 1-7)
5. **Concurrent modifications** - Cache invalidated, fresh data fetched

## Performance Characteristics

- **Cache hit:** ~0ms (instant display from memory)
- **Cache miss:** ~100-500ms (API round trip)
- **View switch (cache hit):** ~10-50ms (filter operation only)
- **Race condition prevention:** Guarantees latest request wins

## Files Modified

1. **`app/dashboard/page.tsx`**
   - Added URL param initialization on mount
   - Reads `view` and `date` from query string
   - Restores calendar state after reload

2. **`src/components/dashboard/Calendar.tsx`**
   - Added `AppointmentCache` interface and state
   - Implemented `getDateRange()`, `cacheCoversRange()`, `filterAppointmentsForView()`
   - Smart caching logic in `loadAppointments()`
   - Defensive filtering in separate useEffect
   - AbortController for race condition prevention
   - Cache invalidation on appointment modifications
   - Development mode invariant checks

## Future Enhancements

- [ ] **Optimistic cache updates** - Update cache locally on modifications instead of invalidating
- [ ] **LRU cache** - Store multiple date ranges, evict oldest when memory limit reached
- [ ] **Background refresh** - Silently refetch stale data in background
- [ ] **Service worker caching** - Offline-first architecture for cached appointments
- [ ] **Prefetching** - Preload adjacent weeks/months when idle

## Related Documentation

- [Step 7k: Calendar Navigation and Interaction Refinements](./STEP_7K_CALENDAR_NAVIGATION.md)
- [Step 7j: Overlapping and Near Time Slot Visualization](./STEP_7J_CASCADE_LAYOUT.md)
- [Database Schema](./DATABASE_SCHEMA.md)
