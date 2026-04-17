import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

interface TwinMessage {
  role: 'user' | 'assistant'
  content: string
  twinId?: string
  twinName?: string
}

interface DigitalTwin {
  id: string
  name: string
  role: string
  segment: string
}

interface ProjectInfo {
  name: string
  problem: string
  target: string
  solution: string
}

export async function POST(request: NextRequest) {
  const { projectInfo, twins, messages }: {
    projectInfo: ProjectInfo
    twins: DigitalTwin[]
    messages: TwinMessage[]
  } = await request.json()

  const transcript = messages
    .map((m) => {
      if (m.role === 'user') return `Interviewer: ${m.content}`
      const twinName = m.twinName ?? 'Twin'
      return `${twinName}: ${m.content}`
    })
    .join('\n\n')

  const twinSummary = twins
    .map((t) => `- ${t.name} (${t.segment}, ${t.role})`)
    .join('\n')

  const prompt = `Analyze this startup validation interview and generate a comprehensive validation report.

PROJECT DETAILS:
Name: ${projectInfo.name}
Problem: ${projectInfo.problem}
Target audience: ${projectInfo.target}
Solution: ${projectInfo.solution}

DIGITAL TWINS INTERVIEWED:
${twinSummary}

INTERVIEW TRANSCRIPT:
${transcript || 'No conversation recorded.'}

Generate a validation report as a JSON object with exactly these fields:
- problemIntensity: number 0-100 (how intense and real the problem is based on responses; 0=not a real problem, 100=extremely painful)
- valueResonance: number 0-100 (how well the solution resonates; 0=no interest, 100=strong demand)
- recurringThemes: string[] (3-5 key themes that came up repeatedly in the conversation)
- mainObjections: string[] (3-4 main objections or concerns raised by the twins)
- verdict: exactly one of "strong_fit" | "weak_fit" | "pivot_needed"
- nextSteps: string[] (exactly 3 specific, actionable next steps for the founder)
- summary: string (2-3 sentences summarizing the key validation findings)
- gains: string[] (3-5 things the twins want to achieve or improve — extracted from what they expressed wanting, not generic)
- pains: string[] (3-5 frustrations or problems the twins experience — extracted from what they explicitly mentioned)
- jobsToBeDone: string[] (3-5 tasks the twins are trying to accomplish that relate to the problem — what they're hiring a solution to do)
- whereToPlay: array with one entry per twin, each entry being:
  {
    "twinId": string (e.g. "twin1"),
    "twinName": string,
    "segment": string (the twin's segment label),
    "segmentAttractiveness": number 0-100 (how attractive this segment is as a market opportunity — based on problem urgency and willingness-to-pay signals expressed in the interview; 0 = very low urgency/WTP, 100 = extremely urgent with high WTP),
    "abilityToServe": number 0-100 (how well the proposed solution fits this segment's specific needs — based on perceived solution fit and absence of hard adoption barriers from the interview; 0 = very poor fit or blocking barriers, 100 = strong fit, easy adoption),
    "gains": string[] (2-4 specific gains THIS twin expressed — based only on what this twin said, not shared with other twins),
    "pains": string[] (2-4 specific pains THIS twin expressed — based only on what this twin said, not shared with other twins),
    "jobsToBeDone": string[] (2-4 specific jobs THIS twin mentioned — based only on what this twin said, not shared with other twins)
  }
  The whereToPlay scores and per-twin gains/pains/jobsToBeDone MUST be derived strictly from interview signals for each specific twin. Do not make all scores similar — spread them across the 0-100 range based on actual differences in how each twin responded. Each twin's gains/pains/jobsToBeDone must reflect what that specific twin said, not an aggregate.

Be rigorous and honest in your assessment. Base scores on actual interview content, not just the project description.`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0].message.content || '{}'
  const parsed = JSON.parse(raw)
  return Response.json({ report: parsed })
}
