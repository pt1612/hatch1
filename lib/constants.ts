// Twin-specific UI colors — brand palette gives 5 distinguishable hues.
// All foreground/background pairs meet WCAG AA Large (>=3:1) or use Deep Teal text
// on lighter chips to stay above 4.5:1.
export const TWIN_AVATAR_COLORS = [
  'bg-[var(--color-foreground)] text-[var(--color-wispy-clouds)]',
  'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
  'bg-[var(--color-secondary)] text-[var(--color-wispy-clouds)]',
  'bg-[var(--color-warm)] text-[var(--color-foreground)]',
  'bg-[var(--color-accent)] text-[var(--color-foreground)]',
]

export const TWIN_BUBBLE_COLORS = [
  'bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] border-[color-mix(in_srgb,var(--color-foreground)_12%,transparent)]',
  'bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] border-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]',
  'bg-[color-mix(in_srgb,var(--color-secondary)_8%,transparent)] border-[color-mix(in_srgb,var(--color-secondary)_18%,transparent)]',
  'bg-[color-mix(in_srgb,var(--color-warm)_18%,transparent)] border-[color-mix(in_srgb,var(--color-warm)_35%,transparent)]',
  'bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] border-[color-mix(in_srgb,var(--color-accent)_40%,transparent)]',
]

export const TWIN_DOT_COLORS = [
  'bg-[var(--color-foreground)]',
  'bg-[var(--color-primary)]',
  'bg-[var(--color-secondary)]',
  'bg-[var(--color-warm)]',
  'bg-[var(--color-accent)]',
]

export const TWIN_COLORS_HEX = [
  'var(--color-foreground)',
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-warm)',
  'var(--color-accent)',
]

// Attractiveness map dot palette — drawn from brand palette only.
export const MAP_DOT_PALETTE = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-foreground)',
  'var(--color-accent)',
  'var(--color-warm)',
  'var(--color-warning)',
  'var(--color-foreground-muted)',
  'var(--color-aruba-blue)',
]

// Score → position on attractiveness map (percentages)
export const SCORE_TO_POSITION: Record<string, number> = {
  low: 15,
  mid: 38,
  high: 65,
  super_high: 85 }

// Potential score badge classes — graded saturation of the primary color.
// Text uses Deep Teal everywhere (≥4.5:1 on these tinted backgrounds).
export const POTENTIAL_BADGE: Record<string, string> = {
  low: 'bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-foreground)] border-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]',
  mid: 'bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)] text-[var(--color-foreground)] border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)]',
  high: 'bg-[color-mix(in_srgb,var(--color-primary)_28%,transparent)] text-[var(--color-foreground)] border-[color-mix(in_srgb,var(--color-primary)_40%,transparent)]',
  super_high: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent' }

// Challenge score badge classes (inverted — high challenge is bad).
export const CHALLENGE_BADGE: Record<string, string> = {
  low: 'bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-foreground)] border-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]',
  mid: 'bg-[color-mix(in_srgb,var(--color-warning)_30%,transparent)] text-[var(--color-foreground)] border-[color-mix(in_srgb,var(--color-warning)_50%,transparent)]',
  high: 'bg-[color-mix(in_srgb,var(--color-warm)_45%,transparent)] text-[var(--color-foreground)] border-[var(--color-warm)]',
  super_high: 'bg-red-50 text-red-700 border-red-200' }
