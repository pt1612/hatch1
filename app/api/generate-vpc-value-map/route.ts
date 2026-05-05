import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type ExistingVPCItems = {
  productsAndServices: string[]
  painRelievers: string[]
  gainCreators: string[]
}

type TwinProfile = {
  name: string
  role: string
  segment: string
}

export async function POST(request: NextRequest) {
  const {
    opportunityName,
    opportunityDescription,
    abilities,
    aggregatedPains,
    aggregatedGains,
    aggregatedJobs,
    twinProfile,
    existingVPCItems,
  }: {
    opportunityName: string
    opportunityDescription: string
    abilities: { name: string; description: string }[]
    aggregatedPains: string[]
    aggregatedGains: string[]
    aggregatedJobs: string[]
    twinProfile?: TwinProfile
    existingVPCItems?: ExistingVPCItems
  } = await request.json()

  const abilitiesText =
    abilities && abilities.length > 0
      ? abilities.map((a) => `- ${a.name}: ${a.description}`).join('\n')
      : '(none provided)'

  const hasExistingItems =
    existingVPCItems &&
    ((existingVPCItems.productsAndServices?.length ?? 0) > 0 ||
      (existingVPCItems.painRelievers?.length ?? 0) > 0 ||
      (existingVPCItems.gainCreators?.length ?? 0) > 0)

  let prompt: string

  if (hasExistingItems && twinProfile) {
    // Subset-selection mode: pick from the main VPC what applies to this twin
    prompt = `You are helping a founder identify which value proposition items genuinely apply to a specific customer persona.

Persona: ${twinProfile.name} — ${twinProfile.role} in the "${twinProfile.segment}" segment.

Their specific needs from interviews:
Jobs to be Done: ${aggregatedJobs.length > 0 ? aggregatedJobs.join(', ') : '(none)'}
Pains: ${aggregatedPains.length > 0 ? aggregatedPains.join(', ') : '(none)'}
Gains: ${aggregatedGains.length > 0 ? aggregatedGains.join(', ') : '(none)'}

Available items from the main Value Proposition Canvas (left side):
Products & Services: ${existingVPCItems!.productsAndServices.length > 0 ? existingVPCItems!.productsAndServices.join(' | ') : '(none)'}
Pain Relievers: ${existingVPCItems!.painRelievers.length > 0 ? existingVPCItems!.painRelievers.join(' | ') : '(none)'}
Gain Creators: ${existingVPCItems!.gainCreators.length > 0 ? existingVPCItems!.gainCreators.join(' | ') : '(none)'}

Select only the gain creators, pain relievers, and products & services that are genuinely relevant to this specific persona. Choose 2–4 items per section maximum. Only include items that appear in the lists above — do not invent new ones. Exclude anything that would not realistically apply to this persona's role, budget, or context.

Detect the language from the persona description and respond in that language.

Return only valid complete JSON. Respond ONLY with a JSON object, no other text:
{
  "productsAndServices": ["...", "..."],
  "painRelievers": ["...", "..."],
  "gainCreators": ["...", "..."]
}`
  } else {
    // Generation mode: create items tailored to this twin (or generic if no twin profile)
    const twinContext = twinProfile
      ? `\nThis value map is for: ${twinProfile.name} — ${twinProfile.role} in the "${twinProfile.segment}" segment. Tailor every item specifically to this persona's role, context, and realistic priorities.\n`
      : ''

    prompt = `You are helping a founder define their Value Proposition for a specific market opportunity.

Opportunity: ${opportunityName}
Description: ${opportunityDescription}
${twinContext}
Their core abilities:
${abilitiesText}

What customers need (from interviews):
Jobs to be Done: ${aggregatedJobs.length > 0 ? aggregatedJobs.join(', ') : '(none)'}
Pains: ${aggregatedPains.length > 0 ? aggregatedPains.join(', ') : '(none)'}
Gains: ${aggregatedGains.length > 0 ? aggregatedGains.join(', ') : '(none)'}

Based on this, suggest:
1. Products & Services (2-4 items): the specific offerings most relevant to this persona
2. Pain Relievers (2-4 items): how the offering addresses this persona's key pains
3. Gain Creators (2-4 items): how the offering creates the gains this persona wants

Each item must be a short phrase of at most 10 words — no full sentences.
Detect the language from the opportunity description and respond in that language.

Return only valid complete JSON. Never truncate. If content is too long, shorten individual items rather than cutting the JSON structure.
Respond ONLY with a JSON object, no other text:
{
  "productsAndServices": ["...", "..."],
  "painRelievers": ["...", "..."],
  "gainCreators": ["...", "..."]
}`
  }

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
  const match = raw.match(/\{[\s\S]*\}/)
  const valueMap = match ? JSON.parse(match[0]) : { productsAndServices: [], painRelievers: [], gainCreators: [] }

  return Response.json({ valueMap })
}
