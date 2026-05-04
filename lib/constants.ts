// Twin-specific UI colors
export const TWIN_AVATAR_COLORS = [
  'bg-[#1A1A18] text-white',
  'bg-[#C77B3A] text-white',
  'bg-[#4CAF7D] text-white',
  'bg-[#888880] text-white',
  'bg-[#B4A888] text-white',
]

export const TWIN_BUBBLE_COLORS = [
  'bg-[rgba(199,123,58,0.08)] border-[rgba(199,123,58,0.15)]',
  'bg-[rgba(76,175,125,0.08)] border-[rgba(76,175,125,0.15)]',
  'bg-[rgba(180,168,136,0.10)] border-[rgba(180,168,136,0.20)]',
  'bg-[rgba(136,136,128,0.08)] border-[rgba(136,136,128,0.15)]',
  'bg-[rgba(26,26,24,0.04)] border-[rgba(26,26,24,0.08)]',
]

export const TWIN_DOT_COLORS = [
  'bg-[#1A1A18]',
  'bg-[#C77B3A]',
  'bg-[#4CAF7D]',
  'bg-[#888880]',
  'bg-[#B4A888]',
]

export const TWIN_COLORS_HEX = ['#1A1A18', '#C77B3A', '#4CAF7D', '#888880', '#B4A888']

// Attractiveness map dot palette
export const MAP_DOT_PALETTE = [
  '#C77B3A',
  '#4CAF7D',
  '#888880',
  '#E8A96A',
  '#1A1A18',
  '#B4A888',
  '#6B9E8A',
  '#D4956A',
]

// Score → position on attractiveness map (percentages)
export const SCORE_TO_POSITION: Record<string, number> = {
  low: 15,
  mid: 38,
  high: 65,
  super_high: 85,
}

// Potential score badge classes — using new design system
export const POTENTIAL_BADGE: Record<string, string> = {
  low: 'bg-[rgba(76,175,125,0.10)] text-[#2D7A57] border-[rgba(76,175,125,0.20)]',
  mid: 'bg-[rgba(199,123,58,0.10)] text-[#7A4A20] border-[rgba(199,123,58,0.20)]',
  high: 'bg-[rgba(199,123,58,0.15)] text-[#7A3D10] border-[rgba(199,123,58,0.25)]',
  super_high: 'bg-[rgba(199,123,58,0.20)] text-[#7A3D10] border-[rgba(199,123,58,0.30)]',
}

// Challenge score badge classes (inverted — high challenge is bad)
export const CHALLENGE_BADGE: Record<string, string> = {
  low: 'bg-[rgba(76,175,125,0.10)] text-[#2D7A57] border-[rgba(76,175,125,0.20)]',
  mid: 'bg-[rgba(199,123,58,0.10)] text-[#7A4A20] border-[rgba(199,123,58,0.20)]',
  high: 'bg-[rgba(199,123,58,0.15)] text-[#7A3D10] border-[rgba(199,123,58,0.25)]',
  super_high: 'bg-[rgba(76,175,125,0.10)] text-[#DC2626] border-[#FECACA]',
}
