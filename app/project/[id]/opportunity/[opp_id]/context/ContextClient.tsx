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
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Sidebar projectId={project.id} projectTitle={project.title} />

      <div className="ml-60 flex-1 overflow-auto p-8">
        <BackButton href={`/project/${project.id}/opportunities`} label="Back to opportunities" />

        <div className="max-w-2xl">
          <h1
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontWeight: 400,
              fontSize: 22,
              letterSpacing: '-0.02em',
              color: 'var(--color-ink)',
              marginBottom: 4,
            }}
          >
            {opportunity.name}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
            {opportunity.customer_segment} · {opportunity.application}
          </p>

          {/* Context textarea */}
          <div
            className="rounded-2xl p-6 mb-6"
            style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
          >
            <h2
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontWeight: 400,
                fontSize: 16,
                color: 'var(--color-ink)',
                marginBottom: 4,
              }}
            >
              Add context (optional)
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
              Tell the AI anything it should know before evaluating this opportunity — e.g. existing
              customers, team experience, partnerships, unfair advantages.
            </p>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. We already have 3 paying customers in this segment. Our team has 5 years of experience in manufacturing software."
              rows={5}
              className="w-full px-4 py-3 text-sm resize-none outline-none transition-colors"
              style={{
                backgroundColor: '#FFFFFF',
                border: '0.5px solid var(--color-border)',
                borderRadius: 8,
                color: 'var(--color-ink)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-amber)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>

          {/* Dimensions preview */}
          <div
            className="rounded-2xl p-6 mb-6"
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
              The AI will evaluate across 6 dimensions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DIMENSIONS.map((d) => (
                <div key={d.label} className="flex items-start gap-2">
                  <div
                    className="flex-shrink-0 mt-1.5"
                    style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--color-sage)' }}
                  />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink)' }}>{d.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{d.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 text-sm font-medium transition-colors disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-amber)', color: '#FFFFFF', borderRadius: 10, border: 'none' }}
            onMouseEnter={(e) => !loading && ((e.currentTarget).style.backgroundColor = '#A8612A')}
            onMouseLeave={(e) => ((e.currentTarget).style.backgroundColor = 'var(--color-amber)')}
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
