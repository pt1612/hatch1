'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { Send, Loader2, Sparkles, ChevronRight, ChevronDown } from 'lucide-react'
import type { ChatMessage, Ability } from '@/lib/types'

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

  // Keep a ref to the latest abilities so beforeunload can read it synchronously
  const abilitiesRef = useRef<Ability[]>([])
  useEffect(() => { abilitiesRef.current = abilities }, [abilities])

  const saveAbilitiesToDB = useCallback(async (abilitiesToSave: Ability[]) => {
    if (abilitiesToSave.length === 0) return
    try {
      await supabase.from('abilities').delete().eq('project_id', project.id)
      await supabase.from('abilities').insert(
        abilitiesToSave.map((a) => ({ project_id: project.id, name: a.name, description: a.description }))
      )
    } catch (err) {
      console.error('[AbilitiesClient] Failed to save abilities to DB:', err)
    }
  }, [project.id, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const stored = localStorage.getItem(`hatch_abilities_${project.id}`)
    if (stored) {
      const parsed: ChatMessage[] = JSON.parse(stored)
      setMessages(parsed)
      if (parsed.length > 0) extractFromConversation(parsed)
    } else {
      sendInitialMessage()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Save on page unload so navigation away doesn't lose extracted abilities
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (abilitiesRef.current.length > 0) {
        // Kick off async save — best-effort on unload
        saveAbilitiesToDB(abilitiesRef.current).catch((err) =>
          console.error('[AbilitiesClient] beforeunload save error:', err)
        )
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveAbilitiesToDB])

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
      body: JSON.stringify({ messages: messagesToSend, systemPrompt: SYSTEM_PROMPT, stream: true }),
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
      for (const line of chunk.split('\n')) {
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
    if (finalMessages.length >= 2) extractFromConversation(finalMessages)
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

  async function extractFromConversation(msgs: ChatMessage[]) {
    const conversation = msgs.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
    try {
      const [abilitiesRes, oppsRes] = await Promise.all([
        fetch('/api/extract-abilities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation }) }),
        fetch('/api/extract-opportunities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation }) }),
      ])
      const abilitiesData = await abilitiesRes.json()
      const oppsData = await oppsRes.json()
      const extractedAbilities: Ability[] = abilitiesData.abilities ?? []
      const extractedOpps: ExtractedOpportunity[] = oppsData.opportunities ?? []
      if (extractedAbilities.length > 0) {
        setAbilities(extractedAbilities)
        // Persist to DB on every AI message — don't wait for the explicit "Generate" button
        await saveAbilitiesToDB(extractedAbilities)
      }
      if (extractedOpps.length > 0) setOpportunities(extractedOpps)
    } catch (err) {
      console.error('[AbilitiesClient] extractFromConversation error:', err)
    }
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
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Sidebar projectId={project.id} projectTitle={project.title} />

      <div className="ml-60 flex-1 flex overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div
            className="px-6 py-4 flex-shrink-0"
            style={{
              backgroundColor: 'var(--color-cream)',
              borderBottom: '0.5px solid var(--color-border)',
            }}
          >
            <h1
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontWeight: 400,
                fontSize: 22,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink)',
              }}
            >
              Core Abilities
            </h1>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Let the AI guide you through identifying your core competencies and market applications.
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 overflow-hidden"
                    style={{ backgroundColor: 'var(--color-amber-bg)', border: '0.5px solid var(--color-border)' }}
                  >
                    <span style={{ fontSize: 14 }}>🥚</span>
                  </div>
                )}
                <div
                  className="max-w-[70%] px-4 py-3 text-sm leading-relaxed"
                  style={
                    msg.role === 'user'
                      ? {
                          backgroundColor: 'var(--color-amber-bg)',
                          border: '0.5px solid rgba(199,123,58,0.2)',
                          borderRadius: '12px 12px 2px 12px',
                          color: 'var(--color-ink)',
                          fontFamily: msg.role === 'user' ? undefined : "'Lora', Georgia, serif",
                        }
                      : {
                          backgroundColor: '#FFFFFF',
                          border: '0.5px solid var(--color-border)',
                          borderRadius: '12px 12px 12px 2px',
                          color: 'var(--color-ink)',
                        }
                  }
                >
                  {msg.role === 'assistant' ? (
                    <span style={{ fontFamily: "'Lora', Georgia, serif", fontWeight: 400 }}>
                      {msg.content || (loading && i === messages.length - 1 ? '…' : '')}
                    </span>
                  ) : (
                    msg.content || (loading && i === messages.length - 1 ? '…' : '')
                  )}
                </div>
              </div>
            ))}
            {loading && messages.length === 0 && (
              <div className="flex justify-start">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center mr-2"
                  style={{ backgroundColor: 'var(--color-amber-bg)', border: '0.5px solid var(--color-border)' }}
                >
                  <span style={{ fontSize: 14 }}>🥚</span>
                </div>
                <div
                  className="px-4 py-3 rounded-2xl"
                  style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
                >
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-amber)' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="p-4 flex gap-3 items-end flex-shrink-0"
            style={{
              backgroundColor: 'var(--color-cream)',
              borderTop: '0.5px solid var(--color-border)',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder="Type your answer… (Enter to send)"
              disabled={loading}
              rows={1}
              className="flex-1 px-4 py-3 text-sm resize-none outline-none disabled:opacity-50 transition-colors"
              style={{
                backgroundColor: '#FFFFFF',
                border: '0.5px solid var(--color-border)',
                borderRadius: 8,
                color: 'var(--color-ink)',
                minHeight: 44,
                maxHeight: 120,
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-amber)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="w-11 h-11 flex items-center justify-center transition-colors disabled:opacity-40 flex-shrink-0"
              style={{
                backgroundColor: 'var(--color-amber)',
                borderRadius: 8,
                border: 'none',
              }}
              onMouseEnter={(e) => !(loading || !input.trim()) && ((e.currentTarget).style.backgroundColor = '#A8612A')}
              onMouseLeave={(e) => ((e.currentTarget).style.backgroundColor = 'var(--color-amber)')}
            >
              {loading ? (
                <Loader2 size={16} className="text-white animate-spin" />
              ) : (
                <Send size={16} className="text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div
          className="w-[340px] overflow-y-auto p-6 flex-shrink-0 scrollbar-thin"
          style={{
            backgroundColor: '#FFFFFF',
            borderLeft: '0.5px solid var(--color-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Sparkles size={15} style={{ color: 'var(--color-amber)' }} />
            <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>Extracted so far</h2>
          </div>

          {/* Abilities */}
          <div className="mb-6">
            <h3
              className="mb-2"
              style={{
                fontSize: 10,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-text-muted)',
              }}
            >
              Core Abilities ({abilities.length})
            </h3>
            {abilities.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--color-text-faint)', fontStyle: 'italic' }}>None yet — keep talking…</p>
            ) : (
              <div className="space-y-2">
                {abilities.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3"
                    style={{ backgroundColor: 'var(--color-cream)', border: '0.5px solid var(--color-border)' }}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-1 flex-shrink-0"
                        style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#4CAF7D', display: 'inline-block' }}
                      />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)' }}>{a.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{a.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Market Applications */}
          <div className="mb-6">
            <h3
              className="mb-2"
              style={{
                fontSize: 10,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-text-muted)',
              }}
            >
              Market Applications ({opportunities.length})
            </h3>
            {opportunities.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--color-text-faint)', fontStyle: 'italic' }}>None yet — keep talking…</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(oppsByApplication).map(([appName, opps]) => {
                  const isCollapsed = collapsedApps.has(appName)
                  return (
                    <div
                      key={appName}
                      className="rounded-xl overflow-hidden"
                      style={{ border: '0.5px solid var(--color-border)' }}
                    >
                      <button
                        onClick={() => toggleApp(appName)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors"
                        style={{ backgroundColor: 'var(--color-cream)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-linen)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-cream)')}
                      >
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)' }}>{appName}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className="px-1.5 py-0.5 rounded-full"
                            style={{
                              fontSize: 10,
                              fontWeight: 500,
                              backgroundColor: '#FFFFFF',
                              color: 'var(--color-text-muted)',
                              border: '0.5px solid var(--color-border)',
                            }}
                          >
                            {opps.length}
                          </span>
                          <ChevronDown
                            size={12}
                            style={{ color: 'var(--color-text-faint)', transform: isCollapsed ? 'rotate(-90deg)' : 'none' }}
                          />
                        </div>
                      </button>
                      {!isCollapsed && (
                        <div style={{ borderTop: '0.5px solid var(--color-border)' }}>
                          {opps.map((o, i) => (
                            <div
                              key={i}
                              className="px-3 py-2"
                              style={{ borderTop: i > 0 ? '0.5px solid var(--color-border)' : undefined }}
                            >
                              <p style={{ fontSize: 12, color: 'var(--color-ink)', fontWeight: 500 }}>{o.customer_segment}</p>
                              {o.description && (
                                <p
                                  className="line-clamp-2"
                                  style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2, lineHeight: '1.5' }}
                                >
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

          {opportunities.length >= 4 ? (
            <button
              onClick={handleGenerateOpportunities}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors disabled:opacity-60"
              style={{
                backgroundColor: 'var(--color-amber)',
                color: '#FFFFFF',
                borderRadius: 10,
                border: 'none',
              }}
              onMouseEnter={(e) => !saving && ((e.currentTarget).style.backgroundColor = '#A8612A')}
              onMouseLeave={(e) => ((e.currentTarget).style.backgroundColor = 'var(--color-amber)')}
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
            <p style={{ fontSize: 12, color: 'var(--color-text-faint)', textAlign: 'center' }}>
              Applications will appear here as the conversation progresses.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
