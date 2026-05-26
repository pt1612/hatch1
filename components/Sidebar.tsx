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
      supabase.auth.getUser().then(({ data }: { data: { user: { email?: string | null } | null } }) => {
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
      const oppIds = opps.map((o: { id: string }) => o.id)
      const { data: evals } = await supabase
        .from('evaluations')
        .select('opportunity_id')
        .in('opportunity_id', oppIds)
        .not('report', 'is', null)
      const uniqueEvaluated = new Set(evals?.map((e: { opportunity_id: string }) => e.opportunity_id) ?? [])
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

  function dotStatus(href: string): 'done' | 'active' | 'todo' {
    if (isActive(href)) return 'active'
    return 'todo'
  }

  function ProgressDot({ status }: { status: 'done' | 'active' | 'todo' }) {
    const cls =
      status === 'done'
        ? 'bg-[var(--color-aruba-blue)]'
        : status === 'active'
        ? 'bg-[var(--color-primary)]'
        : 'bg-white/20'
    return (
      <span className={`flex-shrink-0 inline-block w-1.5 h-1.5 rounded-full ${cls}`} />
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
        className={[
          'flex items-center gap-2 px-2.5 py-[7px] rounded-lg transition-colors text-[13px]',
          active
            ? 'bg-white/10 text-[var(--color-aruba-blue)]'
            : 'text-white/60 hover:bg-white/5 hover:text-white/90',
        ].join(' ')}
      >
        <span className="w-4 h-4 flex-shrink-0 opacity-80">{icon}</span>
        <span className="flex-1">{label}</span>
        {badge && (
          <span
            className={[
              'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
              active
                ? 'bg-[var(--color-aruba-blue)]/20 text-[var(--color-aruba-blue)]'
                : 'bg-white/10 text-white/50',
            ].join(' ')}
          >
            {badge}
          </span>
        )}
        <ProgressDot status={dotStatus(href)} />
      </Link>
    )
  }

  const sectionLabel = (text: string) => (
    <p className="px-2.5 mt-5 mb-1 text-[10px] tracking-[0.1em] uppercase text-white/40 font-medium">
      {text}
    </p>
  )

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col z-30 bg-[var(--color-surface-dark)] text-[var(--color-primary-foreground)]">
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
          <span className="font-bold text-[18px] tracking-[-0.01em] text-[var(--color-wispy-clouds)]">
            Hatch
          </span>
        </Link>
        {projectTitle && (
          <p className="mt-2 truncate pl-0.5 text-[11px] text-white/40">
            {projectTitle}
          </p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 scrollbar-thin">
        {navLink('/dashboard', 'Dashboard', <LayoutDashboard size={16} />)}

        {projectId && (
          <>
            <div className="my-3 border-t border-white/10" />

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
      <div className="px-4 py-4 border-t border-white/10">
        {email && (
          <p className="truncate mb-2 text-[11px] text-white/40 tracking-[0.01em]">
            {email}
          </p>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-[12px] text-white/40 hover:text-white/80 transition-colors tracking-[0.01em]"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
