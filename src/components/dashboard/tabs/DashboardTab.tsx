'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

// Three.js orb — client-side only
const JasperOrb = dynamic(
  () => import('@/components/dashboard/JasperOrb').then(m => m.JasperOrb),
  { ssr: false, loading: () => <OrbPlaceholder /> }
)

function OrbPlaceholder() {
  return (
    <div className="w-[280px] h-[280px] flex items-center justify-center rounded-full border border-emerald-500/20">
      <div className="w-24 h-24 rounded-full border border-emerald-500/30 animate-pulse" />
    </div>
  )
}

interface UsageData {
  today: { messages: number; tokens: number; cost: number }
  month: { messages: number; tokens: number; cost: number }
}

interface AgentTask {
  id: string
  title: string
  status: string
  priority: string
  agent: string | null
  tags: string[] | null
}

// ── Scan line animation overlay ──
function ScanLine() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl opacity-[0.03]">
      <div
        className="absolute w-full h-0.5 bg-emerald-400"
        style={{ animation: 'scanline 4s linear infinite' }}
      />
      <style>{`@keyframes scanline { 0%{top:-2px} 100%{top:100%} }`}</style>
    </div>
  )
}

// ── Metric card ──
function MetricCard({ label, value, sub, accent = 'emerald' }: { label: string; value: string; sub?: string; accent?: string }) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400 border-emerald-500/20 bg-emerald-900/10',
    amber: 'text-amber-400 border-amber-500/20 bg-amber-900/10',
    blue: 'text-blue-400 border-blue-500/20 bg-blue-900/10',
    red: 'text-red-400 border-red-500/20 bg-red-900/10',
    slate: 'text-slate-300 border-slate-600/30 bg-slate-800/30',
  }
  return (
    <div className={`relative rounded-lg border p-3 flex flex-col gap-1 overflow-hidden ${colors[accent]}`}>
      <ScanLine />
      <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">{label}</span>
      <span className={`text-xl font-bold font-mono ${accent === 'emerald' ? 'text-emerald-300' : accent === 'amber' ? 'text-amber-300' : accent === 'blue' ? 'text-blue-300' : accent === 'red' ? 'text-red-300' : 'text-white'}`}>{value}</span>
      {sub && <span className="text-[10px] text-slate-500">{sub}</span>}
    </div>
  )
}

// ── Task item ──
function TaskItem({ task }: { task: AgentTask }) {
  const priorityColor: Record<string, string> = {
    high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-slate-500',
  }
  const statusIcon: Record<string, string> = {
    in_progress: '▶', todo: '○', completed: '✓', blocked: '✗',
  }
  const agentEmoji: Record<string, string> = {
    beacon: '📡', navigator: '🔭', rigger: '⚙️', dev: '💻', fort: '🏰',
  }
  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border transition-all ${
      task.status === 'in_progress' ? 'border-emerald-500/30 bg-emerald-900/10' :
      task.status === 'blocked' ? 'border-red-500/20 bg-red-900/5' :
      'border-slate-700/40 bg-slate-800/20'
    }`}>
      <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${priorityColor[task.priority] ?? 'bg-slate-500'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-snug truncate ${task.status === 'completed' ? 'text-slate-600 line-through' : 'text-slate-200'}`}>{task.title}</p>
        {task.agent && (
          <span className="text-[9px] text-slate-600">{agentEmoji[task.agent] ?? '🤖'} {task.agent}</span>
        )}
      </div>
      <span className={`text-[11px] shrink-0 ${task.status === 'in_progress' ? 'text-emerald-400' : task.status === 'blocked' ? 'text-red-400' : 'text-slate-600'}`}>
        {statusIcon[task.status] ?? '○'}
      </span>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

// ── Main Dashboard ──
export function DashboardTab() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [contextPct, setContextPct] = useState<number | null>(null)
  const [cronCount, setCronCount] = useState<number | null>(null)
  const [time, setTime] = useState('')
  const [agentStatuses, setAgentStatuses] = useState<{id:string; status:'active'|'queued'|'idle'|'blocked'}[]>([])

  // Live clock
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])

  // Usage data
  useEffect(() => {
    fetch('/api/dashboard/usage').then(r => r.json()).then(setUsage).catch(() => {})
  }, [])

  // Tasks + derive agent statuses
  useEffect(() => {
    fetch('/api/tasks/today').then(r => r.json()).then(d => {
      if (d.tasks) {
        setTasks(d.tasks)
        // Derive per-agent status from tasks
        const agentMap: Record<string, 'active'|'queued'|'idle'|'blocked'> = {}
        for (const t of d.tasks as AgentTask[]) {
          if (!t.agent) continue
          const cur = agentMap[t.agent]
          const next = t.status === 'in_progress' ? 'active' : t.status === 'blocked' ? 'blocked' : 'queued'
          // Higher priority status wins: active > blocked > queued > idle
          const rank = (s: string) => s==='active'?3:s==='blocked'?2:s==='queued'?1:0
          if (!cur || rank(next) > rank(cur)) agentMap[t.agent] = next
        }
        setAgentStatuses(
          ['beacon','navigator','rigger','dev','fort'].map(id => ({
            id, status: agentMap[id] ?? 'idle'
          }))
        )
      }
    }).catch(() => {})
  }, [])

  // Context % from jasper-status.json via security API
  useEffect(() => {
    fetch('/api/security').then(r => r.json()).then(d => {
      if (d?.data?.jasperStatus?.contextPct != null) setContextPct(d.data.jasperStatus.contextPct)
      if (d?.data?.cronJobs != null) setCronCount(d.data.cronJobs)
    }).catch(() => {})
  }, [])

  const fmtTokens = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : `${n}`
  const fmtCost = (n: number) => `$${n.toFixed(2)}`

  const activeTasks = tasks.filter(t => t.status === 'in_progress')
  const pendingTasks = tasks.filter(t => t.status === 'todo')
  const completedToday = tasks.filter(t => t.status === 'completed')

  return (
    <div
      className="min-h-screen relative"
      style={{ background: 'linear-gradient(135deg, #060a0e 0%, #080d12 50%, #060b0f 100%)' }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 p-6 space-y-6">

        {/* ── Row 1: System + Orb + Tasks ── */}
        <div className="grid grid-cols-12 gap-5 items-start">

          {/* LEFT: System Status */}
          <div className="col-span-4 space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/50 to-transparent" />
              <span className="text-[10px] font-mono tracking-widest text-emerald-500 uppercase">System Status</span>
              <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/50 to-transparent" />
            </div>

            <MetricCard
              label="Context Window"
              value={contextPct != null ? `${contextPct}%` : '—'}
              sub="Active session memory usage"
              accent={contextPct != null && contextPct > 80 ? 'red' : contextPct != null && contextPct > 60 ? 'amber' : 'emerald'}
            />
            <MetricCard
              label="Active Cron Jobs"
              value={cronCount != null ? `${cronCount}` : '—'}
              sub="Scheduled background tasks"
              accent="blue"
            />
            <MetricCard
              label="Agent Fleet"
              value="5"
              sub="Beacon · Navigator · Rigger · Forge · Anchor"
              accent="emerald"
            />
            <MetricCard
              label="Memory Vectors"
              value="1,224"
              sub="Embedded knowledge chunks"
              accent="slate"
            />

            {/* LLM Usage block */}
            <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-3 space-y-3 relative overflow-hidden">
              <ScanLine />
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-amber-500/40 to-transparent" />
                <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase">LLM Usage</span>
                <div className="h-px flex-1 bg-gradient-to-l from-amber-500/40 to-transparent" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[9px] text-slate-600 uppercase tracking-wider">Today</p>
                  <p className="text-sm font-bold font-mono text-white">{usage ? fmtTokens(usage.today.tokens) : '—'}</p>
                  <p className="text-[9px] text-slate-600">tokens</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-600 uppercase tracking-wider">Month</p>
                  <p className="text-sm font-bold font-mono text-amber-300">{usage ? fmtTokens(usage.month.tokens) : '—'}</p>
                  <p className="text-[9px] text-slate-600">tokens</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-600 uppercase tracking-wider">Est. Cost</p>
                  <p className="text-sm font-bold font-mono text-emerald-300">{usage ? fmtCost(usage.month.cost) : '—'}</p>
                  <p className="text-[9px] text-slate-600">this month</p>
                </div>
              </div>
            </div>
          </div>

          {/* CENTER: Orb + Identity */}
          <div className="col-span-4 flex flex-col items-center justify-center gap-4 py-4">
            <div className="text-center space-y-1 mb-2">
              <p className="text-[10px] font-mono tracking-[0.3em] text-emerald-500 uppercase">{getGreeting()},</p>
              <p className="text-2xl font-bold text-white tracking-wide">Bill</p>
            </div>

            {/* 3D Orb */}
            <div className="relative">
              <JasperOrb size={220} agentStatuses={agentStatuses} />
              {/* Orb reflection */}
              <div
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-36 h-4 rounded-full opacity-20"
                style={{ background: 'radial-gradient(ellipse, #10b981 0%, transparent 70%)', filter: 'blur(6px)' }}
              />
            </div>

            <div className="text-center space-y-1 mt-2">
              <p className="text-base font-bold text-white tracking-widest font-mono">JASPER</p>
              <p className="text-[10px] text-slate-500 tracking-[0.2em] font-mono">FIDELIS MONOMOY</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-400 tracking-widest">CORE SYSTEM ACTIVE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[9px] text-slate-600 font-mono mt-1">JASPER OS v3.0 · MONOMOY STRATEGIES</p>
            </div>
          </div>

          {/* RIGHT: Tasks */}
          <div className="col-span-4 space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/50 to-transparent" />
              <span className="text-[10px] font-mono tracking-widest text-emerald-500 uppercase">Today&apos;s Tasks</span>
              <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/50 to-transparent" />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Active', value: activeTasks.length, color: 'text-emerald-400' },
                { label: 'Pending', value: pendingTasks.length, color: 'text-amber-400' },
                { label: 'Done', value: completedToday.length, color: 'text-slate-400' },
              ].map(s => (
                <div key={s.label} className="rounded-lg border border-slate-700/40 bg-slate-900/40 py-2">
                  <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] text-slate-600 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Task list */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {activeTasks.length === 0 && pendingTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-600 font-mono text-xs">
                  <p>NO ACTIVE TASKS</p>
                  <p className="text-[10px] mt-1 text-slate-700">All systems nominal</p>
                </div>
              ) : (
                <>
                  {activeTasks.map(t => <TaskItem key={t.id} task={t} />)}
                  {pendingTasks.slice(0, 6).map(t => <TaskItem key={t.id} task={t} />)}
                </>
              )}
            </div>

            {/* Footer status */}
            <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-600">STATUS: OPERATIONAL</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-mono text-slate-500">SECURE CONNECTION</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Quick metrics footer ── */}
        <div className="border-t border-emerald-500/10 pt-5">
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: 'Model', value: 'Sonnet 4.6', accent: 'slate' },
              { label: "Today's Chats", value: usage ? `${usage.today.messages}` : '—', accent: 'emerald' },
              { label: 'Month Chats', value: usage ? `${usage.month.messages}` : '—', accent: 'blue' },
              { label: 'Ollama', value: 'llama3.3:70b', accent: 'slate' },
              { label: 'Platform', value: 'Monomoy-1', accent: 'slate' },
              { label: 'Build', value: 'v3.0', accent: 'emerald' },
            ].map(m => (
              <MetricCard key={m.label} label={m.label} value={m.value} accent={m.accent} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
