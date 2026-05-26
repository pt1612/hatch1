import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TwinSetupClient from './TwinSetupClient'

export const dynamic = 'force-dynamic'

export default async function TwinSetupPage({
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
  if (!opportunity) redirect(`/project/${id}/strategy`)

  // Load existing twin session and twins if any
  const { data: twinSession } = await supabase
    .from('twin_sessions')
    .select('*')
    .eq('opportunity_id', opp_id)
    .maybeSingle()

  const { data: existingTwins } = await supabase
    .from('twins')
    .select('*')
    .eq('opportunity_id', opp_id)
    .order('created_at', { ascending: true })

  return (
    <TwinSetupClient
      project={project}
      opportunity={opportunity}
      twinSession={twinSession}
      existingTwins={existingTwins ?? []}
    />
  )
}
