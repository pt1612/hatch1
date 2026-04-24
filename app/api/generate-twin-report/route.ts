import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface TwinMessage {
  role: 'user' | 'assistant'
  content: string
  twinId?: string
  twinName?: string
}

interface DigitalTwin {
  id: string       // sequential: "twin1", "twin2", etc.
  dbId?: string    // real Supabase UUID
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
  const { opportunityId, projectInfo, twins, messages }: {
    opportunityId: string
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
- problemIntensity: number 0-100
- valueResonance: number 0-100
- recurringThemes: string[] (exactly 3 items — each a short phrase, max 7 words)
- mainObjections: string[] (exactly 3 items — each a short phrase, max 7 words)
- verdict: exactly one of "strong_fit" | "weak_fit" | "pivot_needed"
- nextSteps: string[] (exactly 3 items — each an actionable phrase, max 9 words)
- summary: string (1-2 sentences maximum)
- gains: string[] (exactly 3 items — short phrases, max 7 words each)
- pains: string[] (exactly 3 items — short phrases, max 7 words each)
- jobsToBeDone: string[] (exactly 3 items — short phrases, max 7 words each)
- whereToPlay: array with one entry per twin:
  {
    "twinId": string,
    "twinName": string,
    "segment": string,
    "segmentAttractiveness": number 0-100,
    "abilityToServe": number 0-100,
    "gains": string[] (exactly 2 items — short phrases, max 7 words each, specific to this twin),
    "pains": string[] (exactly 2 items — short phrases, max 7 words each, specific to this twin),
    "jobsToBeDone": string[] (exactly 2 items — short phrases, max 7 words each, specific to this twin)
  }

STRICT RULES:
- Spread segmentAttractiveness and abilityToServe scores across the 0-100 range — do not make all twins similar.
- Per-twin gains/pains/jobsToBeDone must reflect what that specific twin said, not shared across all twins.
- Base scores on actual interview content, not the project description.
- Return only valid complete JSON. Never truncate. If content is too long, shorten individual field values rather than cutting the JSON structure.

Return ONLY valid JSON, no other text.`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
  const match = raw.match(/\{[\s\S]*\}/)
  const parsed = match ? JSON.parse(match[0]) : {}

  console.log('[generate-twin-report] whereToPlay:', JSON.stringify(parsed.whereToPlay ?? null))
  console.log('[generate-twin-report] top-level gains:', JSON.stringify(parsed.gains ?? null))
  console.log('[generate-twin-report] top-level pains:', JSON.stringify(parsed.pains ?? null))
  console.log('[generate-twin-report] top-level jobsToBeDone:', JSON.stringify(parsed.jobsToBeDone ?? null))

  // Persist per-twin gains/pains/jobs to twin_interviews
  if (parsed.whereToPlay && Array.isArray(parsed.whereToPlay)) {
    try {
      const supabase = await createClient()

      // Build a direct map from sequential twinId → real DB UUID using the dbId
      // field sent by the client — no order-based lookup needed
      console.log('[generate-twin-report] twins dbIds:', JSON.stringify(twins.map(t => ({ id: t.id, dbId: t.dbId }))))

      for (const [index, entry] of parsed.whereToPlay.entries()) {
        const dbId = twins[index]?.dbId
        if (!dbId) {
          console.log(`[generate-twin-report] no dbId for index ${index} (${entry.twinId}) — skipping`)
          continue
        }

        // Fall back to top-level aggregated values if per-twin fields are missing
        const entryGains = (Array.isArray(entry.gains) && entry.gains.length > 0)
          ? entry.gains
          : (parsed.gains ?? []).slice(0, 3)
        const entryPains = (Array.isArray(entry.pains) && entry.pains.length > 0)
          ? entry.pains
          : (parsed.pains ?? []).slice(0, 3)
        const entryJobs = (Array.isArray(entry.jobsToBeDone) && entry.jobsToBeDone.length > 0)
          ? entry.jobsToBeDone
          : (parsed.jobsToBeDone ?? []).slice(0, 3)

        console.log(`[generate-twin-report] writing ${entry.twinId} (twin_id=${dbId}):`, JSON.stringify({ gains: entryGains, pains: entryPains, jobs_to_be_done: entryJobs }))

        const { data: updated, error: updateErr } = await supabase
          .from('twin_interviews')
          .update({
            segment_attractiveness: entry.segmentAttractiveness,
            ability_to_serve: entry.abilityToServe,
            gains: entryGains,
            pains: entryPains,
            jobs_to_be_done: entryJobs,
          })
          .eq('twin_id', dbId)
          .select('id, gains, pains, jobs_to_be_done')

        console.log(`[generate-twin-report] supabase response for ${entry.twinId}:`, JSON.stringify(updated), 'error:', JSON.stringify(updateErr))
      }
    } catch (err) {
      console.error('[generate-twin-report] DB write error:', err)
    }
  }

  return Response.json({ report: parsed })
}
