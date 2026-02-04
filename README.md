# Jasper HQ - Command Center

A standalone Next.js dashboard for Jasper, the AI assistant. This is Phase 1 of the Jasper HQ project, extracted and adapted from the Vortxx agent dashboard.

## 🦞 Features

- **Live Status Widget** - Real-time agent status with metrics
- **Quick Note Input** - Drop notes for Jasper with keyboard shortcuts
- **Tasks Panel** - Kanban-style task management
- **Activity Feed** - Filterable activity log
- **Dark Theme** - Navy/charcoal backgrounds with gold/amber accents
- **Mobile-First Design** - Responsive grid layout
- **Real-time Data** - Connected to shared Supabase database

## 🚀 Tech Stack

- **Framework:** Next.js 14+ with App Router
- **Styling:** Tailwind CSS + shadcn/ui components  
- **Data:** Supabase (shared database with Vortxx)
- **Auth:** Supabase Auth (same auth as Vortxx)
- **Deploy:** Vercel
- **UI Components:** shadcn/ui with custom dark theme

## 🏗️ Architecture

This app shares the same Supabase database as Vortxx, using these tables:
- `agent_tasks` (or `todos`) — Task board
- `agent_activities` — Activity feed  
- `agent_documents` — Documents hub
- `agent_notes` — Quick notes
- `vault_projects` — Projects board
- `agent_deliverables` — Deliverables
- `agent_scheduled_workflows` — Scheduled workflows
- `agent_notifications` — Notifications
- `calendar_events` — Calendar
- `emails` — Email data (read-only)

## 🎨 Design System

**Color Palette:**
- **Background:** Navy/charcoal gradients (`slate-900`, `slate-800`)
- **Accent:** Gold/amber (`amber-400`, `amber-500`)  
- **Text:** White primary, slate secondary
- **Cards:** Semi-transparent slate with backdrop blur
- **Borders:** Subtle slate borders with opacity

**Layout (Desktop):**
```
┌──────────────────────────────────────────────────────┐
│  🦞 Jasper HQ          [Status: Working]    [Bill 👤] │
├──────────┬──────────┬──────────────────────────────────┤
│ Live     │ Quick    │ Activity Feed                    │
│ Status   │ Note     │ (filterable by type)             │
├──────────┼──────────┤                                  │
│ Tasks    │ Projects │                                  │
│ (Kanban) │ Board    │                                  │
├──────────┼──────────┼──────────────────────────────────┤
│ Ideas    │ Docs     │ Calendar │ System │ Scheduled    │
│ Pipeline │ Hub      │          │ Health │ Workflows    │
└──────────┴──────────┴──────────┴────────┴──────────────┘
```

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Access to Supabase database

### Setup
```bash
# Clone the repository
git clone https://github.com/your-username/jasper-hq.git
cd jasper-hq

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase URL and keys

# Run development server
npm run dev
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key  
NEXT_PUBLIC_USER_ID=your-user-id
```

## 📦 Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## 🎯 Phase 1 Components (Completed)

✅ **Core Infrastructure**
- [x] Next.js 14 setup with App Router
- [x] Tailwind CSS + shadcn/ui components
- [x] Supabase client configuration
- [x] Dark theme implementation
- [x] Responsive layout system

✅ **Dashboard Components**
- [x] DashboardLayout - Main layout with header
- [x] LiveStatusWidget - Real-time agent status
- [x] QuickNoteInput - Note capture with shortcuts
- [x] TasksPanel - Kanban-style task board
- [x] ActivityFeed - Filterable activity log

✅ **Data Layer**
- [x] Supabase integration
- [x] Dashboard service with all CRUD operations
- [x] TypeScript types for all data structures
- [x] Error handling and loading states

## 🔮 Future Phases

**Phase 2 - Complete Feature Set:**
- [ ] ProjectsBoard component
- [ ] DocumentsHub component  
- [ ] IdeasPanel component
- [ ] TodayCalendar component
- [ ] SystemHealthWidget component
- [ ] ScheduledWorkflowsPanel component
- [ ] DeliverablesPanel component
- [ ] NotificationsPanel component

**Phase 3 - Advanced Features:**
- [ ] Real-time subscriptions
- [ ] Interactive task management
- [ ] Document search and filtering
- [ ] Calendar integration
- [ ] System monitoring
- [ ] Workflow management
- [ ] Mobile app

## 📝 Notes

- **DO NOT** modify Vortxx files - this is a separate standalone project
- Components are copied and adapted, not imported from Vortxx
- Shares the same Supabase database for real data
- Mobile-first responsive design
- Command center aesthetic - information-dense but clean

## 🦞 About Jasper

Jasper is an AI assistant with a distinguished personality - imagine a sophisticated lobster in a navy suit with a gold vest. This command center reflects that aesthetic with its navy/charcoal backgrounds and gold accents.

---

Built with ❤️ by the Jasper team