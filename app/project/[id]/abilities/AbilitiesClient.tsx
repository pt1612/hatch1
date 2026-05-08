'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import { Send, Loader2, Plus, X, ChevronRight, ChevronDown, Pencil } from 'lucide-react'
import type { ChatMessage, Ability } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/ui/toast'

// ─── Local ability (table row) ────────────────────────────────────────────────

type LocalAbility = {
  localId: string  // client-side key
  dbId?: string    // Supabase id (undefined = unsaved)
  name: string
  description: string
}

type ExtractedOpportunity = {
  name: string
  application: string
  customer_segment: string
  description: string
}

// ─── System prompt ────────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are a strategic advisor helping a founder map their core capabilities and expertise. Your only goal is to understand what they know how to do.

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

function buildSystemPrompt(abilities: LocalAbility[]): string {
  if (abilities.length === 0) return BASE_SYSTEM_PROMPT
  const list = abilities.map((a) => `- ${a.name}: ${a.description}`).join('\n')
  return `${BASE_SYSTEM_PROMPT}

Abilità già identificate dal fondatore (non ripeterle, approfondisci solo quelle mancanti):
${list}`
}

let _localIdSeq = 0
function newLocalId() { return `local_${++_localIdSeq}` }

// ─── AbilityCard ──────────────────────────────────────────────────────────────

function AbilityCard({
  ability,
  isEditing,
  draft,
  onDraftChange,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  ability: LocalAbility
  isEditing: boolean
  draft: { name: string; description: string }
  onDraftChange: (d: { name: string; description: string }) => void
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  if (isEditing) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '0.5px solid var(--color-amber)',
          borderRadius: 12,
          padding: 14,
        }}
      >
        <input
          ref={nameRef}
          autoFocus
          type="text"
          value={draft.name}
          onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onSave() }
            if (e.key === 'Escape') onCancel()
          }}
          placeholder="Nome abilità…"
          style={{
            width: '100%',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-ink)',
            background: 'none',
            border: 'none',
            outline: 'none',
            marginBottom: 6,
          }}
        />
        <textarea
          value={draft.description}
          onChange={(e) => onDraftChange({ ...draft, description: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}
          placeholder="Breve descrizione…"
          rows={2}
          style={{
            width: '100%',
            fontSize: 12,
            color: 'var(--color-text-muted)',
            background: 'none',
            border: 'none',
            outline: 'none',
            resize: 'none',
            lineHeight: 1.5,
            marginBottom: 10,
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              fontSize: 11,
              color: 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            Annulla
          </button>
          <button
            onClick={onSave}
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#FFFFFF',
              backgroundColor: 'var(--color-amber)',
              border: 'none',
              borderRadius: 6,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            Salva
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onEdit}
      style={{
        position: 'relative',
        backgroundColor: '#FFFFFF',
        border: `0.5px solid ${hovered ? 'var(--color-amber)' : 'var(--color-border)'}`,
        borderRadius: 12,
        padding: 14,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)', marginBottom: 4, lineHeight: 1.3 }}>
            {ability.name || <span style={{ color: 'var(--color-text-faint)', fontStyle: 'italic' }}>Nome…</span>}
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
            {ability.description || <span style={{ fontStyle: 'italic', color: 'var(--color-text-faint)' }}>Descrizione…</span>}
          </p>
        </div>
        {hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            style={{
              flexShrink: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-faint)',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-faint)')}
          >
            <X size={13} />
          </button>
        )}
      </div>
      {hovered && (
        <Pencil
          size={10}
          style={{ position: 'absolute', bottom: 10, right: 14, color: 'var(--color-text-faint)' }}
        />
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AbilitiesClient({
  project,
  initialAbilities,
}: {
  project: { id: string; title: string }
  initialAbilities: Ability[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Keep abilities ref current for system prompt in initial message
  const tableAbilitiesRef = useRef<LocalAbility[]>([])

  // ── Abilities table ────────────────────────────────────────────────────────
  const [tableAbilities, setTableAbilities] = useState<LocalAbility[]>(
    initialAbilities.map((a) => ({ localId: a.id, dbId: a.id, name: a.name, description: a.description }))
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ name: '', description: '' })

  useEffect(() => { tableAbilitiesRef.current = tableAbilities }, [tableAbilities])

  // ── Chat ───────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  // Per-message extracted ability suggestions: Map<msgIndex, [{name,description}]>
  const [msgSuggestions, setMsgSuggestions] = useState<Map<number, { name: string; description: string }[]>>(new Map())

  // ── Opportunities ──────────────────────────────────────────────────────────
  const [opportunities, setOpportunities] = useState<ExtractedOpportunity[]>([])
  const [saving, setSaving] = useState(false)
  const [collapsedApps, setCollapsedApps] = useState<Set<string>>(new Set())

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(`hatch_abilities_${project.id}`)
    if (stored) {
      const parsed: ChatMessage[] = JSON.parse(stored)
      setMessages(parsed)
      if (parsed.length > 0) extractOpportunities(parsed)
    } else {
      sendInitialMessage()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Ability table CRUD ─────────────────────────────────────────────────────

  function startEdit(localId: string) {
    const ab = tableAbilities.find((a) => a.localId === localId)
    if (!ab) return
    setEditingId(localId)
    setEditDraft({ name: ab.name, description: ab.description })
  }

  function cancelEdit() {
    // Remove empty new card if user cancels without typing a name
    if (editingId) {
      const ab = tableAbilities.find((a) => a.localId === editingId)
      if (ab && !ab.dbId && !editDraft.name.trim()) {
        setTableAbilities((prev) => prev.filter((a) => a.localId !== editingId))
      }
    }
    setEditingId(null)
  }

  async function saveAbility(localId: string) {
    const name = editDraft.name.trim()
    const description = editDraft.description.trim()
    if (!name) { cancelEdit(); return }

    setTableAbilities((prev) =>
      prev.map((a) => a.localId === localId ? { ...a, name, description } : a)
    )
    setEditingId(null)

    const ab = tableAbilities.find((a) => a.localId === localId)
    if (ab?.dbId) {
      await supabase.from('abilities').update({ name, description }).eq('id', ab.dbId)
    } else {
      const { data } = await supabase
        .from('abilities')
        .insert({ project_id: project.id, name, description })
        .select()
        .single()
      if (data) {
        setTableAbilities((prev) =>
          prev.map((a) => a.localId === localId ? { ...a, dbId: data.id } : a)
        )
      }
    }
    toast('Abilità salvata')
  }

  function addEmptyAbility() {
    const localId = newLocalId()
    setTableAbilities((prev) => [...prev, { localId, name: '', description: '' }])
    setEditingId(localId)
    setEditDraft({ name: '', description: '' })
  }

  async function deleteAbility(localId: string) {
    const ab = tableAbilities.find((a) => a.localId === localId)
    setTableAbilities((prev) => prev.filter((a) => a.localId !== localId))
    if (ab?.dbId) {
      await supabase.from('abilities').delete().eq('id', ab.dbId)
    }
  }

  async function addFromSuggestion(name: string, description: string, msgIdx: number, sugIdx: number) {
    const localId = newLocalId()
    setTableAbilities((prev) => [...prev, { localId, name, description }])

    // Remove the used suggestion
    setMsgSuggestions((prev) => {
      const next = new Map(prev)
      const list = (next.get(msgIdx) ?? []).filter((_, i) => i !== sugIdx)
      if (list.length === 0) next.delete(msgIdx)
      else next.set(msgIdx, list)
      return next
    })

    // Persist to DB
    const { data } = await supabase
      .from('abilities')
      .insert({ project_id: project.id, name, description })
      .select()
      .single()
    if (data) {
      setTableAbilities((prev) =>
        prev.map((a) => a.localId === localId ? { ...a, dbId: data.id } : a)
      )
    }
  }

  // ── Chat logic ─────────────────────────────────────────────────────────────

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
        systemPrompt: buildSystemPrompt(tableAbilitiesRef.current),
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
      for (const line of decoder.decode(value).split('\n')) {
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

    const aiMsgIndex = finalMessages.length - 1
    extractSuggestionsFromMessage(assistantContent, aiMsgIndex)
    if (finalMessages.length >= 2) extractOpportunities(finalMessages)

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

  async function extractSuggestionsFromMessage(content: string, msgIndex: number) {
    if (content.length < 40) return
    try {
      const res = await fetch('/api/extract-abilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: `ASSISTANT: ${content}` }),
      })
      const { abilities } = await res.json()
      if (abilities?.length > 0) {
        setMsgSuggestions((prev) => new Map(prev).set(msgIndex, abilities))
      }
    } catch {}
  }

  async function extractOpportunities(msgs: ChatMessage[]) {
    const conversation = msgs.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
    try {
      const res = await fetch('/api/extract-opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation }),
      })
      const { opportunities: opps } = await res.json()
      if (opps?.length > 0) {
        setOpportunities(opps)
        toast('Opportunità generate')
      }
    } catch (err) {
      console.error('[AbilitiesClient] extractOpportunities error:', err)
    }
  }

  // ── Opportunities generation ───────────────────────────────────────────────

  async function handleGenerateOpportunities() {
    if (opportunities.length === 0) return
    setSaving(true)

    const title = opportunities[0]?.name ?? project.title
    await supabase.from('projects').update({ title }).eq('id', project.id)

    // Save table abilities (source of truth)
    await supabase.from('abilities').delete().eq('project_id', project.id)
    const toSave = tableAbilities.filter((a) => a.name.trim())
    if (toSave.length > 0) {
      await supabase.from('abilities').insert(
        toSave.map((a) => ({ project_id: project.id, name: a.name, description: a.description }))
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

  const oppsByApplication = opportunities.reduce<Record<string, ExtractedOpportunity[]>>((acc, opp) => {
    const key = opp.application || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(opp)
    return acc
  }, {})

  function toggleApp(appName: string) {
    setCollapsedApps((prev) => {
      const next = new Set(prev)
      if (next.has(appName)) next.delete(appName)
      else next.add(appName)
      return next
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />

      {/* Two-column body */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{ display: 'flex', flex: 1, overflow: 'hidden', marginTop: 52 }}
      >

        {/* ── LEFT COLUMN — Abilities table (60%) ── */}
        <div
          style={{
            width: '60%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRight: '0.5px solid var(--color-border)',
          }}
        >
          {/* Header */}
          <div style={{ padding: '32px 36px 20px', flexShrink: 0 }}>
            <h1
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontWeight: 400,
                fontSize: 34,
                letterSpacing: '-0.03em',
                color: 'var(--color-ink)',
                marginBottom: 4,
              }}
            >
              Le tue abilità
            </h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
              Inseriscile manualmente o lascia che la chat ti aiuti a scoprirle.
            </p>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 36px 36px' }}>

            {/* Grid */}
            {tableAbilities.length === 0 ? (
              <div
                style={{
                  padding: '40px 24px',
                  textAlign: 'center',
                  border: '0.5px dashed var(--color-border)',
                  borderRadius: 12,
                  marginBottom: 12,
                }}
              >
                <p style={{ fontSize: 13, color: 'var(--color-text-faint)', fontStyle: 'italic', margin: 0 }}>
                  Nessuna abilità ancora — aggiungi una manualmente o usa la chat.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <AnimatePresence>
                  {tableAbilities.map((ab) => (
                    <motion.div
                      key={ab.localId}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.18 }}
                    >
                      <AbilityCard
                        ability={ab}
                        isEditing={editingId === ab.localId}
                        draft={editDraft}
                        onDraftChange={setEditDraft}
                        onEdit={() => startEdit(ab.localId)}
                        onSave={() => saveAbility(ab.localId)}
                        onCancel={cancelEdit}
                        onDelete={() => deleteAbility(ab.localId)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Add button */}
            <button
              onClick={addEmptyAbility}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: '100%',
                padding: '10px 0',
                fontSize: 13,
                color: 'var(--color-text-muted)',
                background: 'none',
                border: '0.5px dashed var(--color-border)',
                borderRadius: 10,
                cursor: 'pointer',
                marginBottom: 36,
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-amber)'
                e.currentTarget.style.color = 'var(--color-amber)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.color = 'var(--color-text-muted)'
              }}
            >
              <Plus size={14} />
              Aggiungi abilità
            </button>

            {/* ── Opportunities section ── */}
            {opportunities.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-text-muted)',
                    marginBottom: 12,
                  }}
                >
                  Applicazioni di mercato ({opportunities.length})
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {Object.entries(oppsByApplication).map(([appName, opps]) => {
                    const isCollapsed = collapsedApps.has(appName)
                    return (
                      <div
                        key={appName}
                        style={{ border: '0.5px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}
                      >
                        <button
                          onClick={() => toggleApp(appName)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            backgroundColor: 'var(--color-cream)',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-linen)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-cream)')}
                        >
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>{appName}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 500,
                                backgroundColor: '#FFFFFF',
                                color: 'var(--color-text-muted)',
                                border: '0.5px solid var(--color-border)',
                                borderRadius: 99,
                                padding: '1px 6px',
                              }}
                            >
                              {opps.length}
                            </span>
                            <ChevronDown
                              size={12}
                              style={{
                                color: 'var(--color-text-faint)',
                                transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                                transition: 'transform 0.15s',
                              }}
                            />
                          </div>
                        </button>

                        {!isCollapsed && (
                          <div style={{ borderTop: '0.5px solid var(--color-border)' }}>
                            {opps.map((o, i) => (
                              <div
                                key={i}
                                style={{
                                  padding: '8px 14px',
                                  borderTop: i > 0 ? '0.5px solid var(--color-border)' : undefined,
                                }}
                              >
                                <p style={{ fontSize: 13, color: 'var(--color-ink)', fontWeight: 500, margin: '0 0 2px' }}>
                                  {o.customer_segment}
                                </p>
                                {o.description && (
                                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
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

                {opportunities.length >= 4 ? (
                  <button
                    onClick={handleGenerateOpportunities}
                    disabled={saving}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '12px 24px',
                      fontSize: 14,
                      fontWeight: 500,
                      backgroundColor: saving ? 'var(--color-linen)' : 'var(--color-amber)',
                      color: saving ? 'var(--color-text-muted)' : '#FFFFFF',
                      borderRadius: 10,
                      border: 'none',
                      cursor: saving ? 'default' : 'pointer',
                      transition: 'background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!saving) {
                        ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#A8612A'
                        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(199,123,58,0.25)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!saving) {
                        ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-amber)'
                        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
                      }
                    }}
                  >
                    {saving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        Genera applicazioni ({opportunities.length})
                        <ChevronRight size={16} />
                      </>
                    )}
                  </button>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--color-text-faint)', textAlign: 'center' }}>
                    Le applicazioni appariranno man mano che la conversazione prosegue.
                  </p>
                )}
              </div>
            )}

            {opportunities.length === 0 && tableAbilities.length > 0 && (
              <p style={{ fontSize: 12, color: 'var(--color-text-faint)', fontStyle: 'italic' }}>
                Le applicazioni di mercato appariranno qui dopo alcune risposte nella chat.
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN — AI Chat (40%) ── */}
        <div
          style={{
            width: '40%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: '#FAFAF8',
          }}
        >
          {/* Chat header */}
          <div
            style={{
              padding: '20px 24px 16px',
              borderBottom: '0.5px solid var(--color-border)',
              flexShrink: 0,
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)', marginBottom: 2 }}>
              Scopri le tue abilità
            </h2>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
              La chat ti guida — aggiungi le abilità emerse alla tabella.
            </p>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                style={{ marginBottom: 12 }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  {msg.role === 'assistant' && (
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-amber-bg)',
                        border: '0.5px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginRight: 8,
                        marginTop: 2,
                      }}
                    >
                      <span style={{ fontSize: 12 }}>🥚</span>
                    </div>
                  )}
                  <div
                    style={{
                      maxWidth: '78%',
                      padding: '8px 12px',
                      fontSize: 13,
                      lineHeight: 1.55,
                      ...(msg.role === 'user'
                        ? {
                            backgroundColor: 'var(--color-amber-bg)',
                            border: '0.5px solid rgba(199,123,58,0.2)',
                            borderRadius: '10px 10px 2px 10px',
                            color: 'var(--color-ink)',
                          }
                        : {
                            backgroundColor: '#FFFFFF',
                            border: '0.5px solid var(--color-border)',
                            borderRadius: '10px 10px 10px 2px',
                            color: 'var(--color-ink)',
                            fontFamily: "'Lora', Georgia, serif",
                            fontWeight: 400,
                          }),
                    }}
                  >
                    {msg.content || (loading && i === messages.length - 1 ? '…' : '')}
                  </div>
                </div>

                {/* Suggestion buttons */}
                {msg.role === 'assistant' && msgSuggestions.has(i) && (
                  <div style={{ paddingLeft: 34, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {msgSuggestions.get(i)!.map((sug, j) => (
                      <button
                        key={j}
                        onClick={() => addFromSuggestion(sug.name, sug.description, i, j)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11,
                          color: 'var(--color-amber)',
                          background: 'transparent',
                          border: '0.5px solid rgba(199,123,58,0.35)',
                          borderRadius: 6,
                          padding: '3px 9px',
                          cursor: 'pointer',
                          transition: 'background-color 0.1s',
                          alignSelf: 'flex-start',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber-bg)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Plus size={10} />
                        Aggiungi alla tabella:{' '}
                        <span style={{ fontWeight: 600 }}>{sug.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}

            {loading && messages.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-amber-bg)',
                    border: '0.5px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  <span style={{ fontSize: 12 }}>🥚</span>
                </div>
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    backgroundColor: '#FFFFFF',
                    border: '0.5px solid var(--color-border)',
                  }}
                >
                  <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-amber)' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input — sticky at bottom of right column */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '0.5px solid var(--color-border)',
              backgroundColor: 'var(--color-cream)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                }}
                placeholder="Scrivi la tua risposta… (Invio per inviare)"
                disabled={loading}
                rows={1}
                className="resize-none outline-none disabled:opacity-50"
                style={{
                  flex: 1,
                  fontSize: 13,
                  padding: '9px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '0.5px solid var(--color-border)',
                  borderRadius: 8,
                  color: 'var(--color-ink)',
                  minHeight: 40,
                  maxHeight: 100,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-amber)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(199,123,58,0.12)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border)'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="disabled:opacity-40 flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: 'var(--color-amber)',
                  borderRadius: 8,
                  border: 'none',
                  cursor: loading || !input.trim() ? 'default' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!loading && input.trim())
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#A8612A'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-amber)'
                }}
              >
                {loading ? (
                  <Loader2 size={14} className="text-white animate-spin" />
                ) : (
                  <Send size={14} className="text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
