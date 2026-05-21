import type { DimensionScore, InterviewReport, Opportunity, Strategy } from '@/lib/types'

const POTENTIAL_DIM_KEYS = ['reason_to_buy', 'market_volume', 'economic_viability'] as const

/** Average of the three “potential” dimension scores from the latest AI evaluation report. */
export function averagePotentialScoreFromReport(report: unknown): number | null {
  if (!report || typeof report !== 'object') return null
  const r = report as InterviewReport
  const scores = POTENTIAL_DIM_KEYS.map(
    (k) => (r as unknown as Record<string, DimensionScore | undefined>)[k]?.score
  ).filter(
    (n): n is number => typeof n === 'number' && !Number.isNaN(n)
  )
  if (scores.length === 0) return null
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

export function resolveSpotlightOpportunity(
  strategy: Strategy | null,
  opportunities: Opportunity[]
): Opportunity | null {
  if (!strategy) return null
  const pursue = Array.isArray(strategy.pursue_now_opportunity_ids) ? strategy.pursue_now_opportunity_ids : []
  const primary = strategy.primary_opportunity_id
  const byId = new Map(opportunities.map((o) => [o.id, o]))
  if (primary && byId.has(primary)) return byId.get(primary) ?? null
  for (const id of pursue) {
    const o = byId.get(id)
    if (o) return o
  }
  return null
}

export function isWtpStrategyComplete(strategy: Strategy | null): boolean {
  if (!strategy) return false
  const pursue = Array.isArray(strategy.pursue_now_opportunity_ids) ? strategy.pursue_now_opportunity_ids : []
  return !!strategy.primary_opportunity_id || pursue.length > 0
}
