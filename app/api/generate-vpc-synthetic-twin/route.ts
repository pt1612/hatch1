import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYNTHETIC_TWIN_ID = 'vpc-synthetic-twin'

export async function POST(request: NextRequest) {
  try {
    const { segmentDescription, language } = await request.json()
    const text = typeof segmentDescription === 'string' ? segmentDescription.trim() : ''
    if (text.length < 10) {
      return Response.json({ error: 'Describe the target segment in at least a few words.' }, { status: 400 })
    }

    const langInstruction =
      language === 'it'
        ? 'All human-readable string fields must be in Italian.'
        : 'All human-readable string fields must be in English.'

    const prompt = `A founder is building a Value Proposition Canvas and wants a SINGLE believable "digital twin" customer persona to interview.

SEGMENT / CONTEXT (founder wrote):
${text.slice(0, 8000)}

${langInstruction}

Return ONLY valid JSON for ONE object with EXACTLY these keys (types matter):
{
  "id": "${SYNTHETIC_TWIN_ID}",
  "name": string (realistic full name),
  "role": string (job title, 2-5 words),
  "segment": string (short segment label echoing the founder input),
  "personality": string (one sentence: tone and attitude in interviews),
  "painPoints": string[] (3-5 short specific pains),
  "techLevel": "low" | "medium" | "high",
  "budgetTier": "low" | "mid" | "premium",
  "affinityLabel": "high_affinity" | "moderate" | "early_adopter",
  "occupation": string (same as role or slightly longer),
  "background": string (2-3 sentences: work context),
  "motivations": string[] (2-4 items)
}

The persona must be consistent with the segment description. Do not mention JSON or AI.`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }] })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const match = raw.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : {}

    const twin = {
      id: typeof parsed.id === 'string' ? parsed.id : SYNTHETIC_TWIN_ID,
      name: String(parsed.name ?? 'Alex Morgan'),
      role: String(parsed.role ?? 'Professional'),
      segment: String(parsed.segment ?? 'Target segment'),
      personality: String(parsed.personality ?? 'Pragmatic and concise.'),
      painPoints: Array.isArray(parsed.painPoints) && parsed.painPoints.length > 0
        ? parsed.painPoints.map(String).slice(0, 6)
        : ['Unclear priorities', 'Time pressure'],
      techLevel: ['low', 'medium', 'high'].includes(parsed.techLevel) ? parsed.techLevel : 'medium',
      budgetTier: ['low', 'mid', 'premium'].includes(parsed.budgetTier) ? parsed.budgetTier : 'mid',
      affinityLabel: ['high_affinity', 'moderate', 'early_adopter'].includes(parsed.affinityLabel)
        ? parsed.affinityLabel
        : 'moderate',
      occupation: String(parsed.occupation ?? parsed.role ?? 'Professional'),
      background: String(parsed.background ?? ''),
      motivations: Array.isArray(parsed.motivations) ? parsed.motivations.map(String).slice(0, 5) : [] }

    return Response.json({ twin })
  } catch (e) {
    console.error('[generate-vpc-synthetic-twin]', e)
    return Response.json({ error: 'Could not generate twin' }, { status: 500 })
  }
}
