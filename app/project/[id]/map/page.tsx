import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MapClient from './MapClient'

export const dynamic = 'force-dynamic'

export default async function MapPage({ params }: { params: Promise<{ id: string }> }) {
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

  const oppIds = (opportunities ?? []).map((o) => o.id)
  let evaluations: { opportunity_id: string; report: unknown }[] = []
  if (oppIds.length > 0) {
    const { data } = await supabase
      .from('evaluations')
      .select('opportunity_id, report')
      .in('opportunity_id', oppIds)
    evaluations = data ?? []
  }

  const evalMap = evaluations.reduce<Record<string, unknown>>((acc, e) => {
    acc[e.opportunity_id] = e.report
    return acc
  }, {})

  const oppsWithReport = (opportunities ?? []).map((o) => ({
    ...o,
    report: evalMap[o.id] ?? null }))

  return <MapClient project={project} opportunities={oppsWithReport} />
}
