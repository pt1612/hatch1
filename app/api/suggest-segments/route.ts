import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: NextRequest) {
  const { name, description, customer_segment } = await request.json()

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: `Given this market opportunity:
Name: ${name}
Description: ${description}
Target customer: ${customer_segment}

Suggest 3-4 distinct market segments to validate this opportunity against. Each segment should be a specific, concrete customer profile (e.g. "Manufacturing SMEs with 50-200 employees", "Series A tech startups", "Independent consultants").

Respond ONLY with a JSON array of strings. No other text.
Example: ["Manufacturing SMEs", "Enterprise procurement teams", "Tech startups"]`,
      },
    ],
    temperature: 0.7,
    max_tokens: 256,
  })

  const raw = completion.choices[0].message.content || '[]'
  const match = raw.match(/\[[\s\S]*\]/)
  const segments = match ? JSON.parse(match[0]) : []
  return Response.json({ segments })
}
