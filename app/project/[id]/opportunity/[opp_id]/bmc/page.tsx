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

  // Unique segments from twins
  const { data: twinRows } = await supabase
    .from('twins')
    .select('id, segment')
    .eq('opportunity_id', opp_id)

  const twinSegments = [
    ...new Set((twinRows ?? []).map((r) => r.segment as string).filter(Boolean)),
  ]

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
      existingBMC={existingBMC}
    />
  )
}
