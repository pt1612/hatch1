import { redirect } from 'next/navigation'
import TopNav from '@/components/TopNav'
import { createClient } from '@/lib/supabase/server'
import NewBMCClient from './NewBMCClient'

export const dynamic = 'force-dynamic'

export default async function NewBMCPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  const { data: vpcs } = await supabase
    .from('vpcs')
    .select('id, customer_profile_name, source_type, final_canvas, vpc_opportunities(opportunities(id, name))')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />
      <NewBMCClient project={project} vpcs={vpcs ?? []} />
    </div>
  )
}
