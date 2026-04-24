'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import BackButton from '@/components/BackButton'
import { Plus, X, Loader2, RefreshCw, ChevronRight, Edit2, Check } from 'lucide-react'
import { getInitials } from '@/lib/types'
import { TWIN_AVATAR_COLORS } from '@/lib/constants'
import type { Opportunity, TwinRow } from '@/lib/types'

type MinimalTwin = {
  id: string
  name: string
  role: string      // maps to 'occupation' from the API response
  segment: string
  context: string   // one-sentence description
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

  // Part A: segment suggestion
  const [segments, setSegments] = useState<string[]>(twinSession?.suggested_segments ?? [])
  const [newSegment, setNewSegment] = useState('')
  const [twinCount, setTwinCount] = useState(Math.max(existingTwins.length, 3))
  const [loadingSegments, setLoadingSegments] = useState(segments.length === 0)

  // Part B: twin profiles
  const [twins, setTwins] = useState<MinimalTwin[]>(
    existingTwins.length > 0
      ? existingTwins.map((t, i) => twinRowToMinimalTwin(t, i))
      : []
  )
  const [generatingTwins, setGeneratingTwins] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  // Auto-suggest segments on mount
  useEffect(() => {
    if (segments.length === 0) {
      suggestSegments()
    } else {
      setLoadingSegments(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function suggestSegments() {
    setLoadingSegments(true)
    const res = await fetch('/api/suggest-segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: opportunity.name,
        description: opportunity.description,
        customer_segment: opportunity.customer_segment,
      }),
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
        projectInfo: {
          name: opportunity.name,
          problem: opportunity.description,
          target: opportunity.customer_segment,
          solution: opportunity.application,
        },
        segments,
        count: twinCount,
      }),
    })
    const { twins: generated } = await res.json()
    // API returns { id, name, occupation, segment, context }
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

    // Upsert twin_sessions
    if (twinSession) {
      await supabase
        .from('twin_sessions')
        .update({ suggested_segments: segments })
        .eq('id', twinSession.id)
    } else {
      await supabase.from('twin_sessions').insert({
        opportunity_id: opportunity.id,
        suggested_segments: segments,
      })
    }

    // Delete old twins for this opportunity
    await supabase.from('twins').delete().eq('opportunity_id', opportunity.id)

    // Insert new twins — store context as personality, use safe defaults for legacy columns
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
    <div className="flex min-h-screen">
      <Sidebar projectId={project.id} projectTitle={project.title} primaryOpportunityId={opportunity.id} primaryOpportunityName={opportunity.name} />

      <div className="ml-60 flex-1 overflow-auto p-8">
        <BackButton href={`/project/${project.id}/strategy`} label="Back to strategy" />

        <div className="mb-6">
          <h1 className="text-lg font-semibold text-gray-900">Twin Setup</h1>
          <p className="text-sm text-gray-400 mt-0.5">{opportunity.name}</p>
        </div>

        {/* Part A: Segments */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 max-w-2xl">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-800">Market Segments</h2>
            <button
              onClick={suggestSegments}
              disabled={loadingSegments}
              className="flex items-center gap-1 text-xs text-[#0D6E6E] hover:underline disabled:opacity-40"
            >
              <RefreshCw size={11} />
              Re-suggest
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            AI-suggested segments to validate against. Edit, remove, or add your own.
          </p>

          {loadingSegments ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader2 size={14} className="animate-spin" />
              Suggesting segments…
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {segments.map((seg) => (
                  <span
                    key={seg}
                    className="flex items-center gap-1.5 bg-[#0D6E6E]/10 text-[#0D6E6E] text-xs font-semibold px-3 py-1.5 rounded-full"
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
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-xs focus:ring-2 focus:ring-[#0D6E6E] focus:border-transparent outline-none transition"
                />
                <button
                  onClick={addSegment}
                  className="flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                >
                  <Plus size={12} />
                  Add
                </button>
              </div>
            </>
          )}
        </div>

        {/* Twin count + generate */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 max-w-2xl">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Twin Count</h2>
          <div className="flex items-center gap-3 mb-5">
            {[2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setTwinCount(n)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors ${
                  twinCount === n
                    ? 'bg-[#0D6E6E] text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={handleGenerateTwins}
            disabled={generatingTwins || segments.length === 0}
            className="flex items-center gap-2 bg-[#0D6E6E] text-white py-2.5 px-5 rounded-xl text-sm font-semibold hover:bg-[#0a5555] transition-colors disabled:opacity-60"
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

        {/* Part B: Twin cards */}
        {twins.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-gray-800 mb-4">
              Twin Profiles ({twins.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              {twins.map((twin, idx) => {
                const avatarColor = TWIN_AVATAR_COLORS[idx % TWIN_AVATAR_COLORS.length]
                const isEditing = editingIdx === idx

                return (
                  <div
                    key={twin.id}
                    className="bg-white rounded-2xl p-6 flex flex-col gap-0 border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-xl ${avatarColor} flex items-center justify-center text-sm font-bold flex-shrink-0 mb-4`}>
                      {getInitials(twin.name)}
                    </div>

                    {/* Name (editable) */}
                    {isEditing ? (
                      <div className="flex items-center gap-2 mb-0.5">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 text-sm font-bold border-b border-[#0D6E6E] outline-none bg-transparent"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            setTwins((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, name: editName } : t))
                            )
                            setEditingIdx(null)
                          }}
                        >
                          <Check size={14} className="text-[#0D6E6E]" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xl font-bold text-gray-900 leading-tight">{twin.name}</p>
                        <button
                          onClick={() => {
                            setEditingIdx(idx)
                            setEditName(twin.name)
                          }}
                        >
                          <Edit2 size={12} className="text-gray-300 hover:text-gray-500" />
                        </button>
                      </div>
                    )}

                    {/* Role */}
                    <p className="text-sm text-gray-400 mb-2">{twin.role}</p>

                    {/* Segment badge */}
                    <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#0D6E6E]/10 text-[#0D6E6E] mb-4 w-fit">
                      {twin.segment}
                    </span>

                    {/* Context */}
                    {twin.context && (
                      <p className="text-xs italic text-gray-400 leading-relaxed border-t border-gray-100 pt-4 mt-auto">
                        &ldquo;{twin.context}&rdquo;
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Start interviews */}
            <button
              onClick={handleStartInterviews}
              disabled={saving}
              className="flex items-center gap-2 bg-[#0D6E6E] text-white py-3 px-6 rounded-xl text-sm font-semibold hover:bg-[#0a5555] transition-colors disabled:opacity-60"
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
