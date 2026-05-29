'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/types'
import { useI18n, type Lang } from '@/lib/i18n/context'

interface NavItem {
  label: string
  href: string
  hasData: boolean
}

interface TopNavProps {
  projectId?: string
  projectTitle?: string
  progressPct?: number
  navItems?: NavItem[]
  entryPath?: 'full' | 'idea' | 'vpc' | 'bmc' | null
}

// Nav labels are ALWAYS in English (technical framework terms — not translated)
function isItemLocked(label: string, entryPath: string | null | undefined, href?: string): boolean {
  if (label === 'VPC') {
    if (href?.endsWith('/vpcs') || href?.includes('/vpcs/')) return false
    if (!entryPath || entryPath === 'full' || entryPath === 'idea') return true
    if (entryPath === 'bmc') return true
    return false
  }
  if (label === 'BMC') {
    if (href?.endsWith('/bmcs') || href?.includes('/bmcs/')) return false
    if (entryPath === 'vpc') return true
    return false
  }
  if (!entryPath || entryPath === 'full') return false
  if (entryPath === 'idea') return label === 'Skills'
  if (entryPath === 'vpc') return ['Skills', 'Opportunities', 'Evaluation', 'Map', 'Strategy'].includes(label)
  if (entryPath === 'bmc') return !['VPC', 'BMC'].includes(label)
  return false
}

function LangToggle() {
  const { lang, setLang } = useI18n()
  return (
    <div className="inline-flex items-center h-[26px] rounded-md overflow-hidden border border-[var(--color-border)] bg-[var(--color-muted)]">
      {(['en', 'it'] as Lang[]).map((l) => {
        const active = lang === l
        return (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={[
              'h-full px-[9px] text-[11px] tracking-[0.04em] transition-colors',
              active
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-semibold'
                : 'bg-transparent text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]',
            ].join(' ')}
          >
            {l.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}

export default function TopNav({
  projectId,
  projectTitle,
  progressPct = 0,
  navItems,
  entryPath: entryPathProp,
}: TopNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { t } = useI18n()

  const [userInitials, setUserInitials] = useState('')
  const [fetchedEntryPath, setFetchedEntryPath] = useState<'full' | 'idea' | 'vpc' | 'bmc' | null | undefined>(
    undefined
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: { user_metadata?: { full_name?: string }; email?: string | null } | null } }) => {
      const name = data.user?.user_metadata?.full_name ?? data.user?.email ?? ''
      setUserInitials(getInitials(name) || name.slice(0, 2).toUpperCase())
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (entryPathProp !== undefined) {
      setFetchedEntryPath(entryPathProp)
      return
    }
    if (!projectId) {
      setFetchedEntryPath(null)
      return
    }
    supabase
      .from('projects')
      .select('entry_path')
      .eq('id', projectId)
      .single()
      .then(({ data }: { data: { entry_path: string | null } | null }) => {
        setFetchedEntryPath((data?.entry_path as 'full' | 'idea' | 'vpc' | 'bmc' | null) ?? null)
      })
  }, [projectId, entryPathProp]) // eslint-disable-line react-hooks/exhaustive-deps

  const entryPath = entryPathProp ?? fetchedEntryPath

  const vpcHref = (entryPath === 'vpc' || entryPath === 'bmc')
    ? `/project/${projectId}/evaluations`
    : `/project/${projectId}/vpcs`

  const defaultItems: NavItem[] = projectId
    ? [
        { label: 'Skills',        href: `/project/${projectId}/abilities`,    hasData: true },
        { label: 'Opportunities', href: `/project/${projectId}/opportunities`, hasData: true },
        { label: 'Evaluation',    href: `/project/${projectId}/evaluations`,   hasData: true },
        { label: 'Map',           href: `/project/${projectId}/map`,           hasData: true },
        { label: 'Strategy',      href: `/project/${projectId}/strategy`,      hasData: true },
        { label: 'VPC',           href: vpcHref,                               hasData: true },
        { label: 'BMC',           href: `/project/${projectId}/evaluations`,   hasData: true },
      ]
    : []

  const items = navItems ?? defaultItems

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 h-[52px] flex items-center px-5 bg-[var(--color-background)] border-b border-[var(--color-border)]">
        {/* Left: logo */}
        <div className="flex items-center flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 no-underline">
            <Image
              src="/hatch_logo.svg"
              alt="Hatch"
              width={28}
              height={28}
              style={{ height: 28, width: 'auto' }}
            />
            <span className="font-bold text-[16px] tracking-[-0.01em] text-[var(--color-foreground)]">
              Hatch
            </span>
          </Link>
        </div>

        {/* Center: nav items */}
        {items.length > 0 && (
          <nav className="flex-1 flex items-center justify-center">
            {items
              .filter((item) => !isItemLocked(item.label, entryPath, item.href))
              .map((item, i) => {
                const active = isActive(item.href)
                return (
                  <span key={item.label} className="flex items-center">
                    {i > 0 && (
                      <span className="text-[var(--color-border-strong)] text-sm mx-1 select-none">·</span>
                    )}
                    <Link
                      href={item.href}
                      className={[
                        'text-[13px] whitespace-nowrap pb-0.5 border-b-[1.5px] transition-colors no-underline',
                        active
                          ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                          : 'text-[var(--color-foreground-muted)] border-transparent hover:text-[var(--color-foreground)]',
                      ].join(' ')}
                    >
                      {item.label}
                    </Link>
                  </span>
                )
              })}
          </nav>
        )}

        {/* Right */}
        <div
          className={[
            'flex items-center gap-2.5 flex-shrink-0',
            items.length === 0 ? 'ml-auto' : '',
          ].join(' ')}
        >
          <LangToggle />

          {projectTitle && (
            <span className="text-[12px] text-[var(--color-foreground-faint)] max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">
              {projectTitle}
            </span>
          )}
          {userInitials && (
            <button
              onClick={handleSignOut}
              title={t.nav_signout}
              className="w-[30px] h-[30px] rounded-full bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] border border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] text-[var(--color-primary)] text-[11px] font-semibold tracking-[0.03em] flex items-center justify-center cursor-pointer transition-all hover:bg-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] hover:scale-105"
            >
              {userInitials}
            </button>
          )}
        </div>
      </div>

      {progressPct > 0 && (
        <div className="fixed top-[52px] left-0 right-0 h-0.5 z-[49] bg-[var(--color-muted)]">
          <div
            className="h-full bg-[var(--color-primary)] transition-[width] duration-[0.4s] ease"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </>
  )
}
