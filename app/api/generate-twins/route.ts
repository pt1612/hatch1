import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const { projectInfo, segments, count } = await request.json()

  const ids = Array.from({ length: count }, (_, i) => `twin${i + 1}`)

  const hasSegments = segments && segments.length > 0
  const assignedSegments = hasSegments
    ? ids.map((_: string, i: number) => segments[i % segments.length])
    : null

  const segmentInstructions = hasSegments
    ? `MARKET SEGMENTS:
The following segments have been assigned to each twin:
${assignedSegments!.map((seg: string, i: number) => `- twin${i + 1}: "${seg}"`).join('\n')}

Each twin must represent their assigned segment convincingly. Twins sharing the same segment must have DISTINCT personas — vary their seniority, company size, behavioral style, and attitudes. The "segment" field for each twin must be set to exactly the segment name assigned above.`
    : `Create HIGHLY DIVERSE profiles that differ meaningfully in: role type and company size, digital maturity and tool adoption, urgency of the problem in their daily work, openness to switching solutions. Each twin's "segment" field should be a short descriptive label (e.g., "Budget-Conscious SME", "Enterprise Power User", "Tech-Forward Startup").`

  const prompt = `Create ${count} minimal digital twin customer profiles for startup validation.

Project: ${projectInfo.name}
Problem: ${projectInfo.problem}
Audience: ${projectInfo.target}
Solution: ${projectInfo.solution}

${segmentInstructions}

Return a JSON object with a "twins" array of exactly ${count} profiles. IDs must be: ${ids.join(', ')}.

Each profile has exactly these fields:
- id: one of ${ids.map((id: string) => `"${id}"`).join(', ')}
- name: string (realistic full name)
- occupation: string (job title, 2-4 words)
- segment: string (the market segment for this twin — see instructions above)
- context: string (ONE sentence: who they are and why this problem matters to them)

Return only valid complete JSON. Never truncate. If content is too long, shorten individual fields rather than cutting the JSON structure.
Return ONLY valid JSON, no other text.`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
  const match = raw.match(/\{[\s\S]*\}/)
  const parsed = match ? JSON.parse(match[0]) : {}
  return Response.json({ twins: parsed.twins ?? [] })
}
