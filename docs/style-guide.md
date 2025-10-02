# Rivo Design System & Style Guide

## Design Philosophy

**Functional Minimalism** - Every element serves a purpose. No decoration for decoration's sake. The interface gets out of the way and lets users focus on their work.

### Core Principles

1. **Breathing Room First** - Generous whitespace is not wasted space
2. **Hierarchy Through Typography** - Size and weight create structure, not boxes and borders
3. **Intentional Color** - Brand colors (teal/green) used sparingly for emphasis and identity
4. **Subtle Depth** - Minimal shadows, prefer borders and backdrop blur
5. **Confident Simplicity** - Clean, bold, unafraid of white space

---

## Layout Architecture

### Sidebar Navigation (80px fixed width)
- Icon-only navigation for maximum content space
- Tooltips on hover (dark background, positioned right)
- Active state: gray background fill
- Hover state: lighter gray background
- Logo at top, user profile at bottom

**Spacing:**
- Vertical padding: 24px (py-6)
- Icon size: 24px (w-6 h-6)
- Button height: 56px (h-14)
- Gap between buttons: 8px (gap-2)

### Main Content Area
- Left margin: 80px (sidebar width)
- Horizontal padding: 48px (px-12)
- Vertical padding: 32px (py-8)
- Maximum content width: unrestricted (full viewport minus sidebar)

### Top Bar (Sticky Header)
- Height: auto (padding-based)
- Background: white/95 with backdrop blur
- Border: bottom, gray-200/60
- Padding: 48px horizontal, 20px vertical

---

## Typography

### System Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
letter-spacing: -0.011em;
```

### Type Scale

**Display Heading** (Page title in header)
- Size: 30px (text-3xl)
- Weight: Bold (font-bold)
- Tracking: Tight (tracking-tight)
- Usage: Main business name, primary page identifier

**Section Heading** (Calendar month/year)
- Size: 24px (text-2xl)
- Weight: Bold (font-bold)
- Usage: Date display, section headers

**Body Large** (Buttons, labels)
- Size: 14px (text-sm)
- Weight: Semibold (font-semibold)
- Usage: Primary actions, navigation items

**Body Regular** (Status text, metadata)
- Size: 14px (text-sm)
- Weight: Normal
- Color: Gray-500
- Usage: Secondary information, status indicators

---

## Color System

### Brand Colors (Strategic Use Only)

**Teal to Green Gradient**
```
from-teal-500 to-green-500  → Logo, profile avatar
from-teal-600 to-green-600  → Primary CTA button
```

Use ONLY for:
- Brand identity elements (logo)
- Primary call-to-action buttons
- User avatar/profile
- Active indicators (connected status dot)

### Neutral Palette

**Backgrounds:**
- `bg-white` - Main canvas, cards, sidebar
- `bg-gray-50` - Active state in sidebar navigation
- `bg-gray-100` - Button group container (segmented controls)

**Borders:**
- `border-gray-200/60` - Primary borders (subtle)
- `border-gray-100` - Dividers within cards

**Text:**
- `text-gray-900` - Primary text, headings
- `text-gray-700` - Interactive elements (hover state)
- `text-gray-500` - Secondary text, metadata
- `text-gray-400` - Inactive icons

**Interactive States:**
- Inactive: `text-gray-400`
- Hover: `text-gray-900` + `bg-gray-50`
- Active: `text-gray-900` + `bg-gray-50`

### Accent Colors

**Success/Active:** `bg-green-500` (status dots)
**Inactive:** `bg-gray-400` (status dots)
**Teal Accent:** `text-teal-600` (Today button, subtle CTAs)

---

## Components

### Sidebar Navigation Button
```tsx
// Inactive state
className="w-full h-14 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all relative group"

// Active state
className="w-full h-14 flex items-center justify-center rounded-xl bg-gray-50 text-gray-900 relative group"
```

### Tooltip (on sidebar hover)
```tsx
className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap"
```

### Primary Button (CTA)
```tsx
className="px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
```

**Properties:**
- Gradient background (brand colors)
- Rounded-2xl (16px border radius)
- Hover: slight scale up (1.02) + shadow
- Disabled: 50% opacity
- Icon + text layout with 8px gap

### Secondary Button (Today, subtle actions)
```tsx
className="px-5 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
```

### Segmented Control (View switcher)
```tsx
// Container
className="flex gap-1 bg-gray-100 p-1 rounded-2xl"

// Active segment
className="px-6 py-2 rounded-xl text-sm font-semibold bg-white text-gray-900 shadow-sm transition-all"

// Inactive segment
className="px-6 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-900 transition-all"
```

### Icon Button (Navigation arrows)
```tsx
className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all"
```

### Status Indicator
```tsx
<div className="flex items-center gap-2">
  <div className="w-2 h-2 rounded-full bg-green-500" />
  <span className="text-sm text-gray-500">Connected</span>
</div>
```

### Profile Avatar
```tsx
className="w-10 h-10 bg-gradient-to-br from-teal-500 to-green-500 rounded-full flex items-center justify-center"
```

### Dropdown Menu
```tsx
// Container
className="absolute left-full bottom-0 ml-4 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all"

// Header section
className="p-5 border-b border-gray-100"

// Menu item
className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
```

---

## Spacing System

### Consistent Rhythm
- 4px base unit
- Standard gaps: 8px, 12px, 16px, 24px, 32px, 48px

### Common Patterns
```
gap-1  = 4px   → Segmented control items
gap-2  = 8px   → Icon + text, sidebar nav buttons
gap-3  = 12px  → Form elements
gap-4  = 16px  → Date navigation controls

p-1   = 4px   → Segmented control container
p-2   = 8px   → Dropdown menu actions section
py-3  = 12px  → Menu items vertical
px-4  = 16px  → Menu items horizontal
p-5   = 20px  → Dropdown header
py-6  = 24px  → Sidebar vertical padding
py-8  = 32px  → Main content vertical
px-12 = 48px  → Main content horizontal
```

---

## Border Radius

**Hierarchy of roundness:**
- `rounded-lg` (8px) - Tooltips, small buttons
- `rounded-xl` (12px) - Standard buttons, segments, dropdowns
- `rounded-2xl` (16px) - Logo, primary CTA, menus, segmented control container
- `rounded-full` - Avatars, icon buttons, status dots

---

## Shadows

**Minimal approach** - Use sparingly

```
shadow-sm      → Logo, primary button default state
shadow-lg      → Primary button hover state
shadow-2xl     → Dropdown menus
```

Most elements use borders instead of shadows for definition.

---

## Effects & Transitions

### Backdrop Blur
```tsx
className="bg-white/95 backdrop-blur-sm"
```
Used on sticky header for depth without heaviness.

### Standard Transition
```tsx
className="transition-all"
```
Applied to all interactive elements for smooth state changes.

### Hover Scale
```tsx
className="hover:scale-[1.02]"
```
Only on primary CTA button for emphasis.

### Opacity for Visibility
```tsx
className="opacity-0 invisible group-hover:opacity-100 group-hover:visible"
```
Used for tooltips and dropdowns - combine opacity with visibility for proper animation.

---

## Icons

**Source:** Heroicons (outline style)
**Default size:** 24px (w-6 h-6) for navigation
**Button icons:** 20px (w-5 h-5) for CTA buttons
**Stroke width:** 1.5 (standard), 2 (emphasis)

---

## Responsive Behavior

### Sidebar
- Fixed width: 80px (no collapse on mobile in current implementation)
- Consider adding mobile menu for smaller screens

### Main Content
- Padding scales down on mobile
- Segmented controls may need to stack vertically

---

## Dos and Don'ts

### DO:
✓ Use whitespace generously
✓ Keep brand gradient for logo, primary CTA, and avatar only
✓ Use gray scale for 90% of the interface
✓ Prefer bold typography over boxes for hierarchy
✓ Use subtle borders (gray-200/60) for definition
✓ Round corners consistently (xl for most UI, 2xl for emphasis)

### DON'T:
✗ Add unnecessary borders or backgrounds
✗ Use brand colors for every interactive element
✗ Create visual noise with multiple shadow depths
✗ Over-animate interactions
✗ Use emojis or decorative icons
✗ Add gradients to large background areas

---

## Implementation Notes

### Sticky Elements
```tsx
className="sticky top-0 z-30"  // Header
className="fixed left-0 top-0 z-50"  // Sidebar
```

### Z-Index Scale
- 50: Sidebar (fixed position)
- 40: Modals
- 30: Sticky header
- 20: Dropdowns
- 10: Overlays

---

## Style Name

**"Functional Minimalism with Intentional Color"**

Alternative descriptions:
- Clean workspace aesthetic
- Sidebar-first app layout
- Icon navigation pattern
- Breathable dashboard design
- Professional minimal interface
