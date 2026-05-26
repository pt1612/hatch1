'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '@/components/TopNav'
import BackButton from '@/components/BackButton'
import Link from 'next/link'
import { ChevronRight, Loader2, Plus, X } from 'lucide-react'
import type { Opportunity } from '@/lib/types'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n/context'
import { createClient } from '@/lib/supabase/client'

type LinkedVPC = {
  id: string
  customer_profile_name: string
  source_type: string
}

export default function ContextClient({
  project,
  opportunity,
  linkedVpcs,
  allVpcs }: {
  project: { id: string; title: string }
  opportunity: Opportunity
  linkedVpcs: LinkedVPC[]
  allVpcs: LinkedVPC[]
}) {
  const router = useRouter()
  const { t } = useI18n()
  const supabase = createClient()
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentLinkedVpcs, setCurrentLinkedVpcs] = useState<LinkedVPC[]>(linkedVpcs)
  const [selectedVPCId, setSelectedVPCId] = useState('')

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

  async function linkVPC() {
    if (!selectedVPCId || currentLinkedVpcs.some((vpc) => vpc.id === selectedVPCId)) return
    const nextVPC = allVpcs.find((vpc) => vpc.id === selectedVPCId)
    if (!nextVPC) return

    setCurrentLinkedVpcs((prev) => [...prev, nextVPC])
    setSelectedVPCId('')
    const { error } = await supabase
      .from('vpc_opportunities')
      .upsert({ vpc_id: nextVPC.id, opportunity_id: opportunity.id }, { onConflict: 'vpc_id,opportunity_id' })
    if (error) {
      setCurrentLinkedVpcs((prev) => prev.filter((vpc) => vpc.id !== nextVPC.id))
    }
  }

  async function unlinkVPC(vpcId: string) {
    const previous = currentLinkedVpcs
    setCurrentLinkedVpcs((prev) => prev.filter((vpc) => vpc.id !== vpcId))
    const { error } = await supabase
      .from('vpc_opportunities')
      .delete()
      .eq('vpc_id', vpcId)
      .eq('opportunity_id', opportunity.id)
    if (error) setCurrentLinkedVpcs(previous)
  }

  const availableVpcs = allVpcs.filter((vpc) => !currentLinkedVpcs.some((linked) => linked.id === vpc.id))

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />

      <motion.div className="flex-1 overflow-auto p-8 pt-14" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
        <BackButton href={`/project/${project.id}/opportunities`} label={t.ctx_back} />

        <div style={{ maxWidth: 896 }}>
          <h1
            style={{
              fontWeight: 400,
              fontSize: 22,
              letterSpacing: '-0.02em',
              color: 'var(--color-foreground)',
              marginBottom: 4 }}
          >
            {opportunity.name}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-foreground-muted)', marginBottom: 24 }}>
            {opportunity.customer_segment} · {opportunity.application}
          </p>

          <div
            className="rounded-2xl p-6 mb-6"
            style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2
                  style={{
                    fontWeight: 400,
                    fontSize: 16,
                    color: 'var(--color-foreground)',
                    marginBottom: 4 }}
                >
                  Linked VPCs
                </h2>
                <p style={{ fontSize: 12, color: 'var(--color-foreground-muted)' }}>
                  Connect this opportunity to one or more independent customer profiles.
                </p>
              </div>
              <Link
                href={`/project/${project.id}/vpcs/new?opportunityId=${opportunity.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)', borderRadius: 8, textDecoration: 'none' }}
              >
                <Plus size={13} />
                New VPC
              </Link>
            </div>

            {currentLinkedVpcs.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {currentLinkedVpcs.map((vpc) => (
                  <span
                    key={vpc.id}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs"
                    style={{ backgroundColor: 'rgba(19,163,137,0.10)', color: 'var(--color-primary)' }}
                  >
                    <Link href={`/project/${project.id}/vpcs/${vpc.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {vpc.customer_profile_name}
                    </Link>
                    <button onClick={() => unlinkVPC(vpc.id)} title="Unlink VPC" className="opacity-60 hover:opacity-100">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs italic mb-4" style={{ color: 'var(--color-foreground-faint)' }}>
                No VPC linked to this opportunity yet.
              </p>
            )}

            {availableVpcs.length > 0 && (
              <div className="flex gap-2">
                <select
                  value={selectedVPCId}
                  onChange={(event) => setSelectedVPCId(event.target.value)}
                  className="flex-1 px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)' }}
                >
                  <option value="">Add an existing VPC...</option>
                  {availableVpcs.map((vpc) => (
                    <option key={vpc.id} value={vpc.id}>
                      {vpc.customer_profile_name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={linkVPC}
                  disabled={!selectedVPCId}
                  className="px-3 py-2 text-xs font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', borderRadius: 8 }}
                >
                  Link
                </button>
              </div>
            )}
          </div>

          {/* Context textarea */}
          <div
            className="rounded-2xl p-6 mb-6"
            style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
          >
            <h2
              style={{
                fontWeight: 400,
                fontSize: 16,
                color: 'var(--color-foreground)',
                marginBottom: 4 }}
            >
              {t.ctx_context_title}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-foreground-muted)', marginBottom: 16 }}>
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
                color: 'var(--color-foreground)' }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-primary)'
                e.target.style.boxShadow = '0 0 0 3px rgba(19,163,137,0.12)'
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
                fontWeight: 400,
                fontSize: 16,
                color: 'var(--color-foreground)',
                marginBottom: 16 }}
            >
              {t.ctx_dims_title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DIMENSIONS.map((d) => (
                <div key={d.label} className="flex items-start gap-2">
                  <div
                    className="flex-shrink-0 mt-1.5"
                    style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--color-primary)' }}
                  />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-foreground)' }}>{d.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-foreground-muted)' }}>{d.desc}</p>
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
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
              borderRadius: 10,
              border: 'none',
              transition: 'background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease' }}
            onMouseEnter={(e) => {
              if (!loading) {
                ;(e.currentTarget).style.backgroundColor = 'var(--color-primary-hover)'
                ;(e.currentTarget).style.boxShadow = '0 4px 12px rgba(19,163,137,0.25)'
              }
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget).style.backgroundColor = 'var(--color-primary)'
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
