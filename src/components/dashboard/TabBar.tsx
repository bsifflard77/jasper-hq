'use client'

export type TabId = 'dashboard' | 'security' | 'tasks' | 'projects' | 'ai-board' | 'bridge' | 'canvas' | 'costs' | 'apis' | 'marketing' | 'fort' | 'calendar' | 'ideas' | 'chat'

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
  { id: 'fort', label: 'The Fort', icon: '💪' },
]

interface TabBarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="border-b border-slate-700/50 bg-slate-800/95 backdrop-blur">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap
                rounded-t-lg transition-all duration-200
                ${activeTab === tab.id
                  ? 'text-white bg-slate-800/50 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                }
              `}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
