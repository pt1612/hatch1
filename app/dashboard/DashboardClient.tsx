'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import { Plus, ArrowRight, MoreHorizontal, Calendar, Pencil } from 'lucide-react'

const PHASE_LABELS = ['Abilities', 'Evaluation', 'Map', 'Strategy']

type EnrichedProject = {
  id: string
  title: string
  opportunity_count: number
  evaluated_count: number
  completed_phases: boolean[]
  next_route: string
  updated_at: string
  created_at: string
}

export default function DashboardClient({
  projects,
  userId,
  userName,
}: {
  projects: EnrichedProject[]
  userId: string
  userName?: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [creating, setCreating] = useState(false)
  const [projectList, setProjectList] = useState(projects)
  const [deleting, setDeleting] = useState<string | null>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buongiorno' : hour < 17 ? 'Buon pomeriggio' : 'Buona sera'
  const firstName = userName?.split(' ')[0] ?? ''
  const activeCount = projects.filter((p) => p.completed_phases.some(Boolean)).length

  async function handleRename(projectId: string, newName: string) {
    const trimmed = newName.trim()
    if (!trimmed) return
    setProjectList((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, title: trimmed } : p))
    )
    await supabase.from('projects').update({ title: trimmed }).eq('id', projectId)
  }

  async function handleDeleteProject(projectId: string) {
    if (!window.confirm('Eliminare questo progetto? Tutte le opportunità, i Twin, le interviste e i canvas verranno rimossi definitivamente.')) return
    setDeleting(projectId)
    try {
      const { data: opps } = await supabase.from('opportunities').select('id').eq('project_id', projectId)
      const oppIds = opps?.map((o) => o.id) ?? []
      if (oppIds.length > 0) {
        await supabase.from('evaluations').delete().in('opportunity_id', oppIds)
        const { data: twins } = await supabase.from('twins').select('id').in('opportunity_id', oppIds)
        const twinIds = twins?.map((t) => t.id) ?? []
        if (twinIds.length > 0) {
          await supabase.from('twin_interviews').delete().in('twin_id', twinIds)
          await supabase.from('twins').delete().in('id', twinIds)
        }
        await supabase.from('twin_sessions').delete().in('opportunity_id', oppIds)
        await supabase.from('business_model_canvases').delete().in('opportunity_id', oppIds)
        await supabase.from('opportunities').delete().in('id', oppIds)
      }
      await supabase.from('projects').delete().eq('id', projectId)
      setProjectList((prev) => prev.filter((p) => p.id !== projectId))
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setDeleting(null)
    }
  }

  async function handleNewProject() {
    setCreating(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({ user_id: userId, title: 'Nuovo Progetto' })
      .select()
      .single()
    if (!error && data) {
      router.push(`/project/${data.id}/onboarding`)
    }
    setCreating(false)
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav />
      <main className="flex-1 overflow-auto p-8 pt-14 max-w-5xl mx-auto w-full px-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontWeight: 400,
                fontSize: 28,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink)',
              }}
            >
              {greeting}{firstName ? `, ${firstName}` : ''}.
            </h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
              {projects.length === 0
                ? 'Nessun progetto ancora — crea il primo.'
                : `Hai ${activeCount} progetto${activeCount === 1 ? '' : 'i'} attivo${activeCount === 1 ? '' : 'i'}.`}
            </p>
          </div>
          <button
            onClick={handleNewProject}
            disabled={creating}
            className="flex items-center gap-2 py-2.5 px-4 text-sm font-medium disabled:opacity-60"
            style={{
              backgroundColor: 'var(--color-amber)',
              color: '#FFFFFF',
              borderRadius: 8,
              border: 'none',
              transition: 'background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
            }}
            onMouseEnter={(e) => {
              if (!creating) {
                e.currentTarget.style.backgroundColor = '#A8612A'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(199,123,58,0.25)'
              }
            }}
            onMouseLeave={(e) => {
              if (!creating) {
                e.currentTarget.style.backgroundColor = 'var(--color-amber)'
                e.currentTarget.style.boxShadow = 'none'
              }
            }}
          >
            <Plus size={16} />
            {creating ? 'Creazione…' : 'Nuovo progetto'}
          </button>
        </div>

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-5">
              <path d="M50 15 C24 15 10 32 10 52 C10 74 25 88 50 88 C75 88 90 74 90 52 C90 32 76 15 50 15 Z" fill="var(--color-amber-bg)" />
              <circle cx="50" cy="50" r="16" fill="var(--color-linen)" />
              <circle cx="50" cy="50" r="8" fill="var(--color-amber-light)" opacity="0.5" />
            </svg>
            <p
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 16,
                color: 'var(--color-text-muted)',
                marginBottom: 20,
              }}
            >
              Inizia il tuo primo progetto.
            </p>
            <button
              onClick={handleNewProject}
              disabled={creating}
              className="flex items-center gap-2 py-2.5 px-5 text-sm font-medium disabled:opacity-60"
              style={{
                backgroundColor: 'var(--color-amber)',
                color: '#FFFFFF',
                borderRadius: 8,
                border: 'none',
                transition: 'background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
              }}
              onMouseEnter={(e) => {
                if (!creating) {
                  e.currentTarget.style.backgroundColor = '#A8612A'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(199,123,58,0.25)'
                }
              }}
              onMouseLeave={(e) => {
                if (!creating) {
                  e.currentTarget.style.backgroundColor = 'var(--color-amber)'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              <Plus size={16} />
              {creating ? 'Creazione…' : 'Crea il primo progetto'}
            </button>
          </div>
        )}

        {/* Grid */}
        {projectList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {projectList.map((project, index) => (
              <div key={project.id} className={`card-enter card-enter-${(index % 6) + 1}`}>
                <ProjectCard
                  project={project}
                  isDeleting={deleting === project.id}
                  onDelete={() => handleDeleteProject(project.id)}
                  onRename={(newName) => handleRename(project.id, newName)}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ProjectCard({
  project,
  isDeleting,
  onDelete,
  onRename,
}: {
  project: EnrichedProject
  isDeleting: boolean
  onDelete: () => void
  onRename: (newName: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [hoveringTitle, setHoveringTitle] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(project.title)
  const completed = project.completed_phases.filter(Boolean).length
  const total = project.completed_phases.length
  const isDraft = completed === 0

  const formattedDate = new Date(project.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      className={`flex flex-col gap-4 ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
      style={{
        backgroundColor: '#FFFFFF',
        borderTop: `3px solid ${isDraft ? 'var(--color-linen)' : 'var(--color-amber)'}`,
        border: '0.5px solid var(--color-border)',
        borderRadius: 14,
        padding: 20,
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-amber)'
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Fix: re-apply top border color on hover since border shorthand overrides it */}
      {/* Header */}
      <div className="flex items-start justify-between">
        <div
          className="flex-1 min-w-0"
          onMouseEnter={() => setHoveringTitle(true)}
          onMouseLeave={() => setHoveringTitle(false)}
        >
          {editing ? (
            <input
              autoFocus
              type="text"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onRename(editVal)
                  setEditing(false)
                }
                if (e.key === 'Escape') {
                  setEditVal(project.title)
                  setEditing(false)
                }
              }}
              onBlur={() => {
                onRename(editVal)
                setEditing(false)
              }}
              style={{
                width: '100%',
                fontWeight: 500,
                fontSize: 14,
                color: 'var(--color-ink)',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid var(--color-amber)',
                outline: 'none',
                padding: '0 0 1px 0',
                transition: 'opacity 0.15s ease',
              }}
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <h3
                className="truncate"
                style={{ fontWeight: 500, fontSize: 14, color: 'var(--color-ink)' }}
              >
                {project.title}
              </h3>
              {hoveringTitle && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditVal(project.title)
                    setEditing(true)
                  }}
                  style={{
                    flexShrink: 0,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'var(--color-text-faint)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Rinomina progetto"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-1 mt-1" style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
            <Calendar size={11} />
            <span>{formattedDate}</span>
          </div>
        </div>

        <div className="relative ml-2">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--color-text-faint)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-cream)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 z-10 py-1 w-36 rounded-xl shadow-lg"
              style={{
                backgroundColor: '#FFFFFF',
                border: '0.5px solid var(--color-border)',
              }}
            >
              <button
                className="w-full text-left px-4 py-2 text-sm transition-colors"
                style={{ color: '#DC2626' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                onClick={() => { setMenuOpen(false); onDelete() }}
              >
                {isDeleting ? 'Eliminazione…' : 'Elimina'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3" style={{ fontSize: 12 }}>
        <span
          className="px-3 py-1 rounded-full"
          style={{
            backgroundColor: 'var(--color-amber-bg)',
            color: 'var(--color-amber)',
            fontWeight: 500,
          }}
        >
          {project.opportunity_count} opportunità
        </span>
        {project.evaluated_count > 0 && (
          <span style={{ color: 'var(--color-text-faint)' }}>
            {project.evaluated_count}/{project.opportunity_count} valutate
          </span>
        )}
      </div>

      {/* Progress bar — 5 segments */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
            {completed}/{total} fasi
          </span>
        </div>
        <div className="flex gap-1">
          {project.completed_phases.map((done, i) => {
            const isActive = !done && project.completed_phases.slice(0, i).every(Boolean)
            return (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: done
                    ? 'var(--color-amber)'
                    : isActive
                    ? 'var(--color-amber-light)'
                    : 'var(--color-linen)',
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Phase labels */}
      <div className="flex items-center gap-3">
        {PHASE_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className="flex items-center justify-center"
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: project.completed_phases[i] ? 'var(--color-amber)' : 'transparent',
                border: `1.5px solid ${project.completed_phases[i] ? 'var(--color-amber)' : 'var(--color-linen)'}`,
                fontSize: 9,
                fontWeight: 600,
                color: project.completed_phases[i] ? '#FFFFFF' : 'var(--color-text-faint)',
              }}
            >
              {i + 1}
            </div>
            <span
              className="hidden sm:block"
              style={{ fontSize: 10, color: 'var(--color-text-faint)' }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Link
        href={project.next_route}
        className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium mt-auto"
        style={{
          backgroundColor: 'var(--color-amber)',
          color: '#FFFFFF',
          borderRadius: 8,
          textDecoration: 'none',
          transition: 'background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
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
        Continua
        <ArrowRight size={15} />
      </Link>
    </div>
  )
}
