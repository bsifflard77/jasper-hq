import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const AGENT_EMOJIS: Record<string, string> = {
  dev: '🔨',
  beacon: '📡',
  rigger: '⚙️',
  fort: '💪',
  anchor: '⚓',
  jasper: '🦞',
}

const PROJECT_NAMES: Record<string, string> = {
  vortxx: 'Vortxx',
  heartbeatguard: 'HeartbeatGuard',
  gifthq: 'GiftHQ',
  'jasper-hq': 'Jasper HQ',
  fort: 'The Fort',
  ytidy: 'YTidy',
  'vibe-entrepreneur': 'Vibe Entrepreneur',
  'vibe-coaching': 'Vibe Coaching',
  'pup-portrait': 'Pup Portrait',
  'monomoy-site': 'Monomoy Site',
  'openclaw-hq': 'OpenClaw HQ',
}

const ALL_PROJECTS = Object.keys(PROJECT_NAMES)

function getTasksFilePath(): string {
  // Try env var first
  if (process.env.TASK_REGISTRY_PATH) {
    return process.env.TASK_REGISTRY_PATH
  }
  // Try absolute local path (dev on Monomoy-1)
  const localPath = 'D:/Jasper/clawd/task-registry/tasks.json'
  if (fs.existsSync(localPath)) {
    return localPath
  }
  // Fall back to project data directory (for Vercel)
  return path.join(process.cwd(), 'data', 'tasks.json')
}

function getLastActivity(task: Task): string {
  return task.completed || task.started || task.updated || task.created || ''
}

interface Task {
  id: string
  title: string
  agent: string[]
  project: string
  priority: string
  status: string
  created: string
  completed?: string
  started?: string
  updated?: string
  deadline?: string | null
  description: string
  needs_bill?: boolean
  subagentSession?: string
}

interface TasksFile {
  version: string
  lastUpdated: string
  tasks: Task[]
}

function agentEmojis(agents: string[]): string {
  return agents.map(a => AGENT_EMOJIS[a] || '🤖').join(' ')
}

function formatRelativeTime(isoDate: string): string {
  if (!isoDate) return 'Unknown'
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export async function GET() {
  try {
    const filePath = getTasksFilePath()
    let rawData: TasksFile

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      rawData = JSON.parse(content)
    } catch (err) {
      console.error('Failed to read tasks.json:', err)
      return NextResponse.json({
        needsBill: [],
        inProgress: [],
        completedRecently: [],
        stale: [],
        projectStatus: ALL_PROJECTS.map(id => ({
          id,
          name: PROJECT_NAMES[id] || id,
          lastActivity: null,
          lastActivityRelative: 'No data',
          taskCount: 0,
          inProgressCount: 0,
          status: 'unknown',
        })),
        lastUpdated: null,
        error: 'Could not read task registry',
      })
    }

    const tasks = rawData.tasks || []
    const now = new Date()

    // 🔴 NEEDS BILL
    const needsBill = tasks
      .filter(t => t.needs_bill === true)
      .map(t => ({
        id: t.id,
        title: t.title,
        project: t.project,
        projectName: PROJECT_NAMES[t.project] || t.project,
        agentEmoji: agentEmojis(t.agent || []),
        description: t.description,
        lastUpdated: getLastActivity(t),
        lastUpdatedRelative: formatRelativeTime(getLastActivity(t)),
        status: t.status,
        priority: t.priority,
      }))

    // 🟡 IN PROGRESS
    const inProgress = tasks
      .filter(t => t.status === 'in-progress')
      .map(t => ({
        id: t.id,
        title: t.title,
        project: t.project,
        projectName: PROJECT_NAMES[t.project] || t.project,
        agentEmoji: agentEmojis(t.agent || []),
        description: t.description,
        lastUpdated: getLastActivity(t),
        lastUpdatedRelative: formatRelativeTime(getLastActivity(t)),
        status: t.status,
        priority: t.priority,
        started: t.started,
        deadline: t.deadline,
      }))

    // 🟢 COMPLETED RECENTLY (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const completedRecently = tasks
      .filter(t => {
        if (t.status !== 'done' || !t.completed) return false
        return new Date(t.completed) >= sevenDaysAgo
      })
      .sort((a, b) => new Date(b.completed!).getTime() - new Date(a.completed!).getTime())
      .map(t => ({
        id: t.id,
        title: t.title,
        project: t.project,
        projectName: PROJECT_NAMES[t.project] || t.project,
        agentEmoji: agentEmojis(t.agent || []),
        description: t.description,
        lastUpdated: t.completed!,
        lastUpdatedRelative: formatRelativeTime(t.completed!),
        status: t.status,
        priority: t.priority,
      }))

    // ⚠️ STALE — projects with no task activity in 5+ days
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)

    const projectLastActivity: Record<string, string> = {}
    for (const task of tasks) {
      const lastAct = getLastActivity(task)
      if (!lastAct) continue
      if (!projectLastActivity[task.project] || lastAct > projectLastActivity[task.project]) {
        projectLastActivity[task.project] = lastAct
      }
    }

    const stale = ALL_PROJECTS
      .filter(projectId => {
        const lastAct = projectLastActivity[projectId]
        if (!lastAct) return true // No activity at all = stale
        return new Date(lastAct) < fiveDaysAgo
      })
      .map(projectId => ({
        project: projectId,
        projectName: PROJECT_NAMES[projectId] || projectId,
        lastActivity: projectLastActivity[projectId] || null,
        lastActivityRelative: projectLastActivity[projectId]
          ? formatRelativeTime(projectLastActivity[projectId])
          : 'No activity recorded',
      }))

    // Per-Project Status Row
    const projectStatus = ALL_PROJECTS.map(projectId => {
      const projectTasks = tasks.filter(t => t.project === projectId)
      const lastAct = projectLastActivity[projectId] || null
      const inProgressCount = projectTasks.filter(t => t.status === 'in-progress').length
      const doneCount = projectTasks.filter(t => t.status === 'done').length
      const backlogCount = projectTasks.filter(t => t.status === 'backlog').length

      let status: 'active' | 'stale' | 'idle' | 'unknown'
      if (inProgressCount > 0) status = 'active'
      else if (!lastAct || new Date(lastAct) < fiveDaysAgo) status = 'stale'
      else if (backlogCount > 0) status = 'idle'
      else status = 'idle'

      return {
        id: projectId,
        name: PROJECT_NAMES[projectId] || projectId,
        lastActivity: lastAct,
        lastActivityRelative: lastAct ? formatRelativeTime(lastAct) : 'No data',
        taskCount: projectTasks.length,
        inProgressCount,
        doneCount,
        backlogCount,
        status,
      }
    })

    return NextResponse.json({
      needsBill,
      inProgress,
      completedRecently,
      stale,
      projectStatus,
      lastUpdated: rawData.lastUpdated,
      fetchedAt: now.toISOString(),
    })
  } catch (err) {
    console.error('Bridge status error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
