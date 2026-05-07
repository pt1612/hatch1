import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const BLOCK_LABELS: Record<string, string> = {
  customer_relationships: 'Customer Relationships',
  channels: 'Channels',
  key_activities: 'Key Activities',
  key_resources: 'Key Resources',
  key_partners: 'Key Partners',
  revenue_streams: 'Revenue Streams',
  cost_structure: 'Cost Structure',
}

type VPCSection = { text: string; twinIdx: number }[]
type VPCWithAttribution = Record<string, VPCSection>

export async function POST(request: NextRequest) {
  const { block, opportunityName, opportunityDescription, abilities, existingBlocks,
          isAggregate, vpcWithAttribution, twinSegment, twinProfile, twinVPCData } =
    await request.json()

  const abilitiesText =
    abilities?.length > 0
      ? abilities
          .map((a: { name: string; description: string }) => `- ${a.name}: ${a.description}`)
          .join('\n')
      : '(none provided)'

  const definedLines = [
    `Value Propositions: ${existingBlocks.value_propositions?.join(', ') || '(none)'}`,
    `Customer Segments: ${existingBlocks.customer_segments?.join(', ') || '(none)'}`,
    existingBlocks.customer_relationships?.length
      ? `Customer Relationships: ${existingBlocks.customer_relationships.join(', ')}`
      : null,
    existingBlocks.channels?.length
      ? `Channels: ${existingBlocks.channels.join(', ')}`
      : null,
    existingBlocks.key_activities?.length
      ? `Key Activities: ${existingBlocks.key_activities.join(', ')}`
      : null,
    existingBlocks.key_resources?.length
      ? `Key Resources: ${existingBlocks.key_resources.join(', ')}`
      : null,
    existingBlocks.key_partners?.length
      ? `Key Partners: ${existingBlocks.key_partners.join(', ')}`
      : null,
    existingBlocks.revenue_streams?.length
      ? `Revenue Streams: ${existingBlocks.revenue_streams.join(', ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n')

  let prompt: string

  if (isAggregate && vpcWithAttribution) {
    // Build a labelled VPC context string tagging each item with its source twin
    const vpc = vpcWithAttribution as VPCWithAttribution
    const vpcContext = Object.entries(vpc)
      .filter(([, items]) => items.length > 0)
      .map(([section, items]) =>
        `${section}: ${items.map((i) => i.twinIdx >= 0 ? `[Twin${i.twinIdx}] ${i.text}` : i.text).join(', ')}`
      )
      .join('\n')

    prompt = `You are a business model expert helping a founder build a Business Model Canvas for a specific market opportunity.

Opportunity: ${opportunityName}
Description: ${opportunityDescription}

Their core abilities:
${abilitiesText}

Already defined blocks:
${definedLines}

The aggregate Value Proposition Canvas (each item tagged with its source twin in [TwinN]):
${vpcContext || '(no VPC items yet)'}

Generate 4-6 specific, concrete items for the "${BLOCK_LABELS[block]}" block.
Items must be consistent with the defined blocks and inspired by the VPC above.
Be specific and actionable — avoid generic items.
Each item must be a short phrase of at most 8 words — no full sentences.
For each item, identify which twin indices (0-based) from the VPC influenced it.
Detect the language from the opportunity description and respond in that language.

Return only valid complete JSON. Never truncate.
Respond ONLY with a JSON array of objects, no other text.
Example: [{ "text": "Item 1", "source_twins": [0, 1] }, { "text": "Item 2", "source_twins": [0] }]`
  } else {
    // Build optional VPC context for twin-specific generation
    let twinVPCContext = ''
    if (twinProfile && twinVPCData) {
      const vd = twinVPCData as Record<string, string[]>
      const ps = (vd.productsAndServices ?? []).join(' | ') || '(none)'
      const pr = (vd.painRelievers ?? []).join(' | ') || '(none)'
      const gc = (vd.gainCreators ?? []).join(' | ') || '(none)'
      twinVPCContext = `
Twin profile: ${twinProfile.name} — ${twinProfile.role} in the "${twinProfile.segment}" segment.

This twin's Value Proposition Canvas (select 2–4 items per section that are most relevant to this twin):
Products & Services: ${ps}
Pain Relievers: ${pr}
Gain Creators: ${gc}

For the "Value Propositions" block, select only 2–4 items from the VPC above that genuinely apply to this twin — do not include all items, only the most relevant ones.
`
    }

    prompt = `You are a business model expert helping a founder build a Business Model Canvas for a specific market opportunity.

Opportunity: ${opportunityName}
Description: ${opportunityDescription}
${twinSegment ? `\nFocusing on customer segment: ${twinSegment}\n` : ''}${twinVPCContext}
Their core abilities:
${abilitiesText}

Already defined blocks:
${definedLines}

Generate 4-6 specific, concrete items for the "${BLOCK_LABELS[block]}" block of the Business Model Canvas.
Items must be consistent with the already defined blocks above.
Be specific and actionable — avoid generic items.
Each item must be a short phrase of at most 8 words — no full sentences.
Detect the language from the opportunity description and respond in that language.

Return only valid complete JSON. Never truncate. If content is too long, shorten individual items rather than cutting the JSON structure.
Respond ONLY with a JSON array of strings, no other text.
Example: ["Item 1", "Item 2", "Item 3"]`
  }

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '[]'

  if (isAggregate && vpcWithAttribution) {
    const match = raw.match(/\[[\s\S]*\]/)
    const attribution: { text: string; source_twins: number[] }[] = match ? JSON.parse(match[0]) : []
    return Response.json({ items: attribution.map((a) => a.text), attribution })
  } else {
    const match = raw.match(/\[[\s\S]*\]/)
    const items = match ? JSON.parse(match[0]) : []
    return Response.json({ items })
  }
}
