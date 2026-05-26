import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  // Enrich each project with progress data
  const enriched = await Promise.all(
    (projects ?? []).map(async (project) => {
      const { data: abilities } = await supabase
        .from('abilities')
        .select('id')
        .eq('project_id', project.id)

      const { data: opps } = await supabase
        .from('opportunities')
        .select('id, phase')
        .eq('project_id', project.id)

      const { data: strategy } = await supabase
        .from('strategies')
        .select('id, primary_opportunity_id')
        .eq('project_id', project.id)
        .maybeSingle()

      let evaluatedCount = 0
      if (opps?.length) {
        const oppIds = opps.map((o) => o.id)
        const { data: evals } = await supabase
          .from('evaluations')
          .select('opportunity_id')
          .in('opportunity_id', oppIds)
          .not('report', 'is', null)
        const unique = new Set(evals?.map((e) => e.opportunity_id) ?? [])
        evaluatedCount = unique.size
      }

      const hasAbilities = (abilities?.length ?? 0) > 0
      const hasOpps = (opps?.length ?? 0) > 0
      const allEvaluated =
        (opps?.length ?? 0) > 0 && evaluatedCount === (opps?.length ?? 0)
      const hasStrategy = !!strategy

      const completed_phases = [
        hasAbilities || hasOpps,
        evaluatedCount > 0,
        allEvaluated,
        hasStrategy,
      ]

      const next_route = hasStrategy
        ? `/project/${project.id}/strategy`
        : allEvaluated
        ? `/project/${project.id}/map`
        : evaluatedCount > 0
        ? `/project/${project.id}/evaluations`
        : hasOpps
        ? `/project/${project.id}/opportunities`
        : `/project/${project.id}/abilities`

      return {
        ...project,
        opportunity_count: opps?.length ?? 0,
        evaluated_count: evaluatedCount,
        completed_phases,
        next_route }
    })
  )

  return <DashboardClient projects={enriched} userId={user.id} userName={user.user_metadata?.full_name ?? ''} />
}
