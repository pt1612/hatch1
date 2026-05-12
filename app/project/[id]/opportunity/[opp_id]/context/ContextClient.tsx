'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '@/components/TopNav'
import BackButton from '@/components/BackButton'
import { ChevronRight, Loader2 } from 'lucide-react'
import type { Opportunity } from '@/lib/types'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n/context'

export default function ContextClient({
  project,
  opportunity,
}: {
  project: { id: string; title: string }
  opportunity: Opportunity
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)

  const DIMENSIONS = [
    { label: t.dim_reason_to_buy,              desc: t.ctx_dim_reason_to_buy },
    { label: t.dim_market_volume,              desc: t.ctx_dim_market_volume },
    { label: t.dim_economic_viability,         desc: t.ctx_dim_economic_viability },
    { label: t.dim_implementation_obstacles,   desc: t.ctx_dim_implementation_obstacles },
    { label: t.dim_time_to_revenue,            desc: t.ctx_dim_time_to_revenue },
    { label: t.dim_external_risks,             desc: t.ctx_dim_external_risks },
  ]

  function handleGenerate() {
    setLoading(true)
    if (context.trim()) {
      localStorage.setItem(`hatch_ctx_${opportunity.id}`, context.trim())
    }
    router.push(`/project/${project.id}/opportunity/${opportunity.id}/report`)
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />

      <motion.div className="flex-1 overflow-auto p-8 pt-14" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
        <BackButton href={`/project/${project.id}/opportunities`} label={t.ctx_back} />

        <div style={{ maxWidth: 896 }}>
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
              {t.ctx_context_title}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
              {t.ctx_context_desc}
            </p>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={t.ctx_context_placeholder}
              rows={5}
              className="w-full px-4 py-3 text-sm resize-none outline-none transition-colors"
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
              {t.ctx_dims_title}
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
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 text-sm font-medium disabled:opacity-60"
            style={{
              backgroundColor: 'var(--color-amber)',
              color: '#FFFFFF',
              borderRadius: 10,
              border: 'none',
              transition: 'background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                ;(e.currentTarget).style.backgroundColor = '#A8612A'
                ;(e.currentTarget).style.boxShadow = '0 4px 12px rgba(199,123,58,0.25)'
              }
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget).style.backgroundColor = 'var(--color-amber)'
              ;(e.currentTarget).style.boxShadow = 'none'
            }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                {t.ctx_generate_btn}
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
