'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/types'

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

// ── Lock rules per entry_path ──────────────────────────────────────────────────
function isItemLocked(label: string, entryPath: string | null | undefined): boolean {
  if (!entryPath || entryPath === 'full') return false
  if (entryPath === 'idea') return label === 'Abilità'
  if (entryPath === 'vpc') return ['Abilità', 'Opportunità', 'Valutazione', 'Mappa', 'Strategia'].includes(label)
  if (entryPath === 'bmc') return label !== 'BMC'
  return false
}

// ── Inline lock SVG (10 px) ────────────────────────────────────────────────────
function LockIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 3, flexShrink: 0 }}
    >
      <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" />
      <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
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

  const [userInitials, setUserInitials] = useState('')
  const [fetchedEntryPath, setFetchedEntryPath] = useState<'full' | 'idea' | 'vpc' | 'bmc' | null | undefined>(
    undefined
  )

  // Fetch user initials
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.full_name ?? data.user?.email ?? ''
      setUserInitials(getInitials(name) || name.slice(0, 2).toUpperCase())
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch entry_path from project if not provided as prop
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
      .then(({ data }) => {
        setFetchedEntryPath((data?.entry_path as 'full' | 'idea' | 'vpc' | 'bmc' | null) ?? null)
      })
  }, [projectId, entryPathProp]) // eslint-disable-line react-hooks/exhaustive-deps

  const entryPath = entryPathProp ?? fetchedEntryPath

  const defaultItems: NavItem[] = projectId
    ? [
        { label: 'Abilità',       href: `/project/${projectId}/abilities`,    hasData: true },
        { label: 'Opportunità',   href: `/project/${projectId}/opportunities`, hasData: true },
        { label: 'Valutazione',   href: `/project/${projectId}/evaluations`,   hasData: true },
        { label: 'Mappa',         href: `/project/${projectId}/map`,           hasData: true },
        { label: 'Strategia',     href: `/project/${projectId}/strategy`,      hasData: true },
        { label: 'VPC',           href: `/project/${projectId}/evaluations`,   hasData: true },
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

  const isDashboard = pathname === '/dashboard'

  return (
    <>
      {/* ── Fixed nav bar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: 'var(--color-cream)',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 20,
          paddingRight: 20,
          borderBottom: '0.5px solid var(--color-border)',
        }}
      >
        {/* Left: logo + wordmark + Dashboard link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
          <Link
            href="/dashboard"
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          >
            <Image
              src="/hatch_logo.svg"
              alt="Hatch"
              width={28}
              height={28}
              style={{ height: 28, width: 'auto' }}
            />
            <span
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontWeight: 400,
                fontSize: 16,
                color: 'var(--color-ink)',
                letterSpacing: '-0.01em',
              }}
            >
              Hatch
            </span>
          </Link>

          <Link
            href="/dashboard"
            style={{
              marginLeft: 18,
              fontSize: 12,
              color: isDashboard ? 'var(--color-amber)' : 'var(--color-text-muted)',
              textDecoration: 'none',
              paddingBottom: 1,
              borderBottom: isDashboard
                ? '1.5px solid var(--color-amber)'
                : '1.5px solid transparent',
              transition: 'color 0.1s ease',
            }}
            onMouseEnter={(e) => {
              if (!isDashboard) (e.currentTarget as HTMLElement).style.color = 'var(--color-ink)'
            }}
            onMouseLeave={(e) => {
              if (!isDashboard)
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'
            }}
          >
            Dashboard
          </Link>
        </div>

        {/* Center: nav items */}
        {items.length > 0 && (
          <nav
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0,
            }}
          >
            {items.map((item, i) => {
              const active = isActive(item.href)
              const locked = isItemLocked(item.label, entryPath)

              return (
                <span key={item.label} style={{ display: 'flex', alignItems: 'center' }}>
                  {i > 0 && (
                    <span
                      style={{
                        color: 'var(--color-border)',
                        fontSize: 14,
                        marginLeft: 4,
                        marginRight: 4,
                        userSelect: 'none',
                      }}
                    >
                      ·
                    </span>
                  )}

                  {locked ? (
                    <span
                      style={{
                        fontSize: 13,
                        color: 'var(--color-text-faint)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        paddingBottom: 2,
                        pointerEvents: 'none',
                        opacity: 0.4,
                        whiteSpace: 'nowrap',
                        cursor: 'default',
                      }}
                    >
                      {item.label}
                      <LockIcon />
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      style={{
                        fontSize: 13,
                        color: active ? 'var(--color-amber)' : 'var(--color-text-muted)',
                        textDecoration: 'none',
                        paddingBottom: 2,
                        borderBottom: active
                          ? '1.5px solid var(--color-amber)'
                          : '1.5px solid transparent',
                        transition: 'color 0.1s ease, border-color 0.1s ease',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => {
                        if (!active)
                          (e.currentTarget as HTMLElement).style.color = 'var(--color-ink)'
                      }}
                      onMouseLeave={(e) => {
                        if (!active)
                          (e.currentTarget as HTMLElement).style.color =
                            'var(--color-text-muted)'
                      }}
                    >
                      {item.label}
                    </Link>
                  )}
                </span>
              )
            })}
          </nav>
        )}

        {/* Right: project title + avatar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
            marginLeft: items.length === 0 ? 'auto' : 0,
          }}
        >
          {projectTitle && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--color-text-faint)',
                maxWidth: 160,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {projectTitle}
            </span>
          )}
          {userInitials && (
            <button
              onClick={handleSignOut}
              title="Esci"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: 'rgba(199,123,58,0.10)',
                border: '1px solid rgba(199,123,58,0.25)',
                color: 'var(--color-amber)',
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                letterSpacing: '0.03em',
              }}
            >
              {userInitials}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar below nav (always shown when progressPct > 0) */}
      {progressPct > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 52,
            left: 0,
            right: 0,
            height: 2,
            zIndex: 49,
            backgroundColor: 'var(--color-linen)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              backgroundColor: 'var(--color-amber)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      )}
    </>
  )
}
