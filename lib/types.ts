// ─── Vela / shared score types ────────────────────────────────────────────────

export type ScoreLevel = 'low' | 'mid' | 'high' | 'super_high'

export interface DimensionScore {
  score: number    // 1–10
  label: ScoreLevel
  analysis: string
}

export interface InterviewReport {
  reason_to_buy: DimensionScore
  market_volume: DimensionScore
  economic_viability: DimensionScore
  implementation_obstacles: DimensionScore
  time_to_revenue: DimensionScore
  external_risks: DimensionScore
  overall_potential: ScoreLevel
  overall_challenge: ScoreLevel
  executive_summary: string
}

// ─── DB row types ──────────────────────────────────────────────────────────────

export type Project = {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export type Ability = {
  id: string
  project_id: string
  name: string
  description: string
  created_at: string
}

export type Opportunity = {
  id: string
  project_id: string
  name: string
  application: string
  customer_segment: string
  description: string
  phase: string                   // 'abilities' | 'evaluated'
  potential_score: string | null  // ScoreLevel
  challenge_score: string | null  // ScoreLevel
  created_at: string
}

export type Evaluation = {
  id: string
  opportunity_id: string
  messages: ChatMessage[]
  dimension_scores: Record<string, number>
  report: InterviewReport | null
  created_at: string
  updated_at: string
}

export type Strategy = {
  id: string
  project_id: string
  primary_opportunity_id: string | null          // kept for sidebar compat (= first pursue_now id)
  pursue_now_opportunity_ids: string[]            // all pursue_now opportunities
  classifications: Record<string, Classification>
  created_at: string
}

export type Classification = {
  product_fit: boolean
  market_fit: boolean
  category: 'growth' | 'backup' | 'storage'
}

export type TwinRow = {
  id: string
  project_id: string
  opportunity_id: string
  name: string
  role: string
  segment: string
  personality: string
  pain_points: string[]
  tech_level: 'low' | 'medium' | 'high'
  budget_tier: 'low' | 'mid' | 'premium'
  affinity_label: 'high_affinity' | 'moderate' | 'early_adopter'
  created_at: string
}

export type TwinInterview = {
  id: string
  twin_id: string
  opportunity_id: string
  messages: TwinMessage[]
  gains: string[]
  pains: string[]
  jobs_to_be_done: string[]
  value_map: Record<string, unknown> | null   // { productsAndServices, painRelievers, gainCreators }
  bmc_data:  Record<string, unknown> | null   // Record<BlockKey, string[]>
  segment_attractiveness: number | null
  ability_to_serve: number | null
  created_at: string
  updated_at: string
}

export type TwinSession = {
  id: string
  opportunity_id: string
  suggested_segments: string[]
  report: TwinReport | null
  created_at: string
}

export type Profile = {
  id: string
  full_name: string
  is_admin: boolean
}

// ─── Chat types ────────────────────────────────────────────────────────────────

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

// ─── Digital Twin (in-memory / API shape) ────────────────────────────────────

export interface DigitalTwin {
  id: string                                          // 'twin1', 'twin2', etc.
  dbId?: string                                       // real Supabase UUID
  name: string
  age?: number
  occupation?: string
  background?: string
  role: string
  segment: string
  personality: string
  painPoints: string[]
  motivations?: string[]
  techLevel: 'low' | 'medium' | 'high'
  budgetTier: 'low' | 'mid' | 'premium'
  affinityLabel: 'high_affinity' | 'moderate' | 'early_adopter'
  budget?: string
  gains?: string[]
  pains?: string[]
  jobsToBeDone?: string[]
}

export interface TwinMessage {
  role: 'user' | 'assistant'
  content: string
  twinId?: string
  twinName?: string
  timestamp?: string
}

export interface WhereToPlayEntry {
  twinId: string
  twinName: string
  segment: string
  segmentAttractiveness: number  // 0–100
  abilityToServe: number         // 0–100
}

export interface TwinReport {
  problemIntensity: number        // 0–100
  valueResonance: number          // 0–100
  recurringThemes: string[]
  mainObjections: string[]
  gains: string[]
  pains: string[]
  jobsToBeDone: string[]
  verdict: 'strong_fit' | 'weak_fit' | 'pivot_needed'
  nextSteps: string[]
  summary: string
  whereToPlay: WhereToPlayEntry[]
}

// ─── Score helpers ─────────────────────────────────────────────────────────────

export function numericToLabel(score: number): ScoreLevel {
  if (score >= 9) return 'super_high'
  if (score >= 6) return 'high'
  if (score >= 4) return 'mid'
  return 'low'
}

export const SCORE_TO_POSITION: Record<ScoreLevel, number> = {
  low: 15,
  mid: 38,
  high: 65,
  super_high: 85,
}

export function computeCategory(
  product_fit: boolean,
  market_fit: boolean
): 'growth' | 'backup' | 'storage' {
  if (product_fit && market_fit) return 'growth'
  if (product_fit || market_fit) return 'backup'
  return 'storage'
}

// ─── Twin utility functions (from Twins project) ──────────────────────────────

export function getTwinIndex(id: string): number {
  const match = id.match(/\d+/)
  return match ? parseInt(match[0]) - 1 : 0
}

export function getTechLabel(level: 'low' | 'medium' | 'high'): string {
  return { low: 'Novice', medium: 'Adept', high: 'Expert' }[level]
}

export function getTechProgress(level: 'low' | 'medium' | 'high'): number {
  return { low: 33, medium: 66, high: 100 }[level]
}

export function getAffinityDisplay(label: 'high_affinity' | 'moderate' | 'early_adopter'): {
  text: string
  className: string
} {
  const map = {
    high_affinity: {
      text: 'HIGH AFFINITY',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    moderate: {
      text: 'MODERATE',
      className: 'bg-slate-50 text-slate-600 border-slate-200',
    },
    early_adopter: {
      text: 'EARLY ADOPTER',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
  }
  return map[label] ?? map.moderate
}

export function getBudgetDisplay(tier: 'low' | 'mid' | 'premium'): string {
  return { low: '€ BUDGET', mid: '€€ MID-TIER', premium: '€€€ PREMIUM' }[tier]
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatTime(date?: Date): string {
  const d = date || new Date()
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}
