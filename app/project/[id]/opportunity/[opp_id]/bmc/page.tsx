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

  // Final VPC (new format with FinalVPCItem[]) from twin_session
  const { data: twinSession } = await supabase
    .from('twin_sessions')
    .select('vpc_value_map')
    .eq('opportunity_id', opp_id)
    .maybeSingle()

  // Twins (ordered) + their interviews (value_map + bmc_data)
  const { data: twinRows } = await supabase
    .from('twins')
    .select('id, name, segment')
    .eq('opportunity_id', opp_id)
    .order('created_at', { ascending: true })

  const dbTwinIds = (twinRows ?? []).map((r) => r.id)

  // Use select('*') so the query never errors on optional columns (value_map,
  // bmc_data) that may not exist yet if the migration hasn't been applied.
  const { data: interviewRows } = dbTwinIds.length > 0
    ? await supabase
        .from('twin_interviews')
        .select('*')
        .in('twin_id', dbTwinIds)
    : { data: [] }

  // Build per-twin interview data (matched to twin order)
  const twinInterviews = (twinRows ?? []).map((row, i) => {
    const iv = (interviewRows ?? []).find((r) => r.twin_id === row.id)
    return {
      id: iv?.id ?? null,          // interview DB id (null = no interview yet)
      twinDbId: row.id,
      twinName: row.name,
      twinSegment: row.segment ?? '',
      twinIdx: i,
      valueMap: iv?.value_map ?? null,
      bmcData: iv?.bmc_data ?? null,
    }
  })

  // Aggregate twin segments for the Aggregated tab
  const twinSegments = [
    ...new Set((twinRows ?? []).map((r) => r.segment as string).filter(Boolean)),
  ]

  // Existing aggregated BMC
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
      twinInterviews={twinInterviews}
      vpcValueMap={twinSession?.vpc_value_map ?? null}
      twinSegments={twinSegments}
      existingBMC={existingBMC}
    />
  )
}
