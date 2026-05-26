import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const { conversation } = await request.json()

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `Analyze this market opportunity evaluation conversation and extract scores (0-100) for each dimension based on what has been discussed.

Dimensions:
- reason_to_buy: Compelling reason to buy / customer urgency
- market_volume: Total addressable market size and growth
- economic_viability: Unit economics, margins, pricing power
- implementation_obstacles: Ease of implementation (invert: fewer obstacles = higher score)
- time_to_revenue: Speed to first revenue (invert: faster = higher score)
- external_risks: Regulatory, competitive, macro risks (invert: fewer risks = higher score)

Return ONLY valid JSON with scores 0-100 for dimensions that have been discussed. Use null for dimensions not yet discussed:
{
  "reason_to_buy": 85,
  "market_volume": 60,
  "economic_viability": null,
  "implementation_obstacles": 45,
  "time_to_revenue": 30,
  "external_risks": 25
}`,
    messages: [{ role: 'user', content: conversation }] })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
  const match = raw.match(/\{[\s\S]*\}/)
  const scores = match ? JSON.parse(match[0]) : {}
  return Response.json({ scores })
}
