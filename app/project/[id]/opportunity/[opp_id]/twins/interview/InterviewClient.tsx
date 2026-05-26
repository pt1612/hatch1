'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import BackButton from '@/components/BackButton'
import { Send, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { TWIN_AVATAR_COLORS, TWIN_BUBBLE_COLORS } from '@/lib/constants'
import { getTwinIndex, getInitials, formatTime } from '@/lib/types'
import type { TwinMessage, DigitalTwin, Opportunity } from '@/lib/types'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n/context'

const QUESTION_CATEGORIES_EN = [
  {
    label: 'Problem Validation',
    questions: [
      { text: 'Tell me about the last time this cost you real time or money.', hint: 'urgency' },
      { text: 'What is your current workaround and what do you hate most about it?', hint: 'workaround' },
      { text: 'How often does this actually block your work — every day, every week?', hint: 'frequency' },
      { text: 'Have you tried to solve this before? What stopped you?', hint: 'history' },
    ] },
  {
    label: 'Pain',
    questions: [
      { text: 'What frustrates you most about how you handle this today?', hint: 'frustration' },
      { text: 'How much has this problem cost you — in time, money, or stress — in the last month?', hint: 'cost' },
      { text: 'What would happen if this problem stayed unsolved for another year?', hint: 'consequence' },
      { text: 'Who else on your team or in your company suffers from this problem?', hint: 'scope' },
    ] },
  {
    label: 'Gain',
    questions: [
      { text: 'If this were solved perfectly, how would your day look different?', hint: 'desired outcome' },
      { text: 'What would success look like 6 months after adopting a solution?', hint: 'success vision' },
      { text: 'What would make you look good internally if this were solved?', hint: 'social gain' },
      { text: 'Which part of your workflow would you most like to speed up or simplify?', hint: 'priority' },
    ] },
  {
    label: 'Jobs to be Done',
    questions: [
      { text: 'When this problem comes up, what are you ultimately trying to accomplish?', hint: 'functional job' },
      { text: 'What does "done" look like when you handle this task well?', hint: 'completion criteria' },
      { text: 'Why does this matter to you beyond the immediate task?', hint: 'deeper motivation' },
      { text: 'What drives you to look for a solution — what triggers it?', hint: 'trigger' },
    ] },
]

const QUESTION_CATEGORIES_IT = [
  {
    label: 'Validazione del problema',
    questions: [
      { text: "Raccontami l'ultima volta che questo ti ha fatto perdere tempo o denaro reale.", hint: 'urgenza' },
      { text: "Qual è il tuo workaround attuale e cosa odi di più?", hint: 'workaround' },
      { text: 'Con che frequenza questo blocca davvero il tuo lavoro — ogni giorno, ogni settimana?', hint: 'frequenza' },
      { text: 'Hai mai provato a risolvere questo problema prima? Cosa ti ha fermato?', hint: 'storico' },
    ] },
  {
    label: 'Pain',
    questions: [
      { text: 'Cosa ti frustra di più nel modo in cui gestisci questo problema oggi?', hint: 'frustrazione' },
      { text: "Quanto ti è costato questo problema — in tempo, denaro o stress — nell'ultimo mese?", hint: 'costo' },
      { text: 'Cosa succederebbe se questo problema restasse irrisolto per un altro anno?', hint: 'conseguenza' },
      { text: 'Chi altro nel tuo team o nella tua azienda soffre di questo problema?', hint: 'portata' },
    ] },
  {
    label: 'Gain',
    questions: [
      { text: 'Se questo fosse risolto perfettamente, come sarebbe diversa la tua giornata?', hint: 'risultato desiderato' },
      { text: 'Come sarebbe il successo per te 6 mesi dopo aver adottato una soluzione?', hint: 'visione del successo' },
      { text: 'Cosa ti farebbe fare bella figura internamente se questo fosse risolto?', hint: 'guadagno sociale' },
      { text: 'Quale parte del tuo flusso di lavoro vorresti velocizzare o semplificare di più?', hint: 'priorità' },
    ] },
  {
    label: 'Jobs to be Done',
    questions: [
      { text: 'Quando si presenta questo problema, cosa stai cercando di realizzare in ultima analisi?', hint: 'job funzionale' },
      { text: 'Come appare il "fatto" quando gestisci bene questo compito?', hint: 'criteri di completamento' },
      { text: 'Perché questo è importante per te al di là del compito immediato?', hint: 'motivazione profonda' },
      { text: 'Cosa ti spinge a cercare una soluzione — cosa lo scatena?', hint: 'trigger' },
    ] },
]

function TwinAvatar({ twin }: { twin: DigitalTwin }) {
  const colorClass = TWIN_AVATAR_COLORS[getTwinIndex(twin.id) % TWIN_AVATAR_COLORS.length]
  return (
    <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-xs font-medium flex-shrink-0`}>
      {getInitials(twin.name)}
    </div>
  )
}

function TypingIndicator({ twins }: { twins: DigitalTwin[] }) {
  return (
    <div className="flex flex-col gap-3">
      {twins.map((twin) => (
        <div key={twin.id} className="flex items-end gap-2">
          <TwinAvatar twin={twin} />
          <div
            className="flex items-center gap-1 px-4 py-3 rounded-2xl"
            style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full block"
                style={{ backgroundColor: 'var(--color-warm)' }}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ChatBubble({ message, twins }: { message: TwinMessage; twins: DigitalTwin[] }) {
  if (message.role === 'user') {
    return (
      <motion.div className="flex justify-end" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <div className="max-w-[70%]">
          <div
            className="px-4 py-3 text-sm leading-relaxed"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
              border: '0.5px solid rgba(19,163,137,0.2)',
              borderRadius: '12px 12px 2px 12px',
              color: 'var(--color-foreground)' }}
          >
            {message.content}
          </div>
          {message.timestamp && (
            <p style={{ fontSize: 10, color: 'var(--color-foreground-faint)', marginTop: 4, textAlign: 'right' }}>
              {message.timestamp}
            </p>
          )}
        </div>
      </motion.div>
    )
  }

  const twinIdx = getTwinIndex(message.twinId ?? 'twin1')
  const bubbleClass = TWIN_BUBBLE_COLORS[twinIdx % TWIN_BUBBLE_COLORS.length]
  const twin = twins.find((tw) => tw.id === message.twinId)

  return (
    <motion.div className="flex items-end gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
      {twin && <TwinAvatar twin={twin} />}
      {!twin && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
          style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground-muted)' }}
        >
          ?
        </div>
      )}
      <div className="max-w-[70%]">
        {message.twinName && (
          <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-foreground-muted)', marginBottom: 4, marginLeft: 4 }}>
            {message.twinName}
          </p>
        )}
        <div
          className={`border px-4 py-3 text-sm leading-relaxed ${bubbleClass}`}
          style={{ borderRadius: '12px 12px 12px 2px', color: 'var(--color-foreground)' }}
        >
          <span style={{ fontWeight: 400 }}>
            {message.content}
          </span>
        </div>
        {message.timestamp && (
          <p style={{ fontSize: 10, color: 'var(--color-foreground-faint)', marginTop: 4, marginLeft: 4 }}>
            {message.timestamp}
          </p>
        )}
      </div>
    </motion.div>
  )
}

export default function InterviewClient({
  project,
  opportunity,
  twins,
  twinDbIds,
  existingMessages,
  existingInterviewIds }: {
  project: { id: string; title: string }
  opportunity: Opportunity
  twins: DigitalTwin[]
  twinDbIds: Record<string, string>
  existingMessages: TwinMessage[]
  existingInterviewIds: Record<string, string>
}) {
  const router = useRouter()
  const supabase = createClient()
  const { t, lang } = useI18n()

  const QUESTION_CATEGORIES = lang === 'it' ? QUESTION_CATEGORIES_IT : QUESTION_CATEGORIES_EN

  const [messages, setMessages] = useState<TwinMessage[]>(existingMessages)
  const [input, setInput] = useState('')
  const [selectedTwinId, setSelectedTwinId] = useState<'all' | string>('all')
  const [loading, setLoading] = useState(false)
  const [guidelinesOpen, setGuidelinesOpen] = useState(false)
  const [interviewIds, setInterviewIds] = useState<Record<string, string>>(existingInterviewIds)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const guidelinesPanelRef = useRef<HTMLDivElement>(null)
  const guidelinesButtonRef = useRef<HTMLButtonElement>(null)

  const userQCount = messages.filter((m) => m.role === 'user').length
  const canReport = userQCount >= 2
  const sessionPct = Math.min(Math.round((userQCount / 6) * 100), 100)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!guidelinesOpen) return
    function handleClick(e: MouseEvent) {
      if (
        guidelinesPanelRef.current &&
        !guidelinesPanelRef.current.contains(e.target as Node) &&
        guidelinesButtonRef.current &&
        !guidelinesButtonRef.current.contains(e.target as Node)
      ) {
        setGuidelinesOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [guidelinesOpen])

  async function persistMessages(newMessages: TwinMessage[]) {
    const newIds: Record<string, string> = { ...interviewIds }
    for (const twin of twins) {
      const dbTwinId = twinDbIds[twin.id]
      if (!dbTwinId) continue
      const existingId = newIds[twin.id]
      if (existingId) {
        await supabase.from('twin_interviews').update({ messages: newMessages, updated_at: new Date().toISOString() }).eq('id', existingId)
      } else {
        const { data } = await supabase
          .from('twin_interviews')
          .insert({ twin_id: dbTwinId, opportunity_id: opportunity.id, messages: newMessages })
          .select('id')
          .single()
        if (data?.id) newIds[twin.id] = data.id
      }
    }
    setInterviewIds(newIds)
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    setLoading(true)
    const userMsg: TwinMessage = { role: 'user', content: text.trim(), timestamp: formatTime() }
    const withUser = [...messages, userMsg]
    setMessages(withUser)
    setInput('')
    const projectInfo = {
      name: opportunity.name,
      problem: opportunity.description,
      target: opportunity.customer_segment,
      solution: opportunity.application }
    try {
      if (selectedTwinId === 'all') {
        const res = await fetch('/api/twin-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectInfo, twins, selectedTwinId: 'all', messages, userMessage: text.trim() }) })
        const { responses } = await res.json()
        const assistantMsgs: TwinMessage[] = (responses as { twinId: string; twinName: string; text: string }[]).map((r) => ({
          role: 'assistant' as const,
          content: r.text,
          twinId: r.twinId,
          twinName: r.twinName,
          timestamp: formatTime() }))
        const finalMessages = [...withUser, ...assistantMsgs]
        setMessages(finalMessages)
        await persistMessages(finalMessages)
      } else {
        const twin = twins.find((tw) => tw.id === selectedTwinId)
        const res = await fetch('/api/twin-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectInfo, twins, selectedTwinId, messages, userMessage: text.trim() }) })
        const placeholderMsg: TwinMessage = { role: 'assistant', content: '', twinId: selectedTwinId, twinName: twin?.name, timestamp: formatTime() }
        setMessages((prev) => [...prev, placeholderMsg])
        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''
        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (data === '[DONE]') break
              try {
                const parsed = JSON.parse(data)
                accumulated += parsed.content ?? ''
                setMessages((prev) => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { ...placeholderMsg, content: accumulated }
                  return updated
                })
              } catch {}
            }
          }
        }
        const finalMessages = [...withUser, { ...placeholderMsg, content: accumulated }]
        await persistMessages(finalMessages)
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: t.results_error, timestamp: formatTime() }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const selectedTwin = selectedTwinId !== 'all' ? twins.find((tw) => tw.id === selectedTwinId) ?? null : null
  const typingTwins = selectedTwinId === 'all' ? twins : selectedTwin ? [selectedTwin] : []

  const missingCount = 2 - userQCount
  const unlockText = `${missingCount} ${missingCount === 1 ? t.interview_unlock_singular : t.interview_unlock_plural}`

  if (twins.length === 0) {
    return (
      <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <TopNav projectId={project.id} projectTitle={project.title} />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <p style={{ fontStyle: 'italic', fontSize: 16, color: 'var(--color-foreground-muted)', marginBottom: 12 }}>
            {t.interview_no_twins}
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-foreground-faint)', marginBottom: 20 }}>
            {t.interview_no_twins_hint}
          </p>
          <a
            href={`/project/${project.id}/opportunity/${opportunity.id}/twins/setup`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', fontSize: 13, fontWeight: 500,
              backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)',
              borderRadius: 8, textDecoration: 'none' }}
          >
            {t.interview_go_setup}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />

      {/* Twin list sidebar */}
      <div
        className="w-56 flex flex-col flex-shrink-0 h-[calc(100vh-52px)] sticky top-[52px]"
        style={{ backgroundColor: '#FFFFFF', borderRight: '0.5px solid var(--color-border)' }}
      >
        <div className="p-4 flex-1 overflow-y-auto scrollbar-thin" style={{ borderBottom: '0.5px solid var(--color-border)' }}>
          <h2
            className="mb-3"
            style={{
              fontSize: 10,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--color-foreground-muted)' }}
          >
            {t.interview_participants}
          </h2>

          <button
            onClick={() => setSelectedTwinId('all')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1"
            style={{
              backgroundColor: selectedTwinId === 'all' ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'transparent',
              color: selectedTwinId === 'all' ? 'var(--color-primary)' : 'var(--color-foreground-muted)',
              border: selectedTwinId === 'all' ? '0.5px solid rgba(19,163,137,0.2)' : '0.5px solid transparent' }}
            onMouseEnter={(e) => {
              if (selectedTwinId !== 'all') e.currentTarget.style.backgroundColor = 'var(--color-background)'
            }}
            onMouseLeave={(e) => {
              if (selectedTwinId !== 'all') e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground-muted)' }}
            >
              G
            </div>
            <span style={{ fontSize: 12 }}>{t.interview_group}</span>
          </button>

          <div className="my-2" style={{ borderTop: '0.5px solid var(--color-border)' }} />

          {twins.map((twin) => {
            const colorClass = TWIN_AVATAR_COLORS[getTwinIndex(twin.id) % TWIN_AVATAR_COLORS.length]
            const isSelected = selectedTwinId === twin.id
            return (
              <button
                key={twin.id}
                onClick={() => setSelectedTwinId(twin.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors mb-1"
                style={{
                  backgroundColor: isSelected ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'transparent',
                  color: isSelected ? 'var(--color-primary)' : 'var(--color-foreground-muted)',
                  border: isSelected ? '0.5px solid rgba(19,163,137,0.2)' : '0.5px solid transparent' }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-background)'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <div className={`w-7 h-7 rounded-full ${colorClass} flex items-center justify-center text-xs font-medium flex-shrink-0`}>
                  {getInitials(twin.name)}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="truncate" style={{ fontSize: 12, fontWeight: 500 }}>{twin.name}</p>
                  <p
                    className="truncate"
                    style={{ fontSize: 10, color: isSelected ? 'var(--color-accent)' : 'var(--color-foreground-faint)' }}
                  >
                    {twin.segment}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Progress + Generate */}
        <div className="p-4" style={{ borderTop: '0.5px solid var(--color-border)' }}>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-foreground-muted)' }}>
                {t.interview_progress}
              </span>
              <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-foreground-muted)' }}>
                {userQCount}{t.interview_questions_suffix}
              </span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 4, backgroundColor: 'var(--color-muted)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${sessionPct}%`, backgroundColor: 'var(--color-primary)' }}
              />
            </div>
          </div>
          <button
            onClick={() => router.push(`/project/${project.id}/opportunity/${opportunity.id}/twins/results`)}
            disabled={!canReport}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none' }}
            onMouseEnter={(e) => canReport && ((e.currentTarget).style.backgroundColor = 'var(--color-primary-hover)')}
            onMouseLeave={(e) => ((e.currentTarget).style.backgroundColor = 'var(--color-primary)')}
          >
            {t.interview_generate_results}
            <ChevronRight size={12} />
          </button>
          {!canReport && (
            <p style={{ fontSize: 10, color: 'var(--color-foreground-faint)', textAlign: 'center', marginTop: 6 }}>
              {unlockText}
            </p>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-[calc(100vh-52px)] overflow-hidden">
        {/* Header */}
        <div
          className="px-6 py-3 flex items-center justify-end flex-shrink-0"
          style={{ backgroundColor: 'var(--color-background)', borderBottom: '0.5px solid var(--color-border)' }}
        >
          <BackButton
            href={`/project/${project.id}/opportunity/${opportunity.id}/twins/setup`}
            label={t.interview_back}
          />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center pb-10">
              <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
                <circle cx="50" cy="50" r="30" fill="color-mix(in srgb, var(--color-primary) 10%, transparent)" />
                <path d="M38 50 Q50 38 62 50 Q50 62 38 50" fill="var(--color-accent)" opacity="0.5" />
              </svg>
              <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-foreground)', marginBottom: 4 }}>
                {t.interview_start}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--color-foreground-muted)', maxWidth: 320, lineHeight: '1.6' }}>
                {t.interview_prompt_btn}
              </p>
            </div>
          ) : (
            messages.map((msg, i) => <ChatBubble key={i} message={msg} twins={twins} />)
          )}
          {loading && <TypingIndicator twins={typingTwins} />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="px-6 py-4 flex-shrink-0"
          style={{ backgroundColor: 'var(--color-background)', borderTop: '0.5px solid var(--color-border)' }}
        >
          <div className="relative mb-3">
            <button
              ref={guidelinesButtonRef}
              onClick={() => setGuidelinesOpen((o) => !o)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
            >
              {t.interview_prompt_btn}
              {guidelinesOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {guidelinesOpen && (
              <div
                ref={guidelinesPanelRef}
                className="absolute bottom-full left-0 mb-2 w-96 rounded-xl shadow-lg p-4 z-20 max-h-[60vh] overflow-y-auto scrollbar-thin"
                style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
              >
                <div className="space-y-4">
                  {QUESTION_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      <p
                        className="mb-2"
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: 'var(--color-foreground-muted)' }}
                      >
                        {cat.label}
                      </p>
                      <div className="space-y-1.5">
                        {cat.questions.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setInput(q.text)
                              setGuidelinesOpen(false)
                              setTimeout(() => inputRef.current?.focus(), 50)
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                            style={{
                              backgroundColor: 'var(--color-background)',
                              border: '0.5px solid var(--color-border)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
                              e.currentTarget.style.borderColor = 'rgba(19,163,137,0.3)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--color-background)'
                              e.currentTarget.style.borderColor = 'var(--color-border)'
                            }}
                          >
                            <p style={{ fontSize: 12, color: 'var(--color-foreground)', lineHeight: '1.4', marginBottom: 2 }}>{q.text}</p>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                color: 'var(--color-foreground-muted)' }}
                            >
                              {q.hint}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
              }}
              placeholder={
                selectedTwinId === 'all'
                  ? t.interview_placeholder_all
                  : t.interview_placeholder_twin.replace('{name}', selectedTwin?.name ?? 'Twin')
              }
              className="flex-1 px-4 py-3 text-sm resize-none outline-none transition-colors scrollbar-thin"
              style={{
                backgroundColor: '#FFFFFF',
                border: '0.5px solid var(--color-border)',
                borderRadius: 10,
                color: 'var(--color-foreground)',
                minHeight: 42,
                maxHeight: 120 }}
              rows={1}
              disabled={loading}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors disabled:opacity-40 flex-shrink-0"
              style={{ backgroundColor: 'var(--color-primary)', border: 'none' }}
              onMouseEnter={(e) => !(loading || !input.trim()) && ((e.currentTarget).style.backgroundColor = 'var(--color-primary-hover)')}
              onMouseLeave={(e) => ((e.currentTarget).style.backgroundColor = 'var(--color-primary)')}
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
          <p style={{ fontSize: 10, color: 'var(--color-foreground-faint)', marginTop: 8 }}>
            {t.interview_input_hint}
          </p>
        </div>
      </div>
    </div>
  )
}
