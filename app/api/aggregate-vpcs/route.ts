import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { project_id, source_vpc_ids }: { project_id: string; source_vpc_ids: string[] } =
      await request.json()

    console.log('[aggregate-vpcs] request:', { project_id, source_vpc_ids })

    if (!source_vpc_ids || source_vpc_ids.length < 2) {
      return Response.json({ error: 'At least 2 VPCs required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Load source VPCs (new schema: customer_profile_name, no twin_id / opportunity_id columns)
    const { data: sourceVpcs, error: loadErr } = await supabase
      .from('vpcs')
      .select('id, customer_profile_name, customer_profile, value_map, project_id')
      .in('id', source_vpc_ids)

    if (loadErr) {
      console.error('[aggregate-vpcs] load error:', loadErr)
      return Response.json({ error: `Load failed: ${loadErr.message}`, details: loadErr }, { status: 500 })
    }
    if (!sourceVpcs || sourceVpcs.length < 2) {
      console.error('[aggregate-vpcs] not enough source VPCs:', sourceVpcs?.length)
      return Response.json({ error: 'Failed to load source VPCs (need at least 2)' }, { status: 400 })
    }

    const allSameProject = sourceVpcs.every((v) => v.project_id === project_id)
    if (!allSameProject) {
      return Response.json({ error: 'VPCs must belong to the same project' }, { status: 400 })
    }

    // Build AI prompt
    const vpcDescriptions = sourceVpcs
      .map((v, i) => {
        const cp = (v.customer_profile ?? {}) as { jobs?: string[]; pains?: string[]; gains?: string[] }
        return `VPC ${i + 1} — "${v.customer_profile_name}":
Jobs: ${cp.jobs?.join(', ') || '(none)'}
Pains: ${cp.pains?.join(', ') || '(none)'}
Gains: ${cp.gains?.join(', ') || '(none)'}`
      })
      .join('\n\n')

    const n = sourceVpcs.length
    const prompt = `You are synthesizing customer research from ${n} distinct user profiles into a coherent aggregate customer segment.

${vpcDescriptions}

Your task: identify the intersection — elements that appear in at least 2 of the ${n} profiles, OR that are semantically similar across profiles. Do NOT average or blend — only include items with real evidence across multiple sources. Explain your reasoning briefly for each item kept.

Return a JSON object ONLY (no other text):
{
  "segment_name": "Short synthetic segment name (4-8 words)",
  "jobs": ["item 1", "item 2"],
  "pains": ["item 1", "item 2"],
  "gains": ["item 1", "item 2"],
  "reasoning": "1-2 sentences explaining what unifies these profiles"
}`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }] })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const match = raw.match(/\{[\s\S]*\}/)
    const parsed = match
      ? JSON.parse(match[0])
      : { segment_name: 'Aggregated Segment', jobs: [], pains: [], gains: [] }

    const segmentName: string = parsed.segment_name ?? 'Aggregated Segment'
    const customerProfile = {
      jobs: parsed.jobs ?? [],
      pains: parsed.pains ?? [],
      gains: parsed.gains ?? [] }
    const valueMap = { productsAndServices: [], painRelievers: [], gainCreators: [] }
    const finalCanvas = {
      productsAndServices: [],
      painRelievers: [],
      gainCreators: [],
      jobs: customerProfile.jobs,
      pains: customerProfile.pains,
      gains: customerProfile.gains }
    const interviewAttachment = {
      version: 1,
      kind: 'aggregate',
      source_vpc_ids,
      reasoning: parsed.reasoning ?? null }

    console.log('[aggregate-vpcs] inserting aggregate VPC:', { project_id, segmentName, source_count: n })

    const { data: newVpc, error: insertErr } = await supabase
      .from('vpcs')
      .insert({
        project_id,
        customer_profile_name: segmentName,
        source_type: 'aggregate',
        customer_profile: customerProfile,
        value_map: valueMap,
        final_canvas: finalCanvas,
        interview_attachment: interviewAttachment,
        is_aggregate: true })
      .select('*')
      .single()

    if (insertErr || !newVpc) {
      console.error('[aggregate-vpcs] insert error:', insertErr)
      return Response.json(
        { error: `Insert failed: ${insertErr?.message ?? 'unknown'}`, details: insertErr },
        { status: 500 }
      )
    }

    console.log('[aggregate-vpcs] inserted aggregate VPC id:', newVpc.id)

    const aggregateRows = source_vpc_ids.map((sid) => ({
      aggregate_vpc_id: newVpc.id,
      source_vpc_id: sid }))
    const { error: linkErr } = await supabase.from('vpc_aggregates').insert(aggregateRows)

    if (linkErr) {
      console.error('[aggregate-vpcs] vpc_aggregates link error:', linkErr)
      return Response.json(
        {
          error: `Aggregate row created (id=${newVpc.id}) but source linking failed: ${linkErr.message}. Verify migration 010_vpc_aggregates.sql is applied (vpc_aggregates table must exist).`,
          details: linkErr,
          vpc: newVpc },
        { status: 500 }
      )
    }

    console.log('[aggregate-vpcs] linked', aggregateRows.length, 'source VPCs')

    return Response.json({ vpc: newVpc, reasoning: parsed.reasoning })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[aggregate-vpcs] unhandled error:', err)
    return Response.json({ error: msg }, { status: 500 })
  }
}
