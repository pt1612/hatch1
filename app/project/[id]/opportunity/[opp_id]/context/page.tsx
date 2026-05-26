import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ContextClient from './ContextClient'

export const dynamic = 'force-dynamic'

type LinkedVPC = {
  id: string
  customer_profile_name: string
  source_type: string
}

function normalizeLinkedVpcs(raw: unknown): LinkedVPC[] {
  const rows = Array.isArray(raw) ? raw : []
  return rows.flatMap((row) => {
    const vpc = (row as { vpcs?: LinkedVPC | LinkedVPC[] | null }).vpcs
    if (Array.isArray(vpc)) return vpc
    return vpc ? [vpc] : []
  })
}

export default async function ContextPage({
  params }: {
  params: Promise<{ id: string; opp_id: string }>
}) {
  const { id, opp_id } = await params
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

  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', opp_id)
    .single()
  if (!opportunity) redirect(`/project/${id}/opportunities`)

  const { data: linkedRows } = await supabase
    .from('vpc_opportunities')
    .select('vpc_id, vpcs(id, customer_profile_name, source_type)')
    .eq('opportunity_id', opp_id)

  const { data: allVpcs } = await supabase
    .from('vpcs')
    .select('id, customer_profile_name, source_type')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  return (
    <ContextClient
      project={project}
      opportunity={opportunity}
      linkedVpcs={normalizeLinkedVpcs(linkedRows)}
      allVpcs={allVpcs ?? []}
    />
  )
}
