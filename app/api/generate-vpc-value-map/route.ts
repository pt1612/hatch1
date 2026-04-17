import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: NextRequest) {
  const {
    opportunityName,
    opportunityDescription,
    abilities,
    aggregatedPains,
    aggregatedGains,
    aggregatedJobs,
  } = await request.json()

  const abilitiesText =
    abilities && abilities.length > 0
      ? abilities.map((a: { name: string; description: string }) => `- ${a.name}: ${a.description}`).join('\n')
      : '(none provided)'

  const prompt = `You are helping a founder define their Value Proposition for a specific market opportunity.

Opportunity: ${opportunityName}
Description: ${opportunityDescription}

Their core abilities:
${abilitiesText}

What customers need (from interviews):
Jobs to be Done: ${aggregatedJobs.length > 0 ? aggregatedJobs.join(', ') : '(none)'}
Pains: ${aggregatedPains.length > 0 ? aggregatedPains.join(', ') : '(none)'}
Gains: ${aggregatedGains.length > 0 ? aggregatedGains.join(', ') : '(none)'}

Based on this, suggest:
1. Products & Services (3-5 items): the specific offerings they could bring to market
2. Pain Relievers (3-5 items): how their offering addresses each key pain
3. Gain Creators (3-5 items): how their offering creates the gains customers want

Detect the language from the opportunity description and respond in that language.

Respond ONLY with a JSON object, no other text:
{
  "productsAndServices": ["...", "..."],
  "painRelievers": ["...", "..."],
  "gainCreators": ["...", "..."]
}`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1200,
    temperature: 0.7,
  })

  const raw = completion.choices[0].message.content || '{}'
  const match = raw.match(/\{[\s\S]*\}/)
  const valueMap = match ? JSON.parse(match[0]) : { productsAndServices: [], painRelievers: [], gainCreators: [] }

  return Response.json({ valueMap })
}
