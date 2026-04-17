import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: NextRequest) {
  const { messages, systemPrompt, stream = true } = await request.json()

  if (stream) {
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          stream: true,
          max_tokens: 1024,
          temperature: 0.7,
        })

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content || ''
          if (delta) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } else {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 2048,
      temperature: 0.7,
    })
    return Response.json({ content: completion.choices[0].message.content })
  }
}
