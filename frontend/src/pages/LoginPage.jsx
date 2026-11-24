import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import apiClient from '../api/client'
import { useAuthStore } from '../store/useAuthStore'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await apiClient.post('/api/auth/login', { email, password })
      if (data.success && data.token) {
        setAuth(data.token, data.user)
        if (data.user.role === 'admin')      navigate('/admin')
        else if (data.user.role === 'judge') navigate('/judge')
        else                                  navigate('/participant')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 60%), #0D1117' }}>

      {/* Left Brand Panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12"
        style={{ background: 'rgba(22,27,39,0.6)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Hack<span style={{ color: '#818CF8' }}>Forge</span>
          </span>
        </div>

        <div>
          <div className="badge badge-brand mb-6 text-xs">AI-Native Platform</div>
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            The <span className="gradient-text">intelligent</span> hackathon management platform
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Auto-form balanced teams with skill-vector matching, evaluate projects with NLP sentence embeddings, and rank results with live AI scores.
          </p>
        </div>

        {/* Feature pills */}
        <div className="space-y-3">
          {[
            { icon: '⚡', text: 'AI team formation with scikit-learn clustering' },
            { icon: '🔍', text: 'sentence-transformers plagiarism detection' },
            { icon: '📊', text: 'Live GitHub API commit & contributor metrics' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-slate-400">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.15)' }}>
                {icon}
              </span>
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              Welcome back
            </h1>
            <p className="text-sm text-slate-400">Sign in to your HackForge account</p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3 rounded-xl text-sm text-red-400"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <AlertCircle size={15} className="flex-shrink-0" />
              <span className="text-xs">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Email address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" className="input pl-10" />
              </div>
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type={showPw ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" className="input pl-10 pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2 text-sm">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Authenticating...
                </span>
              ) : 'Sign In to HackForge'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-semibold">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
