import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <header className="sticky top-0 z-50 bg-[#090b10]/90 backdrop-blur-md border-b border-gray-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & AI Engine Status Badge */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-forge-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200">
                <span className="text-xl">🔥</span>
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-brand-300 transition-colors">
                  Hack<span className="text-forge-400">Forge</span>
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-md bg-brand-950 border border-brand-800/60 text-brand-300">
                  v2.0 AI Platform
                </span>
              </div>
            </Link>

            {/* AI Engine Pulse Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900/80 border border-gray-800 text-xs text-gray-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-[11px] text-gray-400">AI Engine Online</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/participant" label="Participant Hub" active={isActive('/participant')} />
            <NavLink to="/admin" label="Admin Control" active={isActive('/admin')} />
            <NavLink to="/judge" label="Judge Evaluation" active={isActive('/judge')} />
            <NavLink to="/leaderboard" label="Leaderboard" active={isActive('/leaderboard')} />
          </nav>

          {/* Right Actions / Profile */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Role Pill */}
                <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider ${
                  user.role === 'admin'
                    ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                    : user.role === 'judge'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                    : 'bg-brand-950/80 text-brand-300 border border-brand-800/60'
                }`}>
                  {user.role}
                </span>

                {/* User Avatar */}
                <div className="flex items-center gap-2 pl-2 border-l border-gray-800">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-200">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden lg:inline-block text-sm font-medium text-gray-300">
                    {user.name}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-secondary text-xs py-2 px-3">
                  Log In
                </Link>
                <Link to="/register" className="btn-primary text-xs py-2 px-4">
                  Get Started
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  )
}

function NavLink({ to, label, active }) {
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-brand-900/40 text-brand-300 border border-brand-800/60 shadow-sm'
          : 'text-gray-400 hover:text-white hover:bg-gray-900/60'
      }`}
    >
      {label}
    </Link>
  )
}
