import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BMCClient from './BMCClient'

export const dynamic = 'force-dynamic'

export default async function BMCPage({
  params,
}: {
  params: Promise<{ id: string; opp_id: string }>
}) {
  const { id, opp_id } = await params
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

  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('id, name, description, customer_segment')
    .eq('id', opp_id)
    .single()
  if (!opportunity) redirect(`/project/${id}/strategy`)

  // Abilities for AI generation context
  const { data: abilities } = await supabase
    .from('abilities')
    .select('id, name, description')
    .eq('project_id', id)

  // vpc_value_map from twin_session
  const { data: twinSession } = await supabase
    .from('twin_sessions')
    .select('vpc_value_map')
    .eq('opportunity_id', opp_id)
    .maybeSingle()

  // Unique segments from twins + interview insights for curated VP
  const { data: twinRows } = await supabase
    .from('twins')
    .select('id, segment')
    .eq('opportunity_id', opp_id)

  const twinSegments = [
    ...new Set((twinRows ?? []).map((r) => r.segment as string).filter(Boolean)),
  ]

  // Aggregate gains/pains/jobs from twin_interviews for curated value propositions
  const dbTwinIds = (twinRows ?? []).map((r) => r.id)
  const { data: interviewInsights } = dbTwinIds.length > 0
    ? await supabase
        .from('twin_interviews')
        .select('gains, pains, jobs_to_be_done')
        .in('twin_id', dbTwinIds)
    : { data: [] }

  function rankTop(lists: (string[] | null)[], n: number): string[] {
    const all = (lists ?? []).flatMap((l) => l ?? []).map((s) => s.trim()).filter(Boolean)
    const counts: Record<string, number> = {}
    for (const item of all) counts[item.toLowerCase()] = (counts[item.toLowerCase()] ?? 0) + 1
    const unique = [...new Set(all)]
    return unique
      .sort((a, b) => (counts[b.toLowerCase()] ?? 0) - (counts[a.toLowerCase()] ?? 0))
      .slice(0, n)
  }

  const aggregatedInsights = {
    gains: rankTop((interviewInsights ?? []).map((r) => r.gains), 3),
    pains: rankTop((interviewInsights ?? []).map((r) => r.pains), 3),
    jobs:  rankTop((interviewInsights ?? []).map((r) => r.jobs_to_be_done), 2),
  }

  // Existing BMC row (null on first visit)
  const { data: existingBMC } = await supabase
    .from('business_model_canvases')
    .select('*')
    .eq('opportunity_id', opp_id)
    .maybeSingle()

  return (
    <BMCClient
      project={project}
      opportunity={opportunity}
      abilities={abilities ?? []}
      vpcValueMap={twinSession?.vpc_value_map ?? null}
      twinSegments={twinSegments}
      aggregatedInsights={aggregatedInsights}
      existingBMC={existingBMC}
    />
  )
}
