'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { TabId } from '@/components/dashboard/TabBar'
import {
  DashboardTab,
  SecurityTab,
  TasksTab,
  ProjectsTab,
  AIBoardTab,
  BridgeTab,
  MarketingTab,
  FortTab,
  CalendarTab,
  IdeasTab,
  CostsTab,
  ApiHealthTab,
  ChatTab,
  CanvasTab,
} from '@/components/dashboard/tabs'

interface DashboardData {
  status: any
  tasks: any[]
  activities: any[]
  documents: any[]
  projects: any[]
  calendar: { today: any[], week: any[] }
  ideas: any[]
  _meta?: any
  error?: string
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard')
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 60000) // refresh every minute
    return () => clearInterval(interval)
  }, [])

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      )
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />
      case 'security':
        return <SecurityTab />
      case 'tasks':
        return <TasksTab tasks={data?.tasks || []} />
      case 'projects':
        return <ProjectsTab projects={data?.projects || []} />
      case 'ai-board':
        return <AIBoardTab documents={data?.documents || []} />
      case 'bridge':
        return <BridgeTab />
      case 'canvas':
        return <CanvasTab />
      case 'marketing':
        return <MarketingTab />
      case 'fort':
        return <FortTab />
      case 'calendar':
        return <CalendarTab calendar={data?.calendar} />
      case 'ideas':
        return <IdeasTab ideas={data?.ideas || []} />
      case 'costs':
        return <CostsTab />
      case 'apis':
        return <ApiHealthTab />
      case 'chat':
        return <ChatTab />
      default:
        return <DashboardTab />
    }
  }

  return (
    <DashboardLayout
      data={data || undefined}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {renderTabContent()}
    </DashboardLayout>
  )
}
