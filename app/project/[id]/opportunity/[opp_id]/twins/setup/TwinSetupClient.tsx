'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import BackButton from '@/components/BackButton'
import { Plus, X, Loader2, RefreshCw, ChevronRight, Edit2, Check } from 'lucide-react'
import { getInitials } from '@/lib/types'
import { TWIN_AVATAR_COLORS } from '@/lib/constants'
import type { Opportunity, TwinRow } from '@/lib/types'

type MinimalTwin = {
  id: string
  name: string
  role: string
  segment: string
  context: string
}

function twinRowToMinimalTwin(row: TwinRow, index: number): MinimalTwin {
  return {
    id: `twin${index + 1}`,
    name: row.name,
    role: row.role,
    segment: row.segment,
    context: row.personality ?? '',
  }
}

export default function TwinSetupClient({
  project,
  opportunity,
  twinSession,
  existingTwins,
}: {
  project: { id: string; title: string }
  opportunity: Opportunity
  twinSession: { id: string; suggested_segments: string[] } | null
  existingTwins: TwinRow[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const [segments, setSegments] = useState<string[]>(twinSession?.suggested_segments ?? [])
  const [newSegment, setNewSegment] = useState('')
  const [twinCount, setTwinCount] = useState(Math.max(existingTwins.length, 3))
  const [loadingSegments, setLoadingSegments] = useState(segments.length === 0)

  const [twins, setTwins] = useState<MinimalTwin[]>(
    existingTwins.length > 0 ? existingTwins.map((t, i) => twinRowToMinimalTwin(t, i)) : []
  )
  const [generatingTwins, setGeneratingTwins] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    if (segments.length === 0) suggestSegments()
    else setLoadingSegments(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function suggestSegments() {
    setLoadingSegments(true)
    const res = await fetch('/api/suggest-segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: opportunity.name, description: opportunity.description, customer_segment: opportunity.customer_segment }),
    })
    const { segments: suggested } = await res.json()
    setSegments(suggested ?? [])
    setLoadingSegments(false)
  }

  function addSegment() {
    if (newSegment.trim() && !segments.includes(newSegment.trim())) {
      setSegments((prev) => [...prev, newSegment.trim()])
      setNewSegment('')
    }
  }

  function removeSegment(seg: string) {
    setSegments((prev) => prev.filter((s) => s !== seg))
  }

  async function handleGenerateTwins() {
    setGeneratingTwins(true)
    const res = await fetch('/api/generate-twins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectInfo: { name: opportunity.name, problem: opportunity.description, target: opportunity.customer_segment, solution: opportunity.application },
        segments,
        count: twinCount,
      }),
    })
    const { twins: generated } = await res.json()
    const mapped: MinimalTwin[] = (generated ?? []).map(
      (t: { id: string; name: string; occupation?: string; role?: string; segment: string; context: string }) => ({
        id: t.id,
        name: t.name,
        role: t.occupation ?? t.role ?? '',
        segment: t.segment,
        context: t.context ?? '',
      })
    )
    setTwins(mapped)
    setGeneratingTwins(false)
  }

  async function handleStartInterviews() {
    if (twins.length === 0) return
    setSaving(true)
    if (twinSession) {
      await supabase.from('twin_sessions').update({ suggested_segments: segments }).eq('id', twinSession.id)
    } else {
      await supabase.from('twin_sessions').insert({ opportunity_id: opportunity.id, suggested_segments: segments })
    }
    await supabase.from('twins').delete().eq('opportunity_id', opportunity.id)
    await supabase.from('twins').insert(
      twins.map((t) => ({
        project_id: project.id,
        opportunity_id: opportunity.id,
        name: t.name,
        role: t.role,
        segment: t.segment,
        personality: t.context,
        pain_points: [],
        tech_level: 'medium',
        budget_tier: 'mid',
        affinity_label: 'moderate',
      }))
    )
    setSaving(false)
    router.push(`/project/${project.id}/opportunity/${opportunity.id}/twins/interview`)
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />

      <div className="flex-1 overflow-auto p-8 pt-14">
        <BackButton href={`/project/${project.id}/strategy`} label="Back to strategy" />

        <div className="mb-6">
          <h1
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontWeight: 400,
              fontSize: 26,
              letterSpacing: '-0.02em',
              color: 'var(--color-ink)',
            }}
          >
            Twin Setup
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{opportunity.name}</p>
        </div>

        {/* Segments */}
        <div
          className="rounded-2xl p-6 mb-6 max-w-2xl"
          style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <h2
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontWeight: 400,
                fontSize: 16,
                color: 'var(--color-ink)',
              }}
            >
              Market Segments
            </h2>
            <button
              onClick={suggestSegments}
              disabled={loadingSegments}
              className="flex items-center gap-1 transition-colors disabled:opacity-40"
              style={{ fontSize: 12, color: 'var(--color-amber)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <RefreshCw size={11} />
              Re-suggest
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
            AI-suggested segments to validate against. Edit, remove, or add your own.
          </p>

          {loadingSegments ? (
            <div className="flex items-center gap-2" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-amber)' }} />
              Suggesting segments…
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {segments.map((seg) => (
                  <span
                    key={seg}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: 'var(--color-amber-bg)',
                      color: 'var(--color-amber)',
                      border: '0.5px solid rgba(199,123,58,0.2)',
                    }}
                  >
                    {seg}
                    <button onClick={() => removeSegment(seg)} className="hover:opacity-70">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newSegment}
                  onChange={(e) => setNewSegment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSegment()}
                  placeholder="Add segment…"
                  className="flex-1 px-3 py-2 text-xs outline-none transition-colors"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '0.5px solid var(--color-border)',
                    borderRadius: 8,
                    color: 'var(--color-ink)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-amber)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                />
                <button
                  onClick={addSegment}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ backgroundColor: 'var(--color-linen)', color: 'var(--color-ink)', border: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-border)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-linen)')}
                >
                  <Plus size={12} />
                  Add
                </button>
              </div>
            </>
          )}
        </div>

        {/* Twin count + generate */}
        <div
          className="rounded-2xl p-6 mb-6 max-w-2xl"
          style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
        >
          <h2
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontWeight: 400,
              fontSize: 16,
              color: 'var(--color-ink)',
              marginBottom: 16,
            }}
          >
            Twin Count
          </h2>
          <div className="flex items-center gap-3 mb-5">
            {[2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setTwinCount(n)}
                className="w-10 h-10 rounded-xl text-sm font-medium transition-colors"
                style={{
                  backgroundColor: twinCount === n ? 'var(--color-amber)' : 'var(--color-linen)',
                  color: twinCount === n ? '#FFFFFF' : 'var(--color-text-muted)',
                  border: 'none',
                }}
                onMouseEnter={(e) => {
                  if (twinCount !== n) e.currentTarget.style.backgroundColor = 'var(--color-border)'
                }}
                onMouseLeave={(e) => {
                  if (twinCount !== n) e.currentTarget.style.backgroundColor = 'var(--color-linen)'
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={handleGenerateTwins}
            disabled={generatingTwins || segments.length === 0}
            className="flex items-center gap-2 py-2.5 px-5 text-sm font-medium transition-colors disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-amber)', color: '#FFFFFF', borderRadius: 10, border: 'none' }}
            onMouseEnter={(e) => !(generatingTwins || segments.length === 0) && ((e.currentTarget).style.backgroundColor = '#A8612A')}
            onMouseLeave={(e) => ((e.currentTarget).style.backgroundColor = 'var(--color-amber)')}
          >
            {generatingTwins ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Generating profiles…
              </>
            ) : (
              <>
                Generate Twin Profiles
                <ChevronRight size={15} />
              </>
            )}
          </button>
        </div>

        {/* Twin cards */}
        {twins.length > 0 && (
          <>
            <h2
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontWeight: 400,
                fontSize: 18,
                color: 'var(--color-ink)',
                marginBottom: 16,
              }}
            >
              Twin Profiles ({twins.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              {twins.map((twin, idx) => {
                const avatarColor = TWIN_AVATAR_COLORS[idx % TWIN_AVATAR_COLORS.length]
                const isEditing = editingIdx === idx

                return (
                  <div
                    key={twin.id}
                    className="rounded-2xl p-6 flex flex-col gap-0 transition-colors"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '0.5px solid var(--color-border)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-amber)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl ${avatarColor} flex items-center justify-center text-sm font-medium flex-shrink-0 mb-4`}
                    >
                      {getInitials(twin.name)}
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2 mb-0.5">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 text-sm font-medium outline-none bg-transparent"
                          style={{ borderBottom: '1px solid var(--color-amber)', color: 'var(--color-ink)' }}
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            setTwins((prev) => prev.map((t, i) => (i === idx ? { ...t, name: editName } : t)))
                            setEditingIdx(null)
                          }}
                        >
                          <Check size={14} style={{ color: 'var(--color-amber)' }} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-0.5">
                        <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-ink)', lineHeight: '1.3' }}>{twin.name}</p>
                        <button
                          onClick={() => { setEditingIdx(idx); setEditName(twin.name) }}
                          style={{ color: 'var(--color-text-faint)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-faint)')}
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    )}

                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>{twin.role}</p>

                    <span
                      className="inline-block px-2.5 py-0.5 rounded-full mb-4 w-fit"
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        backgroundColor: 'var(--color-amber-bg)',
                        color: 'var(--color-amber)',
                      }}
                    >
                      {twin.segment}
                    </span>

                    {twin.context && (
                      <p
                        className="leading-relaxed mt-auto pt-4"
                        style={{
                          fontSize: 12,
                          fontStyle: 'italic',
                          color: 'var(--color-text-muted)',
                          borderTop: '0.5px solid var(--color-border)',
                          fontFamily: "'Lora', Georgia, serif",
                        }}
                      >
                        &ldquo;{twin.context}&rdquo;
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <button
              onClick={handleStartInterviews}
              disabled={saving}
              className="flex items-center gap-2 py-3 px-6 text-sm font-medium transition-colors disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-amber)', color: '#FFFFFF', borderRadius: 10, border: 'none' }}
              onMouseEnter={(e) => !saving && ((e.currentTarget).style.backgroundColor = '#A8612A')}
              onMouseLeave={(e) => ((e.currentTarget).style.backgroundColor = 'var(--color-amber)')}
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <>
                  Start Interviews
                  <ChevronRight size={15} />
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
