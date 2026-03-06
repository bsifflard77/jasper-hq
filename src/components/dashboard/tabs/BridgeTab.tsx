'use client'

import { Badge } from '@/components/ui/badge'
import { useState, useEffect, useCallback } from 'react'
import { AgentCommandCenter } from '@/components/AgentCommandCenter'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BridgeTask {
  id: string
  title: string
  project: string
  projectName: string
  agentEmoji: string
  description: string
  lastUpdated: string
  lastUpdatedRelative: string
  status: string
  priority: string
  started?: string
  deadline?: string | null
}

interface StaleProject {
  project: string
  projectName: string
  lastActivity: string | null
  lastActivityRelative: string
}

interface ProjectStatusItem {
  id: string
  name: string
  lastActivity: string | null
  lastActivityRelative: string
  taskCount: number
  inProgressCount: number
  doneCount: number
  backlogCount: number
  status: 'active' | 'stale' | 'idle' | 'unknown'
}

interface BridgeData {
  needsBill: BridgeTask[]
  inProgress: BridgeTask[]
  completedRecently: BridgeTask[]
  stale: StaleProject[]
  projectStatus: ProjectStatusItem[]
  lastUpdated: string | null
  fetchedAt: string
  error?: string
}

// ─── Task Card ─────────────────────────────────────────────────────────────────

function TaskCard({ task, variant }: { task: BridgeTask; variant: 'needs-bill' | 'in-progress' | 'completed' }) {
  const borderColor = variant === 'needs-bill'
    ? 'border-red-500/30 bg-red-900/10'
    : variant === 'in-progress'
    ? 'border-amber-500/30 bg-amber-900/10'
    : 'border-emerald-500/30 bg-emerald-900/10'

  return (
    <div className={`rounded-lg border p-3 ${borderColor}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-white leading-tight">{task.title}</span>
        <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">{task.lastUpdatedRelative}</span>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300">{task.projectName}</span>
        <span className="text-sm">{task.agentEmoji}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
          task.priority === 'P1' ? 'bg-red-900/40 text-red-300' :
          task.priority === 'P2' ? 'bg-amber-900/40 text-amber-300' :
          'bg-slate-700/40 text-slate-400'
        }`}>{task.priority}</span>
      </div>
      <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>
    </div>
  )
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  emoji,
  title,
  count,
  color,
  children,
  emptyMsg,
}: {
  emoji: string
  title: string
  count: number
  color: 'red' | 'amber' | 'emerald' | 'orange'
  children?: React.ReactNode
  emptyMsg: string
}) {
  const headerColor = {
    red: 'border-red-500/40 bg-red-900/20',
    amber: 'border-amber-500/40 bg-amber-900/20',
    emerald: 'border-emerald-500/40 bg-emerald-900/20',
    orange: 'border-orange-500/40 bg-orange-900/20',
  }[color]

  const badgeColor = {
    red: 'bg-red-900/40 text-red-300 border-red-500/30',
    amber: 'bg-amber-900/40 text-amber-300 border-amber-500/30',
    emerald: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/30',
    orange: 'bg-orange-900/40 text-orange-300 border-orange-500/30',
  }[color]

  return (
    <div className={`rounded-xl border ${headerColor} flex flex-col`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <span className="text-lg">{emoji}</span>
        <h4 className="font-semibold text-white text-sm">{title}</h4>
        <Badge className={`ml-auto text-xs border ${badgeColor}`}>{count}</Badge>
      </div>
      <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-72">
        {count === 0 ? (
          <p className="text-xs text-slate-500 italic py-2 px-1">{emptyMsg}</p>
        ) : children}
      </div>
    </div>
  )
}

// ─── Captain's Bridge ─────────────────────────────────────────────────────────

function CaptainsBridge() {
  const [data, setData] = useState<BridgeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/bridge/status')
      const json = await res.json()
      setData(json)
      setLastFetch(new Date())
    } catch (err) {
      console.error('Bridge status fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000) // poll every 60s
    return () => clearInterval(interval)
  }, [fetchData])

  const statusDotColor = {
    active: 'bg-emerald-400',
    idle: 'bg-amber-400',
    stale: 'bg-red-400',
    unknown: 'bg-slate-500',
  }

  const statusLabel = {
    active: 'Active',
    idle: 'Idle',
    stale: 'Stale',
    unknown: '–',
  }

  return (
    <div className="space-y-5">
      {/* Captain's Bridge Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧭</span>
          <div>
            <h3 className="text-xl font-bold text-white">Captain&apos;s Bridge</h3>
            <p className="text-xs text-slate-400">Project Status Command Center</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastFetch && (
            <span className="text-xs text-slate-500">
              Updated {lastFetch.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
          )}
          <button
            onClick={fetchData}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-700/50 hover:border-slate-500/50 transition"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
            <span className="text-sm">Loading project status...</span>
          </div>
        </div>
      )}

      {!loading && data && (
        <>
          {/* 4-Section Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 🔴 NEEDS BILL */}
            <SectionCard
              emoji="🔴"
              title="NEEDS BILL"
              count={data.needsBill.length}
              color="red"
              emptyMsg="Nothing needs your attention right now."
            >
              {data.needsBill.map(task => (
                <TaskCard key={task.id} task={task} variant="needs-bill" />
              ))}
            </SectionCard>

            {/* 🟡 IN PROGRESS */}
            <SectionCard
              emoji="🟡"
              title="IN PROGRESS"
              count={data.inProgress.length}
              color="amber"
              emptyMsg="No tasks currently in progress."
            >
              {data.inProgress.map(task => (
                <TaskCard key={task.id} task={task} variant="in-progress" />
              ))}
            </SectionCard>

            {/* 🟢 COMPLETED RECENTLY */}
            <SectionCard
              emoji="🟢"
              title="COMPLETED RECENTLY"
              count={data.completedRecently.length}
              color="emerald"
              emptyMsg="No tasks completed in the last 7 days."
            >
              {data.completedRecently.map(task => (
                <TaskCard key={task.id} task={task} variant="completed" />
              ))}
            </SectionCard>

            {/* ⚠️ STALE */}
            <SectionCard
              emoji="⚠️"
              title="STALE PROJECTS"
              count={data.stale.length}
              color="orange"
              emptyMsg="All projects have recent activity."
            >
              {data.stale.map(item => (
                <div key={item.project} className="rounded-lg border border-orange-500/20 bg-orange-900/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{item.projectName}</span>
                    <span className="text-xs text-slate-500">{item.lastActivityRelative}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">No activity for 5+ days</p>
                </div>
              ))}
            </SectionCard>
          </div>

          {/* Per-Project Status Row */}
          <div className="border border-slate-700/40 bg-slate-800/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">📊</span>
              <h4 className="font-semibold text-white text-sm">All Projects</h4>
              <span className="text-xs text-slate-500 ml-auto">
                {data.projectStatus.filter(p => p.status === 'active').length} active ·{' '}
                {data.projectStatus.filter(p => p.status === 'stale').length} stale
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {data.projectStatus.map(proj => (
                <div
                  key={proj.id}
                  className={`rounded-lg border p-2.5 flex flex-col gap-1 ${
                    proj.status === 'active' ? 'border-emerald-500/25 bg-emerald-900/10' :
                    proj.status === 'stale' ? 'border-red-500/20 bg-red-900/5' :
                    'border-slate-700/40 bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotColor[proj.status]}`} />
                    <span className="text-xs font-medium text-white truncate">{proj.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">{proj.lastActivityRelative}</span>
                    {proj.inProgressCount > 0 && (
                      <span className="text-[10px] text-amber-400">{proj.inProgressCount} active</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${
                    proj.status === 'active' ? 'text-emerald-400' :
                    proj.status === 'stale' ? 'text-red-400' :
                    'text-slate-500'
                  }`}>{statusLabel[proj.status]}</span>
                </div>
              ))}
            </div>
          </div>

          {data.error && (
            <div className="text-xs text-red-400 px-2">⚠️ {data.error}</div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Quick Actions ─────────────────────────────────────────────────────────────

interface QuickAction {
  label: string
  desc: string
  command: string
  emoji: string
  style: 'default' | 'danger' | 'success'
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Restart Gateway', desc: 'Rebuild prompt cache', command: 'restart-gateway', emoji: '🔄', style: 'default' },
  { label: 'Fresh Session', desc: 'Start Jasper with clean context', command: 'fresh-session', emoji: '✨', style: 'success' },
  { label: 'Security Audit', desc: 'Run security scan now', command: 'security-audit', emoji: '🛡️', style: 'default' },
  { label: 'Backup Workspace', desc: 'Snapshot .md files + config', command: 'backup-workspace', emoji: '💾', style: 'default' },
  { label: 'Morning Briefing', desc: 'Run briefing cron now', command: 'run-briefing', emoji: '🌅', style: 'default' },
  { label: 'Email Triage', desc: 'Run triage cron now', command: 'run-triage', emoji: '📧', style: 'default' },
]

function QuickActionButton({ action }: { action: QuickAction }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const handleClick = async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: action.command }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus('done')
        setMsg('Queued!')
      } else {
        setStatus('error')
        setMsg('Failed')
      }
    } catch {
      setStatus('error')
      setMsg('Error')
    }
    setTimeout(() => { setStatus('idle'); setMsg('') }, 3000)
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === 'loading'}
      className={`flex flex-col items-start gap-1 p-3 rounded-lg border transition text-left w-full ${
        status === 'done' ? 'border-emerald-500/50 bg-emerald-900/20' :
        status === 'error' ? 'border-red-500/50 bg-red-900/20' :
        'border-slate-700/50 bg-slate-800/30 hover:bg-slate-700/40 hover:border-slate-600/50'
      } ${status === 'loading' ? 'opacity-60 cursor-wait' : ''}`}
    >
      <div className="flex items-center gap-2 w-full">
        <span>{status === 'loading' ? '⏳' : status === 'done' ? '✅' : status === 'error' ? '❌' : action.emoji}</span>
        <span className="text-sm font-medium text-white">{action.label}</span>
        {msg && <span className="text-xs text-emerald-300 ml-auto">{msg}</span>}
      </div>
      <span className="text-[11px] text-slate-500 pl-6">{action.desc}</span>
    </button>
  )
}

// ─── Cron Jobs & Models ────────────────────────────────────────────────────────

interface CronJob {
  name: string
  schedule: string
  lastRun: string
  nextRun: string
  status: 'ok' | 'running' | 'error' | 'pending'
  emoji: string
}

interface LocalModel {
  id: string
  name: string
  model: string
  role: string
  status: 'active' | 'idle' | 'offline'
  emoji: string
  assignment: string
}

const LOCAL_MODELS_BASE: Omit<LocalModel, 'status'>[] = [
  { id: 'llama3.3:70b', name: 'Llama 70B', model: 'Llama 3.3 70B · Q4_K_M · 42.5 GB', role: 'Senior Intern', emoji: '🏠', assignment: 'Heavy local processing & analysis' },
  { id: 'llama3.1:8b',  name: 'Llama 8B',  model: 'Llama 3.1 8B · Q4_K_M · 4.9 GB',   role: 'Junior Intern', emoji: '🏠', assignment: 'Quick tasks, triage & fast responses' },
]

const CRON_JOBS: CronJob[] = [
  { name: 'Morning Briefing', schedule: '5:00 AM EST daily', lastRun: 'Today 5:00 AM', nextRun: 'Tomorrow 5:00 AM', status: 'ok', emoji: '🌅' },
  { name: 'Email Triage — AM', schedule: '7:00 AM EST daily', lastRun: 'Today 7:00 AM', nextRun: 'Tomorrow 7:00 AM', status: 'ok', emoji: '📧' },
  { name: 'Idea Pipeline', schedule: '6:00 AM & 10:00 AM M-F', lastRun: 'Today 6:00 AM', nextRun: 'Tomorrow 6:00 AM', status: 'ok', emoji: '💡' },
  { name: 'Intel Briefing', schedule: '8:30 AM EST daily', lastRun: 'Today 8:30 AM', nextRun: 'Tomorrow 8:30 AM', status: 'ok', emoji: '🔍' },
  { name: 'Email Triage — Noon', schedule: '12:00 PM EST daily', lastRun: 'Today 12:00 PM', nextRun: 'Tomorrow 12:00 PM', status: 'ok', emoji: '📬' },
  { name: 'Email Triage — PM', schedule: '5:00 PM EST daily', lastRun: 'Today 5:00 PM', nextRun: 'Tomorrow 5:00 PM', status: 'ok', emoji: '📮' },
  { name: 'TVE Friday Research', schedule: '5:00 PM EST Fridays', lastRun: 'Not yet run', nextRun: 'Fri Feb 21 5:00 PM', status: 'pending', emoji: '📡' },
  { name: 'Security Audit', schedule: 'M/W/F morning', lastRun: 'Today', nextRun: 'Wednesday', status: 'ok', emoji: '🛡️' },
  { name: 'Context Collector', schedule: 'Every 15 min', lastRun: 'Recently', nextRun: 'In ~15 min', status: 'ok', emoji: '📊' },
]

function getStatusColor(status: string) {
  switch (status) {
    case 'active': case 'ok': return 'bg-emerald-500'
    case 'running': return 'bg-blue-500 animate-pulse'
    case 'idle': return 'bg-amber-500'
    case 'pending': return 'bg-slate-400'
    case 'error': return 'bg-red-500'
    case 'offline': return 'bg-slate-500'
    default: return 'bg-slate-500'
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'active': case 'ok': return 'bg-emerald-900/30 text-emerald-300 border-emerald-500/30'
    case 'running': return 'bg-blue-900/30 text-blue-300 border-blue-500/30'
    case 'idle': return 'bg-amber-900/30 text-amber-300 border-amber-500/30'
    case 'pending': return 'bg-slate-700/30 text-slate-400 border-slate-600/30'
    case 'error': return 'bg-red-900/30 text-red-300 border-red-500/30'
    case 'offline': return 'bg-slate-700/30 text-slate-400 border-slate-600/30'
    default: return 'bg-slate-700/30 text-slate-400 border-slate-600/30'
  }
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function BridgeTab() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [ollamaStatus, setOllamaStatus] = useState<'loading' | 'running' | 'down'>('loading')
  const [runningModels, setRunningModels] = useState<string[]>([])

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetch('/api/security')
      .then(r => r.json())
      .then(d => {
        const ollama = d?.data?.ollama
        if (ollama?.status === 'running') {
          setOllamaStatus('running')
          setRunningModels((ollama.models || []).map((m: { name: string }) => m.name))
        } else {
          setOllamaStatus('down')
        }
      })
      .catch(() => setOllamaStatus('down'))
  }, [])

  const LOCAL_MODELS: LocalModel[] = LOCAL_MODELS_BASE.map(m => ({
    ...m,
    status: ollamaStatus === 'loading' ? 'idle'
          : ollamaStatus === 'running' && runningModels.some(r => r.startsWith(m.id.split(':')[0]))
            ? 'active'
          : ollamaStatus === 'running' ? 'idle'
          : 'offline',
  }))

  const activeCrons = CRON_JOBS.filter(j => j.status === 'running').length
  const okCrons = CRON_JOBS.filter(j => j.status === 'ok').length

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧭</span>
          <div>
            <h2 className="text-2xl font-bold text-white">The Bridge</h2>
            <p className="text-sm text-slate-400">Captain&apos;s Command Center · Operations & Status</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-400">
            {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} EST
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-emerald-300">Gateway Live</span>
          </div>
        </div>
      </div>

      {/* ── Section 1: Agent Command Center ── */}
      <div className="border-2 border-emerald-500/50 bg-gradient-to-br from-slate-800/80 to-emerald-900/20 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/agents/jasper-avatar.png" alt="Jasper" className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500/60 shadow-lg shadow-emerald-500/20" />
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-white">Jasper Fidelis Monomoy</h3>
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-lg text-amber-300">Primary Agent — Command & Control</p>
              <p className="text-sm text-slate-400">Claude Sonnet 4.6 · Orchestrator · All Channels</p>
            </div>
          </div>
          <Badge className="border bg-emerald-900/30 text-emerald-300 border-emerald-500/30">ACTIVE</Badge>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-slate-900/50 rounded-lg">
            <span className="text-slate-400 text-xs">Role</span>
            <p className="text-white font-medium mt-1">Orchestrator</p>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-lg">
            <span className="text-slate-400 text-xs">Manages</span>
            <p className="text-emerald-300 font-medium mt-1">5 Agents</p>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-lg">
            <span className="text-slate-400 text-xs">Channel</span>
            <p className="text-white font-medium mt-1">Discord · Telegram</p>
          </div>
        </div>
      </div>

      <AgentCommandCenter />

      {/* ── Section 2: Captain's Bridge — Project Status ── */}
      <div className="border border-slate-700/40 bg-slate-800/20 rounded-xl p-6">
        <CaptainsBridge />
      </div>

      {/* ── Section 3: Local Fleet ── */}
      <div className="border border-slate-700/50 bg-slate-800/30 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🏠</span>
          <h3 className="font-semibold text-white text-base">Local Fleet (On-Device Models)</h3>
          <div className="ml-auto flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${ollamaStatus === 'running' ? 'bg-emerald-400' : ollamaStatus === 'down' ? 'bg-red-400' : 'bg-slate-500 animate-pulse'}`} />
            <span className="text-xs text-slate-500">
              {ollamaStatus === 'loading' ? 'Checking…' : ollamaStatus === 'running' ? 'Ollama running' : 'Ollama offline'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LOCAL_MODELS.map((model) => (
            <div key={model.id} className="border border-slate-700/50 bg-slate-800/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{model.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white">{model.name}</h4>
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(model.status)}`}></span>
                    </div>
                    <p className="text-xs text-slate-400">{model.model}</p>
                  </div>
                </div>
                <Badge className={`text-xs border ${
                  model.role === 'Senior Intern'
                    ? 'bg-blue-900/20 text-blue-300 border-blue-500/30'
                    : 'bg-slate-700/30 text-slate-400 border-slate-600/30'
                }`}>
                  {model.role}
                </Badge>
              </div>
              <p className="text-sm text-slate-400">{model.assignment}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-3">* Board of Directors (CSO/COO/CRO/CPO) are cloud-based — managed via the AI Board tab</p>
      </div>

      {/* ── Section 4: Infrastructure Overview ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Cron Jobs', value: `${okCrons + activeCrons}/${CRON_JOBS.length}`, sub: 'running OK', color: 'emerald' },
          { label: 'Gateway', value: 'Active', sub: 'Monomoy-1', color: 'blue' },
          { label: 'Local Models', value: LOCAL_MODELS.filter(m => m.status !== 'offline').length.toString(), sub: 'available', color: 'amber' },
          { label: 'Platform', value: 'Win 11', sub: 'Monomoy-1 · RTX 5090', color: 'slate' },
        ].map((item) => (
          <div key={item.label} className={`border rounded-lg p-4 text-center ${
            item.color === 'emerald' ? 'border-emerald-500/30 bg-emerald-900/10' :
            item.color === 'blue' ? 'border-blue-500/30 bg-blue-900/10' :
            item.color === 'amber' ? 'border-amber-500/30 bg-amber-900/10' :
            'border-slate-700/50 bg-slate-800/30'
          }`}>
            <div className={`text-2xl font-bold ${
              item.color === 'emerald' ? 'text-emerald-300' :
              item.color === 'blue' ? 'text-blue-300' :
              item.color === 'amber' ? 'text-amber-300' :
              'text-white'
            }`}>{item.value}</div>
            <div className="text-xs text-slate-400 mt-1">{item.label}</div>
            <div className="text-[10px] text-slate-600 mt-0.5">{item.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Section 5: Quick Actions ── */}
      <div className="border border-slate-700/50 bg-slate-800/30 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">⚡</span>
          <h3 className="font-semibold text-white text-base">Quick Actions</h3>
          <span className="text-xs text-slate-500 ml-auto">Commands queue for Jasper to execute</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionButton key={action.command} action={action} />
          ))}
        </div>
      </div>

      {/* ── Section 6: Automated Workflows ── */}
      <div className="border border-slate-700/50 bg-slate-800/50 backdrop-blur rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">⏰</span>
          <h3 className="font-semibold text-white text-base">Automated Workflows</h3>
          <span className="text-xs text-slate-500 ml-auto">{okCrons} jobs healthy</span>
        </div>
        <div className="space-y-2">
          {CRON_JOBS.map((job) => (
            <div key={job.name} className="flex items-center gap-3 p-3 bg-slate-700/20 rounded-lg border border-slate-600/10">
              <span className="text-base w-6">{job.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white">{job.name}</p>
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(job.status)}`}></span>
                </div>
                <p className="text-[11px] text-slate-400">{job.schedule}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-500">Next: {job.nextRun}</p>
              </div>
              <Badge className={`text-[10px] border shrink-0 ${getStatusBadgeClass(job.status)}`}>
                {job.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
