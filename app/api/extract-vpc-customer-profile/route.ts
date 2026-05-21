import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type ChatMsg = { role: string; content: string }

function transcriptFromMessages(messages: ChatMsg[]): string {
  return messages
    .map((m) => {
      const who = m.role === 'assistant' ? 'Customer (twin)' : 'Interviewer'
      return `${who}: ${m.content}`
    })
    .join('\n\n')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const language = body.language === 'it' ? 'it' : 'en'
    const langLine =
      language === 'it'
        ? 'Scrivi tutte le stringhe in output in italiano naturale.'
        : 'Write all output strings in natural English.'

    let sourceText = typeof body.sourceText === 'string' ? body.sourceText.trim() : ''
    if (!sourceText && Array.isArray(body.messages)) {
      sourceText = transcriptFromMessages(body.messages as ChatMsg[])
    }

    if (!sourceText || sourceText.length < 40) {
      return Response.json(
        { error: 'Provide at least ~40 characters of interview or conversation text (or a message transcript).' },
        { status: 400 }
      )
    }

    const truncated = sourceText.length > 120_000 ? sourceText.slice(0, 120_000) + '\n[…truncated…]' : sourceText

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: `You extract Value Proposition Canvas CUSTOMER PROFILE sticky notes from interview transcripts, call notes, or a user↔customer chat.

${langLine}

Rules:
- jobs: functional / emotional / social jobs to be done (what they are trying to accomplish).
- pains: obstacles, risks, bad outcomes, frustrations.
- gains: outcomes and benefits they want, success criteria, aspirations.
- Each item: short phrase, max 12 words, concrete, no numbering prefixes.
- 3–10 items per category. Skip empty categories only if truly nothing in the source (then return []).
- No duplicates within a category.

Return ONLY valid JSON, no markdown:
{"jobs":["..."],"pains":["..."],"gains":["..."]}`,
      messages: [{ role: 'user', content: truncated }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const match = raw.match(/\{[\s\S]*\}/)
    const parsed = match ? (JSON.parse(match[0]) as Record<string, unknown>) : {}

    const asList = (v: unknown): string[] =>
      Array.isArray(v)
        ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 12)
        : []

    return Response.json({
      jobs: asList(parsed.jobs),
      pains: asList(parsed.pains),
      gains: asList(parsed.gains),
    })
  } catch (e) {
    console.error('[extract-vpc-customer-profile]', e)
    return Response.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
