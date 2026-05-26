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

  // ── Fetch all step-status data in parallel ───────────────────────────────────
  const [evalsRes, twinsRes, sessionsRes, bmcRes] = await Promise.all([
    oppIds.length > 0
      ? supabase.from('evaluations').select('opportunity_id').in('opportunity_id', oppIds).not('report', 'is', null)
      : Promise.resolve({ data: [] }),
    oppIds.length > 0
      ? supabase.from('twins').select('id, opportunity_id').in('opportunity_id', oppIds)
      : Promise.resolve({ data: [] }),
    oppIds.length > 0
      ? supabase.from('twin_sessions').select('opportunity_id, vpc_value_map').in('opportunity_id', oppIds)
      : Promise.resolve({ data: [] }),
    oppIds.length > 0
      ? supabase.from('business_model_canvases').select('opportunity_id').in('opportunity_id', oppIds)
      : Promise.resolve({ data: [] }),
  ])

  const evaluatedIds = new Set(evalsRes.data?.map((e) => e.opportunity_id) ?? [])
  const allTwinRows = twinsRes.data ?? []
  const allTwinIds = allTwinRows.map((t) => t.id)

  // Fetch interview status (messages + results) for all twins
  const { data: interviewRows } = allTwinIds.length > 0
    ? await supabase
        .from('twin_interviews')
        .select('twin_id, messages, gains, pains, jobs_to_be_done')
        .in('twin_id', allTwinIds)
    : { data: [] }

  const sessionMap = new Map((sessionsRes.data ?? []).map((s) => [s.opportunity_id, s]))
  const bmcSet = new Set((bmcRes.data ?? []).map((b) => b.opportunity_id))

  const oppsWithStatus = (opportunities ?? []).map((opp) => {
    const oppTwins = allTwinRows.filter((t) => t.opportunity_id === opp.id)
    const oppTwinIds = new Set(oppTwins.map((t) => t.id))
    const oppInterviews = (interviewRows ?? []).filter((iv) => oppTwinIds.has(iv.twin_id))
    const session = sessionMap.get(opp.id)

    const hasVPC = (() => {
      if (!session?.vpc_value_map) return false
      const vm = session.vpc_value_map as Record<string, unknown>
      // new format: any array with length > 0
      return Object.values(vm).some((v) => Array.isArray(v) && v.length > 0)
    })()

    return {
      ...opp,
      isEvaluated: evaluatedIds.has(opp.id),
      hasTwins: oppTwins.length > 0,
      hasInterviews: oppInterviews.some((iv) => (iv.messages?.length ?? 0) > 0),
      hasResults: oppInterviews.some(
        (iv) =>
          (iv.gains?.length ?? 0) > 0 ||
          (iv.pains?.length ?? 0) > 0 ||
          (iv.jobs_to_be_done?.length ?? 0) > 0
      ),
      hasVPC,
      hasBMC: bmcSet.has(opp.id) }
  })

  return <EvaluationsClient project={project} opportunities={oppsWithStatus} />
}
