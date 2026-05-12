'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import {
  Plus, CheckCircle2, Clock, ChevronRight, ChevronDown, Loader2, X, Trash2,
  Sparkles, Brain,
} from 'lucide-react'
import type { Opportunity, Ability } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/lib/i18n/context'

// ─── Types ────────────────────────────────────────────────────────────────────

type LocalAbility = {
  id: string
  name: string
  description: string
}

// ─── Delete-application confirmation strip ────────────────────────────────────

function DeleteAppConfirm({
  appName,
  count,
  onConfirm,
  onCancel,
}: {
  appName: string
  count: number
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  return (
    <div
      className="flex items-center justify-between px-5 py-3"
      style={{ backgroundColor: '#FEF2F2', borderTop: '0.5px solid #FECACA' }}
    >
      <p style={{ fontSize: 12, color: '#DC2626' }}>
        {t.opps_delete_app_confirm} <strong>{appName}</strong> {t.opps_delete_app_text}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          style={{
            fontSize: 11, color: 'var(--color-text-muted)',
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
          }}
        >
          {t.opps_delete_cancel}
        </button>
        <button
          onClick={onConfirm}
          style={{
            fontSize: 11, fontWeight: 500, color: '#FFFFFF',
            backgroundColor: '#DC2626', border: 'none', borderRadius: 6,
            padding: '4px 12px', cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#B91C1C')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#DC2626')}
        >
          {t.opps_delete_app_confirm}
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OpportunitiesClient({
  project,
  opportunities: initialOpps,
  evaluations,
  abilities: initialAbilities,
}: {
  project: { id: string; title: string }
  opportunities: Opportunity[]
  evaluations: { id: string; opportunity_id: string; report: unknown }[]
  abilities: Ability[]
}) {
  const supabase = createClient()
  const { t, lang } = useI18n()

  // ── Local state ─────────────────────────────────────────────────────────────
  const [localOpps, setLocalOpps] = useState<Opportunity[]>(initialOpps)
  const [localAbilities, setLocalAbilities] = useState<LocalAbility[]>(
    initialAbilities.map((a) => ({ id: a.id, name: a.name, description: a.description }))
  )

  // Form: add opportunity
  const [showAddForm, setShowAddForm] = useState(false)
  const [newOpp, setNewOpp] = useState({ name: '', application: '', customer_segment: '', description: '' })
  const [adding, setAdding] = useState(false)

  // Form: add ability (inside skills section)
  const [showAddAbility, setShowAddAbility] = useState(false)
  const [newAbility, setNewAbility] = useState({ name: '', description: '' })
  const [addingAbility, setAddingAbility] = useState(false)

  // Skills section open/closed
  const [skillsOpen, setSkillsOpen] = useState(true)

  // Collapsed application groups
  const [collapsedApps, setCollapsedApps] = useState<Set<string>>(new Set())

  // Confirm delete for an entire application
  const [confirmDeleteApp, setConfirmDeleteApp] = useState<string | null>(null)

  // AI suggestion loading
  const [suggestingAI, setSuggestingAI] = useState(false)

  const evalMap = evaluations.reduce<Record<string, { id: string; report: unknown }>>((acc, e) => {
    acc[e.opportunity_id] = e
    return acc
  }, {})
  const evaluatedCount = localOpps.filter((o) => !!evalMap[o.id]?.report).length

  const grouped = localOpps.reduce<{ app: string; opps: Opportunity[] }[]>((acc, opp) => {
    const appName = opp.application?.trim() || 'Other'
    const existing = acc.find((g) => g.app === appName)
    if (existing) existing.opps.push(opp)
    else acc.push({ app: appName, opps: [opp] })
    return acc
  }, [])

  function toggleApp(appName: string) {
    setCollapsedApps((prev) => {
      const next = new Set(prev)
      if (next.has(appName)) next.delete(appName)
      else next.add(appName)
      return next
    })
  }

  // ── Add opportunity ──────────────────────────────────────────────────────────

  async function handleAddOpportunity() {
    if (!newOpp.name.trim()) return
    setAdding(true)
    const { data } = await supabase
      .from('opportunities')
      .insert({
        project_id: project.id,
        name: newOpp.name,
        application: newOpp.application,
        customer_segment: newOpp.customer_segment,
        description: newOpp.description,
        phase: 'abilities',
      })
      .select()
      .single()
    if (data) setLocalOpps((prev) => [...prev, data as Opportunity])
    setNewOpp({ name: '', application: '', customer_segment: '', description: '' })
    setShowAddForm(false)
    setAdding(false)
  }

  // ── Delete opportunity ────────────────────────────────────────────────────────

  async function handleDeleteOpportunity(id: string) {
    setLocalOpps((prev) => prev.filter((o) => o.id !== id))
    await supabase.from('opportunities').delete().eq('id', id)
  }

  // ── Delete application (cascade) ─────────────────────────────────────────────

  async function handleDeleteApplication(app: string) {
    const ids = localOpps.filter((o) => (o.application?.trim() || 'Other') === app).map((o) => o.id)
    setLocalOpps((prev) => prev.filter((o) => (o.application?.trim() || 'Other') !== app))
    setConfirmDeleteApp(null)
    if (ids.length > 0) {
      await supabase.from('opportunities').delete().in('id', ids)
    }
  }

  // ── Add ability (inside skills section) ──────────────────────────────────────

  async function handleAddAbility() {
    if (!newAbility.name.trim()) return
    setAddingAbility(true)
    const { data } = await supabase
      .from('abilities')
      .insert({ project_id: project.id, name: newAbility.name, description: newAbility.description })
      .select()
      .single()
    if (data) {
      setLocalAbilities((prev) => [...prev, { id: data.id, name: data.name, description: data.description }])
    }
    setNewAbility({ name: '', description: '' })
    setShowAddAbility(false)
    setAddingAbility(false)
  }

  // ── AI suggest ────────────────────────────────────────────────────────────────

  async function handleSuggestWithAI() {
    if (suggestingAI) return
    setSuggestingAI(true)
    const abilityLines = localAbilities
      .filter((a) => a.name.trim())
      .map((a) => `ASSISTANT: The founder has the following skill: ${a.name}. ${a.description}`)
      .join('\n')
    const conversation = abilityLines || 'USER: I have various technical and business skills.'

    try {
      const res = await fetch('/api/extract-opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation, language: lang }),
      })
      const { opportunities: suggestedOpps } = await res.json()
      if (suggestedOpps?.length > 0) {
        const rows = suggestedOpps.map((o: { name: string; application: string; customer_segment: string; description: string }) => ({
          project_id: project.id,
          name: o.name,
          application: o.application,
          customer_segment: o.customer_segment,
          description: o.description,
          phase: 'abilities' as const,
        }))
        const { data: inserted } = await supabase.from('opportunities').insert(rows).select()
        if (inserted) setLocalOpps((prev) => [...prev, ...(inserted as Opportunity[])])
      }
    } catch (err) {
      console.error('[OpportunitiesClient] AI suggest error:', err)
    } finally {
      setSuggestingAI(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />

      <div className="flex-1 flex overflow-hidden min-h-screen pt-14">
        {/* Main list */}
        <motion.div
          className="flex-1 overflow-y-auto p-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1
                style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontWeight: 400,
                  fontSize: 34,
                  letterSpacing: '-0.03em',
                  color: 'var(--color-ink)',
                }}
              >
                Opportunities
              </h1>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {localOpps.length} {t.opps_identified} · {evaluatedCount} {t.opps_evaluated_count}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/project/${project.id}/abilities`}
                className="py-2 px-3 rounded-lg text-xs font-medium transition-colors"
                style={{
                  border: '0.5px solid var(--color-border)',
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-amber)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                {t.opps_back_skills}
              </Link>
              <button
                onClick={handleSuggestWithAI}
                disabled={suggestingAI || localAbilities.length === 0}
                className="flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium disabled:opacity-50"
                style={{
                  border: '0.5px solid var(--color-border)',
                  color: 'var(--color-ink)',
                  backgroundColor: '#FFFFFF',
                  cursor: suggestingAI || localAbilities.length === 0 ? 'default' : 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!suggestingAI && localAbilities.length > 0)
                    e.currentTarget.style.borderColor = 'var(--color-amber)'
                }}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                {suggestingAI ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Brain size={13} />
                )}
                {suggestingAI ? t.opps_suggesting : t.opps_suggest_ai}
              </button>
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className="flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: 'var(--color-amber)',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#A8612A'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(199,123,58,0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-amber)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <Plus size={14} />
                {t.opps_add_manually}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {localOpps.length > 0 && (
            <div
              className="rounded-full overflow-hidden mb-5"
              style={{ height: 4, backgroundColor: 'var(--color-linen)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${localOpps.length ? (evaluatedCount / localOpps.length) * 100 : 0}%`,
                  backgroundColor: 'var(--color-amber)',
                  boxShadow: '0 0 8px rgba(199,123,58,0.4)',
                }}
              />
            </div>
          )}

          {/* ── Skills collapsible section ── */}
          <div
            className="rounded-2xl overflow-hidden mb-5"
            style={{ border: '0.5px solid var(--color-border)' }}
          >
            <button
              onClick={() => setSkillsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors"
              style={{ backgroundColor: 'var(--color-cream)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-linen)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-cream)')}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={13} style={{ color: 'var(--color-amber)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>
                  Skills
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    backgroundColor: '#FFFFFF',
                    color: 'var(--color-text-muted)',
                    border: '0.5px solid var(--color-border)',
                    borderRadius: 99,
                    padding: '1px 7px',
                  }}
                >
                  {localAbilities.length}
                </span>
              </div>
              <ChevronDown
                size={13}
                style={{
                  color: 'var(--color-text-faint)',
                  transform: skillsOpen ? 'none' : 'rotate(-90deg)',
                  transition: 'transform 0.15s',
                }}
              />
            </button>

            <AnimatePresence>
              {skillsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ overflow: 'hidden', borderTop: '0.5px solid var(--color-border)' }}
                >
                  <div style={{ backgroundColor: '#FFFFFF', padding: '12px 20px 16px' }}>
                    {localAbilities.length === 0 && !showAddAbility && (
                      <p style={{ fontSize: 12, color: 'var(--color-text-faint)', fontStyle: 'italic', marginBottom: 10 }}>
                        {t.abilities_empty}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: localAbilities.length > 0 ? 12 : 0 }}>
                      {localAbilities.map((ab) => (
                        <div
                          key={ab.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            color: 'var(--color-ink)',
                            backgroundColor: 'var(--color-amber-bg)',
                            border: '0.5px solid rgba(199,123,58,0.2)',
                            borderRadius: 8,
                            padding: '4px 10px',
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{ab.name}</span>
                          {ab.description && (
                            <span style={{ color: 'var(--color-text-muted)' }}>— {ab.description}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add ability form */}
                    {showAddAbility ? (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          border: '0.5px solid var(--color-border)',
                          backgroundColor: 'var(--color-cream)',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <input
                            autoFocus
                            value={newAbility.name}
                            onChange={(e) => setNewAbility((p) => ({ ...p, name: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddAbility()}
                            placeholder={t.abilities_name_placeholder}
                            style={{
                              flex: 1,
                              fontSize: 12,
                              padding: '6px 10px',
                              border: '0.5px solid var(--color-border)',
                              borderRadius: 6,
                              outline: 'none',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--color-ink)',
                            }}
                          />
                          <input
                            value={newAbility.description}
                            onChange={(e) => setNewAbility((p) => ({ ...p, description: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddAbility()}
                            placeholder={t.abilities_desc_placeholder}
                            style={{
                              flex: 2,
                              fontSize: 12,
                              padding: '6px 10px',
                              border: '0.5px solid var(--color-border)',
                              borderRadius: 6,
                              outline: 'none',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--color-ink)',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => { setShowAddAbility(false); setNewAbility({ name: '', description: '' }) }}
                            style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px' }}
                          >
                            {t.common_cancel}
                          </button>
                          <button
                            onClick={handleAddAbility}
                            disabled={addingAbility || !newAbility.name.trim()}
                            style={{
                              fontSize: 11, fontWeight: 500, color: '#FFFFFF',
                              backgroundColor: 'var(--color-amber)', border: 'none',
                              borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                            }}
                          >
                            {addingAbility ? '…' : t.common_add}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddAbility(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11,
                          color: 'var(--color-text-muted)',
                          background: 'none',
                          border: '0.5px dashed var(--color-border)',
                          borderRadius: 7,
                          padding: '5px 12px',
                          cursor: 'pointer',
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
                        <Plus size={11} />
                        {t.opps_add_skill}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Manual add form */}
          {showAddForm && (
            <div
              className="rounded-2xl p-5 mb-5"
              style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>
                  {t.opps_add_dialog_title}
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{ color: 'var(--color-text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'name',             label: t.opps_name,        placeholder: '' },
                  { key: 'application',      label: t.opps_application, placeholder: '' },
                  { key: 'customer_segment', label: t.opps_segment,     placeholder: '' },
                  { key: 'description',      label: t.opps_description, placeholder: '' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label
                      className="block mb-1"
                      style={{
                        fontSize: 10, fontWeight: 500,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {label}
                    </label>
                    <input
                      value={newOpp[key as keyof typeof newOpp]}
                      onChange={(e) => setNewOpp((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 text-sm outline-none transition-colors"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '0.5px solid var(--color-border)',
                        borderRadius: 8,
                        color: 'var(--color-ink)',
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
                  </div>
                ))}
                <button
                  onClick={handleAddOpportunity}
                  disabled={adding || !newOpp.name.trim()}
                  className="flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-amber)', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={(e) => { if (!(adding || !newOpp.name.trim())) e.currentTarget.style.backgroundColor = '#A8612A' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-amber)' }}
                >
                  {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {t.opps_add_btn}
                </button>
              </div>
            </div>
          )}

          {/* Opportunity cards grouped by application */}
          {localOpps.length === 0 ? (
            <div className="text-center py-16">
              <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
                <path d="M50 15 C24 15 10 32 10 52 C10 74 25 88 50 88 C75 88 90 74 90 52 C90 32 76 15 50 15 Z" fill="var(--color-amber-bg)" />
                <circle cx="50" cy="50" r="14" fill="var(--color-linen)" />
              </svg>
              <p style={{ fontSize: 13, fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                {t.opps_empty}
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 4 }}>
                {t.opps_empty_hint}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(({ app, opps }) => {
                const isCollapsed = collapsedApps.has(app)
                const evaluatedInGroup = opps.filter((o) => !!evalMap[o.id]?.report).length
                const isConfirmingDelete = confirmDeleteApp === app
                return (
                  <div
                    key={app}
                    className="rounded-2xl overflow-hidden"
                    style={{ border: '0.5px solid var(--color-border)' }}
                  >
                    {/* Group header */}
                    <div
                      className="flex items-center transition-colors"
                      style={{ backgroundColor: 'var(--color-cream)' }}
                    >
                      <button
                        onClick={() => toggleApp(app)}
                        className="flex-1 flex items-center gap-3 px-5 py-3.5 text-left min-w-0"
                        onMouseEnter={(e) => (e.currentTarget.parentElement!.style.backgroundColor = 'var(--color-linen)')}
                        onMouseLeave={(e) => (e.currentTarget.parentElement!.style.backgroundColor = 'var(--color-cream)')}
                      >
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }} className="truncate">
                          {app}
                        </span>
                        <span
                          className="flex-shrink-0 px-2 py-0.5 rounded-full"
                          style={{
                            fontSize: 10, fontWeight: 500,
                            backgroundColor: '#FFFFFF',
                            color: 'var(--color-text-muted)',
                            border: '0.5px solid var(--color-border)',
                          }}
                        >
                          {evaluatedInGroup}/{opps.length} {t.opps_evaluated_label}
                        </span>
                        <ChevronDown
                          size={13}
                          style={{
                            color: 'var(--color-text-faint)',
                            flexShrink: 0,
                            transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                            transition: 'transform 0.15s',
                          }}
                        />
                      </button>
                      {/* Delete application button */}
                      <button
                        onClick={() => setConfirmDeleteApp(isConfirmingDelete ? null : app)}
                        className="flex-shrink-0 flex items-center justify-center transition-colors"
                        style={{
                          width: 36,
                          height: 36,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: isConfirmingDelete ? '#DC2626' : 'var(--color-text-faint)',
                          marginRight: 8,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = isConfirmingDelete ? '#DC2626' : 'var(--color-text-faint)')}
                        title="Elimina application"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Confirm delete strip */}
                    {isConfirmingDelete && (
                      <DeleteAppConfirm
                        appName={app}
                        count={opps.length}
                        onConfirm={() => handleDeleteApplication(app)}
                        onCancel={() => setConfirmDeleteApp(null)}
                      />
                    )}

                    {/* Opportunities inside group */}
                    {!isCollapsed && (
                      <div style={{ borderTop: '0.5px solid var(--color-border)' }}>
                        {opps.map((opp, idx) => {
                          const evaluation = evalMap[opp.id]
                          const isEvaluated = !!evaluation?.report
                          return (
                            <div
                              key={opp.id}
                              className="px-5 py-4 flex items-start gap-4"
                              style={{
                                backgroundColor: '#FFFFFF',
                                borderTop: idx > 0 ? '0.5px solid var(--color-border)' : undefined,
                              }}
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                {isEvaluated ? (
                                  <CheckCircle2 size={16} style={{ color: 'var(--color-sage)' }} />
                                ) : (
                                  <Clock size={16} style={{ color: 'var(--color-linen)' }} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p
                                      className="mb-0.5"
                                      style={{
                                        fontSize: 10, fontWeight: 500,
                                        textTransform: 'uppercase', letterSpacing: '0.06em',
                                        color: 'var(--color-text-faint)',
                                      }}
                                    >
                                      {opp.customer_segment}
                                    </p>
                                    <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>
                                      {opp.name}
                                    </h3>
                                  </div>
                                  <span
                                    className="flex-shrink-0 px-2.5 py-0.5 rounded-full"
                                    style={{
                                      fontSize: 11, fontWeight: 500,
                                      backgroundColor: isEvaluated ? 'var(--color-sage-bg)' : 'var(--color-linen)',
                                      color: isEvaluated ? '#2D7A57' : 'var(--color-text-muted)',
                                    }}
                                  >
                                    {isEvaluated ? t.opps_evaluated_badge : t.opps_pending_badge}
                                  </span>
                                </div>
                                {opp.description && (
                                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: '1.6' }}>
                                    {opp.description}
                                  </p>
                                )}
                              </div>
                              {/* Actions */}
                              <div className="flex-shrink-0 flex items-center gap-2">
                                {isEvaluated ? (
                                  <Link
                                    href={`/project/${project.id}/opportunity/${opp.id}/report`}
                                    className="flex items-center gap-1 text-xs font-medium transition-colors"
                                    style={{ color: 'var(--color-amber)', textDecoration: 'none' }}
                                  >
                                    {t.opps_view_report}
                                    <ChevronRight size={12} />
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/project/${project.id}/opportunity/${opp.id}/context`}
                                    className="flex items-center gap-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors"
                                    style={{
                                      backgroundColor: 'var(--color-amber)',
                                      color: '#FFFFFF',
                                      textDecoration: 'none',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A8612A')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber)')}
                                  >
                                    {t.opps_evaluate}
                                    <ChevronRight size={12} />
                                  </Link>
                                )}
                                {/* Delete opportunity */}
                                <button
                                  onClick={() => handleDeleteOpportunity(opp.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--color-text-faint)',
                                    padding: 4,
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-faint)')}
                                  title="Elimina opportunità"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Right sidebar */}
        <div
          className="w-64 p-5 overflow-auto flex-shrink-0"
          style={{
            backgroundColor: '#FFFFFF',
            borderLeft: '0.5px solid var(--color-border)',
          }}
        >
          <h2
            className="mb-4"
            style={{
              fontSize: 10, fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
            }}
          >
            {t.opps_eval_progress}
          </h2>
          {localOpps.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--color-text-faint)', fontStyle: 'italic' }}>
              {t.opps_empty}
            </p>
          ) : (
            <div className="space-y-2">
              {localOpps.map((opp) => {
                const isEvaluated = !!evalMap[opp.id]?.report
                return (
                  <div key={opp.id} className="flex items-center gap-2">
                    {isEvaluated ? (
                      <CheckCircle2 size={14} style={{ color: 'var(--color-sage)', flexShrink: 0 }} />
                    ) : (
                      <Clock size={14} style={{ color: 'var(--color-linen)', flexShrink: 0 }} />
                    )}
                    <span className="truncate" style={{ fontSize: 12, color: 'var(--color-text-main)' }}>
                      {opp.name}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {localOpps.length > 0 && evaluatedCount === localOpps.length && evaluatedCount > 0 && (
            <Link
              href={`/project/${project.id}/map`}
              className="flex items-center justify-center gap-2 w-full mt-5 py-2.5 px-4 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-amber)',
                color: '#FFFFFF',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#A8612A')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-amber)')}
            >
              {t.opps_view_map}
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
