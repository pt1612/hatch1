import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const { conversation } = await request.json()

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `Analyze this strategic conversation and extract core abilities/competencies that have been identified.

For each ability, provide:
- name: short label (2-5 words)
- description: 1-sentence description

Return ONLY a valid JSON array:
[
  {
    "name": "Low-Latency Data Streaming",
    "description": "Sub-millisecond processing for high-volume telemetry data."
  }
]

If no clear abilities are mentioned, return [].`,
    messages: [{ role: 'user', content: conversation }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
  const match = raw.match(/\[[\s\S]*\]/)
  const abilities = match ? JSON.parse(match[0]) : []
  return Response.json({ abilities })
}
