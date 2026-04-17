'use client'

import { useEffect, useState } from 'react'
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
  Users,
  MessageSquare,
  BarChart2,
  Layers,
  LayoutTemplate,
  Settings,
  HelpCircle,
  LogOut,
  Plus,
} from 'lucide-react'

interface SidebarProps {
  projectId?: string
  projectTitle?: string
  primaryOpportunityId?: string
  primaryOpportunityName?: string
  hasTwinInterviews?: boolean
}

export default function Sidebar({
  projectId,
  projectTitle,
  primaryOpportunityId,
  primaryOpportunityName,
  hasTwinInterviews = false,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [evalCount, setEvalCount] = useState<{ evaluated: number; total: number } | null>(null)

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

  function navLink(href: string, label: string, icon: React.ReactNode, badge?: string, activeOverride?: boolean) {
    const active = activeOverride !== undefined ? activeOverride : isActive(href)
    return (
      <Link
        href={href}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
          active
            ? 'bg-[#0D6E6E] text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <span className="w-4 h-4 flex-shrink-0">{icon}</span>
        <span className="flex-1">{label}</span>
        {badge && (
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              active ? 'bg-white/20 text-white' : 'bg-[#0D6E6E]/10 text-[#0D6E6E]'
            }`}
          >
            {badge}
          </span>
        )}
      </Link>
    )
  }

  const sectionLabel = (text: string) => (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-3 mt-5 mb-1">
      {text}
    </p>
  )

  const divider = <div className="border-t border-gray-100 my-3" />

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-gray-200 flex flex-col z-30">
      {/* Logo + project title */}
      <div className="p-4 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 bg-[#0D6E6E] rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">H</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">Hatch</span>
        </Link>
        {projectTitle && (
          <p className="text-xs text-gray-400 truncate pl-0.5">{projectTitle}</p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {/* Dashboard */}
        {navLink('/dashboard', 'Dashboard', <LayoutDashboard size={16} />)}

        {projectId && (
          <>
            {divider}

            {/* Section 1: WHERE TO PLAY */}
            {sectionLabel('Where to Play')}

            {navLink(
              `/project/${projectId}/abilities`,
              'Core Abilities',
              <Lightbulb size={16} />
            )}
            {navLink(
              `/project/${projectId}/opportunities`,
              'Opportunities',
              <Target size={16} />
            )}
            {navLink(
              `/project/${projectId}/evaluations`,
              'Evaluation',
              <CheckSquare size={16} />,
              evalCount ? `${evalCount.evaluated}/${evalCount.total}` : undefined
            )}
            {navLink(
              `/project/${projectId}/map`,
              'Attractiveness Map',
              <Map size={16} />
            )}
            {navLink(
              `/project/${projectId}/strategy`,
              'Strategic Prioritization',
              <Compass size={16} />
            )}

            {/* Section 2: TWIN VALIDATION */}
            <>
              {divider}
              {sectionLabel('Twin Validation')}
              {primaryOpportunityName && (
                <p className="text-[10px] text-gray-400 px-3 mb-1 truncate italic">
                  {primaryOpportunityName}
                </p>
              )}
              {navLink(
                primaryOpportunityId
                  ? `/project/${projectId}/opportunity/${primaryOpportunityId}/twins/setup`
                  : `/project/${projectId}/strategy`,
                'Twin Setup',
                <Users size={16} />,
                undefined,
                primaryOpportunityId ? undefined : false
              )}
              {navLink(
                primaryOpportunityId
                  ? `/project/${projectId}/opportunity/${primaryOpportunityId}/twins/interview`
                  : `/project/${projectId}/strategy`,
                'Twin Interviews',
                <MessageSquare size={16} />,
                undefined,
                primaryOpportunityId ? undefined : false
              )}
              {navLink(
                primaryOpportunityId
                  ? `/project/${projectId}/opportunity/${primaryOpportunityId}/twins/results`
                  : `/project/${projectId}/strategy`,
                'Twin Results',
                <BarChart2 size={16} />,
                undefined,
                primaryOpportunityId ? undefined : false
              )}
            </>

            {/* Section 3: VALUE PROPOSITION */}
            <>
              {divider}
              {sectionLabel('Value Proposition')}
              {navLink(
                primaryOpportunityId
                  ? `/project/${projectId}/opportunity/${primaryOpportunityId}/vpc`
                  : `/project/${projectId}/strategy`,
                'VPC Canvas',
                <Layers size={16} />,
                undefined,
                primaryOpportunityId ? undefined : false
              )}
            </>

            {/* Section 4: BUSINESS MODEL */}
            <>
              {divider}
              {sectionLabel('Business Model')}
              {navLink(
                primaryOpportunityId
                  ? `/project/${projectId}/opportunity/${primaryOpportunityId}/bmc`
                  : `/project/${projectId}/strategy`,
                'Business Model Canvas',
                <LayoutTemplate size={16} />,
                undefined,
                primaryOpportunityId ? undefined : false
              )}
            </>
          </>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-gray-100 space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Plus size={16} className="flex-shrink-0" />
          <span>New Project</span>
        </Link>
        <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
          <Settings size={16} className="flex-shrink-0" />
          <span>Settings</span>
        </button>
        <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
          <HelpCircle size={16} className="flex-shrink-0" />
          <span>Help</span>
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <LogOut size={16} className="flex-shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
