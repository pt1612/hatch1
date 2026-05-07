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

const QUESTION_CATEGORIES = [
  {
    label: 'Problem Validation',
    questions: [
      { text: 'Walk me through the last time this cost you real time or money.', hint: 'urgency' },
      { text: "What's your current workaround, and what do you hate most about it?", hint: 'workaround' },
      { text: 'How often does this actually block your work — daily, weekly?', hint: 'frequency' },
      { text: 'Have you ever tried to fix this before? What stopped you?', hint: 'history' },
    ],
  },
  {
    label: 'Pains',
    questions: [
      { text: 'What frustrates you most about how you handle this today?', hint: 'frustration' },
      { text: 'What has this problem cost you — in time, money, or stress — in the last month?', hint: 'cost' },
      { text: 'What would happen if this problem went unsolved for another year?', hint: 'consequence' },
      { text: 'Who else in your team or company suffers from this?', hint: 'scope' },
    ],
  },
  {
    label: 'Gains',
    questions: [
      { text: 'If this were solved perfectly, what would your day look like differently?', hint: 'desired outcome' },
      { text: 'What would success look like to you 6 months after adopting a solution?', hint: 'success vision' },
      { text: 'What would make you look good internally if this were fixed?', hint: 'social gain' },
      { text: 'Which part of your workflow would you most want to speed up or simplify?', hint: 'priority gain' },
    ],
  },
  {
    label: 'Jobs to be Done',
    questions: [
      { text: 'When this problem comes up, what are you ultimately trying to accomplish?', hint: 'functional job' },
      { text: 'What does "done" look like when you handle this task well?', hint: 'completion criteria' },
      { text: 'Why does this matter to you beyond just the immediate task?', hint: 'deeper motivation' },
      { text: 'What triggers you to look for a solution to this — what sets it off?', hint: 'trigger' },
    ],
  },
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
            <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0ms]" style={{ backgroundColor: 'var(--color-warm-gray)' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:150ms]" style={{ backgroundColor: 'var(--color-warm-gray)' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:300ms]" style={{ backgroundColor: 'var(--color-warm-gray)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ChatBubble({ message, twins }: { message: TwinMessage; twins: DigitalTwin[] }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%]">
          <div
            className="px-4 py-3 text-sm leading-relaxed"
            style={{
              backgroundColor: 'var(--color-amber-bg)',
              border: '0.5px solid rgba(199,123,58,0.2)',
              borderRadius: '12px 12px 2px 12px',
              color: 'var(--color-ink)',
            }}
          >
            {message.content}
          </div>
          {message.timestamp && (
            <p style={{ fontSize: 10, color: 'var(--color-text-faint)', marginTop: 4, textAlign: 'right' }}>
              {message.timestamp}
            </p>
          )}
        </div>
      </div>
    )
  }

  const twinIdx = getTwinIndex(message.twinId ?? 'twin1')
  const bubbleClass = TWIN_BUBBLE_COLORS[twinIdx % TWIN_BUBBLE_COLORS.length]
  const twin = twins.find((t) => t.id === message.twinId)

  return (
    <div className="flex items-end gap-2">
      {twin && <TwinAvatar twin={twin} />}
      {!twin && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
          style={{ backgroundColor: 'var(--color-linen)', color: 'var(--color-text-muted)' }}
        >
          ?
        </div>
      )}
      <div className="max-w-[70%]">
        {message.twinName && (
          <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 4, marginLeft: 4 }}>
            {message.twinName}
          </p>
        )}
        <div
          className={`border px-4 py-3 text-sm leading-relaxed ${bubbleClass}`}
          style={{ borderRadius: '12px 12px 12px 2px', color: 'var(--color-ink)' }}
        >
          <span style={{ fontFamily: "'Lora', Georgia, serif", fontWeight: 400 }}>
            {message.content}
          </span>
        </div>
        {message.timestamp && (
          <p style={{ fontSize: 10, color: 'var(--color-text-faint)', marginTop: 4, marginLeft: 4 }}>
            {message.timestamp}
          </p>
        )}
      </div>
    </div>
  )
}

export default function InterviewClient({
  project,
  opportunity,
  twins,
  twinDbIds,
  existingMessages,
  existingInterviewIds,
}: {
  project: { id: string; title: string }
  opportunity: Opportunity
  twins: DigitalTwin[]
  twinDbIds: Record<string, string>
  existingMessages: TwinMessage[]
  existingInterviewIds: Record<string, string>
}) {
  const router = useRouter()
  const supabase = createClient()

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
      solution: opportunity.application,
    }
    try {
      if (selectedTwinId === 'all') {
        const res = await fetch('/api/twin-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectInfo, twins, selectedTwinId: 'all', messages, userMessage: text.trim() }),
        })
        const { responses } = await res.json()
        const assistantMsgs: TwinMessage[] = (responses as { twinId: string; twinName: string; text: string }[]).map((r) => ({
          role: 'assistant' as const,
          content: r.text,
          twinId: r.twinId,
          twinName: r.twinName,
          timestamp: formatTime(),
        }))
        const finalMessages = [...withUser, ...assistantMsgs]
        setMessages(finalMessages)
        await persistMessages(finalMessages)
      } else {
        const twin = twins.find((t) => t.id === selectedTwinId)
        const res = await fetch('/api/twin-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectInfo, twins, selectedTwinId, messages, userMessage: text.trim() }),
        })
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
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', timestamp: formatTime() }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const selectedTwin = selectedTwinId !== 'all' ? twins.find((t) => t.id === selectedTwinId) ?? null : null
  const typingTwins = selectedTwinId === 'all' ? twins : selectedTwin ? [selectedTwin] : []

  if (twins.length === 0) {
    return (
      <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
        <TopNav projectId={project.id} projectTitle={project.title} />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <p style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 16, color: 'var(--color-text-muted)', marginBottom: 12 }}>
            Nessun Twin configurato.
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-faint)', marginBottom: 20 }}>
            Crea prima i Twin per questa opportunità prima di iniziare le interviste.
          </p>
          <a
            href={`/project/${project.id}/opportunity/${opportunity.id}/twins/setup`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', fontSize: 13, fontWeight: 500,
              backgroundColor: 'var(--color-amber)', color: '#FFFFFF',
              borderRadius: 8, textDecoration: 'none',
            }}
          >
            Configura Twin →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />

      {/* Twin list sidebar */}
      <div
        className="w-56 flex flex-col flex-shrink-0 h-screen sticky top-0"
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
              color: 'var(--color-text-muted)',
            }}
          >
            Participants
          </h2>

          <button
            onClick={() => setSelectedTwinId('all')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1"
            style={{
              backgroundColor: selectedTwinId === 'all' ? 'var(--color-amber-bg)' : 'transparent',
              color: selectedTwinId === 'all' ? 'var(--color-amber)' : 'var(--color-text-muted)',
              border: selectedTwinId === 'all' ? '0.5px solid rgba(199,123,58,0.2)' : '0.5px solid transparent',
            }}
            onMouseEnter={(e) => {
              if (selectedTwinId !== 'all') e.currentTarget.style.backgroundColor = 'var(--color-cream)'
            }}
            onMouseLeave={(e) => {
              if (selectedTwinId !== 'all') e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
              style={{ backgroundColor: 'var(--color-linen)', color: 'var(--color-text-muted)' }}
            >
              G
            </div>
            <span style={{ fontSize: 12 }}>Group Interview</span>
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
                  backgroundColor: isSelected ? 'var(--color-amber-bg)' : 'transparent',
                  color: isSelected ? 'var(--color-amber)' : 'var(--color-text-muted)',
                  border: isSelected ? '0.5px solid rgba(199,123,58,0.2)' : '0.5px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-cream)'
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
                    style={{ fontSize: 10, color: isSelected ? 'var(--color-amber-light)' : 'var(--color-text-faint)' }}
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
              <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
                Progress
              </span>
              <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-muted)' }}>
                {userQCount}/6 questions
              </span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 4, backgroundColor: 'var(--color-linen)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${sessionPct}%`, backgroundColor: 'var(--color-amber)' }}
              />
            </div>
          </div>
          <button
            onClick={() => router.push(`/project/${project.id}/opportunity/${opportunity.id}/twins/results`)}
            disabled={!canReport}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-amber)', color: '#FFFFFF', border: 'none' }}
            onMouseEnter={(e) => canReport && ((e.currentTarget).style.backgroundColor = '#A8612A')}
            onMouseLeave={(e) => ((e.currentTarget).style.backgroundColor = 'var(--color-amber)')}
          >
            Generate Results
            <ChevronRight size={12} />
          </button>
          {!canReport && (
            <p style={{ fontSize: 10, color: 'var(--color-text-faint)', textAlign: 'center', marginTop: 6 }}>
              {2 - userQCount} more question{2 - userQCount !== 1 ? 's' : ''} to unlock
            </p>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div
          className="px-6 py-3 flex items-center justify-end flex-shrink-0"
          style={{ backgroundColor: 'var(--color-cream)', borderBottom: '0.5px solid var(--color-border)' }}
        >
          <BackButton
            href={`/project/${project.id}/opportunity/${opportunity.id}/twins/setup`}
            label="Back to setup"
          />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center pb-10">
              <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
                <circle cx="50" cy="50" r="30" fill="var(--color-amber-bg)" />
                <path d="M38 50 Q50 38 62 50 Q50 62 38 50" fill="var(--color-amber-light)" opacity="0.5" />
              </svg>
              <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)', marginBottom: 4 }}>
                Start the interview
              </h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 320, lineHeight: '1.6' }}>
                Ask about pain points, desired outcomes, and jobs to be done. Use Question Ideas for prompts.
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
          style={{ backgroundColor: 'var(--color-cream)', borderTop: '0.5px solid var(--color-border)' }}
        >
          <div className="relative mb-3">
            <button
              ref={guidelinesButtonRef}
              onClick={() => setGuidelinesOpen((o) => !o)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ backgroundColor: 'var(--color-amber)', color: '#FFFFFF', border: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A8612A')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber)')}
            >
              Question Ideas 💡
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
                          color: 'var(--color-text-muted)',
                        }}
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
                              backgroundColor: 'var(--color-cream)',
                              border: '0.5px solid var(--color-border)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--color-amber-bg)'
                              e.currentTarget.style.borderColor = 'rgba(199,123,58,0.3)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--color-cream)'
                              e.currentTarget.style.borderColor = 'var(--color-border)'
                            }}
                          >
                            <p style={{ fontSize: 12, color: 'var(--color-ink)', lineHeight: '1.4', marginBottom: 2 }}>{q.text}</p>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                color: 'var(--color-text-muted)',
                              }}
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
              placeholder={selectedTwinId === 'all' ? 'Ask all twins…' : `Ask ${selectedTwin?.name ?? 'twin'}…`}
              className="flex-1 px-4 py-3 text-sm resize-none outline-none transition-colors scrollbar-thin"
              style={{
                backgroundColor: '#FFFFFF',
                border: '0.5px solid var(--color-border)',
                borderRadius: 10,
                color: 'var(--color-ink)',
                minHeight: 42,
                maxHeight: 120,
              }}
              rows={1}
              disabled={loading}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-amber)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors disabled:opacity-40 flex-shrink-0"
              style={{ backgroundColor: 'var(--color-amber)', border: 'none' }}
              onMouseEnter={(e) => !(loading || !input.trim()) && ((e.currentTarget).style.backgroundColor = '#A8612A')}
              onMouseLeave={(e) => ((e.currentTarget).style.backgroundColor = 'var(--color-amber)')}
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
          <p style={{ fontSize: 10, color: 'var(--color-text-faint)', marginTop: 8 }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
