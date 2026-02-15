'use client'

import { LiveStatusWidget } from '@/components/dashboard/LiveStatusWidget'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'

interface DashboardTabProps {
  data: {
    status?: any
    tasks?: any[]
    activities?: any[]
    _meta?: any
  }
}

export function DashboardTab({ data }: DashboardTabProps) {
  const activeTasks = data?.tasks?.filter((t: any) => t.status === 'in_progress') || []

  return (
    <div className="space-y-6">
      {/* Top Row — 3 Equal Sections: Jasper | System | Today */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jasper */}
        <LiveStatusWidget
          model={data?.status?.model || 'Claude Opus 4.6'}
          channel={data?.status?.channel || 'discord'}
          currentTask={data?.status?.currentTask}
          status={data?.status?.status || 'working'}
        />

        {/* System */}
        <div className="border border-slate-700/50 bg-slate-800/50 backdrop-blur rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">⚡</span>
            <h4 className="font-semibold text-white text-base">System</h4>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">API</span>
              <span className="text-emerald-300">● Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tasks</span>
              <span className="text-white">{data?._meta?.counts?.tasks ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Projects</span>
              <span className="text-white">{data?._meta?.counts?.projects ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Docs</span>
              <span className="text-white">{data?._meta?.counts?.documents ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Activities</span>
              <span className="text-white">{data?._meta?.counts?.activities ?? '—'}</span>
            </div>
            {data?._meta?.fetchedAt && (
              <div className="pt-2 border-t border-slate-700/50 text-[10px] text-slate-500">
                Last sync: {new Date(data._meta.fetchedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Today */}
        <div className="border border-emerald-500/30 bg-emerald-900/10 backdrop-blur rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">📊</span>
            <h4 className="font-semibold text-emerald-300 text-base">Today</h4>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Activities</span>
              <span className="text-3xl font-bold text-white">{data?._meta?.counts?.activities || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tasks Active</span>
              <span className="text-white">{activeTasks.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tasks Total</span>
              <span className="text-white">{data?._meta?.counts?.tasks ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Projects</span>
              <span className="text-white">{data?._meta?.counts?.projects ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row — 3 Equal Sections: Workflows | Active | Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflows */}
        <div className="border border-slate-700/50 bg-slate-800/50 backdrop-blur rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">⚙️</span>
            <h4 className="font-semibold text-white text-base">Workflows</h4>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/20">
              <p className="text-white text-sm font-medium">📰 Morning Briefing</p>
              <p className="text-xs text-slate-400 mt-1">5:00 AM EST daily</p>
            </div>
            <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/20">
              <p className="text-white text-sm font-medium">📧 Email Triage (3x)</p>
              <p className="text-xs text-slate-400 mt-1">5AM / 12PM / 6PM</p>
            </div>
            <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/20">
              <p className="text-white text-sm font-medium">💡 Ideas Generation</p>
              <p className="text-xs text-slate-400 mt-1">4:50 AM EST daily</p>
            </div>
          </div>
        </div>

        {/* Active */}
        <div className="border border-amber-500/30 bg-amber-900/10 backdrop-blur rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🎯</span>
            <h4 className="font-semibold text-amber-300 text-base">Active</h4>
          </div>
          {activeTasks.length > 0 ? (
            <div className="space-y-3">
              {activeTasks.slice(0, 5).map((task: any, i: number) => (
                <div key={task.id || i} className="p-3 bg-slate-700/30 rounded-lg border border-amber-500/10">
                  <p className="text-white text-sm font-medium">{task.title || task.name}</p>
                  {task.project && (
                    <p className="text-xs text-slate-400 mt-1">{task.project}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-3xl font-bold text-white">{data?._meta?.counts?.tasks || 0}</p>
              <p className="text-sm text-slate-400 mt-2">Tasks in pipeline</p>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="border border-slate-700/50 bg-slate-800/50 backdrop-blur rounded-lg overflow-hidden">
          <div className="p-5 pb-0">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📋</span>
              <h4 className="font-semibold text-white text-base">Activity Feed</h4>
            </div>
          </div>
          <div className="px-5 pb-5">
            <ActivityFeed activities={data?.activities || []} limit={8} />
          </div>
        </div>
      </div>
    </div>
  )
}
