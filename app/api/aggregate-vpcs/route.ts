import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { project_id, source_vpc_ids }: { project_id: string; source_vpc_ids: string[] } =
      await request.json()

    if (!source_vpc_ids || source_vpc_ids.length < 2) {
      return Response.json({ error: 'At least 2 VPCs required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Load source VPCs
    const { data: sourceVpcs, error: loadErr } = await supabase
      .from('vpcs')
      .select('id, name, customer_profile, value_map, project_id')
      .in('id', source_vpc_ids)

    if (loadErr || !sourceVpcs || sourceVpcs.length < 2) {
      return Response.json({ error: 'Failed to load source VPCs' }, { status: 400 })
    }

    // Verify all VPCs belong to the project
    const allSameProject = sourceVpcs.every(v => v.project_id === project_id)
    if (!allSameProject) {
      return Response.json({ error: 'VPCs must belong to the same project' }, { status: 400 })
    }

    // Build AI prompt for aggregation
    const vpcDescriptions = sourceVpcs.map((v, i) => {
      const cp = v.customer_profile as { jobs: string[]; pains: string[]; gains: string[] }
      return `VPC ${i + 1} — "${v.name}":
Jobs: ${cp.jobs?.join(', ') || '(none)'}
Pains: ${cp.pains?.join(', ') || '(none)'}
Gains: ${cp.gains?.join(', ') || '(none)'}`
    }).join('\n\n')

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
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const match = raw.match(/\{[\s\S]*\}/)
    const parsed = match
      ? JSON.parse(match[0])
      : { segment_name: 'Aggregated Segment', jobs: [], pains: [], gains: [] }

    // Create the aggregate VPC
    const { data: newVpc, error: insertErr } = await supabase
      .from('vpcs')
      .insert({
        project_id,
        opportunity_id: null,
        twin_id: null,
        name: parsed.segment_name ?? 'Aggregated Segment',
        is_aggregate: true,
        customer_profile: {
          jobs: parsed.jobs ?? [],
          pains: parsed.pains ?? [],
          gains: parsed.gains ?? [],
        },
        value_map: null,
      })
      .select('*')
      .single()

    if (insertErr || !newVpc) {
      return Response.json({ error: 'Failed to create aggregate VPC' }, { status: 500 })
    }

    // Link source VPCs
    const aggregateRows = source_vpc_ids.map(sid => ({
      aggregate_vpc_id: newVpc.id,
      source_vpc_id: sid,
    }))
    await supabase.from('vpc_aggregates').insert(aggregateRows)

    return Response.json({ vpc: newVpc, reasoning: parsed.reasoning })
  } catch (err) {
    console.error('[aggregate-vpcs] error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
