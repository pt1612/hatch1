import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VPCDashboardClient from './VPCDashboardClient'
import type { VPC, VPCAggregate } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function VPCDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, title')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!project) redirect('/dashboard')

  // Load all opportunities for the project
  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, name')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  // Load all twins for the project (to find those with completed interviews)
  const { data: allTwins } = await supabase
    .from('twins')
    .select('id, name, opportunity_id')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  // Load all twin_interviews that have gains/pains/jobs (completed interviews)
  const twinIds = (allTwins ?? []).map(t => t.id)
  const { data: completedInterviews } = twinIds.length > 0
    ? await supabase
        .from('twin_interviews')
        .select('id, twin_id, opportunity_id, gains, pains, jobs_to_be_done')
        .in('twin_id', twinIds)
    : { data: [] }

  // Interviews with actual data (gains OR pains OR jobs populated)
  const interviewsWithData = (completedInterviews ?? []).filter(iv =>
    (iv.gains?.length ?? 0) > 0 || (iv.pains?.length ?? 0) > 0 || (iv.jobs_to_be_done?.length ?? 0) > 0
  )

  // Load existing VPCs for the project
  const { data: existingVpcs } = await supabase
    .from('vpcs')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  // Auto-create VPCs for twins with completed interviews that don't have one yet
  const existingTwinIds = new Set(
    (existingVpcs ?? []).filter(v => !v.is_aggregate && v.twin_id).map(v => v.twin_id as string)
  )
  const twinMap = new Map((allTwins ?? []).map(t => [t.id, t]))

  const toCreate = interviewsWithData.filter(iv => !existingTwinIds.has(iv.twin_id))
  if (toCreate.length > 0) {
    await supabase.from('vpcs').insert(
      toCreate.map(iv => {
        const twin = twinMap.get(iv.twin_id)
        return {
          project_id: id,
          opportunity_id: iv.opportunity_id,
          twin_id: iv.twin_id,
          name: twin?.name ?? 'Unknown',
          is_aggregate: false,
          customer_profile: {
            jobs: iv.jobs_to_be_done ?? [],
            pains: iv.pains ?? [],
            gains: iv.gains ?? [],
          },
          value_map: null,
        }
      })
    )
  }

  // Reload VPCs after potential creation
  const { data: vpcsData } = await supabase
    .from('vpcs')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  const vpcs = (vpcsData ?? []) as VPC[]

  // Load vpc_aggregates for aggregate VPCs
  const aggregateVpcIds = vpcs.filter(v => v.is_aggregate).map(v => v.id)
  const { data: aggregateLinks } = aggregateVpcIds.length > 0
    ? await supabase
        .from('vpc_aggregates')
        .select('*')
        .in('aggregate_vpc_id', aggregateVpcIds)
    : { data: [] }

  return (
    <VPCDashboardClient
      project={project}
      opportunities={opportunities ?? []}
      vpcs={vpcs}
      aggregateLinks={(aggregateLinks ?? []) as VPCAggregate[]}
    />
  )
}
