import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VPCClient from './VPCClient'
import type { DigitalTwin, TwinInterview } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function VPCPage({
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
    .select('*')
    .eq('id', opp_id)
    .single()
  if (!opportunity) redirect(`/project/${id}/strategy`)

  // Load abilities for the AI value map generation
  const { data: abilities } = await supabase
    .from('abilities')
    .select('id, name, description')
    .eq('project_id', id)

  // Load twins
  const { data: twinRows } = await supabase
    .from('twins')
    .select('*')
    .eq('opportunity_id', opp_id)
    .order('created_at', { ascending: true })

  const twins: DigitalTwin[] = (twinRows ?? []).map((row, i) => ({
    id: `twin${i + 1}`,
    name: row.name,
    role: row.role ?? '',
    segment: row.segment ?? '',
    personality: row.personality ?? '',
    painPoints: row.pain_points ?? [],
    techLevel: (row.tech_level ?? 'medium') as 'low' | 'medium' | 'high',
    budgetTier: (row.budget_tier ?? 'mid') as 'low' | 'mid' | 'premium',
    affinityLabel: (row.affinity_label ?? 'moderate') as
      | 'high_affinity'
      | 'moderate'
      | 'early_adopter',
  }))

  // Load twin_interviews with VPC data.
  // Use select('*') so the query never fails if optional columns (value_map)
  // haven't been added to the database yet — PostgREST only errors when a column
  // is explicitly requested but absent; '*' silently skips missing columns.
  const dbTwinIds = (twinRows ?? []).map((r) => r.id)
  const { data: interviewRows, error: interviewErr } = await supabase
    .from('twin_interviews')
    .select('*')
    .in('twin_id', dbTwinIds.length > 0 ? dbTwinIds : ['00000000-0000-0000-0000-000000000000'])

  if (interviewErr) {
    console.error('[VPC page] twin_interviews query error:', interviewErr)
  }

  // Map twin DB ids to interview data with sequential twin id
  const interviews: (TwinInterview & { twinSequentialId: string })[] = []
  if (interviewRows && twinRows) {
    twinRows.forEach((row, i) => {
      const iv = interviewRows.find((r) => r.twin_id === row.id)
      if (iv) {
        interviews.push({
          ...(iv as TwinInterview),
          twinSequentialId: `twin${i + 1}`,
        })
      }
    })
  }

  // Show VPC canvas as long as interview rows exist — gains/pains/jobs may still
  // be empty if "Generate Results" hasn't been run yet, which is fine: the per-twin
  // breakdown already handles that case with an inline prompt to generate results.
  console.log('[VPC page] interviewRows:', JSON.stringify((interviewRows ?? []).map(r => ({
    id: r.id,
    twin_id: r.twin_id,
    gains: r.gains,
    pains: r.pains,
    jobs: r.jobs_to_be_done,
  }))))

  const hasInterviews = interviews.length > 0

  // Load twin_session for vpc_value_map
  const { data: twinSession } = await supabase
    .from('twin_sessions')
    .select('id, vpc_value_map')
    .eq('opportunity_id', opp_id)
    .maybeSingle()

  let vpcRecordId: string | null = null
  if (twinSession?.id) {
    const { data: vpcRecord } = await supabase
      .from('vpcs')
      .select('id')
      .eq('legacy_twin_session_id', twinSession.id)
      .maybeSingle()
    vpcRecordId = vpcRecord?.id ?? null
  }

  return (
    <VPCClient
      project={project}
      opportunity={opportunity}
      twins={twins}
      interviews={interviews}
      hasInterviews={hasInterviews}
      abilities={abilities ?? []}
      sessionId={twinSession?.id ?? null}
      vpcRecordId={vpcRecordId}
      existingFinalVPC={twinSession?.vpc_value_map ?? null}
    />
  )
}
