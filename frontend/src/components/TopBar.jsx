import { Search, Bell } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useLocation } from 'react-router-dom'

const pageTitles = {
  '/participant': { title: 'Participant Hub', sub: 'Manage skills & submit projects' },
  '/admin':       { title: 'Admin Control',   sub: 'Team formation & AI evaluation' },
  '/judge':       { title: 'Judge Panel',     sub: 'Score projects with AI assistance' },
  '/leaderboard': { title: 'Leaderboard',     sub: 'Live weighted ranking board' },
  '/login':       { title: 'Sign In',         sub: 'Access your account' },
  '/register':    { title: 'Register',        sub: 'Create your account' },
}

export default function TopBar() {
  const { user } = useAuthStore()
  const location = useLocation()
  const page = pageTitles[location.pathname] || { title: 'HackForge', sub: 'AI Platform' }

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b"
      style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(13,17,23,0.8)', backdropFilter: 'blur(12px)' }}>

      {/* Page Title */}
      <div>
        <h1 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
          {page.title}
        </h1>
        <p className="text-[11px] text-slate-500">{page.sub}</p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative hidden md:block">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search events, teams, projects..."
            className="input pl-8 pr-4 py-2 text-xs w-56"
          />
        </div>

        {/* Notification Bell */}
        <button className="btn-ghost p-2.5 rounded-xl relative">
          <Bell size={16} className="text-slate-400" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-500"></span>
        </button>

        {/* User Avatar */}
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
