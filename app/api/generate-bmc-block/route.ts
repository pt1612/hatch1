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

export async function POST(request: NextRequest) {
  const { block, opportunityName, opportunityDescription, abilities, existingBlocks } =
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

  const prompt = `You are a business model expert helping a founder build a Business Model Canvas for a specific market opportunity.

Opportunity: ${opportunityName}
Description: ${opportunityDescription}

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

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
  const match = raw.match(/\[[\s\S]*\]/)
  const items = match ? JSON.parse(match[0]) : []

  return Response.json({ items })
}
