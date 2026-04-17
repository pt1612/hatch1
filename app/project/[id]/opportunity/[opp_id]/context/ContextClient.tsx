'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import BackButton from '@/components/BackButton'
import { ChevronRight, Loader2 } from 'lucide-react'
import type { Opportunity } from '@/lib/types'

const DIMENSIONS = [
  { label: 'Compelling Reason to Buy', desc: 'How urgently do customers need this?' },
  { label: 'Market Volume', desc: 'How large is the addressable market?' },
  { label: 'Economic Viability', desc: 'What are the unit economics and margins?' },
  { label: 'Implementation Obstacles', desc: 'How hard is this to build and launch?' },
  { label: 'Time to Revenue', desc: 'How long until meaningful revenue?' },
  { label: 'External Risks', desc: 'Regulatory, competitive, and macro risks.' },
]

export default function ContextClient({
  project,
  opportunity,
}: {
  project: { id: string; title: string }
  opportunity: Opportunity
}) {
  const router = useRouter()
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)

  function handleGenerate() {
    setLoading(true)
    if (context.trim()) {
      localStorage.setItem(`hatch_ctx_${opportunity.id}`, context.trim())
    }
    router.push(`/project/${project.id}/opportunity/${opportunity.id}/report`)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar projectId={project.id} projectTitle={project.title} />

      <div className="ml-60 flex-1 overflow-auto p-8">
        <BackButton href={`/project/${project.id}/opportunities`} label="Back to opportunities" />

        <div className="max-w-2xl">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">{opportunity.name}</h1>
          <p className="text-sm text-gray-500 mb-6">
            {opportunity.customer_segment} · {opportunity.application}
          </p>

          {/* Context textarea */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Add context (optional)</h2>
            <p className="text-xs text-gray-400 mb-4">
              Tell the AI anything it should know before evaluating this opportunity — e.g. existing
              customers, team experience, partnerships, unfair advantages.
            </p>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. We already have 3 paying customers in this segment. Our team has 5 years of experience in manufacturing software."
              rows={5}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[#0D6E6E] focus:border-transparent text-sm resize-none outline-none transition"
            />
          </div>

          {/* Dimensions preview */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">
              The AI will evaluate across 6 dimensions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DIMENSIONS.map((d) => (
                <div key={d.label} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0D6E6E] flex-shrink-0 mt-1.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{d.label}</p>
                    <p className="text-xs text-gray-400">{d.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#0D6E6E] text-white py-3.5 px-6 rounded-xl text-sm font-semibold hover:bg-[#0a5555] transition-colors disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                Generate evaluation
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
