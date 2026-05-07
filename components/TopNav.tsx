'use client'

import { useEffect, useRef, useState } from 'react'
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
}

export default function TopNav({ projectId, projectTitle, progressPct = 0, navItems }: TopNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [visible, setVisible] = useState(false)
  const [userInitials, setUserInitials] = useState('')
  const triggerRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.full_name ?? data.user?.email ?? ''
      setUserInitials(getInitials(name) || name.slice(0, 2).toUpperCase())
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function show() {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    setVisible(true)
  }

  function scheduleHide() {
    hideTimerRef.current = setTimeout(() => setVisible(false), 120)
  }

  const defaultItems: NavItem[] = projectId
    ? [
        { label: 'Abilities',     href: `/project/${projectId}/abilities`,     hasData: true },
        { label: 'Opportunities', href: `/project/${projectId}/opportunities`,  hasData: true },
        { label: 'Evaluation',    href: `/project/${projectId}/evaluations`,    hasData: true },
        { label: 'Map',           href: `/project/${projectId}/map`,            hasData: true },
        { label: 'Strategy',      href: `/project/${projectId}/strategy`,       hasData: true },
        { label: 'VPC',           href: `/project/${projectId}/evaluations`,    hasData: true },
        { label: 'BMC',           href: `/project/${projectId}/evaluations`,    hasData: true },
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
      {/* Invisible trigger zone — 12px at very top */}
      <div
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 12,
          zIndex: 60,
        }}
      />

      {/* Nav bar */}
      <div
        ref={navRef}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: '#1A1A18',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 20,
          paddingRight: 20,
          gap: 0,
          transform: visible ? 'translateY(0)' : 'translateY(-100%)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.2s ease, opacity 0.15s ease',
          boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
        }}
      >
        {/* Left: logo + wordmark */}
        <Link
          href="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            flexShrink: 0,
          }}
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
              color: '#FAFAF8',
              letterSpacing: '-0.01em',
            }}
          >
            Hatch
          </span>
        </Link>

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
              return (
                <span key={item.label} style={{ display: 'flex', alignItems: 'center' }}>
                  {i > 0 && (
                    <span
                      style={{
                        color: '#3A3A38',
                        fontSize: 14,
                        marginLeft: 4,
                        marginRight: 4,
                        userSelect: 'none',
                      }}
                    >
                      ·
                    </span>
                  )}
                  <Link
                    href={item.href}
                    style={{
                      fontSize: 13,
                      color: active ? '#E8A96A' : item.hasData ? '#A8A89E' : '#666660',
                      textDecoration: 'none',
                      paddingBottom: 2,
                      borderBottom: active ? '2px solid #C77B3A' : '2px solid transparent',
                      transition: 'color 0.1s ease, border-color 0.1s ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.color = '#FAFAF8'
                    }}
                    onMouseLeave={(e) => {
                      if (!active)
                        (e.currentTarget as HTMLElement).style.color = item.hasData ? '#A8A89E' : '#666660'
                    }}
                  >
                    {item.label}
                  </Link>
                </span>
              )
            })}
          </nav>
        )}

        {/* Right: project name + avatar */}
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
                color: '#666660',
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
              title="Sign out"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: 'rgba(199,123,58,0.25)',
                border: '1px solid rgba(199,123,58,0.4)',
                color: '#E8A96A',
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

      {/* Amber progress bar below nav (only when visible + progressPct > 0) */}
      {progressPct > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 52,
            left: 0,
            right: 0,
            height: 2,
            zIndex: 49,
            backgroundColor: '#2A2A28',
            transform: visible ? 'translateY(0)' : 'translateY(-54px)',
            opacity: visible ? 1 : 0,
            transition: 'transform 0.2s ease, opacity 0.15s ease',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              backgroundColor: '#C77B3A',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      )}
    </>
  )
}
