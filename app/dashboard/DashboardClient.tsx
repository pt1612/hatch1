'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { Plus, ArrowRight, MoreHorizontal, Calendar } from 'lucide-react'

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
}: {
  projects: EnrichedProject[]
  userId: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [creating, setCreating] = useState(false)

  async function handleNewProject() {
    setCreating(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({ user_id: userId, title: 'New Project' })
      .select()
      .single()
    if (!error && data) {
      router.push(`/project/${data.id}/abilities`)
    }
    setCreating(false)
  }

  const completedCount = (phases: boolean[]) => phases.filter(Boolean).length

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-60 flex-1 overflow-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {projects.length === 0
                ? 'No projects yet — create your first one.'
                : `${projects.length} project${projects.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <button
            onClick={handleNewProject}
            disabled={creating}
            className="flex items-center gap-2 bg-[#0D6E6E] text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-[#0a5555] transition-colors disabled:opacity-60"
          >
            <Plus size={16} />
            {creating ? 'Creating…' : 'New Project'}
          </button>
        </div>

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-[#0D6E6E]/10 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-3xl font-black text-[#0D6E6E]">H</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Start your first project
            </h2>
            <p className="text-sm text-gray-500 max-w-sm mb-6">
              Define your abilities, discover opportunities, validate with digital twins, and build
              your venture — step by step.
            </p>
            <button
              onClick={handleNewProject}
              disabled={creating}
              className="flex items-center gap-2 bg-[#0D6E6E] text-white py-2.5 px-5 rounded-lg text-sm font-semibold hover:bg-[#0a5555] transition-colors disabled:opacity-60"
            >
              <Plus size={16} />
              {creating ? 'Creating…' : 'Create first project'}
            </button>
          </div>
        )}

        {/* Grid */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ProjectCard({ project }: { project: EnrichedProject }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const completed = project.completed_phases.filter(Boolean).length
  const total = project.completed_phases.length
  const progressPct = Math.round((completed / total) * 100)

  const formattedDate = new Date(project.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{project.title}</h3>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
            <Calendar size={11} />
            <span>{formattedDate}</span>
          </div>
        </div>
        <div className="relative ml-2">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1 w-36">
              <button
                className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                Rename
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                onClick={() => setMenuOpen(false)}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="bg-[#0D6E6E]/10 text-[#0D6E6E] font-semibold px-2.5 py-1 rounded-full">
          {project.opportunity_count} opportunit{project.opportunity_count === 1 ? 'y' : 'ies'}
        </span>
        {project.evaluated_count > 0 && (
          <span className="text-gray-400">
            {project.evaluated_count}/{project.opportunity_count} evaluated
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400">
            {completed}/{total} stages
          </span>
          <span className="text-xs font-semibold text-[#0D6E6E]">{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0D6E6E] rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Phase dots */}
      <div className="flex items-center gap-3">
        {PHASE_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                project.completed_phases[i]
                  ? 'border-[#0D6E6E] bg-[#0D6E6E] text-white'
                  : 'border-gray-200 text-gray-300'
              }`}
            >
              {i + 1}
            </div>
            <span className="text-[10px] text-gray-400 hidden sm:block">{label}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Link
        href={project.next_route}
        className="flex items-center justify-center gap-2 bg-[#0D6E6E] text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-[#0a5555] transition-colors mt-auto"
      >
        Continue
        <ArrowRight size={15} />
      </Link>
    </div>
  )
}
