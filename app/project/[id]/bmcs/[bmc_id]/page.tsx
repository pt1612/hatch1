import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BMCClient from '../../opportunity/[opp_id]/bmc/BMCClient'

export const dynamic = 'force-dynamic'

type VPCSummary = {
  id: string
  customer_profile_name: string
  final_canvas: Record<string, unknown> | null
}

function normalizeBmcVpcs(raw: unknown): { role: 'primary' | 'secondary'; vpcs: VPCSummary | null }[] {
  return (Array.isArray(raw) ? raw : []).map((row) => {
    const typed = row as { role?: 'primary' | 'secondary'; vpcs?: VPCSummary | VPCSummary[] | null }
    const vpc = Array.isArray(typed.vpcs) ? typed.vpcs[0] ?? null : typed.vpcs ?? null
    return { role: typed.role ?? 'secondary', vpcs: vpc }
  })
}

export default async function BMCDetailPage({
  params,
}: {
  params: Promise<{ id: string; bmc_id: string }>
}) {
  const { id, bmc_id } = await params
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

  const { data: existingBMC } = await supabase
    .from('business_model_canvases')
    .select('*, bmc_vpcs(role, vpcs(id, customer_profile_name, final_canvas))')
    .eq('id', bmc_id)
    .eq('project_id', id)
    .single()
  if (!existingBMC) redirect(`/project/${id}/bmcs/new`)

  const linked = normalizeBmcVpcs((existingBMC as { bmc_vpcs?: unknown }).bmc_vpcs)
  const primaryVPC = linked.find((row) => row.role === 'primary')?.vpcs ?? null
  if (!primaryVPC) redirect(`/project/${id}/bmcs/new`)

  const secondaryVPCs = linked
    .filter((row) => row.role === 'secondary' && row.vpcs)
    .map((row) => row.vpcs as VPCSummary)

  const { data: allVpcs } = await supabase
    .from('vpcs')
    .select('id, customer_profile_name, final_canvas')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const { data: linkedOppRows } = await supabase
    .from('vpc_opportunities')
    .select('opportunities(id, name, description, customer_segment)')
    .eq('vpc_id', primaryVPC.id)

  const linkedOpportunity = (Array.isArray(linkedOppRows) ? linkedOppRows : [])
    .flatMap((row) => {
      const opp = (row as { opportunities?: { id: string; name: string; description: string | null; customer_segment: string | null } | { id: string; name: string; description: string | null; customer_segment: string | null }[] | null }).opportunities
      return Array.isArray(opp) ? opp : opp ? [opp] : []
    })[0]

  const opportunity = linkedOpportunity
    ? {
        id: linkedOpportunity.id,
        name: linkedOpportunity.name,
        description: linkedOpportunity.description ?? '',
        customer_segment: linkedOpportunity.customer_segment ?? '',
      }
    : {
        id: '00000000-0000-0000-0000-000000000000',
        name: existingBMC.title ?? 'Business Model Canvas',
        description: '',
        customer_segment: primaryVPC.customer_profile_name,
      }

  return (
    <BMCClient
      project={project}
      opportunity={opportunity}
      abilities={[]}
      twinInterviews={[]}
      vpcValueMap={primaryVPC.final_canvas}
      twinSegments={[]}
      existingBMC={existingBMC}
      primaryVPC={primaryVPC}
      secondaryVPCs={secondaryVPCs}
      availableSecondaryVPCs={(allVpcs ?? []) as VPCSummary[]}
      bmcBackHref={`/project/${project.id}/vpcs/${primaryVPC.id}`}
    />
  )
}
