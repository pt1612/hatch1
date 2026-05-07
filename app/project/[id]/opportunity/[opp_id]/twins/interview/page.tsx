import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InterviewClient from './InterviewClient'
import type { DigitalTwin, TwinMessage } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function InterviewPage({
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

  // Load twins ordered by created_at so index is stable
  const { data: twinRows } = await supabase
    .from('twins')
    .select('*')
    .eq('opportunity_id', opp_id)
    .order('created_at', { ascending: true })

  // Convert DB rows → DigitalTwin using stable index-based ids (twin1, twin2 …)
  const twins: DigitalTwin[] = (twinRows ?? []).map((row, i) => ({
    id: `twin${i + 1}`,
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

  // Map twin.id (twin1…) → actual DB UUID, used for upserting twin_interviews
  const twinDbIds: Record<string, string> = {}
  ;(twinRows ?? []).forEach((row, i) => {
    twinDbIds[`twin${i + 1}`] = row.id
  })

  // Load existing twin_interviews to restore messages
  const dbTwinIds = (twinRows ?? []).map((r) => r.id)
  const { data: interviews } = await supabase
    .from('twin_interviews')
    .select('id, twin_id, messages')
    .in('twin_id', dbTwinIds)

  // Build existingInterviewIds: twin.id → interview row uuid
  const existingInterviewIds: Record<string, string> = {}
  if (interviews) {
    ;(twinRows ?? []).forEach((row, i) => {
      const found = interviews.find((iv) => iv.twin_id === row.id)
      if (found) existingInterviewIds[`twin${i + 1}`] = found.id
    })
  }

  // Restore messages from the interview row with the most content
  let existingMessages: TwinMessage[] = []
  if (interviews && interviews.length > 0) {
    const richest = interviews.reduce((best, iv) =>
      (iv.messages?.length ?? 0) > (best.messages?.length ?? 0) ? iv : best
    )
    existingMessages = (richest.messages as TwinMessage[]) ?? []
  }

  return (
    <InterviewClient
      project={project}
      opportunity={opportunity}
      twins={twins}
      twinDbIds={twinDbIds}
      existingMessages={existingMessages}
      existingInterviewIds={existingInterviewIds}
    />
  )
}
