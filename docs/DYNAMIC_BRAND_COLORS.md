# Dynamic Brand Colors for Booking Forms

## Overview
The booking form now uses dynamic brand colors from each business's YAML configuration file. Each business can have their own unique color scheme that is automatically applied to all interactive elements.

## Implementation

### 1. Brand Color System (`src/lib/theme/brand-colors.ts`)
- Dynamically applies CSS custom properties based on YAML `branding.primaryColor` and `branding.secondaryColor`
- Generates color variants (hover states, light versions, etc.)
- Provides utility functions for applying and removing brand colors

### 2. CSS Theme System (`app/[locale]/book/[subdomain]/brand-theme.css`)
- Uses CSS custom properties (variables) for dynamic theming
- Pre-defined classes for common branded elements:
  - `.brand-spinner` - Loading spinners
  - `.brand-link` - Links with brand color
  - `.brand-button` - Primary gradient buttons
  - `.brand-step-active` - Active step indicators
  - `.brand-selected` - Selected items (categories, services)
  - `.brand-date-selected` - Selected date
  - `.brand-slot` - Time slot buttons
  - `.brand-info-box` - Information boxes
  - `.brand-icon-bg` - Icon backgrounds
  - `.brand-cta-button` - Call-to-action buttons
  - `.brand-today-indicator` - Today's date indicator
  - And more...

### 3. Booking Page Integration
- Imports the brand theme CSS
- Applies brand colors on component mount based on config
- Removes colors on unmount for cleanup
- All interactive elements use brand color classes

## CSS Variables Available

The following CSS variables are automatically set based on the business's YAML configuration:

```css
--brand-primary           /* Main brand color */
--brand-primary-rgb       /* RGB values for opacity usage */
--brand-primary-hover     /* Darker shade for hover states */
--brand-primary-light     /* Lighter shade */
--brand-primary-lighter   /* Even lighter shade */

--brand-secondary         /* Secondary brand color */
--brand-secondary-rgb     /* RGB values for opacity usage */
--brand-secondary-hover   /* Darker shade for hover states */
--brand-secondary-light   /* Lighter shade */
```

## Branded Elements

All of the following elements now use dynamic brand colors:

### Navigation & Steps
- Step indicators (1, 2, 3 circles)
- Progress indicators
- Active step highlighting

### Interactive Elements
- Category selection buttons
- Service selection cards
- Date picker (selected dates)
- Time slot buttons (hover & focus)
- Form inputs (focus states)
- Primary action buttons
- Secondary buttons
- Links

### Visual Feedback
- Loading spinners
- Success confirmation icons
- Info boxes
- Selected state backgrounds
- Icon backgrounds
- Today indicators in calendar

### Buttons
- Main booking confirmation button (gradient)
- "New Booking" button
- "Get Directions" button
- Login/Signup toggle buttons
- Secondary action buttons

## YAML Configuration

Each business's colors are defined in their YAML file:

```yaml
branding:
  primaryColor: "#1e3a8a"      # Main brand color (e.g., dark blue)
  secondaryColor: "#3b82f6"    # Secondary color (e.g., lighter blue)
  logoUrl: "..."
  coverImageUrl: "..."
  # ...
```

## Examples

### Blues Barber Firenze
- Primary: `#1e3a8a` (Dark Blue)
- Secondary: `#3b82f6` (Blue)
- All buttons, links, and interactive elements use these colors

### Machete Firenze Centro
- Primary: `#1a1a1a` (Almost Black)
- Secondary: `#b8860b` (Dark Goldenrod)
- Creates a sophisticated, vintage aesthetic

### Generic/Test Businesses
- Can use any hex color combination
- Colors are automatically applied across all elements

## Benefits

1. **Brand Consistency**: Each business maintains its unique brand identity
2. **No Code Changes**: Adding a new business just requires YAML configuration
3. **Automatic Application**: Colors propagate to all interactive elements
4. **Maintainable**: Centralized theme system, easy to update
5. **Performance**: CSS variables are highly optimized by browsers

## Migration Notes

All hardcoded `teal-*` and `green-*` Tailwind classes have been replaced with:
- Dynamic CSS custom properties
- Brand-specific CSS classes
- Inline styles where needed for dynamic colors

The system is backward compatible and falls back to teal/green if brand colors are not provided.
