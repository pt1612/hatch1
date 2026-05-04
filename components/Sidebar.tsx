'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Lightbulb,
  Target,
  CheckSquare,
  Map,
  Compass,
  LogOut,
} from 'lucide-react'

interface SidebarProps {
  projectId?: string
  projectTitle?: string
  userEmail?: string
}

export default function Sidebar({ projectId, projectTitle, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [evalCount, setEvalCount] = useState<{ evaluated: number; total: number } | null>(null)
  const [email, setEmail] = useState(userEmail ?? '')

  useEffect(() => {
    if (!userEmail) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email) setEmail(data.user.email)
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!projectId) return
    async function fetchEvalCount() {
      const { data: opps } = await supabase
        .from('opportunities')
        .select('id')
        .eq('project_id', projectId)
      if (!opps?.length) {
        setEvalCount({ evaluated: 0, total: 0 })
        return
      }
      const oppIds = opps.map((o) => o.id)
      const { data: evals } = await supabase
        .from('evaluations')
        .select('opportunity_id')
        .in('opportunity_id', oppIds)
        .not('report', 'is', null)
      const uniqueEvaluated = new Set(evals?.map((e) => e.opportunity_id) ?? [])
      setEvalCount({ evaluated: uniqueEvaluated.size, total: opps.length })
    }
    fetchEvalCount()
  }, [projectId, pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Progress dot status for each nav item
  function dotStatus(href: string): 'done' | 'active' | 'todo' {
    if (isActive(href)) return 'active'
    return 'todo'
  }

  function ProgressDot({ status }: { status: 'done' | 'active' | 'todo' }) {
    const color =
      status === 'done'
        ? '#4CAF7D'
        : status === 'active'
        ? '#E8A96A'
        : '#3A3A38'
    return (
      <span
        className="flex-shrink-0"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: color,
          display: 'inline-block',
        }}
      />
    )
  }

  function navLink(
    href: string,
    label: string,
    icon: React.ReactNode,
    badge?: string,
    activeOverride?: boolean
  ) {
    const active = activeOverride !== undefined ? activeOverride : isActive(href)
    return (
      <Link
        href={href}
        className="flex items-center gap-2 px-2.5 py-[7px] rounded-lg transition-colors"
        style={{
          background: active ? 'rgba(199,123,58,0.15)' : 'transparent',
          color: active ? '#E8A96A' : '#A8A89E',
          fontSize: 13,
          letterSpacing: '0.01em',
        }}
        onMouseEnter={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
        }}
        onMouseLeave={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
        }}
      >
        <span className="w-4 h-4 flex-shrink-0 opacity-70">{icon}</span>
        <span className="flex-1">{label}</span>
        {badge && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              background: active ? 'rgba(232,169,106,0.2)' : 'rgba(255,255,255,0.08)',
              color: active ? '#E8A96A' : '#666660',
            }}
          >
            {badge}
          </span>
        )}
        <ProgressDot status={dotStatus(href)} />
      </Link>
    )
  }

  const sectionLabel = (text: string) => (
    <p
      className="px-2.5 mt-5 mb-1"
      style={{
        fontSize: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#666660',
        fontWeight: 500,
      }}
    >
      {text}
    </p>
  )

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-60 flex flex-col z-30"
      style={{ backgroundColor: '#1A1A18' }}
    >
      {/* Logo area */}
      <div className="px-4 pt-5 pb-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image
            src="/hatch_logo.svg"
            alt="Hatch"
            width={32}
            height={32}
            style={{ height: 32, width: 'auto' }}
          />
          <span
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontWeight: 400,
              fontSize: 18,
              color: '#FAFAF8',
              letterSpacing: '-0.01em',
            }}
          >
            Hatch
          </span>
        </Link>
        {projectTitle && (
          <p
            className="mt-2 truncate pl-0.5"
            style={{ fontSize: 11, color: '#666660' }}
          >
            {projectTitle}
          </p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 scrollbar-thin">
        {navLink('/dashboard', 'Dashboard', <LayoutDashboard size={16} />)}

        {projectId && (
          <>
            <div
              className="my-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            />

            {sectionLabel('Where to Play')}
            {navLink(`/project/${projectId}/abilities`, 'Core Abilities', <Lightbulb size={16} />)}
            {navLink(`/project/${projectId}/opportunities`, 'Opportunities', <Target size={16} />)}
            {navLink(
              `/project/${projectId}/evaluations`,
              'Evaluation',
              <CheckSquare size={16} />,
              evalCount ? `${evalCount.evaluated}/${evalCount.total}` : undefined
            )}
            {navLink(`/project/${projectId}/map`, 'Attractiveness Map', <Map size={16} />)}
            {navLink(`/project/${projectId}/strategy`, 'Strategic Prioritization', <Compass size={16} />)}
          </>
        )}
      </nav>

      {/* Bottom */}
      <div
        className="px-4 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {email && (
          <p
            className="truncate mb-2"
            style={{ fontSize: 11, color: '#666660', letterSpacing: '0.01em' }}
          >
            {email}
          </p>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 transition-colors"
          style={{ fontSize: 12, color: '#666660', letterSpacing: '0.01em' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#A8A89E')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#666660')}
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
