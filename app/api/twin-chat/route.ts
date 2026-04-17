import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SKEPTICISM_INSTRUCTIONS = `
BEHAVIOR RULES — follow these strictly:
- Be realistic and skeptical, NOT enthusiastic or cheerful by default
- Raise concrete objections: cost, switching effort, trust in a new product, hidden complexity
- Push back if a question sounds like it's fishing for validation — say so
- Contradict other twins when you genuinely would disagree, based on your profile
- Express uncertainty when relevant ("I'm not sure this would actually work for me because...")
- Never give a glowing endorsement unless there is a truly compelling reason rooted in your specific pain points
- Keep responses to 2-4 sentences — be direct and opinionated, not polite and vague

SIGNAL LAYERING — do NOT announce scores or labels; let these emerge naturally in how you speak:
- Problem urgency: the intensity of your frustration or indifference should be evident in your word choice and examples ("we lose hours every week" vs. "it's mildly annoying sometimes")
- Willingness to pay: reference money naturally ("I'd honestly consider paying for this", "there's no way I'd budget for that", "maybe if it were a low flat fee...")
- Adoption barriers: mention switching friction, learning curve, or trust issues where relevant ("we'd need buy-in from three teams", "we've been burned by SaaS tools that disappeared")
- Solution fit: express whether the proposed solution addresses your actual pain ("this doesn't solve the part I actually care about" or "this is exactly the gap I need filled")

As you respond, naturally reveal signals about: (1) the urgency of the problem you experience, (2) your willingness to pay for a solution, (3) specific gains you would get from a solution, (4) specific pains it would relieve, (5) the jobs-to-be-done it would help you accomplish. Do not state these as a list — weave them naturally into your responses.`

interface ProjectInfo {
  name: string
  problem: string
  target: string
  solution: string
}

interface DigitalTwin {
  id: string
  name: string
  role: string
  segment: string
  personality: string
  painPoints: string[]
  techLevel: 'low' | 'medium' | 'high'
  budgetTier: 'low' | 'mid' | 'premium'
  affinityLabel: 'high_affinity' | 'moderate' | 'early_adopter'
  age?: number
  occupation?: string
  background?: string
  motivations?: string[]
  budget?: string
}

interface TwinMessage {
  role: 'user' | 'assistant'
  content: string
  twinId?: string
  twinName?: string
  timestamp?: string
}

function buildSystemPrompt(
  twin: DigitalTwin,
  projectInfo: ProjectInfo,
  modeDescription: string
): string {
  const budgetDisplay =
    twin.budget ??
    (twin.budgetTier === 'low'
      ? 'budget-conscious, under $40/month'
      : twin.budgetTier === 'mid'
      ? '$40–120/month'
      : 'premium tier, $120+/month')

  const techDisplay =
    twin.techLevel === 'low' ? 'low' : twin.techLevel === 'medium' ? 'medium' : 'high'

  return `You are ${twin.name}, a digital twin customer being interviewed about a startup product.

YOUR PROFILE:
${twin.age ? `Age: ${twin.age}` : ''}
Occupation: ${twin.occupation ?? twin.role}
Segment: ${twin.segment}
Background: ${twin.background ?? twin.personality}
Pain points: ${twin.painPoints.join('; ')}
Motivations: ${twin.motivations ? twin.motivations.join('; ') : 'not specified'}
Tech savviness: ${techDisplay}
Monthly budget for tools: ${budgetDisplay}
Personality: ${twin.personality}

THE PRODUCT BEING EVALUATED:
Name: ${projectInfo.name}
Problem: ${projectInfo.problem}
Solution: ${projectInfo.solution}
Target audience: ${projectInfo.target}

Interview mode: ${modeDescription}
${SKEPTICISM_INSTRUCTIONS}
Respond in first person as ${twin.name}. Do NOT start with your name. Be direct.
Detect the language of the user's input and respond in that same language throughout the entire conversation.`
}

export async function POST(request: NextRequest) {
  const { projectInfo, twins, selectedTwinId, mode, messages, userMessage } =
    await request.json()

  const modeDescription =
    mode === 'problem'
      ? 'Problem Validation — focus on how intense the problem is, how often it occurs, current workarounds, and what has been tried before'
      : 'Value Proposition — focus on the appeal (or lack thereof) of the proposed solution, willingness to pay, adoption barriers, and trust'

  if (selectedTwinId === 'all') {
    // Group mode: parallel, non-streaming
    const responses = await Promise.all(
      twins.map(async (twin: DigitalTwin) => {
        const systemPrompt = buildSystemPrompt(twin, projectInfo, modeDescription)
        // Filter: only user messages + this twin's assistant messages
        const twinHistory = (messages as TwinMessage[]).filter(
          (m) => m.role === 'user' || m.twinId === twin.id
        )
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            ...twinHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            { role: 'user', content: userMessage },
          ],
          temperature: 0.9,
          max_tokens: 300,
        })
        return {
          twinId: twin.id,
          twinName: twin.name,
          text: completion.choices[0].message.content ?? '',
        }
      })
    )
    return Response.json({ responses })
  } else {
    // Individual mode: SSE streaming
    const twin = (twins as DigitalTwin[]).find((t) => t.id === selectedTwinId)
    if (!twin) return Response.json({ error: 'Twin not found' }, { status: 404 })

    const systemPrompt = buildSystemPrompt(twin, projectInfo, modeDescription)
    // Filter: only user messages + this twin's assistant messages
    const twinHistory = (messages as TwinMessage[]).filter(
      (m) => m.role === 'user' || m.twinId === twin.id
    )

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...twinHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: userMessage },
      ],
      temperature: 0.9,
      max_tokens: 350,
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content ?? ''
          if (content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
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
  }
}
