import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OpportunitiesClient from './OpportunitiesClient'

export const dynamic = 'force-dynamic'

export default async function OpportunitiesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!project) redirect('/dashboard')

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  const oppIds = (opportunities ?? []).map((o) => o.id)
  let evaluations: { id: string; opportunity_id: string; report: unknown }[] = []
  if (oppIds.length > 0) {
    const { data } = await supabase
      .from('evaluations')
      .select('id, opportunity_id, report')
      .in('opportunity_id', oppIds)
    evaluations = data ?? []
  }

  return (
    <OpportunitiesClient
      project={project}
      opportunities={opportunities ?? []}
      evaluations={evaluations}
    />
  )
}
