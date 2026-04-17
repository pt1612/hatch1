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
        content: `Analyze this strategic conversation and extract core abilities/competencies that have been identified.

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
      },
      { role: 'user', content: conversation },
    ],
    max_tokens: 512,
    temperature: 0.3,
  })

  const raw = completion.choices[0].message.content || '[]'
  const match = raw.match(/\[[\s\S]*\]/)
  const abilities = match ? JSON.parse(match[0]) : []
  return Response.json({ abilities })
}
