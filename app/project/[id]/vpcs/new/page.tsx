import { redirect } from 'next/navigation'
import TopNav from '@/components/TopNav'
import { createClient } from '@/lib/supabase/server'
import NewVPCClient from './NewVPCClient'

export const dynamic = 'force-dynamic'

export default async function NewVPCPage({
  params }: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user } } = await supabase.auth.getUser()
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
    .select('id, name, customer_segment')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />
      <NewVPCClient project={project} opportunities={opportunities ?? []} />
    </div>
  )
}
