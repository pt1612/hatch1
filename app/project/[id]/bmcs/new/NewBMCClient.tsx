'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Plus, SquareStack } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type VPCOption = {
  id: string
  customer_profile_name: string
  source_type: string
  final_canvas: Record<string, unknown>
  vpc_opportunities?: unknown
}

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
  const [selectedVPCId, setSelectedVPCId] = useState(vpcs[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function createBMC() {
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

  return (
    <main className="pt-20 px-6 pb-16 max-w-4xl mx-auto">
      <Link href={`/project/${project.id}/vpcs`} className="inline-flex items-center gap-2 text-xs mb-7" style={{ color: 'var(--color-foreground-muted)', textDecoration: 'none' }}>
        <ArrowLeft size={14} />
        Back to VPCs
      </Link>

      <div className="mb-7">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--color-foreground-muted)' }}>
          Level 3
        </p>
        <h1 style={{ fontWeight: 400, fontSize: 34, letterSpacing: '-0.03em', color: 'var(--color-foreground)' }}>
          Start a BMC
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-foreground-muted)' }}>
          Choose one VPC as the primary segment. Customer Segments and Value Propositions will be inherited from it.
        </p>
      </div>

      {vpcs.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}>
          <SquareStack size={30} className="mx-auto mb-3" style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-base font-medium mb-2" style={{ color: 'var(--color-foreground)' }}>Create a VPC first</h2>
          <p className="text-sm mb-5" style={{ color: 'var(--color-foreground-muted)' }}>
            A BMC needs exactly one primary VPC before it can be created.
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

          <button onClick={createBMC} disabled={saving || !selectedVPCId} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium disabled:opacity-60" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', borderRadius: 10 }}>
            {saving ? 'Creating...' : 'Create BMC'}
            <ArrowRight size={15} />
          </button>
        </>
      )}
    </main>
  )
}
