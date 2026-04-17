import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StrategyClient from './StrategyClient'

export const dynamic = 'force-dynamic'

export default async function StrategyPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: existingStrategy } = await supabase
    .from('strategies')
    .select('*')
    .eq('project_id', id)
    .maybeSingle()

  return (
    <StrategyClient
      project={project}
      opportunities={opportunities ?? []}
      existingStrategy={existingStrategy}
    />
  )
}
