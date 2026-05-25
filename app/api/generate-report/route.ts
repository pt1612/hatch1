import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { numericToLabel } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const { opportunityName, application, customerSegment, description, userContext, language } =
    await request.json()

  const langInstruction = language === 'it'
    ? 'Write the entire report in Italian. Use Italian for all text fields (analysis, executive_summary, etc.).'
    : 'Write the entire report in English.'
  const contextInstruction = userContext ? `Additional context: "${userContext}".` : ''

  const systemPrompt = `You are an expert market strategist evaluating a specific market opportunity using the Market Opportunity Navigator framework.

${langInstruction}
${contextInstruction}

Evaluate the following market opportunity across 6 dimensions using a numeric scale of 1-10 for each.

OPPORTUNITY DETAILS:
- Name: ${opportunityName}
- Application: ${application}
- Customer Segment: ${customerSegment}
- Description: ${description}

SCORING FRAMEWORK:

─── POTENTIAL DIMENSIONS (higher score = more attractive) ───

reason_to_buy (1–10):
  1–3: Nice-to-have, easily ignored, no urgency
  4–5: Real need but not urgent, some alternatives exist
  6–8: Strong pain point, customers actively seeking solutions
  9–10: Burning problem, customers will pay a premium immediately

market_volume (1–10):
  1–3: Niche market, TAM < $50M
  4–5: Moderate market, $50M–$500M TAM
  6–8: Large market, $500M–$10B TAM with solid growth
  9–10: Massive market, >$10B TAM with explosive growth

economic_viability (1–10):
  1–3: Poor unit economics, thin or negative margins
  4–5: Viable but thin margins (<30%), tough pricing power
  6–8: Strong margins (>50%), good pricing power or recurring revenue
  9–10: Exceptional margins (>80%), network effects or platform dynamics

─── CHALLENGE DIMENSIONS (higher score = more difficult) ───

implementation_obstacles (1–10):
  1–3: Easy to build, minimal technical/regulatory barriers
  4–5: Some complexity, manageable with standard resources
  6–8: Significant technical, regulatory, or partnership challenges
  9–10: Near-impossible without major breakthroughs or resources

time_to_revenue (1–10):
  1–3: Revenue within weeks to 3 months
  4–5: 3–12 months to first meaningful revenue
  6–8: 1–3 years before significant revenue
  9–10: 3+ years before revenue, long sales cycles or regulatory delays

external_risks (1–10):
  1–3: Stable market, low regulatory risk, few strong competitors
  4–5: Some competition, manageable regulatory landscape
  6–8: Strong incumbents or regulatory risk, macro uncertainty
  9–10: Existential risks — monopolistic incumbents, regulatory bans, rapid tech disruption

IMPORTANT:
- Be specific and data-driven. Avoid vague or overly optimistic assessments.
- Use the full scale — avoid defaulting to mid-range scores.
- STRICT LENGTH LIMIT: each dimension's detailed_analysis MUST be at most 2 sentences (hard cap — do not exceed under any circumstances; shorten rather than truncate the JSON).
- The summary must be 2–3 sentences maximum.
- Return complete, valid JSON. Never truncate. If you are approaching the token budget, shorten field values, do not cut off the JSON structure.

Return ONLY valid JSON in this exact format:
{
  "summary": "3-4 sentence synthesis across all 6 dimensions.",
  "overall_potential": "high",
  "overall_challenge": "mid",
  "dimensions": {
    "reason_to_buy": {
      "numeric_score": 7,
      "score": "high",
      "detailed_analysis": "..."
    },
    "market_volume": {
      "numeric_score": 5,
      "score": "mid",
      "detailed_analysis": "..."
    },
    "economic_viability": {
      "numeric_score": 8,
      "score": "high",
      "detailed_analysis": "..."
    },
    "implementation_obstacles": {
      "numeric_score": 4,
      "score": "mid",
      "detailed_analysis": "..."
    },
    "time_to_revenue": {
      "numeric_score": 3,
      "score": "low",
      "detailed_analysis": "..."
    },
    "external_risks": {
      "numeric_score": 6,
      "score": "high",
      "detailed_analysis": "..."
    }
  }
}`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: systemPrompt }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
  console.log('[generate-report] raw LLM response:', raw)
  const match = raw.match(/\{[\s\S]*\}/)

  let parsed: Record<string, unknown> = {}
  if (match) {
    try {
      parsed = JSON.parse(match[0])
    } catch (parseErr) {
      console.error('[generate-report] JSON.parse failed:', parseErr)
      console.error('[generate-report] full raw response that failed to parse:', raw)
      console.error('[generate-report] matched substring length:', match[0].length)
      console.error('[generate-report] last 200 chars of matched substring:', match[0].slice(-200))
      return Response.json(
        { report: null, error: 'LLM response was not valid JSON (likely truncated). See server logs for the full raw response.' },
        { status: 500 }
      )
    }
  } else {
    console.error('[generate-report] no JSON object found in raw response:', raw)
  }
  console.log('[generate-report] parsed JSON:', JSON.stringify(parsed, null, 2))

  type Dim = { numeric_score: number; score: string; detailed_analysis: string }
  const dims = parsed.dimensions as Record<string, Dim> | undefined
  if (!dims) {
    return Response.json({ report: null }, { status: 500 })
  }

  const potentialAvg =
    (dims.reason_to_buy.numeric_score +
      dims.market_volume.numeric_score +
      dims.economic_viability.numeric_score) /
    3
  const challengeAvg =
    (dims.implementation_obstacles.numeric_score +
      dims.time_to_revenue.numeric_score +
      dims.external_risks.numeric_score) /
    3

  const DIM_KEYS = [
    'reason_to_buy',
    'market_volume',
    'economic_viability',
    'implementation_obstacles',
    'time_to_revenue',
    'external_risks',
  ] as const

  const report: Record<string, unknown> = {
    executive_summary: parsed.summary,
    overall_potential: numericToLabel(potentialAvg),
    overall_challenge: numericToLabel(challengeAvg),
  }

  for (const key of DIM_KEYS) {
    const d = dims[key]
    report[key] = {
      score: d.numeric_score,
      label: d.score as string,
      analysis: d.detailed_analysis,
    }
  }

  console.log('[generate-report] shaped report:', JSON.stringify(report, null, 2))
  return Response.json({ report })
}
