'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/TopNav'
import { Loader2, X, Plus, Sparkles, Download } from 'lucide-react'
import type { VPC, VPCCustomerProfile, VPCValueMap, Opportunity } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/lib/i18n/context'

interface VPCDetailClientProps {
  project: { id: string; title: string }
  vpc: VPC
  opportunityName: string | null
  opportunity: Opportunity | null
  abilities: { id: string; name: string; description: string }[]
  sourceVpcs: { id: string; name: string }[]
}

function Pill({ text, onRemove }: { text: string; onRemove?: () => void }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        borderRadius: 20,
        backgroundColor: 'var(--color-muted)',
        border: '0.5px solid var(--color-border)',
        fontSize: 12,
        color: 'var(--color-foreground)',
        maxWidth: '100%' }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0, color: 'var(--color-foreground-faint)' }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}

function AddInput({
  placeholder,
  onAdd }: {
  placeholder: string
  onAdd: (val: string) => void
}) {
  const [val, setVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleAdd() {
    const trimmed = val.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setVal('')
    inputRef.current?.focus()
  }

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
      <input
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
        placeholder={placeholder}
        style={{
          flex: 1,
          padding: '5px 10px',
          borderRadius: 6,
          border: '0.5px solid var(--color-border)',
          backgroundColor: '#FFFFFF',
          fontSize: 12,
          color: 'var(--color-foreground)',
          outline: 'none' }}
      />
      <button
        onClick={handleAdd}
        disabled={!val.trim()}
        style={{
          padding: '5px 10px',
          borderRadius: 6,
          border: '0.5px solid var(--color-border)',
          backgroundColor: val.trim() ? 'var(--color-primary)' : 'var(--color-muted)',
          color: val.trim() ? '#FFFFFF' : 'var(--color-foreground-faint)',
          fontSize: 12,
          cursor: val.trim() ? 'pointer' : 'not-allowed',
          whiteSpace: 'nowrap' }}
      >
        <Plus size={12} />
      </button>
    </div>
  )
}

function PillSection({
  label,
  items,
  onAdd,
  onRemove,
  placeholder }: {
  label: string
  items: string[]
  onAdd: (val: string) => void
  onRemove: (idx: number) => void
  placeholder: string
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-foreground-muted)', marginBottom: 8 }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.length === 0 && (
          <span style={{ fontSize: 12, color: 'var(--color-foreground-faint)', fontStyle: 'italic' }}>—</span>
        )}
        <AnimatePresence>
          {items.map((item, idx) => (
            <motion.div
              key={`${item}-${idx}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.12 }}
            >
              <Pill text={item} onRemove={() => onRemove(idx)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AddInput placeholder={placeholder} onAdd={onAdd} />
    </div>
  )
}

export default function VPCDetailClient({
  project,
  vpc,
  opportunityName,
  opportunity,
  abilities,
  sourceVpcs }: VPCDetailClientProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const { t } = useI18n()

  const initialCp = (vpc.customer_profile ?? {}) as { jobs?: string[]; pains?: string[]; gains?: string[] }
  const initialVm = (vpc.value_map ?? {}) as { productsAndServices?: string[]; painRelievers?: string[]; gainCreators?: string[] }

  const [customerProfile, setCustomerProfile] = useState<VPCCustomerProfile>({
    jobs: initialCp.jobs ?? [],
    pains: initialCp.pains ?? [],
    gains: initialCp.gains ?? [] })

  const [valueMap, setValueMap] = useState<VPCValueMap>({
    productsAndServices: initialVm.productsAndServices ?? [],
    painRelievers: initialVm.painRelievers ?? [],
    gainCreators: initialVm.gainCreators ?? [] })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [generatingMap, setGeneratingMap] = useState(false)

  // ── Customer profile mutations ─────────────────────────────────────────────

  function cpAdd(field: keyof VPCCustomerProfile, val: string) {
    setCustomerProfile(prev => ({ ...prev, [field]: [...prev[field], val] }))
    setSaved(false)
  }

  function cpRemove(field: keyof VPCCustomerProfile, idx: number) {
    setCustomerProfile(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }))
    setSaved(false)
  }

  // ── Value map mutations ─────────────────────────────────────────────────────

  function vmAdd(field: keyof VPCValueMap, val: string) {
    setValueMap(prev => ({ ...prev, [field]: [...prev[field], val] }))
    setSaved(false)
  }

  function vmRemove(field: keyof VPCValueMap, idx: number) {
    setValueMap(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }))
    setSaved(false)
  }

  // ── Generate value map via AI ───────────────────────────────────────────────

  async function handleGenerateMap() {
    setGeneratingMap(true)
    try {
      const res = await fetch('/api/generate-vpc-value-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityName: opportunity?.name ?? vpc.customer_profile_name,
          opportunityDescription: opportunity?.description ?? '',
          abilities: abilities.map(a => ({ name: a.name, description: a.description })),
          aggregatedPains: customerProfile.pains,
          aggregatedGains: customerProfile.gains,
          aggregatedJobs: customerProfile.jobs,
          twinProfile: (vpc.interview_attachment as { twin_id?: string } | null)?.twin_id
            ? { name: vpc.customer_profile_name, role: '', segment: '' }
            : undefined }) })
      const { valueMap: generated } = await res.json()
      if (generated) {
        setValueMap({
          productsAndServices: generated.productsAndServices ?? [],
          painRelievers: generated.painRelievers ?? [],
          gainCreators: generated.gainCreators ?? [] })
        setSaved(false)
      }
    } catch {
      toast('Generation failed', 'error')
    } finally {
      setGeneratingMap(false)
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('vpcs')
      .update({
        customer_profile: customerProfile,
        value_map: valueMap,
        updated_at: new Date().toISOString() })
      .eq('id', vpc.id)

    setSaving(false)
    if (error) {
      toast('Save failed', 'error')
    } else {
      setSaved(true)
      toast(t.vpcd_detail_saved, 'success')
    }
  }

  const hasValueMapContent =
    valueMap.productsAndServices.length > 0 ||
    valueMap.painRelievers.length > 0 ||
    valueMap.gainCreators.length > 0

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
      <TopNav projectId={project.id} projectTitle={project.title} />

      <div className="vpc-print-target" style={{ maxWidth: 1100, margin: '0 auto', padding: '88px 24px 60px' }}>
        {/* Print-only header: customer profile name + date (hidden on screen) */}
        <div className="vpc-print-header">
          <div className="vpc-print-title">{vpc.customer_profile_name}</div>
          <div className="vpc-print-meta">
            {opportunityName ? `${opportunityName} · ` : ''}{new Date().toLocaleDateString('it-IT')}
          </div>
        </div>

        {/* Back link */}
        <Link
          href={`/project/${project.id}/vpcs`}
          className="vpc-print-hide"
          style={{ fontSize: 12, color: 'var(--color-foreground-muted)', textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}
        >
          {t.vpcd_detail_back}
        </Link>

        {/* Header */}
        <div className="vpc-print-hide" style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1
                style={{
                  fontWeight: 400,
                  fontSize: 26,
                  color: 'var(--color-foreground)',
                  letterSpacing: '-0.02em',
                  margin: 0 }}
              >
                {vpc.customer_profile_name}
              </h1>
              {(vpc as unknown as { is_aggregate?: boolean }).is_aggregate && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: 4,
                    backgroundColor: 'rgba(19,163,137,0.10)',
                    color: 'var(--color-primary)',
                    border: '0.5px solid rgba(19,163,137,0.30)' }}
                >
                  {t.vpcd_detail_aggregate_badge}
                </span>
              )}
            </div>
            {opportunityName && (
              <p style={{ fontSize: 12, color: 'var(--color-foreground-faint)', margin: 0 }}>
                {opportunityName}
              </p>
            )}
            {sourceVpcs.length > 0 && (
              <p style={{ fontSize: 12, color: 'var(--color-foreground-faint)', margin: '4px 0 0' }}>
                {t.vpcd_detail_sources_label}: {sourceVpcs.map(s => s.name).join(' · ')}
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Download PDF button (browser print → save as PDF) */}
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              border: '0.5px solid var(--color-border)',
              backgroundColor: '#FFFFFF',
              color: 'var(--color-foreground)',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease' }}
          >
            <Download size={14} />
            {t.vpcd_detail_download_pdf}
          </button>

          {/* Create BMC button */}
          <Link
            href={`/project/${project.id}/bmcs/new?vpc=${vpc.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              border: '0.5px solid var(--color-border)',
              backgroundColor: '#FFFFFF',
              color: 'var(--color-foreground)',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease' }}
          >
            {t.vpcd_detail_create_bmc}
          </Link>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
              border: '0.5px solid var(--color-primary)',
              backgroundColor: saved ? 'rgba(19,163,137,0.10)' : 'var(--color-primary)',
              color: saved ? 'var(--color-primary)' : '#FFFFFF',
              transition: 'all 0.15s ease',
              flexShrink: 0 }}
          >
            {saving ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                {t.vpcd_detail_saving}
              </>
            ) : saved ? (
              t.vpcd_detail_saved + ' ✓'
            ) : (
              t.vpcd_detail_save
            )}
          </button>
          </div>
        </div>

        {/* Two-column canvas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* LEFT — Value Map */}
          <div
            style={{
              borderRadius: 16,
              backgroundColor: '#FFFFFF',
              border: '0.5px solid var(--color-border)',
              padding: 24 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2
                style={{
                  fontWeight: 400,
                  fontSize: 16,
                  color: 'var(--color-foreground)',
                  margin: 0 }}
              >
                {t.vpcd_detail_value_map}
              </h2>
              <button
                onClick={handleGenerateMap}
                disabled={generatingMap}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: generatingMap ? 'not-allowed' : 'pointer',
                  border: '0.5px solid rgba(19,163,137,0.40)',
                  backgroundColor: 'rgba(19,163,137,0.08)',
                  color: 'var(--color-primary)',
                  transition: 'all 0.15s ease' }}
              >
                {generatingMap ? (
                  <>
                    <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    {t.vpcd_detail_generating}
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    {t.vpcd_detail_generate_map}
                  </>
                )}
              </button>
            </div>

            {!hasValueMapContent && !generatingMap && (
              <p style={{ fontSize: 12, color: 'var(--color-foreground-faint)', fontStyle: 'italic', marginBottom: 20 }}>
                {t.vpcd_detail_empty_map}
              </p>
            )}

            <PillSection
              label={t.vpcd_detail_products}
              items={valueMap.productsAndServices}
              onAdd={val => { vmAdd('productsAndServices', val); setSaved(false) }}
              onRemove={idx => { vmRemove('productsAndServices', idx); setSaved(false) }}
              placeholder={t.vpcd_detail_add}
            />
            <PillSection
              label={t.vpcd_detail_relievers}
              items={valueMap.painRelievers}
              onAdd={val => { vmAdd('painRelievers', val); setSaved(false) }}
              onRemove={idx => { vmRemove('painRelievers', idx); setSaved(false) }}
              placeholder={t.vpcd_detail_add}
            />
            <PillSection
              label={t.vpcd_detail_creators}
              items={valueMap.gainCreators}
              onAdd={val => { vmAdd('gainCreators', val); setSaved(false) }}
              onRemove={idx => { vmRemove('gainCreators', idx); setSaved(false) }}
              placeholder={t.vpcd_detail_add}
            />
          </div>

          {/* RIGHT — Customer Profile */}
          <div
            style={{
              borderRadius: 16,
              backgroundColor: '#FFFFFF',
              border: '0.5px solid var(--color-border)',
              padding: 24 }}
          >
            <h2
              style={{
                fontWeight: 400,
                fontSize: 16,
                color: 'var(--color-foreground)',
                margin: '0 0 24px' }}
            >
              {t.vpcd_detail_customer_profile}
            </h2>

            <PillSection
              label={t.vpcd_detail_jobs}
              items={customerProfile.jobs}
              onAdd={val => cpAdd('jobs', val)}
              onRemove={idx => cpRemove('jobs', idx)}
              placeholder={t.vpcd_detail_add}
            />
            <PillSection
              label={t.vpcd_detail_pains}
              items={customerProfile.pains}
              onAdd={val => cpAdd('pains', val)}
              onRemove={idx => cpRemove('pains', idx)}
              placeholder={t.vpcd_detail_add}
            />
            <PillSection
              label={t.vpcd_detail_gains}
              items={customerProfile.gains}
              onAdd={val => cpAdd('gains', val)}
              onRemove={idx => cpRemove('gains', idx)}
              placeholder={t.vpcd_detail_add}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
