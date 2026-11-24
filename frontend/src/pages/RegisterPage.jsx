import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, User, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import apiClient from '../api/client'
import { useAuthStore } from '../store/useAuthStore'

const ROLES = [
  { value: 'participant', label: 'Participant', desc: 'Build and submit projects',   color: '#818CF8' },
  { value: 'judge',       label: 'Judge',       desc: 'Score submissions',           color: '#FCD34D' },
  { value: 'admin',       label: 'Admin',       desc: 'Manage events & teams',       color: '#4ADE80' },
]

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'participant' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await apiClient.post('/api/auth/register', form)
      if (data.success && data.token) {
        setAuth(data.token, data.user)
        if (data.user.role === 'admin')      navigate('/admin')
        else if (data.user.role === 'judge') navigate('/judge')
        else                                  navigate('/participant')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try a different email.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.1) 0%, transparent 60%), #0D1117' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Hack<span style={{ color: '#818CF8' }}>Forge</span>
          </span>
        </div>

        <div className="glass p-8 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              Create account
            </h1>
            <p className="text-sm text-slate-500 mt-1">Join the AI-powered hackathon platform</p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl text-xs text-red-400"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="input-label">Full Name</label>
              <div className="relative">
                <User size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" required value={form.name} onChange={set('name')}
                  placeholder="Jane Doe" className="input pl-10" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="input-label">Email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="email" required value={form.email} onChange={set('email')}
                  placeholder="jane@example.com" className="input pl-10" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={set('password')}
                  placeholder="Minimum 6 characters" className="input pl-10 pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="input-label">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(({ value, label, desc, color }) => (
                  <button key={value} type="button" onClick={() => setForm(f => ({ ...f, role: value }))}
                    className="p-3 rounded-xl text-left border transition-all duration-200"
                    style={{
                      background: form.role === value ? `${color}12` : 'rgba(255,255,255,0.02)',
                      borderColor: form.role === value ? `${color}35` : 'rgba(255,255,255,0.06)',
                    }}>
                    <div className="text-xs font-semibold mb-0.5" style={{ color: form.role === value ? color : '#94A3B8', fontFamily: "'Space Grotesk',sans-serif" }}>
                      {label}
                    </div>
                    <div className="text-[10px] text-slate-600">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm mt-1">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating account...
                </span>
              ) : 'Create My Account'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
