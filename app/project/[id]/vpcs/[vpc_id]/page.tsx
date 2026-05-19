import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VPCDetailClient from './VPCDetailClient'
import type { VPC, VPCAggregate } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function VPCDetailPage({
  params,
}: {
  params: Promise<{ id: string; vpc_id: string }>
}) {
  const { id, vpc_id } = await params
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

  const { data: vpc } = await supabase
    .from('vpcs')
    .select('*')
    .eq('id', vpc_id)
    .eq('project_id', id)
    .single()
  if (!vpc) redirect(`/project/${id}/vpcs`)

  // Load opportunity name if linked
  let opportunityName: string | null = null
  if (vpc.opportunity_id) {
    const { data: opp } = await supabase
      .from('opportunities')
      .select('name, description, customer_segment')
      .eq('id', vpc.opportunity_id)
      .single()
    opportunityName = opp?.name ?? null
  }

  // Load abilities for value map generation
  const { data: abilities } = await supabase
    .from('abilities')
    .select('id, name, description')
    .eq('project_id', id)

  // Load source VPC names for aggregates
  let sourceVpcs: { id: string; name: string }[] = []
  if (vpc.is_aggregate) {
    const { data: links } = await supabase
      .from('vpc_aggregates')
      .select('source_vpc_id')
      .eq('aggregate_vpc_id', vpc_id)

    if (links && links.length > 0) {
      const { data: sources } = await supabase
        .from('vpcs')
        .select('id, name')
        .in('id', links.map(l => l.source_vpc_id))
      sourceVpcs = sources ?? []
    }
  }

  // Load opportunity data for value map generation context
  const { data: opportunity } = vpc.opportunity_id
    ? await supabase.from('opportunities').select('*').eq('id', vpc.opportunity_id).single()
    : { data: null }

  return (
    <VPCDetailClient
      project={project}
      vpc={vpc as VPC}
      opportunityName={opportunityName}
      opportunity={opportunity}
      abilities={abilities ?? []}
      sourceVpcs={sourceVpcs}
    />
  )
}
