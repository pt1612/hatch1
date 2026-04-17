'use client'

import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { CheckCircle2, Clock, ChevronRight } from 'lucide-react'

type OppWithStatus = {
  id: string
  name: string
  customer_segment: string
  application: string
  isEvaluated: boolean
}

export default function EvaluationsClient({
  project,
  opportunities,
}: {
  project: { id: string; title: string }
  opportunities: OppWithStatus[]
}) {
  const evaluatedCount = opportunities.filter((o) => o.isEvaluated).length
  const total = opportunities.length
  const progressPct = total > 0 ? Math.round((evaluatedCount / total) * 100) : 0

  return (
    <div className="flex min-h-screen">
      <Sidebar projectId={project.id} projectTitle={project.title} />

      <div className="ml-60 flex-1 overflow-auto p-8">
        <div className="max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-gray-900">Evaluation</h1>
            <span className="text-sm font-semibold text-[#0D6E6E]">
              {evaluatedCount}/{total} evaluated
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            Evaluate each opportunity across 6 dimensions to build your attractiveness map.
          </p>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-[#0D6E6E] rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Opportunity list */}
          {opportunities.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">No opportunities found.</p>
              <Link
                href={`/project/${project.id}/abilities`}
                className="text-xs text-[#0D6E6E] hover:underline mt-1 block"
              >
                Go to abilities chat to generate opportunities
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4"
                >
                  {opp.isEvaluated ? (
                    <CheckCircle2 size={18} className="text-[#0D6E6E] flex-shrink-0" />
                  ) : (
                    <Clock size={18} className="text-gray-300 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{opp.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {opp.customer_segment} · {opp.application}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        opp.isEvaluated
                          ? 'bg-[#0D6E6E]/10 text-[#0D6E6E]'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {opp.isEvaluated ? 'Evaluated' : 'Pending'}
                    </span>
                    {opp.isEvaluated ? (
                      <Link
                        href={`/project/${project.id}/opportunity/${opp.id}/report`}
                        className="flex items-center gap-1 text-xs font-semibold text-[#0D6E6E] hover:underline"
                      >
                        View report
                        <ChevronRight size={12} />
                      </Link>
                    ) : (
                      <Link
                        href={`/project/${project.id}/opportunity/${opp.id}/context`}
                        className="flex items-center gap-1 bg-[#0D6E6E] text-white py-1.5 px-3 rounded-lg text-xs font-semibold hover:bg-[#0a5555] transition-colors"
                      >
                        Evaluate
                        <ChevronRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA when all evaluated */}
          {evaluatedCount > 0 && evaluatedCount === total && (
            <div className="mt-6">
              <Link
                href={`/project/${project.id}/map`}
                className="flex items-center justify-center gap-2 w-full bg-[#0D6E6E] text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-[#0a5555] transition-colors"
              >
                View attractiveness map
                <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
