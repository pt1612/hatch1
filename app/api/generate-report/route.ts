import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'
import { numericToLabel } from '@/lib/types'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: NextRequest) {
  const { opportunityName, application, customerSegment, description, userContext } =
    await request.json()

  const contextInstruction = userContext
    ? `Important: This evaluation is being made in the context of: "${userContext}". If the context is written in a language other than English, write the entire report in that same language.`
    : ''

  const systemPrompt = `You are an expert market strategist evaluating a specific market opportunity using the Market Opportunity Navigator framework.

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
- Each detailed_analysis must be 5–8 sentences with specific reasoning.
- The summary must be exactly 3–4 sentences synthesizing across all 6 dimensions.

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

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: systemPrompt }],
    max_tokens: 3500,
    temperature: 0.35,
  })

  const raw = completion.choices[0].message.content || '{}'
  const match = raw.match(/\{[\s\S]*\}/)
  const report = match ? JSON.parse(match[0]) : {}

  // Server-side override: recalculate overall scores from dimension averages
  const dims = report.dimensions
  if (dims) {
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
    report.overall_potential = numericToLabel(potentialAvg)
    report.overall_challenge = numericToLabel(challengeAvg)
  }

  return Response.json({ report })
}
