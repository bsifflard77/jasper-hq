'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ── Agent Definitions ──────────────────────────────────────────────────────────

interface AgentDef {
  id: string
  name: string
  emoji: string
  role: string
  title: string
  roomLabel: string
  roomImage: string
  owns: string[]
  color: string
  borderColor: string
  borderColorHex: string
  textColor: string
  bgColor: string
  glowColor: string
}

const AGENTS: AgentDef[] = [
  {
    id: 'beacon',
    name: 'BEACON',
    emoji: '📡',
    role: 'Content Creation',
    title: 'Content & Brand Strategist',
    roomLabel: 'CONTENT STUDIO',
    roomImage: '/agents/beacon-room.png',
    owns: ['Blog & social content', 'Newsletter drafts', 'TVE & Monomoy copy'],
    color: 'amber',
    borderColor: 'border-amber-500/50',
    borderColorHex: '#f59e0b',
    textColor: 'text-amber-300',
    bgColor: 'bg-amber-950/30',
    glowColor: 'shadow-amber-500/20',
  },
  {
    id: 'navigator',
    name: 'NAVIGATOR',
    emoji: '🔭',
    role: 'Research & Intel',
    title: 'Research & Intelligence Lead',
    roomLabel: 'RESEARCH LAB',
    roomImage: '/agents/navigator-room.png',
    owns: ['Market research', 'Competitor analysis', 'Daily intel briefings'],
    color: 'blue',
    borderColor: 'border-blue-500/50',
    borderColorHex: '#3b82f6',
    textColor: 'text-blue-300',
    bgColor: 'bg-blue-950/30',
    glowColor: 'shadow-blue-500/20',
  },
  {
    id: 'rigger',
    name: 'RIGGER',
    emoji: '⚙️',
    role: 'Automation & n8n',
    title: 'Automation & Infrastructure Engineer',
    roomLabel: 'ENGINE ROOM',
    roomImage: '/agents/rigger-room.png',
    owns: ['n8n workflow pipelines', 'GiftHQ social pipeline', 'Integration & sync jobs'],
    color: 'orange',
    borderColor: 'border-orange-500/50',
    borderColorHex: '#f97316',
    textColor: 'text-orange-300',
    bgColor: 'bg-orange-950/30',
    glowColor: 'shadow-orange-500/20',
  },
  {
    id: 'dev',
    name: 'FORGE',
    emoji: '💻',
    role: 'Development',
    title: 'Lead Developer',
    roomLabel: 'DEV CAVE',
    roomImage: '/agents/forge-room.png',
    owns: ['Jasper HQ', 'Vortxx', 'YTidy', 'GiftHQ', 'All code & deploys'],
    color: 'emerald',
    borderColor: 'border-emerald-500/50',
    borderColorHex: '#10b981',
    textColor: 'text-emerald-300',
    bgColor: 'bg-emerald-950/30',
    glowColor: 'shadow-emerald-500/20',
  },
  {
    id: 'fort',
    name: 'ANCHOR',
    emoji: '🏰',
    role: 'The Fort Strategy',
    title: 'Fort Marketing & Strategy Lead',
    roomLabel: 'STRATEGY HQ',
    roomImage: '/agents/anchor-room.png',
    owns: ['Fort marketing plans', 'Performance Therapy growth', 'Membership & pricing'],
    color: 'purple',
    borderColor: 'border-purple-500/50',
    borderColorHex: '#a855f7',
    textColor: 'text-purple-300',
    bgColor: 'bg-purple-950/30',
    glowColor: 'shadow-purple-500/20',
  },
]

// ── Current Assignments (update as agents take on new work) ───────────────────

interface Assignment {
  status: 'active' | 'queued' | 'idle' | 'blocked'
  project: string
  task: string
  priority: 'P1' | 'P2' | 'P3'
}

const CURRENT_ASSIGNMENTS: Record<string, Assignment> = {
  beacon: {
    status: 'queued',
    project: 'TVE Newsletter',
    task: 'Draft TVE Issue #1 — Apply This Now section',
    priority: 'P1',
  },
  navigator: {
    status: 'queued',
    project: 'GiftHQ',
    task: 'Research Amazon PA API categories for Mother\'s Day',
    priority: 'P1',
  },
  rigger: {
    status: 'active',
    project: 'GiftHQ Pipeline',
    task: 'Build Amazon → OpenAI → video → social auto-posting pipeline',
    priority: 'P1',
  },
  dev: {
    status: 'queued',
    project: 'Jasper Chat',
    task: 'Fix chat lag — bypass cron, call Claude API directly in /api/chat/send',
    priority: 'P1',
  },
  fort: {
    status: 'active',
    project: 'The Fort',
    task: 'March 1 price increase — member communication & Drew talking points',
    priority: 'P1',
  },
}

type AgentStatus = 'idle' | 'active' | 'queued' | 'blocked'

const STATUS_CONFIG: Record<AgentStatus, { label: string; dotColor: string }> = {
  idle:    { label: 'IDLE',    dotColor: 'bg-slate-400' },
  active:  { label: 'ACTIVE',  dotColor: 'bg-yellow-400' },
  queued:  { label: 'QUEUED',  dotColor: 'bg-blue-400' },
  blocked: { label: 'BLOCKED', dotColor: 'bg-red-400' },
}

const PRIORITY_BADGE: Record<string, string> = {
  P1: 'bg-red-900/40 text-red-300 border-red-500/30',
  P2: 'bg-amber-900/40 text-amber-300 border-amber-500/30',
  P3: 'bg-slate-700/40 text-slate-300 border-slate-500/30',
}

// Supabase task type — matches actual agent_tasks table schema
interface AgentTask {
  id: string
  user_id: string
  agent: string | null
  title: string
  notes: string | null
  status: string          // 'todo' | 'in_progress' | 'completed' | 'blocked'
  priority: string        // 'low' | 'medium' | 'high' | 'critical'
  assigned_by: string | null
  tags: string[] | null   // e.g. ['GiftHQ', 'P1']
  metadata: Record<string, unknown> | null
  started_at: string | null
  completed_at: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

// Map DB status → display status
function mapStatus(s: string): 'active' | 'queued' | 'idle' | 'blocked' {
  if (s === 'in_progress') return 'active'
  if (s === 'todo')        return 'queued'
  if (s === 'blocked')     return 'blocked'
  return 'idle'
}

// Map DB priority → P-label
function mapPriority(p: string): 'P1' | 'P2' | 'P3' {
  if (p === 'high')   return 'P1'
  if (p === 'medium') return 'P2'
  return 'P3'
}

// Get project from tags (first tag that isn't a P-level)
function projectFromTags(tags: string[] | null): string {
  return tags?.find(t => !t.match(/^P[123]$/)) ?? ''
}

// ── Sub-component: Agent Card ──────────────────────────────────────────────────

function AgentCard({
  agent,
  status,
  currentTask,
}: {
  agent: AgentDef
  status: AgentStatus
  currentTask: { task: string; project: string; priority: 'P1'|'P2'|'P3' } | null
}) {
  const statusInfo = STATUS_CONFIG[status]

  return (
    <div
      className={`rounded-lg border ${agent.borderColor} ${agent.bgColor} flex flex-col overflow-hidden shadow-lg ${agent.glowColor} transition-all duration-200 hover:scale-[1.02] hover:shadow-xl`}
      style={{ boxShadow: `0 0 18px 1px ${agent.borderColorHex}22` }}
    >
      {/* Room label bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900/60 border-b border-slate-700/50">
        <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">{agent.roomLabel}</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${statusInfo.dotColor} ${status === 'active' ? 'animate-pulse' : ''}`} />
        </div>
      </div>

      {/* Room image */}
      <div className="relative w-full aspect-square overflow-hidden bg-slate-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={agent.roomImage}
          alt={`${agent.name} room`}
          className="w-full h-full object-cover"
        />
        {/* Status overlay badge */}
        <div className="absolute top-2 right-2">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
            status === 'active'  ? 'bg-yellow-400 text-yellow-950' :
            status === 'queued'  ? 'bg-blue-500 text-white' :
            status === 'blocked' ? 'bg-red-500 text-white' :
            'bg-slate-600 text-slate-200'
          }`}>
            [{statusInfo.label}]
          </span>
        </div>
      </div>

      {/* Agent name + task */}
      <div className="p-3 flex flex-col gap-2 flex-1 bg-slate-900/40">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{agent.emoji}</span>
          <span className={`text-xs font-bold tracking-wide ${agent.textColor}`}>{agent.name}</span>
        </div>

        {/* Current task */}
        {currentTask ? (
          <div className="space-y-1">
            <p className="text-[10px] text-slate-300 leading-snug line-clamp-2">{currentTask.task}</p>
            <div className="flex items-center gap-1.5">
              {currentTask.project && (
                <span className="text-[9px] text-slate-500 truncate">{currentTask.project}</span>
              )}
              <span className={`text-[8px] px-1 py-0.5 rounded border shrink-0 ml-auto ${PRIORITY_BADGE[currentTask.priority]}`}>
                {currentTask.priority}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-slate-600 italic">Available</p>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function AgentCommandCenter() {
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [live, setLive] = useState(true)

  useEffect(() => {
    if (!supabase) return
    // Initial fetch
    supabase
      .from('agent_tasks')
      .select('*')
      .not('agent', 'is', null)
      .neq('status', 'completed')
      .order('updated_at', { ascending: false })
      .then(({ data }: { data: AgentTask[] | null }) => {
        if (data) { setTasks(data); setLastUpdated(new Date()) }
      })

    // Realtime subscription
    const ch = supabase
      .channel('agent_tasks_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_tasks' }, () => {
        supabase
          .from('agent_tasks')
          .select('*')
          .not('agent', 'is', null)
          .neq('status', 'completed')
          .order('updated_at', { ascending: false })
          .then(({ data }: { data: AgentTask[] | null }) => {
            if (data) { setTasks(data); setLastUpdated(new Date()) }
          })
        setLive(false); setTimeout(() => setLive(true), 400)
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [])

  // Per-agent: use DB tasks if available, else fall back to static CURRENT_ASSIGNMENTS
  function getAgentStatus(agentId: string): AgentStatus {
    const agentTasks = tasks.filter(t => t.agent === agentId)
    if (agentTasks.length > 0) return mapStatus(agentTasks[0].status)
    return CURRENT_ASSIGNMENTS[agentId]?.status ?? 'idle'
  }

  function getAgentTask(agentId: string): { task: string; project: string; priority: 'P1'|'P2'|'P3' } | null {
    const t = tasks.find(t => t.agent === agentId)
    if (t) return { task: t.title, project: projectFromTags(t.tags), priority: mapPriority(t.priority) }
    const a = CURRENT_ASSIGNMENTS[agentId]
    if (a && a.status !== 'idle') return { task: a.task, project: a.project, priority: a.priority }
    return null
  }

  const allStatuses = AGENTS.map(a => getAgentStatus(a.id))
  const runningCount = allStatuses.filter(s => s === 'active').length
  const queuedCount  = allStatuses.filter(s => s === 'queued').length
  const blockedCount = allStatuses.filter(s => s === 'blocked').length

  return (
    <div className="border border-slate-700/50 bg-slate-800/40 backdrop-blur rounded-lg p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[9px] font-bold tracking-widest text-emerald-400 uppercase mb-0.5">Monomoy Strategies</p>
          <h3 className="text-base font-bold text-white">AGENT COMMAND CENTER</h3>
        </div>
        <div className="flex items-center gap-2">
          {runningCount > 0 && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-yellow-900/40 text-yellow-300 border border-yellow-500/30">
              {runningCount} running
            </span>
          )}
          {blockedCount > 0 && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-red-900/40 text-red-300 border border-red-500/30">
              {blockedCount} blocked
            </span>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className={`w-2 h-2 rounded-full transition-all duration-300 ${live ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            {tasks.length > 0 ? 'Live' : 'Static'} · {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* 6-card grid: Jasper (conference room) + 5 agents — all same size */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Jasper card — conference room */}
        <div
          className="rounded-lg border border-emerald-500/50 bg-emerald-950/20 flex flex-col overflow-hidden shadow-lg transition-all duration-200 hover:scale-[1.02]"
          style={{ boxShadow: '0 0 18px 1px #10b98122' }}
        >
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900/60 border-b border-slate-700/50">
            <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">THE BRIDGE</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="relative w-full aspect-square overflow-hidden bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/agents/conference-room.png" alt="Jasper HQ Conference Room" className="w-full h-full object-cover" />
            <div className="absolute top-2 right-2">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white">[CMD]</span>
            </div>
          </div>
          <div className="p-3 flex flex-col gap-1 flex-1 bg-slate-900/40">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🦞</span>
              <span className="text-xs font-bold tracking-wide text-emerald-300">JASPER</span>
            </div>
            <p className="text-[10px] text-slate-400">Orchestrator · All agents</p>
            <div className="flex items-center gap-1 mt-auto pt-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400 border border-slate-600/40">📅 Tue 10AM</span>
            </div>
          </div>
        </div>

        {/* 5 agent cards */}
        {AGENTS.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            status={getAgentStatus(agent.id)}
            currentTask={getAgentTask(agent.id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-[10px] text-slate-600">
        <span>{runningCount} active · {queuedCount} queued · {blockedCount} blocked</span>
        <span>{tasks.length > 0 ? `${tasks.length} tasks from Supabase` : 'Using static fallback'}</span>
      </div>
    </div>
  )
}
