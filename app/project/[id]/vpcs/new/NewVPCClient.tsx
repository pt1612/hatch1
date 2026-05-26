'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Sparkles,
  Users,
  X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { DigitalTwin, TwinMessage } from '@/lib/types'
import { useI18n } from '@/lib/i18n/context'

type OpportunityOption = {
  id: string
  name: string
  customer_segment: string | null
}

type WizardMode = 'manual' | 'real_interview' | 'virtual_interview'
type WizardStep = 'mode' | 'manual' | 'real' | 'virtual_segment' | 'virtual_chat' | 'review'

type RealSource = 'paste' | 'file' | 'both'

function StickyColumn({
  label,
  items,
  onAdd,
  onRemove,
  placeholder,
  addLabel }: {
  label: string
  items: string[]
  onAdd: (text: string) => void
  onRemove: (index: number) => void
  placeholder: string
  addLabel: string
}) {
  const [draft, setDraft] = useState('')
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}>
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--color-foreground-muted)' }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-2 mb-3 min-h-[28px]">
        {items.map((text, i) => (
          <span
            key={`${text}-${i}`}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}
          >
            {text}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="opacity-50 hover:opacity-100"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11 }}
            >
              ×
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-xs italic" style={{ color: 'var(--color-foreground-faint)' }}>
            —
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              const t = draft.trim()
              if (t) {
                onAdd(t)
                setDraft('')
              }
            }
          }}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-3 py-2 text-sm outline-none"
          style={{ border: '0.5px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)' }}
        />
        <button
          type="button"
          onClick={() => {
            const t = draft.trim()
            if (t) {
              onAdd(t)
              setDraft('')
            }
          }}
          className="px-3 py-2 text-xs font-medium shrink-0"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', borderRadius: 8, border: 'none' }}
        >
          {addLabel}
        </button>
      </div>
    </div>
  )
}

export default function NewVPCClient({
  project,
  opportunities }: {
  project: { id: string; title: string }
  opportunities: OpportunityOption[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { t, lang } = useI18n()
  const initialOpportunityId = searchParams.get('opportunityId')

  const [step, setStep] = useState<WizardStep>('mode')
  const [mode, setMode] = useState<WizardMode | null>(null)

  const [customerName, setCustomerName] = useState('')
  const [linkedOpportunityIds, setLinkedOpportunityIds] = useState<string[]>(
    initialOpportunityId ? [initialOpportunityId] : []
  )

  const [jobs, setJobs] = useState<string[]>([])
  const [pains, setPains] = useState<string[]>([])
  const [gains, setGains] = useState<string[]>([])

  const [rawInterviewText, setRawInterviewText] = useState('')
  const [realSource, setRealSource] = useState<RealSource>('paste')
  const [realFilename, setRealFilename] = useState<string | null>(null)

  const [segments, setSegments] = useState<string[]>([])
  const [segmentDraft, setSegmentDraft] = useState('')
  const [twinCount, setTwinCount] = useState(2)
  const [syntheticTwins, setSyntheticTwins] = useState<DigitalTwin[]>([])
  const [chatMessages, setChatMessages] = useState<TwinMessage[]>([])
  const [chatMode, setChatMode] = useState<'problem' | 'value'>('problem')
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [guidelinesOpen, setGuidelinesOpen] = useState(false)

  const [extracting, setExtracting] = useState(false)
  const [generatingTwin, setGeneratingTwin] = useState(false)
  const [suggestingSegment, setSuggestingSegment] = useState(false)
  const [suggestingProfile, setSuggestingProfile] = useState(false)
  const [suggestingName, setSuggestingName] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  function resetModeData() {
    setJobs([])
    setPains([])
    setGains([])
    setRawInterviewText('')
    setRealSource('paste')
    setRealFilename(null)
    setSegments([])
    setSegmentDraft('')
    setSyntheticTwins([])
    setChatMessages([])
    setChatInput('')
    setGuidelinesOpen(false)
    setError('')
  }

  async function suggestSegmentChips() {
    setSuggestingSegment(true)
    setError('')
    try {
      const linkedOpp = opportunities.find((o) => linkedOpportunityIds.includes(o.id))
      const res = await fetch('/api/suggest-segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: linkedOpp?.name ?? project.title,
          description: '',
          customer_segment: linkedOpp?.customer_segment ?? '' }) })
      const { segments: segs } = await res.json()
      if (Array.isArray(segs) && segs.length > 0) {
        setSegments((prev) => {
          const existing = new Set(prev)
          const newSegs = (segs as string[]).slice(0, 4).filter((s) => !existing.has(s))
          return [...prev, ...newSegs]
        })
      }
    } catch {
      // silently fail — user can still type manually
    } finally {
      setSuggestingSegment(false)
    }
  }

  async function suggestManualProfile() {
    setSuggestingProfile(true)
    setError('')
    try {
      const linkedOpp = opportunities.find((o) => linkedOpportunityIds.includes(o.id))
      const context = linkedOpp
        ? `Opportunity: ${linkedOpp.name}. Customer segment: ${linkedOpp.customer_segment ?? 'unknown'}.`
        : `Project: ${project.title}.`
      const existingJobs = jobs.join(', ') || 'none'
      const existingPains = pains.join(', ') || 'none'
      const existingGains = gains.join(', ') || 'none'
      const prompt = `${context}

Suggest realistic customer profile items for a VPC.
Existing jobs: ${existingJobs}
Existing pains: ${existingPains}
Existing gains: ${existingGains}

Suggest 3 new items for each category (jobs, pains, gains) that are not already listed.
Each item: max 10 words, concrete and specific.
Respond in ${lang === 'it' ? 'Italian' : 'English'}.
Return ONLY valid JSON: {"jobs":["..."],"pains":["..."],"gains":["..."]}`

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream: false,
          systemPrompt:
            'You are a Value Proposition Canvas expert. Return ONLY valid JSON with keys jobs, pains, gains. No other text.',
          messages: [{ role: 'user', content: prompt }] }) })
      const data = await res.json()
      const text: string = data.content ?? ''
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0]) as Record<string, unknown>
        const toList = (v: unknown): string[] =>
          Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []
        const newJobs = toList(parsed.jobs)
        const newPains = toList(parsed.pains)
        const newGains = toList(parsed.gains)
        setJobs((prev) => {
          const set = new Set(prev)
          return [...prev, ...newJobs.filter((x) => !set.has(x))]
        })
        setPains((prev) => {
          const set = new Set(prev)
          return [...prev, ...newPains.filter((x) => !set.has(x))]
        })
        setGains((prev) => {
          const set = new Set(prev)
          return [...prev, ...newGains.filter((x) => !set.has(x))]
        })
      }
    } catch {
      // silently fail — user can still fill manually
    } finally {
      setSuggestingProfile(false)
    }
  }

  async function suggestCustomerName() {
    const linkedOpp = opportunities.find((o) => linkedOpportunityIds.includes(o.id))
    if (!linkedOpp) return
    setSuggestingName(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream: false,
          systemPrompt:
            'Return ONLY a concise 2-5 word customer segment label (like "CFO Mid Manufacturing" or "Early-stage SaaS Founder"). No punctuation at the end.',
          messages: [
            {
              role: 'user',
              content: `Opportunity: "${linkedOpp.name}". Customer segment: "${linkedOpp.customer_segment ?? ''}". Generate a short VPC segment label. Respond in ${lang === 'it' ? 'Italian' : 'English'}.` },
          ] }) })
      const data = await res.json()
      const name = (data.content ?? '').trim().replace(/^["']|["']$/g, '').replace(/[.!?]$/, '')
      if (name) setCustomerName(name)
    } catch {
      // silent
    } finally {
      setSuggestingName(false)
    }
  }

  // Auto-suggest customer name when an opportunity is selected and name is blank
  useEffect(() => {
    if (linkedOpportunityIds.length > 0 && !customerName.trim()) {
      suggestCustomerName()
    }
  }, [linkedOpportunityIds]) // eslint-disable-line react-hooks/exhaustive-deps

  function selectMode(m: WizardMode) {
    resetModeData()
    setMode(m)
    if (m === 'manual') setStep('manual')
    else if (m === 'real_interview') setStep('real')
    else setStep('virtual_segment')
  }

  function goBack() {
    setError('')
    if (step === 'manual' || step === 'real' || step === 'virtual_segment') {
      setStep('mode')
      setMode(null)
      resetModeData()
      return
    }
    if (step === 'virtual_chat') {
      setStep('virtual_segment')
      setSyntheticTwins([])
      setChatMessages([])
      setGuidelinesOpen(false)
      setSegmentDraft('')
      return
    }
    if (step === 'review' && mode === 'manual') {
      setStep('manual')
      return
    }
    if (step === 'review' && mode === 'real_interview') {
      setStep('real')
      return
    }
    if (step === 'review' && mode === 'virtual_interview') {
      setStep('virtual_chat')
    }
  }

  async function runExtract(sourceText?: string, transcriptMessages?: { role: string; content: string }[]) {
    setExtracting(true)
    setError('')
    try {
      const res = await fetch('/api/extract-vpc-customer-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: lang,
          ...(transcriptMessages ? { messages: transcriptMessages } : { sourceText: sourceText ?? rawInterviewText }) }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'extract')
      setJobs(Array.isArray(data.jobs) ? data.jobs : [])
      setPains(Array.isArray(data.pains) ? data.pains : [])
      setGains(Array.isArray(data.gains) ? data.gains : [])
      setStep('review')
    } catch {
      setError(t.vpc_wizard_error_extract)
    } finally {
      setExtracting(false)
    }
  }

  async function handleRealExtract() {
    const text = rawInterviewText.trim()
    if (text.length < 40) {
      setError(t.vpc_wizard_error_extract)
      return
    }
    await runExtract(text)
  }

  async function handleVirtualExtract() {
    if (chatMessages.length < 2) {
      setError(t.vpc_wizard_error_extract)
      return
    }
    if (syntheticTwins.length === 0) {
      setError(t.vpc_wizard_error_extract)
      return
    }

    setExtracting(true)
    setError('')
    console.log(`[VPC] Per-twin creation starting for ${syntheticTwins.length} twins`)

    try {
      const createdVpcIds: string[] = []

      for (const twin of syntheticTwins) {
        // Filter messages: all interviewer (user) turns + only THIS twin's replies.
        const twinMessages = chatMessages.filter(
          (m) => m.role === 'user' || m.twinId === twin.id || m.twinName === twin.name
        )
        console.log(`[VPC] Twin ${twin.name} (${twin.id}) → ${twinMessages.length} messages`)

        if (twinMessages.length < 2) {
          console.log(`[VPC] Skipping twin ${twin.name} — not enough messages`)
          continue
        }

        // Extract this twin's customer profile from their own transcript.
        const extractRes = await fetch('/api/extract-vpc-customer-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: lang,
            messages: twinMessages.map((m) => ({ role: m.role, content: m.content })) }) })
        const extractData = await extractRes.json()
        if (!extractRes.ok) {
          console.error(`[VPC] Extract failed for twin ${twin.name}:`, extractData.error)
          continue
        }

        const twinJobs: string[] = Array.isArray(extractData.jobs) ? extractData.jobs : []
        const twinPains: string[] = Array.isArray(extractData.pains) ? extractData.pains : []
        const twinGains: string[] = Array.isArray(extractData.gains) ? extractData.gains : []
        console.log(`[VPC] Extracted for ${twin.name}: jobs=${twinJobs.length}, pains=${twinPains.length}, gains=${twinGains.length}`)

        const { data: vpcRow, error: vpcError } = await supabase
          .from('vpcs')
          .insert({
            project_id: project.id,
            customer_profile_name: twin.name,
            source_type: 'virtual_interview',
            customer_profile: { jobs: twinJobs, pains: twinPains, gains: twinGains },
            value_map: { productsAndServices: [], painRelievers: [], gainCreators: [] },
            final_canvas: {
              productsAndServices: [],
              painRelievers: [],
              gainCreators: [],
              jobs: twinJobs,
              pains: twinPains,
              gains: twinGains },
            interview_attachment: {
              version: 1,
              synthetic_twin_id: twin.id,
              twin_name: twin.name,
              twin_segment: twin.segment,
              chat_mode: chatMode },
            twin_transcript: twinMessages.map((m) => ({
              role: m.role,
              content: m.content,
              twinId: m.twinId ?? null,
              twinName: m.twinName ?? null })) })
          .select('id')
          .single()

        if (vpcError || !vpcRow) {
          console.error(`[VPC] Insert failed for twin ${twin.name}:`, vpcError)
          continue
        }
        console.log(`[VPC] Created VPC ${vpcRow.id} for twin ${twin.name}`)
        createdVpcIds.push(vpcRow.id)

        if (linkedOpportunityIds.length > 0) {
          const { error: linkError } = await supabase
            .from('vpc_opportunities')
            .insert(
              linkedOpportunityIds.map((opportunityId) => ({
                vpc_id: vpcRow.id,
                opportunity_id: opportunityId }))
            )
          if (linkError) {
            console.error(`[VPC] vpc_opportunities link failed for ${vpcRow.id}:`, linkError)
          } else {
            console.log(`[VPC] Linked ${vpcRow.id} to opportunities:`, linkedOpportunityIds)
          }
        }
      }

      if (createdVpcIds.length === 0) {
        setError(t.vpc_wizard_error_extract)
        return
      }

      console.log(`[VPC] Done — created ${createdVpcIds.length} VPCs, navigating`)
      const fromParam = searchParams.get('from')
      router.push(fromParam ?? `/project/${project.id}/vpcs`)
    } catch (err) {
      console.error('[VPC] Per-twin creation error:', err)
      setError(t.vpc_wizard_error_extract)
    } finally {
      setExtracting(false)
    }
  }

  async function handleGenerateTwins() {
    if (segments.length === 0) {
      setError(t.vpc_wizard_error_twin)
      return
    }
    const seg = segments.join(', ')
    setGeneratingTwin(true)
    setError('')
    try {
      const res = await fetch('/api/generate-twins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectInfo: { name: project.title, problem: seg, target: seg, solution: '' },
          segments: segments,
          count: twinCount }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'twin')
      const rawTwins: Array<{ id: string; name: string; occupation?: string; segment: string; context: string }> =
        Array.isArray(data.twins) ? data.twins : []
      if (rawTwins.length === 0) throw new Error('no twins')
      const twins: DigitalTwin[] = rawTwins.map((tw) => ({
        id: tw.id,
        name: tw.name,
        role: tw.occupation ?? 'Professional',
        segment: tw.segment,
        personality: tw.context,
        painPoints: [],
        techLevel: 'medium' as const,
        budgetTier: 'mid' as const,
        affinityLabel: 'moderate' as const,
        occupation: tw.occupation,
        background: tw.context }))
      setSyntheticTwins(twins)
      setChatMessages([])
      setStep('virtual_chat')
    } catch {
      setError(t.vpc_wizard_error_twin)
    } finally {
      setGeneratingTwin(false)
    }
  }

  async function sendChatMessage(overrideText?: string) {
    const text = (overrideText ?? chatInput).trim()
    if (!text || syntheticTwins.length === 0 || chatLoading) return
    setChatLoading(true)
    if (!overrideText) setChatInput('')
    setError('')
    const priorMessages = chatMessages
    const userMsg: TwinMessage = { role: 'user', content: text }
    const withUser = [...priorMessages, userMsg]
    setChatMessages(withUser)

    try {
      const segDesc = segments.join(', ')
      const res = await fetch('/api/twin-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectInfo: {
            name: project.title,
            problem: segDesc,
            target: segDesc,
            solution: '' },
          twins: syntheticTwins,
          selectedTwinId: 'all',
          mode: chatMode,
          messages: priorMessages,
          userMessage: text }) })
      const data = await res.json()
      const responses: { twinId: string; twinName: string; text: string }[] = data.responses ?? []
      const assistantMessages: TwinMessage[] = responses.map((r) => ({
        role: 'assistant' as const,
        content: r.text,
        twinId: r.twinId,
        twinName: r.twinName }))
      setChatMessages([...withUser, ...assistantMessages])
    } catch {
      setChatMessages([...withUser, {
        role: 'assistant',
        content: t.vpc_wizard_error_extract }])
    } finally {
      setChatLoading(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  function handleTxtFile(file: File | null) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setError(t.vpc_wizard_error_file_type)
      return
    }
    if (file.size > 512 * 1024) {
      setError(t.vpc_wizard_error_extract)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      setRawInterviewText((prev) => {
        const merged = prev.trim() ? `${prev.trim()}\n\n${text.trim()}` : text.trim()
        return merged
      })
      setRealFilename(file.name)
      setRealSource((prev) => (prev === 'paste' ? 'both' : 'file'))
      setError('')
    }
    reader.onerror = () => setError(t.vpc_wizard_error_file_read)
    reader.readAsText(file)
  }

  async function saveVpc() {
    const name = customerName.trim()
    if (!name) {
      setError(t.vpc_wizard_error_name)
      return
    }
    if (!mode) return

    setSaving(true)
    setError('')
    const emptyLeft = { productsAndServices: [] as string[], painRelievers: [] as string[], gainCreators: [] as string[] }
    const finalCanvas = {
      ...emptyLeft,
      jobs: [...jobs],
      pains: [...pains],
      gains: [...gains] }
    const customer_profile = { jobs: [...jobs], pains: [...pains], gains: [...gains] }
    const value_map = {
      productsAndServices: [] as string[],
      painRelievers: [] as string[],
      gainCreators: [] as string[] }

    let interview_attachment: Record<string, unknown> | null = null
    let twin_transcript: unknown = null

    if (mode === 'real_interview') {
      interview_attachment = {
        version: 1,
        source: realSource,
        filename: realFilename,
        raw_text: rawInterviewText.trim() }
    }
    if (mode === 'virtual_interview') {
      twin_transcript = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
        twinId: m.twinId ?? null,
        twinName: m.twinName ?? null }))
    }

    const { data: vpc, error: vpcError } = await supabase
      .from('vpcs')
      .insert({
        project_id: project.id,
        customer_profile_name: name,
        source_type: mode,
        customer_profile,
        value_map,
        final_canvas: finalCanvas,
        interview_attachment,
        twin_transcript })
      .select('id')
      .single()

    if (vpcError || !vpc) {
      setSaving(false)
      setError(vpcError?.message ?? t.vpc_wizard_error_save)
      return
    }

    if (linkedOpportunityIds.length > 0) {
      const { error: linkError } = await supabase.from('vpc_opportunities').insert(
        linkedOpportunityIds.map((opportunityId) => ({
          vpc_id: vpc.id,
          opportunity_id: opportunityId }))
      )
      if (linkError) {
        setSaving(false)
        setError(linkError.message)
        return
      }
    }

    const fromParam = searchParams.get('from')
    router.push(fromParam ?? `/project/${project.id}/vpcs/${vpc.id}`)
  }

  function toggleOpportunity(id: string) {
    setLinkedOpportunityIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const nameAndLinksBlock = (
    <div className="space-y-5 mb-8">
      <div className="rounded-2xl p-6" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--color-foreground-muted)' }}>
            {t.vpc_wizard_customer_name_label}
          </label>
          {linkedOpportunityIds.length > 0 && (
            <button
              type="button"
              onClick={suggestCustomerName}
              disabled={suggestingName}
              className="inline-flex items-center gap-1 text-[10px] disabled:opacity-50"
              style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {suggestingName ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
              {suggestingName ? t.vpc_wizard_suggesting_segment : t.vpc_wizard_suggest_segment}
            </button>
          )}
        </div>
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder={t.vpc_wizard_customer_name_placeholder}
          className="w-full px-4 py-3 text-sm outline-none"
          style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)' }}
        />
      </div>
      <div className="rounded-2xl p-6" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Users size={15} style={{ color: 'var(--color-primary)' }} />
          <div>
            <h2 className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>{t.vpc_wizard_linked_opps_header}</h2>
            <p className="text-xs" style={{ color: 'var(--color-foreground-muted)' }}>{t.vpc_wizard_linked_opps_hint}</p>
          </div>
        </div>
        {opportunities.length === 0 ? (
          <p className="text-xs italic" style={{ color: 'var(--color-foreground-faint)' }}>{t.vpc_wizard_no_opps}</p>
        ) : (
          <div className="space-y-2">
            {opportunities.map((opportunity) => {
              const selected = linkedOpportunityIds.includes(opportunity.id)
              return (
                <button
                  key={opportunity.id}
                  type="button"
                  onClick={() => toggleOpportunity(opportunity.id)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left"
                  style={{
                    borderRadius: 8,
                    border: selected ? '0.5px solid rgba(19,163,137,0.45)' : '0.5px solid var(--color-border)',
                    backgroundColor: selected ? 'rgba(19,163,137,0.08)' : '#FFFFFF' }}
                >
                  <span>
                    <span className="block text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>{opportunity.name}</span>
                    {opportunity.customer_segment && (
                      <span className="block text-xs mt-0.5" style={{ color: 'var(--color-foreground-muted)' }}>{opportunity.customer_segment}</span>
                    )}
                  </span>
                  {selected && <Check size={16} style={{ color: 'var(--color-primary)' }} />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  const profileEditor = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <StickyColumn
        label={t.vpc_wizard_column_jobs}
        items={jobs}
        onAdd={(x) => setJobs((p) => [...p, x])}
        onRemove={(i) => setJobs((p) => p.filter((_, j) => j !== i))}
        placeholder={t.vpc_wizard_add_placeholder}
        addLabel={t.vpc_add_btn}
      />
      <StickyColumn
        label={t.vpc_wizard_column_pains}
        items={pains}
        onAdd={(x) => setPains((p) => [...p, x])}
        onRemove={(i) => setPains((p) => p.filter((_, j) => j !== i))}
        placeholder={t.vpc_wizard_add_placeholder}
        addLabel={t.vpc_add_btn}
      />
      <StickyColumn
        label={t.vpc_wizard_column_gains}
        items={gains}
        onAdd={(x) => setGains((p) => [...p, x])}
        onRemove={(i) => setGains((p) => p.filter((_, j) => j !== i))}
        placeholder={t.vpc_wizard_add_placeholder}
        addLabel={t.vpc_add_btn}
      />
    </div>
  )

  return (
    <main className="pt-20 px-6 pb-16 max-w-5xl mx-auto">
      <button
        type="button"
        onClick={() => router.push(`/project/${project.id}/vpcs`)}
        className="inline-flex items-center gap-2 text-xs mb-7"
        style={{ color: 'var(--color-foreground-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <ArrowLeft size={14} />
        {t.vpc_wizard_back_vpcs}
      </button>

      {step !== 'mode' && (
        <button
          type="button"
          onClick={goBack}
          className="block text-xs mb-4"
          style={{ color: 'var(--color-foreground-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {t.vpc_wizard_back_step}
        </button>
      )}

      <div className="mb-7">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--color-foreground-muted)' }}>
          {t.vpc_wizard_level}
        </p>
        <h1
          style={{
            fontWeight: 400,
            fontSize: 34,
            letterSpacing: '-0.03em',
            color: 'var(--color-foreground)' }}
        >
          {t.vpc_wizard_title}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-foreground-muted)' }}>{t.vpc_wizard_subtitle}</p>
      </div>

      {error && (
        <p className="text-xs mb-4" style={{ color: '#B91C1C' }}>{error}</p>
      )}

      {step === 'mode' && (
        <div>
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--color-foreground)' }}>{t.vpc_wizard_mode_heading}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                key: 'manual' as const,
                icon: <Pencil size={22} style={{ color: 'var(--color-primary)' }} />,
                title: t.vpc_wizard_mode_manual_title,
                desc: t.vpc_wizard_mode_manual_desc,
                cta: t.vpc_wizard_mode_manual_cta },
              {
                key: 'real_interview' as const,
                icon: <FileText size={22} style={{ color: 'var(--color-primary)' }} />,
                title: t.vpc_wizard_mode_real_title,
                desc: t.vpc_wizard_mode_real_desc,
                cta: t.vpc_wizard_mode_real_cta },
              {
                key: 'virtual_interview' as const,
                icon: <MessageCircle size={22} style={{ color: 'var(--color-primary)' }} />,
                title: t.vpc_wizard_mode_virtual_title,
                desc: t.vpc_wizard_mode_virtual_desc,
                cta: t.vpc_wizard_mode_virtual_cta },
            ].map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => selectMode(card.key)}
                className="text-left rounded-2xl p-6 flex flex-col h-full transition-colors"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '0.5px solid var(--color-border)',
                  cursor: 'pointer' }}
              >
                <div className="mb-3">{card.icon}</div>
                <h2 className="text-base font-medium mb-2" style={{ color: 'var(--color-foreground)' }}>{card.title}</h2>
                <p className="text-sm flex-1 mb-4" style={{ color: 'var(--color-foreground-muted)' }}>{card.desc}</p>
                <span
                  className="inline-flex items-center gap-2 text-sm font-medium"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {card.cta}
                  <ArrowRight size={15} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'manual' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>{t.vpc_wizard_manual_heading}</p>
            <button
              type="button"
              onClick={suggestManualProfile}
              disabled={suggestingProfile}
              className="inline-flex items-center gap-1.5 text-xs disabled:opacity-50"
              style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {suggestingProfile ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {suggestingProfile ? t.vpc_wizard_suggesting_profile : t.vpc_wizard_suggest_profile}
            </button>
          </div>
          <p className="text-xs mb-6" style={{ color: 'var(--color-foreground-muted)' }}>{t.vpc_wizard_manual_hint}</p>
          {profileEditor}
          <button
            type="button"
            onClick={() => setStep('review')}
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', borderRadius: 10, border: 'none' }}
          >
            {t.vpc_wizard_continue_review}
            <ArrowRight size={15} />
          </button>
        </div>
      )}

      {step === 'real' && (
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-foreground)' }}>{t.vpc_wizard_real_heading}</p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-foreground-muted)' }}>{t.vpc_wizard_real_hint}</p>
          <textarea
            value={rawInterviewText}
            onChange={(e) => {
              setRawInterviewText(e.target.value)
              if (e.target.value.trim()) setRealSource((prev) => (realFilename ? 'both' : 'paste'))
            }}
            rows={14}
            className="w-full px-4 py-3 text-sm outline-none mb-4"
            style={{ border: '0.5px solid var(--color-border)', borderRadius: 12, color: 'var(--color-foreground)', backgroundColor: '#FFFFFF' }}
            placeholder={t.vpc_wizard_paste_label}
          />
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <input ref={fileInputRef} type="file" accept=".txt,text/plain" className="hidden" onChange={(e) => handleTxtFile(e.target.files?.[0] ?? null)} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)', borderRadius: 8, border: '0.5px solid var(--color-border)' }}
            >
              <FileText size={15} />
              {t.vpc_wizard_upload_txt}
            </button>
            {realFilename && <span className="text-xs" style={{ color: 'var(--color-foreground-muted)' }}>{realFilename}</span>}
          </div>
          <button
            type="button"
            onClick={handleRealExtract}
            disabled={extracting}
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', borderRadius: 10, border: 'none' }}
          >
            {extracting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {extracting ? t.vpc_wizard_extracting : t.vpc_wizard_extract_btn}
          </button>
        </div>
      )}

      {step === 'virtual_segment' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>{t.vpc_wizard_virtual_segment_heading}</p>
            <button
              type="button"
              onClick={suggestSegmentChips}
              disabled={suggestingSegment}
              className="inline-flex items-center gap-1.5 text-xs disabled:opacity-50"
              style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {suggestingSegment ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {suggestingSegment ? t.vpc_wizard_suggesting_segment : t.vpc_wizard_suggest_segment}
            </button>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--color-foreground-muted)' }}>{t.vpc_wizard_virtual_segment_hint}</p>

          {/* Segment chips */}
          <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}>
            <div className="flex flex-wrap gap-2 mb-3 min-h-[28px]">
              {segments.length === 0 && (
                <span className="text-xs italic" style={{ color: 'var(--color-foreground-faint)' }}>
                  {t.vpc_wizard_segment_placeholder}
                </span>
              )}
              {segments.map((seg, i) => (
                <span
                  key={`${seg}-${i}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: 'rgba(19,163,137,0.10)', color: 'var(--color-primary)', border: '0.5px solid rgba(19,163,137,0.25)' }}
                >
                  {seg}
                  <button
                    type="button"
                    onClick={() => setSegments((prev) => prev.filter((_, j) => j !== i))}
                    className="opacity-60 hover:opacity-100"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={segmentDraft}
                onChange={(e) => setSegmentDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const trimmed = segmentDraft.trim()
                    if (trimmed) {
                      setSegments((prev) => [...prev, trimmed])
                      setSegmentDraft('')
                    }
                  }
                }}
                placeholder={t.vpc_wizard_segment_placeholder}
                className="flex-1 min-w-0 px-3 py-2 text-sm outline-none"
                style={{ border: '0.5px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)' }}
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = segmentDraft.trim()
                  if (trimmed) {
                    setSegments((prev) => [...prev, trimmed])
                    setSegmentDraft('')
                  }
                }}
                className="px-3 py-2 flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', borderRadius: 8, border: 'none', cursor: 'pointer' }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Twin count selector */}
          <div className="mb-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--color-foreground-muted)' }}>
              {t.vpc_wizard_twin_count_label}
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTwinCount(n)}
                  className="w-10 h-10 rounded-xl text-sm font-medium"
                  style={{
                    backgroundColor: twinCount === n ? 'var(--color-primary)' : 'var(--color-muted)',
                    color: twinCount === n ? '#FFFFFF' : 'var(--color-foreground-muted)',
                    border: 'none',
                    cursor: 'pointer' }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerateTwins}
            disabled={generatingTwin}
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', borderRadius: 10, border: 'none' }}
          >
            {generatingTwin ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {generatingTwin ? t.vpc_wizard_generating_twin : t.vpc_wizard_generate_twin_btn}
          </button>
        </div>
      )}

      {step === 'virtual_chat' && syntheticTwins.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>{t.vpc_wizard_chat_heading}</p>
          <p className="text-xs mb-3" style={{ color: 'var(--color-foreground-muted)' }}>{t.vpc_wizard_chat_hint}</p>

          {/* Twin profile pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {syntheticTwins.map((twin, idx) => {
              const colors = ['rgba(19,163,137,0.12)', 'rgba(19,163,137,0.12)', 'rgba(99,102,241,0.12)', 'rgba(236,72,153,0.12)']
              const textColors = ['var(--color-primary)', 'var(--color-primary)', '#6366F1', '#DB2777']
              return (
                <span key={twin.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: colors[idx % colors.length], color: textColors[idx % textColors.length] }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: textColors[idx % textColors.length], color: 'var(--color-primary-foreground)' }}>
                    {twin.name[0]}
                  </span>
                  {twin.name} · {twin.segment}
                </span>
              )
            })}
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-3">
            {(['problem', 'value'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setChatMode(m)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg"
                style={{
                  backgroundColor: chatMode === m ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'var(--color-muted)',
                  color: chatMode === m ? 'var(--color-primary)' : 'var(--color-foreground-muted)',
                  border: chatMode === m ? '0.5px solid rgba(19,163,137,0.25)' : '0.5px solid var(--color-border)',
                  cursor: 'pointer' }}>
                {m === 'problem' ? t.vpc_wizard_chat_mode_problem : t.vpc_wizard_chat_mode_value}
              </button>
            ))}
          </div>

          {/* Chat transcript */}
          <div className="rounded-2xl p-4 mb-3 max-h-[460px] overflow-y-auto"
            style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}>
            {chatMessages.length === 0 && (
              <p className="text-xs italic" style={{ color: 'var(--color-foreground-faint)' }}>—</p>
            )}
            {chatMessages.map((m, i) => {
              const twinIdx = syntheticTwins.findIndex((tw) => tw.id === m.twinId)
              const textColors = ['var(--color-primary)', 'var(--color-primary)', '#6366F1', '#DB2777']
              return (
                <div key={i} className="mb-3" style={{ textAlign: m.role === 'user' ? 'right' : 'left' }}>
                  {m.role === 'assistant' && m.twinName && (
                    <p className="text-[10px] font-semibold mb-1"
                      style={{ color: twinIdx >= 0 ? textColors[twinIdx % textColors.length] : 'var(--color-foreground-muted)' }}>
                      {m.twinName}
                    </p>
                  )}
                  <span className="inline-block max-w-[85%] px-3 py-2 rounded-xl text-sm"
                    style={{
                      backgroundColor: m.role === 'user' ? 'rgba(19,163,137,0.12)' : 'var(--color-muted)',
                      color: 'var(--color-foreground)' }}>
                    {m.content || (chatLoading && i === chatMessages.length - 1 ? '…' : '')}
                  </span>
                </div>
              )
            })}
            {chatLoading && (
              <div className="flex items-center gap-2 mt-2" style={{ color: 'var(--color-foreground-faint)' }}>
                <Loader2 size={12} className="animate-spin" />
                <span className="text-xs">All twins are replying…</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Question prompt panel */}
          <div className="mb-3">
            <button type="button" onClick={() => setGuidelinesOpen((v) => !v)}
              className="text-xs mb-2"
              style={{ color: 'var(--color-foreground-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {t.vpc_wizard_prompts_btn} {guidelinesOpen ? '▲' : '▼'}
            </button>
            {guidelinesOpen && (
              <div className="rounded-2xl p-4" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}>
                {[
                  { label: t.vpc_wizard_q_cat_problem, qs: [t.vpc_wizard_q_prob_1, t.vpc_wizard_q_prob_2, t.vpc_wizard_q_prob_3, t.vpc_wizard_q_prob_4] },
                  { label: t.vpc_wizard_q_cat_pain,    qs: [t.vpc_wizard_q_pain_1, t.vpc_wizard_q_pain_2, t.vpc_wizard_q_pain_3, t.vpc_wizard_q_pain_4] },
                  { label: t.vpc_wizard_q_cat_gain,    qs: [t.vpc_wizard_q_gain_1, t.vpc_wizard_q_gain_2, t.vpc_wizard_q_gain_3, t.vpc_wizard_q_gain_4] },
                  { label: t.vpc_wizard_q_cat_jobs,    qs: [t.vpc_wizard_q_jobs_1, t.vpc_wizard_q_jobs_2, t.vpc_wizard_q_jobs_3, t.vpc_wizard_q_jobs_4] },
                ].map((cat) => (
                  <div key={cat.label} className="mb-3 last:mb-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--color-primary)' }}>
                      {cat.label}
                    </p>
                    <div className="flex flex-col gap-1">
                      {cat.qs.map((q) => (
                        <button key={q} type="button"
                          onClick={() => { setChatInput(q); setGuidelinesOpen(false) }}
                          disabled={chatLoading}
                          className="text-left text-xs px-3 py-2 rounded-lg disabled:opacity-40 transition-colors"
                          style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)', border: 'none', cursor: 'pointer' }}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input + send */}
          <div className="flex gap-2 mb-4">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
              className="flex-1 px-4 py-2.5 text-sm outline-none"
              style={{ border: '0.5px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)' }}
              placeholder="…"
            />
            <button type="button" onClick={() => sendChatMessage()} disabled={chatLoading}
              className="px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
              {t.vpc_wizard_send}
            </button>
          </div>

          <button type="button" onClick={handleVirtualExtract} disabled={extracting}
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)', borderRadius: 10, border: '0.5px solid var(--color-border)', cursor: 'pointer' }}>
            {extracting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {extracting ? t.vpc_wizard_extracting : t.vpc_wizard_finish_extract}
          </button>
        </div>
      )}

      {step === 'review' && (
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-foreground)' }}>{t.vpc_wizard_review_heading}</p>
          <p className="text-xs mb-6" style={{ color: 'var(--color-foreground-muted)' }}>{t.vpc_wizard_review_hint}</p>
          {nameAndLinksBlock}
          {profileEditor}
          <button
            type="button"
            onClick={saveVpc}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', borderRadius: 10, border: 'none' }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {saving ? t.vpc_wizard_saving : t.vpc_wizard_save}
          </button>
        </div>
      )}
    </main>
  )
}
