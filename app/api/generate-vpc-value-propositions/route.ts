import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type Body = {
  // Structured left-side of a VPC (used when synthesizing from a linked VPC)
  productsAndServices?: string[]
  painRelievers?: string[]
  gainCreators?: string[]
  // Free-text VPC description (used by the "Import VPC as text" entry path)
  rawText?: string
  customerProfileName?: string
  segment?: string
}

export async function POST(request: NextRequest) {
  try {
    const {
      productsAndServices = [],
      painRelievers = [],
      gainCreators = [],
      rawText = '',
      customerProfileName,
      segment }: Body = await request.json()

    const hasStructured =
      productsAndServices.length > 0 || painRelievers.length > 0 || gainCreators.length > 0
    const hasRaw = rawText.trim().length > 0

    if (!hasStructured && !hasRaw) {
      return Response.json({ items: [] })
    }

    const audience = [customerProfileName, segment].filter(Boolean).join(' — ')

    const sourceBlock = hasStructured
      ? `Value Proposition Canvas — left side (the offering):
Products & Services: ${productsAndServices.length > 0 ? productsAndServices.join(' | ') : '(none)'}
Pain Relievers: ${painRelievers.length > 0 ? painRelievers.join(' | ') : '(none)'}
Gain Creators: ${gainCreators.length > 0 ? gainCreators.join(' | ') : '(none)'}`
      : `Value Proposition description (free text):
${rawText.trim()}`

    const prompt = `You are a business model expert helping a founder fill the "Value Propositions" block of a Business Model Canvas.
${audience ? `\nThis value proposition is for: ${audience}\n` : ''}
${sourceBlock}

Synthesize 3-5 clear Value Proposition statements that distill the material above.
Do NOT copy the source items verbatim — combine and rephrase them into coherent value proposition statements that express the value delivered to the customer.
Each item must be a short phrase of at most 10 words — no full sentences.
Detect the language of the source material and respond in that language.

Return only valid complete JSON. Never truncate.
Respond ONLY with a JSON array of strings, no other text.
Example: ["Item 1", "Item 2", "Item 3"]`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }] })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
    const match = raw.match(/\[[\s\S]*\]/)
    const items: string[] = match ? JSON.parse(match[0]) : []
    return Response.json({ items })
  } catch (err) {
    console.error('[generate-vpc-value-propositions] error:', err)
    return Response.json({ error: String(err), items: [] }, { status: 500 })
  }
}
