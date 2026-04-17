'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { Send, Loader2, Sparkles, ChevronRight } from 'lucide-react'
import type { ChatMessage, Ability } from '@/lib/types'

const SYSTEM_PROMPT = `Sei un consulente strategico che aiuta un imprenditore o fondatore a identificare le proprie competenze chiave e le opportunità di mercato, usando il framework Market Opportunity Navigator (Worksheet 1).

Il tuo obiettivo è guidarli attraverso:
1. Prima, identifica le COMPETENZE CHIAVE (Abilities) chiedendo di:
   - Competenze tecnologiche e know-how tecnico
   - Risorse uniche, asset proprietari o dati a cui hanno accesso
   - Expertise specifica, conoscenze proprietarie o metodologie distintive
   Fai una domanda alla volta. Costruisci sulle risposte precedenti.

2. Per ogni competenza identificata, esplora 2-3 possibili APPLICAZIONI (quali problemi risolverebbe, quali prodotti/servizi si potrebbero creare).

3. Per ogni applicazione, identifica il SEGMENTO DI CLIENTELA TARGET (chi ne beneficerebbe di più specificamente).

Ogni combinazione applicazione + segmento clientela = un'Opportunità di Mercato.

Sii conversazionale, curioso e analitico. Valida le loro idee approfondendo. Quando hai identificato almeno 2 opportunità di mercato solide, comunicalo all'utente e digli che può generare la lista delle opportunità.

Inizia con una domanda calorosa e coinvolgente sui punti di forza tecnici o commerciali principali.

LINGUA: Parla in italiano di default. Se l'utente risponde in un'altra lingua (es. inglese), adatta immediatamente la tua lingua a quella dell'utente e continua in quella lingua per tutto il resto della conversazione. Detect the language of the user's input and respond in that same language throughout the entire conversation.`

export default function AbilitiesClient({ project }: { project: { id: string; title: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [abilities, setAbilities] = useState<Ability[]>([])
  const [opportunities, setOpportunities] = useState<{ name: string; application: string; customer_segment: string; description: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Load persisted messages or send initial
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
    setInitialized(true)
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

    // Show streaming message
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

    // Extract after each exchange
    if (finalMessages.length >= 4) {
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
    const { abilities: extractedAbilities } = await abilitiesRes.json()
    const { opportunities: extractedOpps } = await oppsRes.json()
    if (extractedAbilities?.length) setAbilities(extractedAbilities)
    if (extractedOpps?.length) setOpportunities(extractedOpps)
  }

  async function handleGenerateOpportunities() {
    if (opportunities.length === 0) return
    setSaving(true)

    // Update project title from first opportunity
    const title = opportunities[0]?.name ?? project.title
    await supabase.from('projects').update({ title }).eq('id', project.id)

    // Delete old abilities and insert new
    await supabase.from('abilities').delete().eq('project_id', project.id)
    if (abilities.length > 0) {
      await supabase.from('abilities').insert(
        abilities.map((a) => ({ project_id: project.id, name: a.name, description: a.description }))
      )
    }

    // Delete old opportunities and insert new
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

  return (
    <div className="flex min-h-screen">
      <Sidebar projectId={project.id} projectTitle={project.title} />

      <div className="ml-60 flex-1 flex overflow-hidden min-h-screen">
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <h1 className="text-lg font-semibold text-gray-900">Core Abilities</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Let the AI guide you through identifying your core competencies and market opportunities.
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
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

        {/* Right panel — extracted data */}
        <div className="w-[340px] border-l border-gray-200 bg-white overflow-y-auto p-6 flex-shrink-0">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles size={16} className="text-[#0D6E6E]" />
            <h2 className="text-sm font-semibold text-gray-900">Extracted so far</h2>
          </div>

          {/* Abilities */}
          <div className="mb-6">
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

          {/* Opportunities */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Market Opportunities ({opportunities.length})
            </h3>
            {opportunities.length === 0 ? (
              <p className="text-xs text-gray-300 italic">None yet — keep going…</p>
            ) : (
              <div className="space-y-2">
                {opportunities.map((o, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-800">{o.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {o.customer_segment} · {o.application}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generate button */}
          {opportunities.length >= 2 && (
            <button
              onClick={handleGenerateOpportunities}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-[#0D6E6E] text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-[#0a5555] transition-colors disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Generate opportunities
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          )}
          {opportunities.length < 2 && (
            <p className="text-xs text-gray-400 text-center">
              Keep the conversation going — at least 2 opportunities are needed to proceed.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
