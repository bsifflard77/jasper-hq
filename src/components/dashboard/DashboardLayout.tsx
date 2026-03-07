'use client'

import { ReactNode, createContext, useContext } from 'react'
import Image from 'next/image'
import { TabBar, TabId } from './TabBar'
import { StatusBar } from './StatusBar'
import { useTheme } from '@/contexts/ThemeContext'

interface DashboardData {
  status: Record<string, unknown>
  tasks: unknown[]
  activities: unknown[]
  documents: unknown[]
  projects: unknown[]
  calendar: { today: unknown[]; week: unknown[] }
  ideas: unknown[]
  _meta?: unknown
}

interface DashboardLayoutProps {
  children: ReactNode
  data?: DashboardData
  status?: 'idle' | 'working' | 'thinking'
  activeTab?: TabId
  onTabChange?: (tab: TabId) => void
}

const DashboardContext = createContext<DashboardData | null>(null)

export function useDashboardData() {
  const context = useContext(DashboardContext)
  if (!context) throw new Error('useDashboardData must be used within DashboardLayout')
  return context
}

// ── Theme Toggle Button ────────────────────────────────────────────────────────
function ThemeToggle() {
  const { isDark, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200"
      style={{
        background: 'var(--jhq-surface)',
        borderColor: 'var(--jhq-border)',
        color: 'var(--jhq-text2)',
      }}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <>☀️ <span className="hidden sm:inline">Light</span></>
      ) : (
        <>🌙 <span className="hidden sm:inline">Dark</span></>
      )}
    </button>
  )
}

export function DashboardLayout({
  children,
  data,
  status = 'working',
  activeTab = 'dashboard',
  onTabChange,
}: DashboardLayoutProps) {
  const statusConfig = {
    idle:     { label: 'Idle',     dot: '#f59e0b', dotGlow: 'rgba(245,158,11,0.5)' },
    working:  { label: 'Working',  dot: '#10b981', dotGlow: 'rgba(16,185,129,0.5)' },
    thinking: { label: 'Thinking', dot: '#a78bfa', dotGlow: 'rgba(167,139,250,0.5)' },
  }
  const statusKey = ((data?.status as Record<string,string>)?.status || status) as keyof typeof statusConfig
  const currentStatus = statusConfig[statusKey] ?? statusConfig.working

  return (
    <DashboardContext.Provider value={data || { status: {}, tasks: [], activities: [], documents: [], projects: [], calendar: { today: [], week: [] }, ideas: [] }}>
      <div
        className="min-h-screen jhq-grid-bg"
        style={{ background: 'var(--jhq-bg)', color: 'var(--jhq-text)', transition: 'background 0.3s, color 0.3s' }}
      >
        {/* ── Sticky chrome: StatusBar + Header + Tabs ── */}
        <div className="sticky top-0 z-50">
          {/* Monospace status bar */}
          <StatusBar />

          {/* Main header */}
          <header
            className="border-b backdrop-blur-md"
            style={{ background: 'var(--jhq-header-bg)', borderColor: 'var(--jhq-header-bdr)' }}
          >
            <div className="px-4 py-3 flex items-center justify-between gap-4">
              {/* LEFT — brand */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <Image
                  src="/agents/jasper-avatar.png"
                  alt="Jasper"
                  width={40}
                  height={40}
                  className="rounded-full ring-2 shrink-0"
                  style={{ ringColor: 'var(--jhq-accent)' }}
                />
                <div>
                  <h1 className="text-lg font-bold leading-tight" style={{ color: 'var(--jhq-text)' }}>Jasper HQ</h1>
                  <p className="text-xs leading-tight" style={{ color: 'var(--jhq-text2)' }}>Command Center</p>
                </div>
              </div>

              {/* RIGHT — status + theme toggle */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Live status badge */}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium"
                  style={{ background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: currentStatus.dot, boxShadow: `0 0 6px ${currentStatus.dotGlow}`, animation: 'pulse 2s ease-in-out infinite' }}
                  />
                  <span style={{ color: 'var(--jhq-text)' }}>{currentStatus.label}</span>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Tab bar */}
          {onTabChange && (
            <TabBar activeTab={activeTab} onTabChange={onTabChange} />
          )}
        </div>

        {/* ── Page content ── */}
        <main>
          {children}
        </main>
      </div>
    </DashboardContext.Provider>
  )
}
