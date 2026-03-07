'use client'

export type TabId = 'dashboard' | 'security' | 'tasks' | 'projects' | 'ai-board' | 'bridge' | 'canvas' | 'costs' | 'apis' | 'credentials' | 'marketing' | 'fort' | 'calendar' | 'ideas' | 'chat'

export interface Tab {
  id: TabId
  label: string
  icon: string
}

export const TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'chat', label: 'Chat', icon: '🦞' },
  { id: 'bridge', label: 'Bridge', icon: '🧭' },
  { id: 'security', label: 'Security', icon: '🛡️' },
  { id: 'tasks', label: 'Tasks', icon: '📋' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'projects', label: 'Projects', icon: '📁' },
  { id: 'ai-board', label: 'AI Board', icon: '🏛️' },
  { id: 'ideas', label: 'Ideas', icon: '💡' },
  { id: 'canvas', label: 'Canvas', icon: '🧠' },
  { id: 'marketing', label: 'Marketing', icon: '📈' },
  { id: 'costs', label: 'Costs', icon: '💰' },
  { id: 'apis', label: 'APIs', icon: '🔌' },
  { id: 'credentials', label: 'Credentials', icon: '🔐' },
  { id: 'fort', label: 'The Fort', icon: '💪' },
]

interface TabBarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div
      className="border-b backdrop-blur-md"
      style={{ background: 'var(--jhq-tab-bg)', borderColor: 'var(--jhq-header-bdr)' }}
    >
      <div className="flex items-center gap-0.5 overflow-x-auto px-3 py-1" style={{ scrollbarWidth: 'none' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-all duration-150"
            style={
              activeTab === tab.id
                ? {
                    color: '#fff',
                    background: 'var(--jhq-accent)',
                    boxShadow: '0 0 10px rgba(16,185,129,0.35)',
                  }
                : {
                    color: 'var(--jhq-text2)',
                    background: 'transparent',
                  }
            }
            onMouseEnter={e => {
              if (activeTab !== tab.id) {
                (e.currentTarget as HTMLElement).style.background = 'var(--jhq-surface2)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--jhq-text)'
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== tab.id) {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--jhq-text2)'
              }
            }}
          >
            <span className="text-sm">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
