import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReportClient from './ReportClient'

export const dynamic = 'force-dynamic'

export default async function ReportPage({
  params,
}: {
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

  const { data: evaluation } = await supabase
    .from('evaluations')
    .select('*')
    .eq('opportunity_id', opp_id)
    .maybeSingle()

  return (
    <ReportClient
      project={project}
      opportunity={opportunity}
      existingEvaluation={evaluation}
    />
  )
}
