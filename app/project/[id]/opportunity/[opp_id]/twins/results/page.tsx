import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ResultsClient from './ResultsClient'
import type { DigitalTwin, TwinMessage, TwinReport } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string; opp_id: string }>
}) {
  const { id, opp_id } = await params
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

  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', opp_id)
    .single()
  if (!opportunity) redirect(`/project/${id}/strategy`)

  // Load twins
  const { data: twinRows } = await supabase
    .from('twins')
    .select('*')
    .eq('opportunity_id', opp_id)
    .order('created_at', { ascending: true })

  if (!twinRows || twinRows.length === 0) {
    redirect(`/project/${id}/opportunity/${opp_id}/twins/setup`)
  }

  const twins: DigitalTwin[] = twinRows.map((row, i) => ({
    id: `twin${i + 1}`,
    dbId: row.id,
    name: row.name,
    role: row.role ?? '',
    segment: row.segment ?? '',
    personality: row.personality ?? '',
    painPoints: row.pain_points ?? [],
    techLevel: (row.tech_level ?? 'medium') as 'low' | 'medium' | 'high',
    budgetTier: (row.budget_tier ?? 'mid') as 'low' | 'mid' | 'premium',
    affinityLabel: (row.affinity_label ?? 'moderate') as
      | 'high_affinity'
      | 'moderate'
      | 'early_adopter',
  }))

  // Load twin_session (may contain saved report)
  const { data: twinSession } = await supabase
    .from('twin_sessions')
    .select('id, report')
    .eq('opportunity_id', opp_id)
    .maybeSingle()

  // Load interview messages (for passing to report generation)
  const dbTwinIds = twinRows.map((r) => r.id)
  const { data: interviews } = await supabase
    .from('twin_interviews')
    .select('twin_id, messages')
    .in('twin_id', dbTwinIds)

  // Merge all messages into one transcript
  let allMessages: TwinMessage[] = []
  if (interviews && interviews.length > 0) {
    const richest = interviews.reduce((best, iv) =>
      (iv.messages?.length ?? 0) > (best.messages?.length ?? 0) ? iv : best
    )
    allMessages = (richest.messages as TwinMessage[]) ?? []
  }

  const existingReport = (twinSession?.report as TwinReport) ?? null
  const twinSessionId = twinSession?.id ?? null

  return (
    <ResultsClient
      project={project}
      opportunity={opportunity}
      twins={twins}
      messages={allMessages}
      existingReport={existingReport}
      twinSessionId={twinSessionId}
    />
  )
}
