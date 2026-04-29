// Twin-specific UI colors (from Twins project)
export const TWIN_AVATAR_COLORS = [
  'bg-[#0d3b2e] text-white',
  'bg-teal-700 text-white',
  'bg-slate-700 text-white',
  'bg-amber-700 text-white',
  'bg-rose-700 text-white',
]

export const TWIN_BUBBLE_COLORS = [
  'bg-amber-50 border-amber-100',
  'bg-emerald-50 border-emerald-100',
  'bg-blue-50 border-blue-100',
  'bg-purple-50 border-purple-100',
  'bg-rose-50 border-rose-100',
]

export const TWIN_DOT_COLORS = [
  'bg-[#0d3b2e]',
  'bg-teal-700',
  'bg-slate-600',
  'bg-amber-700',
  'bg-rose-700',
]

// Twin hex colours (inline dot styles, same hues as TWIN_DOT_COLORS)
export const TWIN_COLORS_HEX = ['#0d3b2e', '#0f766e', '#475569', '#b45309', '#be123c']

// Attractiveness map dot palette (from Vela)
export const MAP_DOT_PALETTE = [
  '#0D6E6E',
  '#F97316',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#EAB308',
  '#14B8A6',
  '#EF4444',
]

// Score → position on attractiveness map (percentages)
export const SCORE_TO_POSITION: Record<string, number> = {
  low: 15,
  mid: 38,
  high: 65,
  super_high: 85,
}

// Potential score badge classes
export const POTENTIAL_BADGE: Record<string, string> = {
  low: 'bg-red-100 text-red-700 border-red-200',
  mid: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  high: 'bg-green-100 text-green-700 border-green-200',
  super_high: 'bg-[#0D6E6E]/10 text-[#0D6E6E] border-[#0D6E6E]/20',
}

// Challenge score badge classes (inverted — high challenge is bad)
export const CHALLENGE_BADGE: Record<string, string> = {
  low: 'bg-green-100 text-green-700 border-green-200',
  mid: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  super_high: 'bg-red-100 text-red-700 border-red-200',
}
