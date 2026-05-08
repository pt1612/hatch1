import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AbilitiesClient from './AbilitiesClient'

export const dynamic = 'force-dynamic'

export default async function AbilitiesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: project }, { data: abilities }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('abilities').select('*').eq('project_id', id).order('created_at', { ascending: true }),
  ])

  if (!project) redirect('/dashboard')

  return <AbilitiesClient project={project} initialAbilities={abilities ?? []} />
}
