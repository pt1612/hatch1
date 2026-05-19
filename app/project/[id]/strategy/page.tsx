import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StrategyClient from './StrategyClient'
import type { Opportunity, Strategy } from '@/lib/types'
import {
  averagePotentialScoreFromReport,
  isWtpStrategyComplete,
  resolveSpotlightOpportunity,
} from '@/lib/strategy-wtp-completion'

export const dynamic = 'force-dynamic'

export default async function StrategyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, title')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!project) redirect('/dashboard')

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  const { data: existingStrategy } = await supabase.from('strategies').select('*').eq('project_id', id).maybeSingle()

  const strategy = existingStrategy as Strategy | null
  const opps = (opportunities ?? []) as Opportunity[]
  const wtpComplete = isWtpStrategyComplete(strategy)
  const spotlightOpp = wtpComplete ? resolveSpotlightOpportunity(strategy, opps) : null
  const spotlightId = spotlightOpp?.id ?? null

  const evaluatedCount = opps.filter((o) => !!o.potential_score).length
  const opportunitiesCount = opps.length

  const [{ count: abilitiesCount }, vpcsRes, bmcsRes, evalRes] = await Promise.all([
    supabase.from('abilities').select('id', { count: 'exact', head: true }).eq('project_id', id),
    supabase.from('vpcs').select('id, customer_profile_name').eq('project_id', id).order('created_at', { ascending: false }),
    supabase
      .from('business_model_canvases')
      .select('id, title')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    spotlightId
      ? supabase
          .from('evaluations')
          .select('report')
          .eq('opportunity_id', spotlightId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null as { report: unknown } | null }),
  ])

  const avgPotential = averagePotentialScoreFromReport(evalRes.data?.report)
  const spotlightScoreLabel = avgPotential != null ? `${avgPotential.toFixed(1)}/10` : null

  const wtpCompletion = wtpComplete
    ? {
        abilitiesCount: abilitiesCount ?? 0,
        opportunitiesCount,
        evaluatedCount,
        spotlightOpportunity: spotlightOpp ? { id: spotlightOpp.id, name: spotlightOpp.name } : null,
        spotlightScoreLabel,
        vpcs: (vpcsRes.data ?? []) as { id: string; customer_profile_name: string }[],
        bmcs: (bmcsRes.data ?? []) as { id: string; title: string | null }[],
      }
    : null

  return (
    <StrategyClient
      project={project}
      opportunities={opps}
      existingStrategy={existingStrategy}
      wtpCompletion={wtpCompletion}
    />
  )
}
