'use client'

import Link from 'next/link'
import { Check, Users, LayoutGrid } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

const TEAL_BG = 'linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #14b8a6 100%)'
const TEAL_BORDER = 'rgba(15, 118, 110, 0.35)'

export type WtpCompletionVpc = { id: string; customer_profile_name: string }
export type WtpCompletionBmc = { id: string; title: string | null }

export default function WhereToPlayCompletion({
  projectId,
  abilitiesCount,
  opportunitiesCount,
  evaluatedCount,
  spotlightOpportunity,
  spotlightScoreLabel,
  vpcs,
  bmcs,
}: {
  projectId: string
  abilitiesCount: number
  opportunitiesCount: number
  evaluatedCount: number
  spotlightOpportunity: { id: string; name: string } | null
  spotlightScoreLabel: string | null
  vpcs: WtpCompletionVpc[]
  bmcs: WtpCompletionBmc[]
}) {
  const { t } = useI18n()
  const hasVpcs = vpcs.length > 0
  const hasBmcs = bmcs.length > 0
  const showDeepenings = hasVpcs || hasBmcs

  const vpcNewHref = spotlightOpportunity
    ? `/project/${projectId}/vpcs/new?opportunityId=${spotlightOpportunity.id}`
    : `/project/${projectId}/vpcs/new`
  const bmcNewHref = `/project/${projectId}/bmcs/new`

  return (
    <section className="mt-10 max-w-5xl mx-auto" aria-label={t.strategy_wtp_completion_section_label}>
      <div
        className="rounded-2xl overflow-hidden shadow-sm"
        style={{
          background: TEAL_BG,
          border: `1px solid ${TEAL_BORDER}`,
        }}
      >
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
              >
                <Check size={22} strokeWidth={2.5} />
              </span>
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {t.strategy_wtp_completion_level_label}
                </p>
                <h2
                  className="text-xl sm:text-2xl font-normal"
                  style={{ fontFamily: "'Lora', Georgia, serif", color: '#fff', letterSpacing: '-0.02em' }}
                >
                  {t.strategy_wtp_completion_wtp_title}
                </h2>
              </div>
            </div>
            <Link
              href={`/project/${projectId}/abilities`}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium shrink-0 rounded-lg transition-colors"
              style={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                color: '#0f766e',
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.5)',
              }}
            >
              {t.strategy_wtp_completion_review}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              { label: t.strategy_wtp_completion_metric_skills, value: abilitiesCount },
              { label: t.strategy_wtp_completion_metric_opps, value: opportunitiesCount },
              { label: t.strategy_wtp_completion_metric_evaluated, value: evaluatedCount },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl px-4 py-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.25)' }}
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {m.label}
                </p>
                <p className="text-2xl font-semibold tabular-nums mt-1" style={{ color: '#fff' }}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          {spotlightOpportunity && (
            <>
              <div className="border-t border-white/25 my-5" />
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-2"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  {t.strategy_wtp_completion_priority_label}
                </p>
                <p className="text-base sm:text-lg font-medium" style={{ color: '#fff' }}>
                  {spotlightOpportunity.name}
                  {spotlightScoreLabel ? (
                    <span className="font-normal opacity-90"> · {spotlightScoreLabel}</span>
                  ) : null}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-ink)' }}>
          {t.strategy_wtp_completion_deepen_with}
        </p>
        {showDeepenings ? (
          <div
            className="rounded-2xl p-6 mb-4"
            style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
          >
            <p
              className="text-[10px] font-medium uppercase tracking-[0.1em] mb-4"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {t.strategy_wtp_completion_deepenings_title}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>
                  VPC
                </p>
                {hasVpcs ? (
                  <ul className="space-y-2 mb-3">
                    {vpcs.map((v) => (
                      <li key={v.id}>
                        <Link
                          href={`/project/${projectId}/vpcs/${v.id}`}
                          className="text-sm font-medium"
                          style={{ color: 'var(--color-amber)', textDecoration: 'none' }}
                        >
                          {v.customer_profile_name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs italic mb-3" style={{ color: 'var(--color-text-faint)' }}>
                    {t.strategy_wtp_completion_none_vpc}
                  </p>
                )}
                <Link
                  href={vpcNewHref}
                  className="inline-block text-xs font-medium"
                  style={{ color: 'var(--color-text-muted)', textDecoration: 'underline' }}
                >
                  {t.strategy_wtp_completion_add_another_vpc}
                </Link>
              </div>
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>
                  BMC
                </p>
                {hasBmcs ? (
                  <ul className="space-y-2 mb-3">
                    {bmcs.map((b) => (
                      <li key={b.id}>
                        <Link
                          href={`/project/${projectId}/bmcs/${b.id}`}
                          className="text-sm font-medium"
                          style={{ color: 'var(--color-amber)', textDecoration: 'none' }}
                        >
                          {b.title?.trim() || 'BMC'}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs italic mb-3" style={{ color: 'var(--color-text-faint)' }}>
                    {t.strategy_wtp_completion_none_bmc}
                  </p>
                )}
                <Link
                  href={bmcNewHref}
                  className="inline-block text-xs font-medium"
                  style={{ color: 'var(--color-text-muted)', textDecoration: 'underline' }}
                >
                  {hasBmcs ? t.strategy_wtp_completion_add_another_bmc : t.strategy_wtp_completion_start_bmc}
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className="rounded-2xl p-6 flex flex-col"
              style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
            >
              <Users size={22} className="mb-3" style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--color-text-muted)' }}>
                {t.strategy_wtp_completion_level2}
              </p>
              <h3 className="text-base font-medium mb-2" style={{ color: 'var(--color-ink)' }}>
                {t.strategy_wtp_completion_vpc_card_title}
              </h3>
              <p className="text-sm flex-1 mb-4" style={{ color: 'var(--color-text-muted)' }}>
                {t.strategy_wtp_completion_vpc_card_desc}
              </p>
              <Link
                href={vpcNewHref}
                className="inline-flex items-center justify-center py-2.5 px-4 text-sm font-medium rounded-lg w-fit"
                style={{ backgroundColor: 'var(--color-linen)', color: 'var(--color-ink)', textDecoration: 'none' }}
              >
                {t.strategy_wtp_completion_start_vpc}
              </Link>
            </div>
            <div
              className="rounded-2xl p-6 flex flex-col"
              style={{ backgroundColor: '#FFFFFF', border: '0.5px solid var(--color-border)' }}
            >
              <LayoutGrid size={22} className="mb-3" style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--color-text-muted)' }}>
                {t.strategy_wtp_completion_level3}
              </p>
              <h3 className="text-base font-medium mb-2" style={{ color: 'var(--color-ink)' }}>
                {t.strategy_wtp_completion_bmc_card_title}
              </h3>
              <p className="text-sm flex-1 mb-4" style={{ color: 'var(--color-text-muted)' }}>
                {t.strategy_wtp_completion_bmc_card_desc}
              </p>
              <Link
                href={bmcNewHref}
                className="inline-flex items-center justify-center py-2.5 px-4 text-sm font-medium rounded-lg w-fit"
                style={{ backgroundColor: 'var(--color-linen)', color: 'var(--color-ink)', textDecoration: 'none' }}
              >
                {t.strategy_wtp_completion_start_bmc}
              </Link>
            </div>
          </div>
        )}
      </div>

      <div
        className="mt-4 rounded-xl px-4 py-3 text-sm"
        style={{ backgroundColor: 'var(--color-linen)', color: 'var(--color-text-muted)', border: '0.5px solid var(--color-border)' }}
      >
        {t.strategy_wtp_completion_optional_note}
      </div>
    </section>
  )
}
