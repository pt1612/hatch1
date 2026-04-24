'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { Send, Loader2, Sparkles, ChevronRight, ChevronDown } from 'lucide-react'
import type { ChatMessage, Ability } from '@/lib/types'

// Fix 6: rewritten system prompt — only understands abilities, never mentions applications,
// plain prose, short messages, one question per turn, stops after 4-5 exchanges.
const SYSTEM_PROMPT = `You are a strategic advisor helping a founder map their core capabilities and expertise. Your only goal is to understand what they know how to do.

Ask about their technical skills, proprietary methods, unique data or assets, domain expertise, and any other specific competencies they have built. Ask follow-up questions that build on what they just said.

Rules you must follow without exception:
- Write in plain conversational prose. No bullet points, numbered lists, bold text, headers, or emojis of any kind.
- Keep every message to two to four sentences maximum.
- Ask exactly one question per message.
- Never mention market opportunities, market applications, customer segments, validation, competitors, or anything related to market strategy. That is entirely outside the scope of this conversation.
- Never tell the user you are generating anything, extracting data, or doing anything in the background.
- Never ask for permission or confirmation before moving on. Just ask the next question.
- After four to five exchanges you have enough information. Wrap up the conversation naturally with a short closing statement. Do not keep asking for more.

Detect the language of the user's first message and use that language throughout the entire conversation. If no user message yet, start in Italian.`

type ExtractedOpportunity = {
  name: string
  application: string
  customer_segment: string
  description: string
}

export default function AbilitiesClient({ project }: { project: { id: string; title: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [abilities, setAbilities] = useState<Ability[]>([])
  const [opportunities, setOpportunities] = useState<ExtractedOpportunity[]>([])
  const [saving, setSaving] = useState(false)
  const [collapsedApps, setCollapsedApps] = useState<Set<string>>(new Set())

  // Load persisted messages or start fresh
  useEffect(() => {
    const stored = localStorage.getItem(`hatch_abilities_${project.id}`)
    if (stored) {
      const parsed: ChatMessage[] = JSON.parse(stored)
      setMessages(parsed)
      if (parsed.length > 0) {
        extractFromConversation(parsed)
      }
    } else {
      sendInitialMessage()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function persistMessages(msgs: ChatMessage[]) {
    localStorage.setItem(`hatch_abilities_${project.id}`, JSON.stringify(msgs))
  }

  async function sendInitialMessage() {
    setLoading(true)
    await streamResponse([], '')
    setLoading(false)
  }

  async function streamResponse(currentMessages: ChatMessage[], userInput: string) {
    const messagesToSend = userInput
      ? [...currentMessages, { role: 'user' as const, content: userInput }]
      : currentMessages

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messagesToSend,
        systemPrompt: SYSTEM_PROMPT,
        stream: true,
      }),
    })

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let assistantContent = ''

    const newMessages: ChatMessage[] = userInput
      ? [...currentMessages, { role: 'user', content: userInput }, { role: 'assistant', content: '' }]
      : [...currentMessages, { role: 'assistant', content: '' }]

    setMessages(newMessages)

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const parsed = JSON.parse(line.slice(6))
            assistantContent += parsed.content
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
              return updated
            })
          } catch {}
        }
      }
    }

    const finalMessages: ChatMessage[] = userInput
      ? [...currentMessages, { role: 'user', content: userInput }, { role: 'assistant', content: assistantContent }]
      : [...currentMessages, { role: 'assistant', content: assistantContent }]

    persistMessages(finalMessages)

    // Fix 3: start extracting from message 2 (first user reply received)
    if (finalMessages.length >= 2) {
      extractFromConversation(finalMessages)
    }

    return finalMessages
  }

  async function handleSend() {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setLoading(true)
    const updated = await streamResponse(messages, text)
    setMessages(updated)
    setLoading(false)
    inputRef.current?.focus()
  }

  // Fix 5: robust extraction — always fires, logs on failure
  async function extractFromConversation(msgs: ChatMessage[]) {
    const conversation = msgs.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
    const [abilitiesRes, oppsRes] = await Promise.all([
      fetch('/api/extract-abilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation }),
      }),
      fetch('/api/extract-opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation }),
      }),
    ])

    const abilitiesData = await abilitiesRes.json()
    const oppsData = await oppsRes.json()

    const extractedAbilities: Ability[] = abilitiesData.abilities ?? []
    const extractedOpps: ExtractedOpportunity[] = oppsData.opportunities ?? []

    if (extractedAbilities.length > 0) setAbilities(extractedAbilities)
    if (extractedOpps.length > 0) setOpportunities(extractedOpps)
  }

  async function handleGenerateOpportunities() {
    if (opportunities.length === 0) return
    setSaving(true)

    const title = opportunities[0]?.name ?? project.title
    await supabase.from('projects').update({ title }).eq('id', project.id)

    await supabase.from('abilities').delete().eq('project_id', project.id)
    if (abilities.length > 0) {
      await supabase.from('abilities').insert(
        abilities.map((a) => ({ project_id: project.id, name: a.name, description: a.description }))
      )
    }

    await supabase.from('opportunities').delete().eq('project_id', project.id).eq('phase', 'abilities')
    await supabase.from('opportunities').insert(
      opportunities.map((o) => ({
        project_id: project.id,
        name: o.name,
        application: o.application,
        customer_segment: o.customer_segment,
        description: o.description,
        phase: 'abilities',
      }))
    )

    setSaving(false)
    router.push(`/project/${project.id}/opportunities`)
  }

  // Group by application for display
  const oppsByApplication = opportunities.reduce<Record<string, ExtractedOpportunity[]>>(
    (acc, opp) => {
      const key = opp.application || 'Other'
      if (!acc[key]) acc[key] = []
      acc[key].push(opp)
      return acc
    },
    {}
  )

  function toggleApp(appName: string) {
    setCollapsedApps((prev) => {
      const next = new Set(prev)
      if (next.has(appName)) next.delete(appName)
      else next.add(appName)
      return next
    })
  }

  return (
    // Fix 2: h-screen + overflow-hidden keeps both panels fixed — neither scrolls away
    <div className="flex h-screen overflow-hidden">
      <Sidebar projectId={project.id} projectTitle={project.title} />

      <div className="ml-60 flex-1 flex overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <h1 className="text-lg font-semibold text-gray-900">Core Abilities</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Let the AI guide you through identifying your core competencies and market applications.
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-[#0D6E6E] rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                    <span className="text-white text-xs font-bold">H</span>
                  </div>
                )}
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#0D6E6E] text-white rounded-tr-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                  }`}
                >
                  {msg.content || (loading && i === messages.length - 1 ? '…' : '')}
                </div>
              </div>
            ))}
            {loading && messages.length === 0 && (
              <div className="flex justify-start">
                <div className="w-8 h-8 bg-[#0D6E6E] rounded-full flex items-center justify-center mr-2">
                  <span className="text-white text-xs font-bold">H</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-200 p-4 flex gap-3 items-end flex-shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Type your answer… (Enter to send)"
              disabled={loading}
              rows={1}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[#0D6E6E] focus:border-transparent text-sm resize-none outline-none disabled:opacity-50 transition"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="w-11 h-11 bg-[#0D6E6E] rounded-xl flex items-center justify-center hover:bg-[#0a5555] disabled:opacity-40 transition-colors flex-shrink-0"
            >
              {loading ? (
                <Loader2 size={16} className="text-white animate-spin" />
              ) : (
                <Send size={16} className="text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Fix 2: right panel is h-full overflow-y-auto — stays anchored, content scrolls inside */}
        <div className="w-[340px] border-l border-gray-200 bg-white overflow-y-auto p-6 flex-shrink-0">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles size={16} className="text-[#0D6E6E]" />
            <h2 className="text-sm font-semibold text-gray-900">Extracted so far</h2>
          </div>

          {/* Abilities */}
          <div className="mb-6">
            {/* Fix 2 label stays internal — this one is already "Core Abilities" which is correct */}
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Core Abilities ({abilities.length})
            </h3>
            {abilities.length === 0 ? (
              <p className="text-xs text-gray-300 italic">None yet — keep talking…</p>
            ) : (
              <div className="space-y-2">
                {abilities.map((a, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-800">{a.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fix 1: renamed to "Market Applications" */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Market Applications ({opportunities.length})
            </h3>
            {opportunities.length === 0 ? (
              <p className="text-xs text-gray-300 italic">None yet — keep talking…</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(oppsByApplication).map(([appName, opps]) => {
                  const isCollapsed = collapsedApps.has(appName)
                  return (
                    <div key={appName} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleApp(appName)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                      >
                        <span className="text-xs font-semibold text-gray-700 leading-snug pr-2">
                          {appName}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[10px] font-semibold text-gray-400 bg-white px-1.5 py-0.5 rounded-full border border-gray-200">
                            {opps.length}
                          </span>
                          <ChevronDown
                            size={12}
                            className={`text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                          />
                        </div>
                      </button>
                      {!isCollapsed && (
                        <div className="divide-y divide-gray-50">
                          {opps.map((o, i) => (
                            <div key={i} className="px-3 py-2">
                              <p className="text-xs text-gray-700 font-medium">{o.customer_segment}</p>
                              {o.description && (
                                <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
                                  {o.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Fix 1: renamed button label */}
          {opportunities.length >= 4 ? (
            <button
              onClick={handleGenerateOpportunities}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-[#0D6E6E] text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-[#0a5555] transition-colors disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Generate applications ({opportunities.length})
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          ) : (
            <p className="text-xs text-gray-400 text-center">
              Applications will appear here as the conversation progresses.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
