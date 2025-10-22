# Dashboard i18n + Responsiveness + UX Improvements Plan

## Context
Update the `/dashboard` with internationalization (i18n) on each component and modal, improve responsiveness across all devices, and enhance overall UX following the Rivo design system (teal/green palette, minimal Apple-like aesthetic, functional minimalism).

## Current State
- Dashboard main page: `app/[locale]/dashboard/page.tsx`
- Dashboard components: `src/components/dashboard/*.tsx`
- Translation files: `messages/{en,es,it}.json`
- Some components already use `useTranslations()` but many have hardcoded strings
- Desktop-first layout with fixed sidebar
- Limited mobile optimization
- Existing skeleton loaders and transitions

## Goals
1. **Complete i18n coverage** - Every user-facing string translated in EN, ES, IT
2. **Mobile responsiveness** - Optimized for phones, tablets, desktops
3. **Enhanced UX** - Better loading states, transitions, touch interactions, accessibility

---

## Phase 1: i18n Implementation

### Step 1: Audit All Components for Hardcoded Strings
**Goal:** Create inventory of all strings needing translation

**Files to audit:**
- `src/components/dashboard/Calendar.tsx` - Month/week/day/list views, empty states, error messages
- `src/components/dashboard/CreateAppointmentModal.tsx` - Wizard steps, form labels, validation messages
- `src/components/dashboard/AppointmentCard.tsx` - Status labels, action buttons, tooltips
- `src/components/dashboard/AppointmentEditModal.tsx` - Form fields, time picker, status options
- `src/components/dashboard/DragDropRescheduleModal.tsx` - Confirmation dialog, warning messages
- `src/components/dashboard/RescheduleAppointmentModal.tsx` - Slot selection, date picker, availability messages
- `src/components/dashboard/NotificationCenter.tsx` - Notification types, timestamps, actions
- `src/components/dashboard/BusinessSelector.tsx` - Dropdown labels, loading/empty states
- `src/components/dashboard/OnboardingTutorial.tsx` - Tutorial steps, tooltips
- `src/components/dashboard/RescheduleConfirmationModal.tsx` - Confirmation messages

**Deliverable:** List of all hardcoded strings organized by component

---

### Step 2: Update messages/en.json
**Goal:** Add complete English translations for dashboard

**Translation structure to add:**
```json
{
  "dashboard": {
    "navigation": { ... }, // Already exists
    "header": { ... }, // Already exists
    "calendar": {
      "views": {
        "month": "Month",
        "week": "Week",
        "day": "Day",
        "list": "List"
      },
      "emptyStates": {
        "noAppointments": "No appointments",
        "noAppointmentsForDay": "No appointments for this day",
        "noAppointmentsForWeek": "No appointments this week",
        "noAppointmentsForMonth": "No appointments this month"
      },
      "loading": {
        "appointments": "Loading appointments...",
        "slots": "Loading available slots..."
      },
      "errors": {
        "loadFailed": "Failed to load appointments",
        "rescheduleFailed": "Failed to reschedule appointment",
        "deleteFailed": "Failed to delete appointment"
      },
      "actions": {
        "dragToReschedule": "Drag to reschedule",
        "clickToEdit": "Click to edit",
        "viewDetails": "View details"
      }
    },
    "createAppointment": {
      "title": "Create Appointment",
      "steps": {
        "category": "Select Category",
        "service": "Select Service",
        "datetime": "Choose Date & Time",
        "customer": "Customer Details"
      },
      "form": {
        "selectCategory": "Choose a category",
        "selectService": "Choose a service",
        "selectDate": "Select date",
        "selectTime": "Select time",
        "customerName": "Customer name",
        "customerEmail": "Email address",
        "customerPhone": "Phone number",
        "notes": "Notes (optional)",
        "notesPlaceholder": "Add any special notes..."
      },
      "buttons": {
        "back": "Back",
        "next": "Next",
        "create": "Create Appointment",
        "cancel": "Cancel"
      },
      "validation": {
        "categoryRequired": "Please select a category",
        "serviceRequired": "Please select a service",
        "dateRequired": "Please select a date",
        "timeRequired": "Please select a time slot",
        "nameRequired": "Customer name is required",
        "emailRequired": "Email address is required",
        "emailInvalid": "Please enter a valid email",
        "phoneRequired": "Phone number is required"
      },
      "success": "Appointment created successfully",
      "error": "Failed to create appointment"
    },
    "appointmentCard": {
      "status": {
        "confirmed": "Confirmed",
        "cancelled": "Cancelled",
        "completed": "Completed",
        "no_show": "No Show",
        "pending": "Pending"
      },
      "actions": {
        "edit": "Edit",
        "reschedule": "Reschedule",
        "cancel": "Cancel",
        "markCompleted": "Mark as Completed",
        "markNoShow": "Mark as No Show"
      },
      "duration": "{{duration}} min",
      "price": "{{price}}",
      "customer": "Customer",
      "service": "Service",
      "time": "Time",
      "notes": "Notes"
    },
    "editAppointment": {
      "title": "Edit Appointment",
      "form": {
        "date": "Date",
        "time": "Time",
        "service": "Service",
        "status": "Status",
        "customerName": "Customer Name",
        "customerEmail": "Email",
        "customerPhone": "Phone",
        "notes": "Notes",
        "notifyCustomer": "Notify customer of changes"
      },
      "buttons": {
        "save": "Save Changes",
        "delete": "Delete Appointment",
        "cancel": "Cancel"
      },
      "confirmDelete": {
        "title": "Delete Appointment?",
        "message": "This action cannot be undone. The customer will be notified of the cancellation.",
        "confirm": "Delete",
        "cancel": "Keep Appointment"
      },
      "success": "Appointment updated successfully",
      "error": "Failed to update appointment"
    },
    "reschedule": {
      "title": "Reschedule Appointment",
      "dragDrop": {
        "title": "Confirm Reschedule",
        "message": "Move appointment from {{oldTime}} to {{newTime}}?",
        "sameTime": "Appointment is already at this time",
        "notifyCustomer": "Notify customer of change",
        "confirm": "Confirm",
        "cancel": "Cancel"
      },
      "modal": {
        "selectDate": "Select new date",
        "selectTime": "Select new time",
        "noSlotsAvailable": "No available slots for this date",
        "loading": "Checking availability..."
      },
      "success": "Appointment rescheduled successfully",
      "error": "Failed to reschedule appointment"
    },
    "notifications": {
      "title": "Notifications",
      "markAllRead": "Mark all as read",
      "empty": "No notifications",
      "types": {
        "booking_created": "New Booking",
        "booking_cancelled": "Booking Cancelled",
        "booking_rescheduled": "Booking Rescheduled",
        "booking_completed": "Booking Completed",
        "booking_no_show": "No Show"
      },
      "timeAgo": {
        "justNow": "Just now",
        "minutesAgo": "{{count}}m ago",
        "hoursAgo": "{{count}}h ago",
        "daysAgo": "{{count}}d ago"
      }
    },
    "businessSelector": {
      "label": "Select Business",
      "loading": "Loading businesses...",
      "empty": "No businesses found",
      "current": "Current business"
    },
    "loading": {
      "loadingAppointments": "Loading appointments...",
      "loadingBusiness": "Loading {{businessName}}...",
      "switching": "Switching business..."
    },
    "errors": {
      "genericError": "Something went wrong. Please try again.",
      "networkError": "Connection error. Check your internet.",
      "notFound": "Resource not found",
      "unauthorized": "You don't have permission to do this"
    }
  }
}
```

**Acceptance:** All English strings documented and added to messages/en.json

---

### Step 3: Update messages/es.json
**Goal:** Add complete Spanish translations

**Key translations:**
- Calendar views: "Mes", "Semana", "Día", "Lista"
- Appointment statuses: "Confirmado", "Cancelado", "Completado", "No asistió", "Pendiente"
- Actions: "Editar", "Reprogramar", "Cancelar", "Crear cita"
- Form labels: "Nombre del cliente", "Correo electrónico", "Teléfono", "Notas"
- Validation: "Campo requerido", "Correo inválido"
- Time relative: "Hace {{count}} minutos", "Hace {{count}} horas"

**Acceptance:** Complete Spanish translation matching en.json structure

---

### Step 4: Update messages/it.json
**Goal:** Add complete Italian translations

**Key translations:**
- Calendar views: "Mese", "Settimana", "Giorno", "Lista"
- Appointment statuses: "Confermato", "Annullato", "Completato", "Assente", "In attesa"
- Actions: "Modifica", "Riprogramma", "Annulla", "Crea appuntamento"
- Form labels: "Nome cliente", "Email", "Telefono", "Note"
- Validation: "Campo obbligatorio", "Email non valida"
- Time relative: "{{count}} minuti fa", "{{count}} ore fa"

**Acceptance:** Complete Italian translation matching en.json structure

---

### Step 5: Add i18n to Calendar Component
**File:** `src/components/dashboard/Calendar.tsx`

**Changes:**
1. Import `useTranslations` from 'next-intl'
2. Add hook: `const t = useTranslations('dashboard.calendar')`
3. Replace hardcoded strings:
   - Empty state messages
   - Error messages in toast notifications
   - Loading states
   - Day/month names (use `toLocaleDateString(locale)`)
4. Update error handling to use translated messages:
   ```typescript
   showToast({
     type: 'error',
     message: t('errors.loadFailed')
   });
   ```

**Acceptance:** All user-facing strings in Calendar use translations, no hardcoded English

---

### Step 6: Add i18n to CreateAppointmentModal
**File:** `src/components/dashboard/CreateAppointmentModal.tsx`

**Changes:**
1. Add `const t = useTranslations('dashboard.createAppointment')`
2. Translate wizard step titles
3. Translate all form labels and placeholders
4. Translate validation error messages
5. Translate button labels
6. Translate success/error toast messages
7. Add locale-aware date/time formatting
8. Update currency display to respect locale

**Example:**
```typescript
<label className="...">{t('form.customerName')}</label>
<input
  placeholder={t('form.notesPlaceholder')}
  ...
/>
```

**Acceptance:** Complete modal in user's language, proper date/currency formatting

---

### Step 7: Add i18n to AppointmentCard
**File:** `src/components/dashboard/AppointmentCard.tsx`

**Changes:**
1. Add `const t = useTranslations('dashboard.appointmentCard')`
2. Translate status badges: `t('status.' + appointment.status)`
3. Translate action button labels and tooltips
4. Translate duration display
5. Use locale-aware time formatting
6. Translate customer/service labels

**Acceptance:** All appointment card text translated, times formatted per locale

---

### Step 8: Add i18n to AppointmentEditModal
**File:** `src/components/dashboard/AppointmentEditModal.tsx`

**Changes:**
1. Add `const t = useTranslations('dashboard.editAppointment')`
2. Translate modal title and form labels
3. Translate status dropdown options
4. Translate delete confirmation dialog
5. Translate checkbox "Notify customer"
6. Translate button labels
7. Translate success/error messages

**Acceptance:** Edit modal fully translated with confirmation dialog

---

### Step 9: Add i18n to Reschedule Modals
**Files:**
- `src/components/dashboard/DragDropRescheduleModal.tsx`
- `src/components/dashboard/RescheduleAppointmentModal.tsx`
- `src/components/dashboard/RescheduleConfirmationModal.tsx`

**Changes:**
1. Add `const t = useTranslations('dashboard.reschedule')`
2. Translate confirmation messages with time interpolation
3. Translate "same time" detection message
4. Translate slot availability messages
5. Translate loading states
6. Use locale-aware time formatting in confirmation

**Example:**
```typescript
{t('dragDrop.message', {
  oldTime: formatTime(originalTime, locale),
  newTime: formatTime(newTime, locale)
})}
```

**Acceptance:** Reschedule flow fully translated with correct time formats

---

### Step 10: Add i18n to NotificationCenter
**File:** `src/components/dashboard/NotificationCenter.tsx`

**Changes:**
1. Add `const t = useTranslations('dashboard.notifications')`
2. Translate notification type labels
3. Translate relative time ("2h ago", "5m ago")
4. Translate "Mark all as read" action
5. Translate empty state message
6. Use `Intl.RelativeTimeFormat` for relative times

**Example:**
```typescript
const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
const relativeTime = rtf.format(-2, 'hour'); // "2 hours ago"
```

**Acceptance:** Notifications display in user's language with proper relative times

---

### Step 11: Add i18n to BusinessSelector
**File:** `src/components/dashboard/BusinessSelector.tsx`

**Changes:**
1. Add `const t = useTranslations('dashboard.businessSelector')`
2. Translate dropdown label
3. Translate loading state
4. Translate empty state
5. Keep business names unchanged (from database)

**Acceptance:** Business selector UI translated, business names preserved

---

### Step 12: Add i18n to OnboardingTutorial
**File:** `src/components/dashboard/OnboardingTutorial.tsx`

**Changes:**
1. Add `const t = useTranslations('dashboard.onboarding')`
2. Add onboarding translations to messages/*.json
3. Translate tutorial step titles and descriptions
4. Translate button labels ("Next", "Skip", "Get Started")
5. Translate progress indicators

**New translation keys:**
```json
"onboarding": {
  "welcome": "Welcome to Rivo",
  "step1": { "title": "...", "description": "..." },
  "buttons": { "next": "Next", "skip": "Skip", "done": "Get Started" }
}
```

**Acceptance:** Onboarding tutorial available in all three languages

---

## Phase 2: Mobile Responsiveness

### Step 13: Make Sidebar Responsive
**File:** `app/[locale]/dashboard/page.tsx` (lines 69-167)

**Current state:** Fixed 80px sidebar always visible

**Changes:**
1. Add mobile hamburger menu button in header (visible on `md:hidden`)
2. Make sidebar slide-in overlay on mobile: `fixed inset-y-0 left-0 transform -translate-x-full md:translate-x-0 transition-transform`
3. Add backdrop overlay when mobile menu open
4. Keep desktop behavior unchanged (always visible)
5. Add touch-friendly close button in mobile sidebar
6. Increase touch targets to minimum 48x48px on mobile

**Breakpoints:**
- Mobile: `< 768px` - Hamburger menu, slide-in sidebar
- Tablet/Desktop: `>= 768px` - Fixed sidebar visible

**Example:**
```typescript
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

// In header
<button
  className="md:hidden w-10 h-10 flex items-center justify-center"
  onClick={() => setMobileMenuOpen(true)}
>
  <MenuIcon />
</button>

// Sidebar
<aside className={`
  fixed left-0 top-0 h-full w-64 bg-white z-50
  transform transition-transform duration-300
  ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
  md:w-20 md:translate-x-0
`}>
```

**Acceptance:** Sidebar accessible via hamburger on mobile, always visible on desktop

---

### Step 14: Make Dashboard Header Responsive
**File:** `app/[locale]/dashboard/page.tsx` (lines 172-209)

**Current state:** Horizontal layout with business selector and button

**Changes:**
1. Stack header elements on mobile:
   ```css
   flex-col gap-3 md:flex-row md:gap-8
   ```
2. Make "New Appointment" button full-width on mobile:
   ```css
   w-full md:w-auto
   ```
3. Reduce padding on mobile: `px-4 py-3 md:px-12 md:py-5`
4. Make business selector full-width on mobile
5. Adjust logo size on mobile: `scale-50 md:scale-75`

**Acceptance:** Header stacks vertically on mobile, horizontal on desktop

---

### Step 15: Make Calendar Controls Responsive
**File:** `app/[locale]/dashboard/page.tsx` (lines 214-310)

**Current state:** Horizontal layout with date navigation and view selector

**Changes:**
1. Stack controls on small screens:
   ```css
   flex-col gap-4 md:flex-row md:justify-between
   ```
2. Date navigation compact on mobile:
   - Smaller buttons (w-8 h-8 on mobile, w-10 h-10 on desktop)
   - Shorter month display
3. View selector full-width on mobile with smaller buttons:
   ```css
   w-full md:w-auto
   grid grid-cols-4 gap-1 md:flex
   ```
4. Reduce month name font size: `text-lg md:text-2xl`

**Acceptance:** Controls stack on mobile, all interactive elements easily tappable

---

### Step 16: Make Calendar Views Responsive
**File:** `src/components/dashboard/Calendar.tsx`

**Month View Changes:**
- Reduce cell height on mobile: `h-20 md:h-24 lg:h-28`
- Show only day number on mobile, full info on desktop
- Appointment cards smaller on mobile with truncated text
- Enable horizontal scroll for wide months if needed

**Week View Changes:**
- Switch to vertical scroll on mobile (not horizontal)
- Show fewer hours visible at once (8am-6pm default)
- Larger time labels for touch
- Stack day columns on mobile (one day at a time with swipe)

**Day View Changes:**
- Full-width on mobile
- Larger time slots (easier to tap)
- Appointment details in expandable cards instead of inline

**List View Changes:**
- Already responsive, but improve card spacing on mobile
- Larger touch targets for actions
- Swipe-to-reveal actions on mobile

**Breakpoints:**
```css
/* Mobile: compact layout */
h-16 text-sm

/* Tablet: medium layout */
md:h-20 md:text-base

/* Desktop: full layout */
lg:h-24 lg:text-base
```

**Acceptance:** All calendar views usable and readable on mobile without horizontal scroll

---

### Step 17: Make All Modals Responsive

**Files to update:**
- `src/components/dashboard/CreateAppointmentModal.tsx`
- `src/components/dashboard/AppointmentEditModal.tsx`
- `src/components/dashboard/RescheduleAppointmentModal.tsx`
- `src/components/dashboard/DragDropRescheduleModal.tsx`

**Changes:**
1. Full-screen on mobile, centered dialog on desktop:
   ```css
   fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
   w-full h-full md:w-auto md:h-auto md:max-w-2xl md:max-h-[90vh]
   ```
2. Adjust padding: `p-4 md:p-6`
3. Make form inputs larger on mobile (easier to tap)
4. Stack buttons vertically on mobile:
   ```css
   flex-col gap-2 md:flex-row md:gap-4
   ```
5. Add sticky header/footer on mobile for long forms
6. Time slot grid: 2 columns on mobile, 3-4 on desktop

**Example:**
```typescript
<div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
  {/* Backdrop */}
  <div className="fixed inset-0 bg-black/50" onClick={onClose} />

  {/* Modal */}
  <div className="relative w-full h-[95vh] md:h-auto md:max-w-2xl bg-white rounded-t-3xl md:rounded-2xl">
    {/* Content */}
  </div>
</div>
```

**Acceptance:** Modals full-screen on mobile (slide up from bottom), centered dialog on desktop

---

## Phase 3: UX Enhancements

### Step 18: Enhance Touch Interactions

**Changes across all components:**

1. **Minimum touch target size:** 48x48px (WCAG AAA)
   ```css
   min-h-[48px] min-w-[48px]
   ```

2. **Larger tap areas for small icons:**
   ```css
   p-3 /* Icon gets padding to reach 48px */
   ```

3. **Add hover/active states for touch:**
   ```css
   active:scale-95 active:bg-gray-100
   ```

4. **Swipe gestures on calendar:**
   - Add swipe left/right to navigate days/weeks/months
   - Use `react-swipeable` or implement touch events
   - Visual feedback during swipe

5. **Long-press for context menu on appointments:**
   - Hold appointment card to show actions menu
   - Alternative to hover tooltips on mobile

6. **Pull-to-refresh on calendar:**
   - Pull down to refresh appointments
   - Visual indicator with spinner

**Implementation example:**
```typescript
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => navigateNext(),
  onSwipedRight: () => navigatePrevious(),
  trackMouse: false // Only on touch
});

<div {...handlers} className="...">
  {/* Calendar content */}
</div>
```

**Acceptance:** All interactive elements easy to tap, swipe gestures work naturally

---

### Step 19: Improve Loading States and Transitions

**Current state:** Skeleton loaders exist in `src/components/dashboard/skeletons/`

**Enhancements:**

1. **Consistent loading states:**
   - Use existing skeletons (MonthSkeleton, DaySkeleton, ListSkeleton)
   - Add skeleton for modals while loading data
   - Show spinner for short operations (<2s), skeleton for longer

2. **Smooth transitions:**
   - Already implemented in ViewTransition component
   - Ensure consistent 200-300ms transitions
   - Add loading shimmer effect on skeletons

3. **Optimistic UI updates:**
   - Show immediate feedback on actions
   - Update UI before API confirms
   - Rollback gracefully on error

4. **Progress indicators:**
   - Show progress in multi-step modals (CreateAppointmentModal)
   - Visual progress bar: "Step 2 of 4"

5. **Empty states:**
   - Friendly messages with illustrations
   - Clear call-to-action
   - Already exists in calendar, ensure consistency

**Acceptance:** Loading states clear and consistent, transitions smooth, no jarring UI changes

---

### Step 20: Test Across Devices

**Testing checklist:**

**Mobile (320px - 767px):**
- [ ] iPhone SE (375x667) - smallest modern phone
- [ ] iPhone 12/13/14 (390x844) - standard
- [ ] iPhone 14 Pro Max (430x932) - largest
- [ ] Android (360x740) - average
- [ ] All text readable without zoom
- [ ] All buttons easily tappable
- [ ] No horizontal scroll
- [ ] Modals fully usable
- [ ] Calendar views functional

**Tablet (768px - 1023px):**
- [ ] iPad (768x1024) portrait
- [ ] iPad (1024x768) landscape
- [ ] iPad Pro (834x1194)
- [ ] Sidebar behavior correct
- [ ] Calendar shows appropriate detail
- [ ] Two-column layouts work

**Desktop (1024px+):**
- [ ] Laptop (1366x768)
- [ ] Desktop (1920x1080)
- [ ] Wide screen (2560x1440)
- [ ] All features visible
- [ ] Optimal use of space
- [ ] No awkward stretching

**Browsers:**
- [ ] Safari (iOS/macOS)
- [ ] Chrome (desktop/mobile)
- [ ] Firefox
- [ ] Edge

**Interactions:**
- [ ] Touch gestures work on mobile
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Forms submit properly
- [ ] Drag-and-drop works on desktop/tablet

**Performance:**
- [ ] First paint < 1.5s on 3G
- [ ] Smooth 60fps animations
- [ ] No layout shift (CLS < 0.1)
- [ ] No memory leaks

**Acceptance:** Dashboard fully functional on all tested devices and browsers

---

## Implementation Order

### Priority 1: Core i18n (Do First)
1. Step 2: Update messages/en.json
2. Step 3: Update messages/es.json
3. Step 4: Update messages/it.json
4. Step 5: Calendar i18n
5. Step 6: CreateAppointmentModal i18n
6. Step 7: AppointmentCard i18n

### Priority 2: Mobile Responsiveness
7. Step 13: Sidebar responsive
8. Step 14: Header responsive
9. Step 15: Controls responsive
10. Step 16: Calendar views responsive
11. Step 17: Modals responsive

### Priority 3: Remaining i18n
12. Step 8: Edit modal i18n
13. Step 9: Reschedule modals i18n
14. Step 10: NotificationCenter i18n
15. Step 11: BusinessSelector i18n
16. Step 12: Onboarding i18n

### Priority 4: UX Polish
17. Step 18: Touch interactions
18. Step 19: Loading states
19. Step 20: Testing

---

## Success Criteria

**i18n:**
- [ ] Zero hardcoded English strings in dashboard
- [ ] All three languages (EN/ES/IT) complete
- [ ] Date/time formatted per locale
- [ ] Currency formatted per locale
- [ ] Pluralization rules correct
- [ ] RTL support (future) possible

**Responsiveness:**
- [ ] No horizontal scroll on any viewport
- [ ] All interactive elements min 48x48px on mobile
- [ ] Text readable without zooming
- [ ] Modals fully usable on small screens
- [ ] Calendar functional on all devices

**UX:**
- [ ] Loading states clear and consistent
- [ ] Transitions smooth (60fps)
- [ ] Error messages helpful and translated
- [ ] Empty states with clear CTAs
- [ ] Keyboard navigation works
- [ ] Screen reader accessible

**Performance:**
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] First Input Delay < 100ms

---

## Technical Notes

### Tailwind Breakpoints
```
sm: 640px   // Small phones landscape
md: 768px   // Tablets portrait
lg: 1024px  // Tablets landscape / small laptops
xl: 1280px  // Desktop
2xl: 1536px // Large desktop
```

### Design System References
- Colors: Teal (primary) + Green (secondary)
- Font: System UI stack / Inter
- Border radius: 2xl (16px) for cards, xl (12px) for buttons
- Shadows: Subtle, minimal
- Spacing: 4px grid (gap-2, gap-4, gap-6, gap-8)

### Key Libraries
- `next-intl` for i18n
- `tailwindcss` for responsive design
- `react-swipeable` for touch gestures (if needed)
- `framer-motion` for animations (if needed)

---

## Potential Gotchas

1. **Date formatting:** Ensure consistent locale usage across all date/time displays
2. **Currency:** Load from business config, respect locale formatting
3. **Timezones:** Already handled in backend, display in business timezone
4. **Touch conflicts:** Drag-and-drop may conflict with scroll on mobile - disable drag on touch devices
5. **Modal stacking:** Multiple modals may need z-index management
6. **Performance:** Large month views with many appointments may need virtualization
7. **Browser support:** Safari date inputs need polyfill or custom picker

---

## Files to Modify Summary

**Translation files (3):**
- `messages/en.json`
- `messages/es.json`
- `messages/it.json`

**Components (12):**
- `src/components/dashboard/Calendar.tsx`
- `src/components/dashboard/CreateAppointmentModal.tsx`
- `src/components/dashboard/AppointmentCard.tsx`
- `src/components/dashboard/AppointmentEditModal.tsx`
- `src/components/dashboard/DragDropRescheduleModal.tsx`
- `src/components/dashboard/RescheduleAppointmentModal.tsx`
- `src/components/dashboard/RescheduleConfirmationModal.tsx`
- `src/components/dashboard/NotificationCenter.tsx`
- `src/components/dashboard/BusinessSelector.tsx`
- `src/components/dashboard/OnboardingTutorial.tsx`
- `app/[locale]/dashboard/page.tsx` (main layout)
- `app/[locale]/dashboard/settings/page.tsx` (if needed)

**Utilities (potential new files):**
- `src/lib/i18n-utils.ts` (helper functions for date/time formatting)
- `src/hooks/useSwipe.ts` (custom hook for swipe gestures)

---

## Questions to Resolve Before Starting

1. Do we need Arabic (RTL) support in the future?
2. Should drag-and-drop be disabled on mobile entirely?
3. What's the minimum supported iOS/Android version?
4. Are there specific accessibility requirements beyond WCAG AA?
5. Should we add Portuguese or French translations?

---

## Estimated Effort

- i18n implementation: 6-8 hours
- Mobile responsiveness: 8-10 hours
- UX enhancements: 4-6 hours
- Testing and bug fixes: 4-6 hours
- **Total: 22-30 hours** (3-4 days)

---

## After Completion

**Documentation to update:**
- Update README with supported languages
- Add responsive design guidelines to docs
- Document mobile-specific behaviors
- Create translation contribution guide

**Future improvements:**
- Add more languages (FR, DE, PT)
- Add keyboard shortcuts documentation
- Implement dark mode toggle (if business branding allows)
- Add accessibility statement page
