/**
 * Lucas App — Design Tokens
 *
 * Central source of truth for the pastel color palette, touch target minimums,
 * and typography scale used across Android and Web.
 *
 * Requirements: 8.1 (colors), 8.2 (touch targets), 8.3 (monetary display / typography)
 */

// ---------------------------------------------------------------------------
// Color Palette (Requirement 8.1)
// ---------------------------------------------------------------------------

export const Colors = {
  /** Soft Lavender — CTA buttons, active tab indicators */
  primary: '#B8A9E3',
  /** Mint Green — panel backgrounds, card surfaces */
  secondary: '#A8D8C2',
  /** Peach — alert banners, budget limit warnings, highlights */
  accent: '#F2B8A0',
  /** Cloud White — screen backgrounds, modal overlays */
  background: '#F7F5FF',
  /** Slate Gray — body text, labels, borders, icons */
  text: '#6B7280',
} as const;

export type ColorKey = keyof typeof Colors;

// ---------------------------------------------------------------------------
// Touch Target Minimums (Requirement 8.2)
// ---------------------------------------------------------------------------

export const TouchTarget = {
  minWidth: 44,
  minHeight: 44,
} as const;

// ---------------------------------------------------------------------------
// Typography Scale (Requirement 8.3)
// ---------------------------------------------------------------------------

export const Typography = {
  H1: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: Colors.text,
  },
  H2: {
    fontSize: 18,
    fontWeight: '600' as const, // SemiBold
    color: Colors.text,
  },
  Body: {
    fontSize: 14,
    fontWeight: '400' as const, // Regular
    color: Colors.text,
  },
  Caption: {
    fontSize: 12,
    fontWeight: '400' as const, // Regular
    color: Colors.text,
  },
  CTAButton: {
    fontSize: 16,
    fontWeight: '600' as const, // SemiBold
    color: Colors.background,   // #F7F5FF on #B8A9E3 background
    backgroundColor: Colors.primary,
  },
} as const;

export type TypographyKey = keyof typeof Typography;
