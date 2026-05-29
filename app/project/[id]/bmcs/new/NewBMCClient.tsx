'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Plus, X, SquareStack, PenLine, ClipboardList, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type VPCOption = {
  id: string
  customer_profile_name: string
  source_type: string
  final_canvas: Record<string, unknown>
  vpc_opportunities?: unknown
}

type Mode = 'choose' | 'select' | 'import'

type ImportEntry = { segment: string; text: string }

function countItems(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 0
  return Object.values(raw as Record<string, unknown>).reduce<number>((sum, value) => {
    return sum + (Array.isArray(value) ? value.length : 0)
  }, 0)
}

export default function NewBMCClient({
  project,
  vpcs }: {
  project: { id: string; title: string }
  vpcs: VPCOption[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const preselectedVPCId = searchParams.get('vpc')
  const initialVPCId =
    preselectedVPCId && vpcs.some((vpc) => vpc.id === preselectedVPCId)
      ? preselectedVPCId
      : vpcs[0]?.id ?? ''

  // Returning from VPC creation with ?vpc=<id> jumps straight to the selection step.
  const [mode, setMode] = useState<Mode>(preselectedVPCId ? 'select' : 'choose')
  const [selectedVPCId, setSelectedVPCId] = useState(initialVPCId)
  const [importEntries, setImportEntries] = useState<ImportEntry[]>([{ segment: '', text: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ── Option A — Manual ───────────────────────────────────────────────────────
  async function createManualBMC() {
    setSaving(true)
    setError('')
    const { data: bmc, error: bmcError } = await supabase
      .from('business_model_canvases')
      .insert({
        project_id: project.id,
        title: 'Business Model Canvas',
        value_propositions: [],
        customer_segments: [],
        customer_relationships: [],
        channels: [],
        key_activities: [],
        key_resources: [],
        key_partners: [],
        revenue_streams: [],
        cost_structure: [] })
      .select('id')
      .single()

    if (bmcError || !bmc) {
      setSaving(false)
      setError(bmcError?.message ?? 'Unable to create the BMC.')
      return
    }
    router.push(`/project/${project.id}/bmcs/${bmc.id}`)
  }

  // ── Option B — Create from a primary VPC ─────────────────────────────────────
  async function createBMCFromVPC() {
    const selected = vpcs.find((vpc) => vpc.id === selectedVPCId)
    if (!selected) {
      setError('Select a primary VPC first.')
      return
    }

    setSaving(true)
    setError('')

    const { data: bmc, error: bmcError } = await supabase
      .from('business_model_canvases')
      .insert({
        project_id: project.id,
        title: `${selected.customer_profile_name} BMC`,
        value_propositions: [],
        customer_segments: [],
        customer_relationships: [],
        channels: [],
        key_activities: [],
        key_resources: [],
        key_partners: [],
        revenue_streams: [],
        cost_structure: [] })
      .select('id')
      .single()

    if (bmcError || !bmc) {
      setSaving(false)
      setError(bmcError?.message ?? 'Unable to create the BMC.')
      return
    }

    const { error: linkError } = await supabase
      .from('bmc_vpcs')
      .insert({ bmc_id: bmc.id, vpc_id: selected.id, role: 'primary' })

    if (linkError) {
      setSaving(false)
      setError(linkError.message)
      return
    }

    router.push(`/project/${project.id}/bmcs/${bmc.id}`)
  }

  // ── Option C — Import VPC as text ────────────────────────────────────────────
  function updateEntry(idx: number, patch: Partial<ImportEntry>) {
    setImportEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)))
  }
  function addEntry() {
    setImportEntries((prev) => [...prev, { segment: '', text: '' }])
  }
  function removeEntry(idx: number) {
    setImportEntries((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)))
  }

  async function createImportedBMC() {
    const entries = importEntries
      .map((e) => ({ segment: e.segment.trim(), text: e.text.trim() }))
      .filter((e) => e.segment && e.text)

    if (entries.length === 0) {
      setError('Add at least one VPC with a customer segment and a description.')
      return
    }

    setSaving(true)
    setError('')

    // Customer Segments come from what the user declared, not from the pasted text.
    const customerSegments = Array.from(new Set(entries.map((e) => e.segment)))

    // Value Propositions are synthesized by the AI from the pasted descriptions.
    let valuePropositions: string[] = []
    try {
      const rawText = entries.map((e) => `For "${e.segment}":\n${e.text}`).join('\n\n')
      const res = await fetch('/api/generate-vpc-value-propositions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }) })
      const json = await res.json()
      valuePropositions = Array.isArray(json.items) ? json.items : []
    } catch {
      // Non-fatal: keep VPs empty, the user can still add them in the editor.
      valuePropositions = []
    }

    const { data: bmc, error: bmcError } = await supabase
      .from('business_model_canvases')
      .insert({
        project_id: project.id,
        title: `${customerSegments[0]} BMC`,
        value_propositions: valuePropositions,
        customer_segments: customerSegments,
        customer_relationships: [],
        channels: [],
        key_activities: [],
        key_resources: [],
        key_partners: [],
        revenue_streams: [],
        cost_structure: [],
        imported_vpc_text: entries }) // jsonb array of { segment, text }
      .select('id')
      .single()

    if (bmcError || !bmc) {
      setSaving(false)
      setError(bmcError?.message ?? 'Unable to create the BMC.')
      return
    }

    router.push(`/project/${project.id}/bmcs/${bmc.id}`)
  }

  // ── Shared header ────────────────────────────────────────────────────────────
  const backLink =
    mode === 'choose' ? (
      <Link href={`/project/${project.id}/vpcs`} className="inline-flex items-center gap-2 text-xs mb-7" style={{ color: 'var(--color-foreground-muted)', textDecoration: 'none' }}>
        <ArrowLeft size={14} />
        Back to VPCs
      </Link>
    ) : (
      <button onClick={() => { setMode('choose'); setError('') }} className="inline-flex items-center gap-2 text-xs mb-7" style={{ color: 'var(--color-foreground-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
        <ArrowLeft size={14} />
        Back to options
      </button>
    )

  return (
    <main className="pt-20 px-6 pb-16 max-w-4xl mx-auto">
      {backLink}

      <div className="mb-7">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--color-foreground-muted)' }}>
          Level 3
        </p>
        <h1 style={{ fontWeight: 400, fontSize: 34, letterSpacing: '-0.03em', color: 'var(--color-foreground)' }}>
          Start a BMC
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-foreground-muted)' }}>
          {mode === 'choose' && 'Choose how you want to build this Business Model Canvas.'}
          {mode === 'select' && 'Choose one VPC as the primary segment. Value Propositions will be drafted from it.'}
          {mode === 'import' && 'Paste one or more VPC descriptions and declare who each one is for.'}
        </p>
      </div>

      {/* ── Step: choose entry path ───────────────────────────────────────────── */}
      {mode === 'choose' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={createManualBMC}
            disabled={saving}
            className="text-left rounded-2xl p-6 flex flex-col h-full transition-colors disabled:opacity-60"
            style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)', cursor: 'pointer' }}
          >
            <div className="mb-3"><PenLine size={22} style={{ color: 'var(--color-primary)' }} /></div>
            <h2 className="text-base font-medium mb-2" style={{ color: 'var(--color-foreground)' }}>Manual</h2>
            <p className="text-sm flex-1 mb-4" style={{ color: 'var(--color-foreground-muted)' }}>
              Start from a blank canvas. Fill every block yourself, with AI suggestions based on what you&apos;ve already filled in.
            </p>
            <span className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
              {saving ? 'Creating…' : 'Start blank'}
              {saving ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('select'); setError('') }}
            className="text-left rounded-2xl p-6 flex flex-col h-full transition-colors"
            style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)', cursor: 'pointer' }}
          >
            <div className="mb-3"><SquareStack size={22} style={{ color: 'var(--color-primary)' }} /></div>
            <h2 className="text-base font-medium mb-2" style={{ color: 'var(--color-foreground)' }}>From a VPC</h2>
            <p className="text-sm flex-1 mb-4" style={{ color: 'var(--color-foreground-muted)' }}>
              Pick an existing VPC as the primary segment — or create one first. Value Propositions are drafted from its value map.
            </p>
            <span className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
              Choose a VPC
              <ArrowRight size={15} />
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('import'); setError('') }}
            className="text-left rounded-2xl p-6 flex flex-col h-full transition-colors"
            style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)', cursor: 'pointer' }}
          >
            <div className="mb-3"><ClipboardList size={22} style={{ color: 'var(--color-primary)' }} /></div>
            <h2 className="text-base font-medium mb-2" style={{ color: 'var(--color-foreground)' }}>Import as text</h2>
            <p className="text-sm flex-1 mb-4" style={{ color: 'var(--color-foreground-muted)' }}>
              Paste one or more VPC descriptions and declare the target segment for each. We&apos;ll draft Segments and Value Propositions.
            </p>
            <span className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
              Paste VPC text
              <ArrowRight size={15} />
            </span>
          </button>
        </div>
      )}

      {error && mode === 'choose' && <p className="text-xs mt-4" style={{ color: '#B91C1C' }}>{error}</p>}

      {/* ── Step: select a primary VPC (Option B) ─────────────────────────────── */}
      {mode === 'select' && (
        vpcs.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}>
            <SquareStack size={30} className="mx-auto mb-3" style={{ color: 'var(--color-primary)' }} />
            <h2 className="text-base font-medium mb-2" style={{ color: 'var(--color-foreground)' }}>Create a VPC first</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--color-foreground-muted)' }}>
              You don&apos;t have any VPCs yet. Create one, then come back to use it as the primary segment.
            </p>
            <Link href={`/project/${project.id}/vpcs/new`} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', borderRadius: 10, textDecoration: 'none' }}>
              <Plus size={15} />
              Start a VPC
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {vpcs.map((vpc) => {
                const selected = selectedVPCId === vpc.id
                return (
                  <button
                    key={vpc.id}
                    onClick={() => setSelectedVPCId(vpc.id)}
                    className="text-left rounded-2xl p-5 transition-colors"
                    style={{
                      backgroundColor: selected ? 'rgba(19,163,137,0.08)' : '#FFFFFF',
                      border: selected ? '0.5px solid rgba(19,163,137,0.45)' : '0.5px solid var(--color-border)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--color-foreground-muted)' }}>
                          Primary VPC
                        </p>
                        <h2 className="text-base font-medium mt-1" style={{ color: 'var(--color-foreground)' }}>
                          {vpc.customer_profile_name}
                        </h2>
                      </div>
                      {selected && <Check size={18} style={{ color: 'var(--color-primary)' }} />}
                    </div>
                    <p className="text-xs mt-4" style={{ color: 'var(--color-foreground-muted)' }}>
                      {countItems(vpc.final_canvas)} VPC items
                    </p>
                  </button>
                )
              })}
            </div>

            {error && <p className="text-xs mb-4" style={{ color: '#B91C1C' }}>{error}</p>}

            <div className="flex items-center gap-4">
              <button onClick={createBMCFromVPC} disabled={saving || !selectedVPCId} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium disabled:opacity-60" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', borderRadius: 10 }}>
                {saving ? 'Creating…' : 'Create BMC'}
                {saving ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
              </button>
              <Link href={`/project/${project.id}/vpcs/new`} className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                <Plus size={15} />
                Create a new VPC first
              </Link>
            </div>
          </>
        )
      )}

      {/* ── Step: import VPC text (Option C) ──────────────────────────────────── */}
      {mode === 'import' && (
        <>
          <div className="flex flex-col gap-4 mb-5">
            {importEntries.map((entry, idx) => (
              <div key={idx} className="rounded-2xl p-5" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--color-foreground-muted)' }}>
                    VPC {idx + 1}
                  </p>
                  {importEntries.length > 1 && (
                    <button onClick={() => removeEntry(idx)} className="opacity-50 hover:opacity-100" title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>
                  Who is this VPC for?
                </label>
                <input
                  value={entry.segment}
                  onChange={(e) => updateEntry(idx, { segment: e.target.value })}
                  placeholder="e.g. Independent boutique owners"
                  className="w-full px-3 py-2 text-sm outline-none mb-3"
                  style={{ backgroundColor: 'var(--color-muted)', border: '0.5px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)' }}
                />

                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>
                  VPC description
                </label>
                <textarea
                  value={entry.text}
                  onChange={(e) => updateEntry(idx, { text: e.target.value })}
                  placeholder="Paste the value proposition / customer profile description here…"
                  rows={5}
                  className="w-full px-3 py-2 text-sm outline-none resize-y"
                  style={{ backgroundColor: 'var(--color-muted)', border: '0.5px solid var(--color-border)', borderRadius: 8, color: 'var(--color-foreground)' }}
                />
              </div>
            ))}
          </div>

          <button onClick={addEntry} className="inline-flex items-center gap-1.5 text-sm font-medium mb-6" style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Plus size={15} />
            Add another VPC
          </button>

          {error && <p className="text-xs mb-4" style={{ color: '#B91C1C' }}>{error}</p>}

          <div>
            <button onClick={createImportedBMC} disabled={saving} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium disabled:opacity-60" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', borderRadius: 10 }}>
              {saving ? 'Generating…' : 'Create BMC'}
              {saving ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
            </button>
          </div>
        </>
      )}
    </main>
  )
}
