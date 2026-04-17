'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
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
    <div
      className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-xs font-bold flex-shrink-0`}
    >
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
          <div className="flex items-center gap-1 px-4 py-3 bg-white border border-gray-200 rounded-2xl rounded-bl-sm">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
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
          <div className="bg-[#0D6E6E] text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
            {message.content}
          </div>
          {message.timestamp && (
            <p className="text-[10px] text-gray-400 mt-1 text-right">{message.timestamp}</p>
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
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0 text-gray-500">
          ?
        </div>
      )}
      <div className="max-w-[70%]">
        {message.twinName && (
          <p className="text-[10px] font-semibold text-gray-500 mb-1 ml-1">{message.twinName}</p>
        )}
        <div
          className={`border px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed text-gray-800 ${bubbleClass}`}
        >
          {message.content}
        </div>
        {message.timestamp && (
          <p className="text-[10px] text-gray-400 mt-1 ml-1">{message.timestamp}</p>
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
  // Track interview IDs that were created this session (so we can update them)
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
        await supabase
          .from('twin_interviews')
          .update({ messages: newMessages, updated_at: new Date().toISOString() })
          .eq('id', existingId)
      } else {
        const { data } = await supabase
          .from('twin_interviews')
          .insert({
            twin_id: dbTwinId,
            opportunity_id: opportunity.id,
            messages: newMessages,
          })
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

    const userMsg: TwinMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: formatTime(),
    }
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
        // Group mode: non-streaming, parallel responses
        const res = await fetch('/api/twin-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectInfo,
            twins,
            selectedTwinId: 'all',
            messages, // history before this user message
            userMessage: text.trim(),
          }),
        })
        const { responses } = await res.json()
        const assistantMsgs: TwinMessage[] = (
          responses as { twinId: string; twinName: string; text: string }[]
        ).map((r) => ({
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
        // Individual mode: SSE streaming
        const twin = twins.find((t) => t.id === selectedTwinId)
        const res = await fetch('/api/twin-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectInfo,
            twins,
            selectedTwinId,
            messages,
            userMessage: text.trim(),
          }),
        })

        const placeholderMsg: TwinMessage = {
          role: 'assistant',
          content: '',
          twinId: selectedTwinId,
          twinName: twin?.name,
          timestamp: formatTime(),
        }
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
              } catch {
                // ignore parse errors on partial chunks
              }
            }
          }
        }

        const finalMessages = [...withUser, { ...placeholderMsg, content: accumulated }]
        await persistMessages(finalMessages)
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: formatTime(),
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const selectedTwin =
    selectedTwinId !== 'all' ? twins.find((t) => t.id === selectedTwinId) ?? null : null
  const typingTwins = selectedTwinId === 'all' ? twins : selectedTwin ? [selectedTwin] : []

  return (
    <div className="ml-60 flex min-h-screen">
      <Sidebar
        projectId={project.id}
        projectTitle={project.title}
        primaryOpportunityId={opportunity.id}
        primaryOpportunityName={opportunity.name}
        hasTwinInterviews={messages.length > 0}
      />

      {/* Twin list sidebar */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-screen sticky top-0">
        <div className="p-4 border-b border-gray-100 flex-1 overflow-y-auto scrollbar-thin">
          <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Participants
          </h2>

          {/* Group interview */}
          <button
            onClick={() => setSelectedTwinId('all')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors mb-1 ${
              selectedTwinId === 'all'
                ? 'bg-[#0D6E6E] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
              G
            </div>
            <span className="text-xs">Group Interview</span>
          </button>

          <div className="border-t border-gray-100 my-2" />

          {/* Individual twins */}
          {twins.map((twin) => {
            const colorClass = TWIN_AVATAR_COLORS[getTwinIndex(twin.id) % TWIN_AVATAR_COLORS.length]
            const isSelected = selectedTwinId === twin.id
            return (
              <button
                key={twin.id}
                onClick={() => setSelectedTwinId(twin.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors mb-1 ${
                  isSelected ? 'bg-[#0D6E6E] text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full ${colorClass} flex items-center justify-center text-xs font-bold flex-shrink-0`}
                >
                  {getInitials(twin.name)}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-semibold truncate">{twin.name}</p>
                  <p
                    className={`text-[10px] truncate ${
                      isSelected ? 'text-white/70' : 'text-gray-400'
                    }`}
                  >
                    {twin.segment}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Progress + Generate button */}
        <div className="p-4 border-t border-gray-100">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Progress
              </span>
              <span className="text-[10px] font-semibold text-gray-500">
                {userQCount}/6 questions
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0D6E6E] rounded-full transition-all duration-500"
                style={{ width: `${sessionPct}%` }}
              />
            </div>
          </div>
          <button
            onClick={() =>
              router.push(
                `/project/${project.id}/opportunity/${opportunity.id}/twins/results`
              )
            }
            disabled={!canReport}
            className="w-full flex items-center justify-center gap-1.5 bg-[#0D6E6E] text-white py-2 px-3 rounded-lg text-xs font-semibold hover:bg-[#0a5555] transition-colors disabled:opacity-40"
          >
            Generate Results
            <ChevronRight size={12} />
          </button>
          {!canReport && (
            <p className="text-[10px] text-gray-400 text-center mt-1.5">
              {2 - userQCount} more question{2 - userQCount !== 1 ? 's' : ''} to unlock
            </p>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Chat header */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-end flex-shrink-0">
          <BackButton
            href={`/project/${project.id}/opportunity/${opportunity.id}/twins/setup`}
            label="Back to setup"
          />
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center pb-10">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Start the interview</h3>
              <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                Ask about pain points, desired outcomes, and jobs to be done. Use Question Ideas 💡 for prompts.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => <ChatBubble key={i} message={msg} twins={twins} />)
          )}
          {loading && <TypingIndicator twins={typingTwins} />}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
          {/* Question Ideas button */}
          <div className="relative mb-3">
            <button
              ref={guidelinesButtonRef}
              onClick={() => setGuidelinesOpen((o) => !o)}
              className="flex items-center gap-2 bg-[#0D6E6E] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#0a5555] transition-colors"
            >
              Question Ideas 💡
              {guidelinesOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {guidelinesOpen && (
              <div
                ref={guidelinesPanelRef}
                className="absolute bottom-full left-0 mb-2 w-96 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 max-h-[60vh] overflow-y-auto scrollbar-thin"
              >
                <div className="space-y-4">
                  {QUESTION_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
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
                            className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-[#0D6E6E]/5 border border-gray-100 hover:border-[#0D6E6E]/20 transition-colors"
                          >
                            <p className="text-xs text-gray-700 leading-snug mb-0.5">{q.text}</p>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
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
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(input)
                }
              }}
              placeholder={
                selectedTwinId === 'all'
                  ? 'Ask all twins…'
                  : `Ask ${selectedTwin?.name ?? 'twin'}…`
              }
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm resize-none focus:ring-2 focus:ring-[#0D6E6E] focus:border-transparent outline-none transition scrollbar-thin"
              style={{ minHeight: '42px', maxHeight: '120px' }}
              rows={1}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="flex items-center justify-center w-10 h-10 bg-[#0D6E6E] text-white rounded-xl hover:bg-[#0a5555] transition-colors disabled:opacity-40 flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
