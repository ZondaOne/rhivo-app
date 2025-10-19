/**
 * Brand Colors Theme System
 * 
 * Dynamically applies business brand colors to the booking interface
 * using CSS custom properties (CSS variables).
 * 
 * This allows each business to have their own color scheme while
 * maintaining consistent component styling.
 */

export interface BrandColors {
  primary: string;
  secondary: string;
}

/**
 * Convert hex color to RGB values for CSS variables
 * This allows us to use opacity with the colors
 */
function hexToRgb(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert 3-digit hex to 6-digit
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `${r} ${g} ${b}`;
}

/**
 * Apply brand colors as CSS custom properties
 * These can be used throughout the application with the var() function
 */
export function applyBrandColors(colors: BrandColors): void {
  const root = document.documentElement;
  
  // Set primary color
  root.style.setProperty('--brand-primary', colors.primary);
  root.style.setProperty('--brand-primary-rgb', hexToRgb(colors.primary));
  
  // Set secondary color
  root.style.setProperty('--brand-secondary', colors.secondary);
  root.style.setProperty('--brand-secondary-rgb', hexToRgb(colors.secondary));
  
  // Generate lighter and darker variants for hover states, etc.
  // These are calculated approximations - you could make them more sophisticated
  root.style.setProperty('--brand-primary-hover', adjustBrightness(colors.primary, -10));
  root.style.setProperty('--brand-primary-light', adjustBrightness(colors.primary, 40));
  root.style.setProperty('--brand-primary-lighter', adjustBrightness(colors.primary, 60));
  
  root.style.setProperty('--brand-secondary-hover', adjustBrightness(colors.secondary, -10));
  root.style.setProperty('--brand-secondary-light', adjustBrightness(colors.secondary, 40));
}

/**
 * Adjust the brightness of a hex color
 * @param hex - The hex color string
 * @param percent - Percentage to adjust (-100 to 100)
 */
function adjustBrightness(hex: string, percent: number): string {
  hex = hex.replace('#', '');
  
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  r = Math.max(0, Math.min(255, r + (r * percent / 100)));
  g = Math.max(0, Math.min(255, g + (g * percent / 100)));
  b = Math.max(0, Math.min(255, b + (b * percent / 100)));
  
  const rr = Math.round(r).toString(16).padStart(2, '0');
  const gg = Math.round(g).toString(16).padStart(2, '0');
  const bb = Math.round(b).toString(16).padStart(2, '0');
  
  return `#${rr}${gg}${bb}`;
}

/**
 * Remove brand colors (reset to default)
 */
export function removeBrandColors(): void {
  const root = document.documentElement;
  
  root.style.removeProperty('--brand-primary');
  root.style.removeProperty('--brand-primary-rgb');
  root.style.removeProperty('--brand-primary-hover');
  root.style.removeProperty('--brand-primary-light');
  root.style.removeProperty('--brand-primary-lighter');
  
  root.style.removeProperty('--brand-secondary');
  root.style.removeProperty('--brand-secondary-rgb');
  root.style.removeProperty('--brand-secondary-hover');
  root.style.removeProperty('--brand-secondary-light');
}

/**
 * Get brand color CSS class names for Tailwind-like usage
 * These return inline style objects that can be spread into React components
 */
export const brandStyles = {
  // Primary color styles
  bgPrimary: { backgroundColor: 'var(--brand-primary)' },
  bgPrimaryLight: { backgroundColor: 'var(--brand-primary-light)' },
  bgPrimaryLighter: { backgroundColor: 'var(--brand-primary-lighter)' },
  textPrimary: { color: 'var(--brand-primary)' },
  borderPrimary: { borderColor: 'var(--brand-primary)' },
  
  // Secondary color styles
  bgSecondary: { backgroundColor: 'var(--brand-secondary)' },
  bgSecondaryLight: { backgroundColor: 'var(--brand-secondary-light)' },
  textSecondary: { color: 'var(--brand-secondary)' },
  borderSecondary: { borderColor: 'var(--brand-secondary)' },
  
  // Gradient styles
  gradientPrimary: { 
    background: 'linear-gradient(to right, var(--brand-primary), var(--brand-secondary))' 
  },
};
