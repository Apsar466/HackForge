import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Trophy, Star, Zap,
  LogOut, Settings, ChevronRight
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'

const navItems = [
  { to: '/participant', icon: LayoutDashboard, label: 'Participant Hub' },
  { to: '/admin',       icon: Zap,             label: 'Admin Control'  },
  { to: '/judge',       icon: Star,            label: 'Judge Panel'    },
  { to: '/leaderboard', icon: Trophy,          label: 'Leaderboard'   },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="sidebar fixed inset-y-0 left-0 w-64 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Hack<span className="text-brand-400">Forge</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">AI Platform v2</div>
        </div>
      </div>

      {/* AI Engine Status */}
      <div className="mx-4 mt-4 px-3 py-2.5 rounded-xl flex items-center gap-2.5"
        style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
        <span className="glow-dot green">
          <span></span><span></span>
        </span>
        <div>
          <div className="text-[11px] font-semibold text-emerald-400" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>AI Engine Active</div>
          <div className="text-[10px] text-slate-500 font-mono">sentence-transformers online</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-6 space-y-1">
        <div className="section-title px-3 mb-3">Navigation</div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon size={17} className="nav-icon flex-shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight size={13} className="opacity-30" />
          </NavLink>
        ))}
      </nav>

      {/* User Profile at Bottom */}
      <div className="px-3 pb-4 border-t border-white/5 pt-4 space-y-2">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {user.name}
              </div>
              <div className="text-[10px] text-slate-500 truncate font-mono">{user.email}</div>
            </div>
            <span className={`badge text-[10px] ${
              user.role === 'admin' ? 'badge-violet' : user.role === 'judge' ? 'badge-amber' : 'badge-brand'
            }`}>
              {user.role}
            </span>
          </div>
        )}

        <button onClick={handleLogout}
          className="nav-item w-full text-slate-400 hover:text-red-400">
          <LogOut size={15} className="flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
