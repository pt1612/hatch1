import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EvaluationsClient from './EvaluationsClient'

export const dynamic = 'force-dynamic'

export default async function EvaluationsPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  const oppIds = (opportunities ?? []).map((o) => o.id)
  let evaluatedIds: Set<string> = new Set()
  if (oppIds.length > 0) {
    const { data: evals } = await supabase
      .from('evaluations')
      .select('opportunity_id')
      .in('opportunity_id', oppIds)
      .not('report', 'is', null)
    evaluatedIds = new Set(evals?.map((e) => e.opportunity_id) ?? [])
  }

  const oppsWithStatus = (opportunities ?? []).map((o) => ({
    ...o,
    isEvaluated: evaluatedIds.has(o.id),
  }))

  return <EvaluationsClient project={project} opportunities={oppsWithStatus} />
}
