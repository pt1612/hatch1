import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ContextClient from './ContextClient'

export const dynamic = 'force-dynamic'

export default async function ContextPage({
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

  // If already evaluated, skip to report
  const { data: evaluation } = await supabase
    .from('evaluations')
    .select('id, report')
    .eq('opportunity_id', opp_id)
    .not('report', 'is', null)
    .maybeSingle()

  if (evaluation?.report) {
    redirect(`/project/${id}/opportunity/${opp_id}/report`)
  }

  return <ContextClient project={project} opportunity={opportunity} />
}
