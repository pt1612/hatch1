import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: NextRequest) {
  const { conversation } = await request.json()

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are analyzing a strategic conversation about market opportunities. Extract all identified market opportunities from the conversation.

For each opportunity, provide:
- name: short name (3-6 words)
- application: the specific application or use case
- customer_segment: the target customer segment
- description: 1-2 sentence description

Return ONLY a valid JSON array. Example:
[
  {
    "name": "Real-time IoT Monitoring",
    "application": "Predictive maintenance for industrial equipment",
    "customer_segment": "Heavy manufacturing plants",
    "description": "Using low-latency streaming to detect pre-failure states in industrial machinery."
  }
]

If fewer than 2 opportunities are clearly identified, return an empty array [].`,
      },
      { role: 'user', content: conversation },
    ],
    max_tokens: 1024,
    temperature: 0.3,
  })

  const raw = completion.choices[0].message.content || '[]'
  const match = raw.match(/\[[\s\S]*\]/)
  const opportunities = match ? JSON.parse(match[0]) : []
  return Response.json({ opportunities })
}
