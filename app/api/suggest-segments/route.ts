import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const { name, description, customer_segment } = await request.json()

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `The following market opportunity targets a specific customer segment. Generate 3-5 distinct sub-segments or personas that exist within that segment.

Opportunity: ${name}
Description: ${description}
Customer segment: ${customer_segment}

Each sub-segment must be a specific type of person or organization that falls within "${customer_segment}". Vary them by seniority, company size, specialization, or context — do not repeat the parent segment.

Respond ONLY with a JSON array of strings. No other text.
Example for segment "Hospital procurement teams": ["Large hospital network procurement directors", "Regional clinic purchasing managers", "Independent hospital CFOs"]` },
    ] })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
  const match = raw.match(/\[[\s\S]*\]/)
  const segments = match ? JSON.parse(match[0]) : []
  return Response.json({ segments })
}
