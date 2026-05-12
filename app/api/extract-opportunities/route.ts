import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const { conversation, language } = await request.json()
  const langInstruction = language === 'it'
    ? 'Write all text fields (name, application, customer_segment, description) in Italian.'
    : 'Write all text fields in English.'

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: `You are a market strategist. You will receive a conversation where a founder described their skills and expertise. Generate a strict application × segment opportunity matrix from their capabilities.

${langInstruction}

MANDATORY STRUCTURE — follow exactly:

Step 1: Identify exactly 3 or 4 distinct APPLICATIONS (concrete products or services that could be built from their capabilities). Never fewer than 3, never more than 4.

Step 2: For each application, generate exactly 4 or 5 distinct CUSTOMER SEGMENTS that would use it. Never fewer than 4 segments per application, never more than 5.

Step 3: Output every (application × segment) pair as a separate JSON entry. The total number of entries must be between 12 and 20.

STRICT RULES:
- Even if the conversation is short or vague, you must infer enough from context to reach at least 12 entries. Use reasonable inference — do not return fewer than 12.
- Each application must be a concrete product/service concept, not a restatement of a skill.
- Segments must be specific and distinct from each other (e.g. "SME logistics managers", "hospital procurement teams") — not vague categories.
- Do not quote or reference the conversation. Generate from inferred capabilities only.
- Do not use phrases like "based on what you said" or "you mentioned".

OUTPUT FORMAT — return ONLY a valid JSON array, no other text:
[
  {
    "name": "<application name> for <segment>",
    "application": "<application name>",
    "customer_segment": "<specific segment>",
    "description": "<one sentence on why this pair makes sense>"
  },
  ...
]

Example with 3 applications × 4 segments = 12 entries minimum:
Application A → Segment 1, Segment 2, Segment 3, Segment 4
Application B → Segment 1, Segment 2, Segment 3, Segment 4
Application C → Segment 1, Segment 2, Segment 3, Segment 4`,
    messages: [{ role: 'user', content: conversation }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
  const match = raw.match(/\[[\s\S]*\]/)
  const opportunities = match ? JSON.parse(match[0]) : []
  return Response.json({ opportunities })
}
