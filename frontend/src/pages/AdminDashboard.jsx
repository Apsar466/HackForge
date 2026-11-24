import { useState, useEffect, useCallback } from 'react'
import {
  Zap, Users, GitBranch, Trophy, TrendingUp, AlertCircle,
  CheckCircle, X, RefreshCw, Database, Scale, Star,
  ChevronDown, ChevronUp, ExternalLink, Shield
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts'
import apiClient from '../api/client'
import { useAuthStore } from '../store/useAuthStore'
import { useRealtime } from '../hooks/useRealtime'

// ── Tooltip ───────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass px-3 py-2 text-xs">
        <p className="text-slate-400 mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="font-semibold font-mono" style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// ── Score bar ─────────────────────────────────────────────────────────────────
const ScoreBar = ({ value, color }) => (
  <div className="w-full rounded-full h-1.5 mt-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
    <div className="h-1.5 rounded-full transition-all duration-700"
      style={{ width: `${Math.min(100, value)}%`, background: color }} />
  </div>
)

// ── Section header ────────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, subtitle, children, iconColor = '#818CF8' }) => (
  <div className="flex items-start justify-between mb-5 pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${iconColor}18`, border: `1px solid ${iconColor}28` }}>
        <Icon size={15} style={{ color: iconColor }} />
      </div>
      <div>
        <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
)

// ── Toast banner ──────────────────────────────────────────────────────────────
const Banner = ({ msg }) => msg ? (
  <div className={`flex items-start gap-2 p-3 rounded-xl text-xs ${
    msg.type === 'success'
      ? 'bg-emerald-500/8 border border-emerald-500/15 text-emerald-400'
      : 'bg-red-500/8 border border-red-500/15 text-red-400'
  }`}>
    {msg.type === 'success'
      ? <CheckCircle size={13} className="mt-0.5 flex-shrink-0" />
      : <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />}
    <span>{msg.text}</span>
  </div>
) : null

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuthStore()

  // ── Core state ────────────────────────────────────────────────────────────
  const [events, setEvents]         = useState([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [teams, setTeams]           = useState([])
  const [projects, setProjects]     = useState([])
  const [autoForming, setAutoForming] = useState(false)
  const [autoFormMsg, setAutoFormMsg] = useState(null)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [evaluatingMap, setEvaluatingMap] = useState({})
  const [llmEvalMap, setLlmEvalMap] = useState({})      // projectId → result
  const [llmEvalLoading, setLlmEvalLoading] = useState({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [eventForm, setEventForm]   = useState({ name: '', description: '', teamSize: 3 })
  const [creatingEvent, setCreatingEvent] = useState(false)

  // ── Google Sheets state ───────────────────────────────────────────────────
  const [sheetRegs, setSheetRegs]         = useState([])
  const [sheetSubs, setSheetSubs]         = useState([])
  const [regSheetUrl, setRegSheetUrl]     = useState('')
  const [subSheetUrl, setSubSheetUrl]     = useState('')
  const [syncingRegs, setSyncingRegs]     = useState(false)
  const [syncingSubs, setSyncingSubs]     = useState(false)
  const [sheetsMsg, setSheetsMsg]         = useState(null)
  const [showRegs, setShowRegs]           = useState(false)
  const [showSubs, setShowSubs]           = useState(false)

  // ── Compare Teams state ───────────────────────────────────────────────────
  const [comparing, setComparing]         = useState(false)
  const [compareResult, setCompareResult] = useState(null)
  const [compareMsg, setCompareMsg]       = useState(null)

  // ── Chart data (derived) ──────────────────────────────────────────────────
  const chartData = [
    { time: '00:00', teams: 2,  projects: 1,  score: 72 },
    { time: '04:00', teams: 4,  projects: 3,  score: 78 },
    { time: '08:00', teams: 6,  projects: 5,  score: 83 },
    { time: '12:00', teams: 8,  projects: 8,  score: 87 },
    { time: '16:00', teams: 10, projects: 12, score: 91 },
    { time: '20:00', teams: 12, projects: 15, score: 94 },
    { time: 'Now',   teams: teams.length || 12, projects: projects.length || 16, score: 96 },
  ]

  // ── Loaders ───────────────────────────────────────────────────────────────
  useEffect(() => { loadEvents() }, [])
  useEffect(() => { if (selectedEventId) { loadTeams(); loadProjects() } }, [selectedEventId])

  const loadEvents = async () => {
    try {
      const { data } = await apiClient.get('/api/events')
      if (data.success) {
        setEvents(data.events || [])
        if (data.events.length > 0) setSelectedEventId(data.events[0]._id)
      }
    } catch {}
  }

  const loadTeams = useCallback(async () => {
    if (!selectedEventId) return
    try {
      const { data } = await apiClient.get(`/api/teams?eventId=${selectedEventId}`)
      if (data.success) setTeams(data.teams || [])
    } catch {}
  }, [selectedEventId])

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true)
    try {
      const { data } = await apiClient.get('/api/projects')
      if (data.success) setProjects(data.projects || [])
    } catch {} finally { setLoadingProjects(false) }
  }, [])

  // ── Realtime SSE subscription ──────────────────────────────────────────────
  const { isConnected: isRealtimeConnected } = useRealtime({
    sync_update: useCallback(() => {
      loadTeams()
      loadProjects()
      setSheetsMsg({ type: 'success', text: '⚡ Live Realtime Sync Event received from Google Sheets!' })
    }, [loadTeams, loadProjects]),
    teams_updated: useCallback(() => {
      loadTeams()
    }, [loadTeams]),
    leaderboard_updated: useCallback(() => {
      loadProjects()
    }, [loadProjects]),
  })

  // ── Google Sheets sync ────────────────────────────────────────────────────
  const syncRegistrations = async () => {
    setSyncingRegs(true)
    setSheetsMsg(null)
    try {
      const { data } = await apiClient.post('/sync/registrations', { sheetUrl: regSheetUrl || undefined })
      setSheetRegs(data.data || [])
      setShowRegs(true)
      setSheetsMsg({ type: 'success', text: `${data.count} registration(s) fetched from Google Sheets.` })
    } catch (err) {
      setSheetsMsg({ type: 'error', text: err.response?.data?.message || 'Failed to fetch registrations.' })
    } finally { setSyncingRegs(false) }
  }

  const syncSubmissions = async () => {
    setSyncingSubs(true)
    setSheetsMsg(null)
    try {
      const { data } = await apiClient.post('/sync/submissions', { sheetUrl: subSheetUrl || undefined })
      setSheetSubs(data.data || [])
      setShowSubs(true)
      setSheetsMsg({ type: 'success', text: `${data.count} submission(s) fetched from Google Sheets.` })
    } catch (err) {
      setSheetsMsg({ type: 'error', text: err.response?.data?.message || 'Failed to fetch submissions.' })
    } finally { setSyncingSubs(false) }
  }

  // ── Auto-form ─────────────────────────────────────────────────────────────
  const handleAutoFormTeams = async () => {
    if (!selectedEventId) return
    setAutoForming(true)
    setAutoFormMsg(null)
    const evt = events.find(e => e._id === selectedEventId)
    try {
      const { data } = await apiClient.post('/api/teams/auto-form', {
        eventId: selectedEventId,
        teamSize: evt?.teamSize || 3,
      })
      if (data.success) {
        setAutoFormMsg({ type: 'success', text: `${data.teamsCount || data.teams?.length} balanced teams formed!` })
        loadTeams()
      } else {
        setAutoFormMsg({ type: 'error', text: data.message || 'Auto-form failed.' })
      }
    } catch (err) {
      setAutoFormMsg({ type: 'error', text: err.response?.data?.message || 'Auto-form failed.' })
    } finally { setAutoForming(false) }
  }

  // ── Compare Teams (algo vs LLM) ───────────────────────────────────────────
  const handleCompareTeams = async () => {
    if (!selectedEventId) return
    setComparing(true)
    setCompareMsg(null)
    setCompareResult(null)
    const evt = events.find(e => e._id === selectedEventId)
    try {
      const { data } = await apiClient.post('/api/teams/compare', {
        eventId: selectedEventId,
        teamSize: evt?.teamSize || 3,
      })
      setCompareResult(data)
      setCompareMsg({
        type: 'success',
        text: `Winner: "${data.winner}". ${data.savedTeams?.length || 0} winning team(s) saved to MongoDB.`
      })
      loadTeams()
    } catch (err) {
      setCompareMsg({ type: 'error', text: err.response?.data?.message || 'Comparison failed.' })
    } finally { setComparing(false) }
  }

  // ── Standard project AI eval ──────────────────────────────────────────────
  const handleEvaluate = async (projectId) => {
    setEvaluatingMap(p => ({ ...p, [projectId]: true }))
    try {
      await apiClient.post(`/api/projects/${projectId}/evaluate`)
      loadProjects()
    } catch (err) {
      alert(err.response?.data?.message || 'Evaluation failed')
    } finally { setEvaluatingMap(p => ({ ...p, [projectId]: false })) }
  }

  // ── LLM Project Evaluation (per submission from Google Sheets) ────────────
  const handleLLMEval = async (sub) => {
    const key = sub.teamName
    setLlmEvalLoading(m => ({ ...m, [key]: true }))
    const otherPitches = sheetSubs
      .filter(s => s.teamName !== sub.teamName)
      .map(s => s.pitchDescription)

    try {
      const { data } = await apiClient.post('/ai/evaluate-project-llm', {
        project_id: sub.teamName.toLowerCase().replace(/\s+/g, '-'),
        team_name: sub.teamName,
        pitch_description: sub.pitchDescription,
        github_repo_url: sub.githubRepoUrl,
        other_pitches: otherPitches,
      })
      setLlmEvalMap(m => ({ ...m, [key]: data }))
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message
      setLlmEvalMap(m => ({ ...m, [key]: { error: msg } }))
    } finally { setLlmEvalLoading(m => ({ ...m, [key]: false })) }
  }

  // ── Create Event ──────────────────────────────────────────────────────────
  const handleCreateEvent = async (e) => {
    e.preventDefault()
    setCreatingEvent(true)
    try {
      const { data } = await apiClient.post('/api/events', {
        ...eventForm,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      if (data.success) { setShowCreateModal(false); loadEvents() }
    } catch (err) { alert(err.response?.data?.message || 'Failed to create event') }
    finally { setCreatingEvent(false) }
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const evalProjects  = projects.filter(p => p.aiEvaluation?.originalityScore !== undefined)
  const avgOriginality = evalProjects.length
    ? Math.round(evalProjects.reduce((s, p) => s + p.aiEvaluation.originalityScore, 0) / evalProjects.length)
    : 0

  // ── Compare bar-chart data ────────────────────────────────────────────────
  const compareBarData = compareResult ? [
    {
      method: 'Algorithmic',
      score: compareResult.comparison?.algorithmic?.average_skill_coverage_score ?? 0,
      fill: '#6366F1',
    },
    {
      method: 'LLM',
      score: compareResult.comparison?.llm?.average_skill_coverage_score ?? 0,
      fill: compareResult.comparison?.llm ? '#A78BFA' : '#374151',
    },
  ] : []

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              Admin <span className="gradient-text">Control Centre</span>
            </h1>
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
              isRealtimeConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isRealtimeConnected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              {isRealtimeConnected ? '🟢 REALTIME LIVE' : '⚪ CONNECTING...'}
            </div>
          </div>
          <p className="text-sm text-slate-500">AI-powered team formation, LLM project evaluation & Google Sheets sync</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}
            className="input py-2 text-sm pr-8 cursor-pointer w-52">
            {events.map(evt => (
              <option key={evt._id} value={evt._id}>{evt.name}</option>
            ))}
          </select>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary text-xs px-4">
            + New Event
          </button>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Active Events',      value: events.length,         sub: 'Hackathons live',         color: '#818CF8', icon: Zap },
          { label: 'Teams Formed',       value: teams.length,          sub: 'AI auto-matched',         color: '#4ADE80', icon: Users },
          { label: 'Projects Submitted', value: projects.length,       sub: 'Pitches evaluated',       color: '#60A5FA', icon: GitBranch },
          { label: 'Avg Originality',    value: `${avgOriginality}%`,  sub: 'NLP similarity score',    color: '#A78BFA', icon: TrendingUp },
        ].map(({ label, value, sub, color, icon: Icon }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="section-title">{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
                <Icon size={15} style={{ color }} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color, fontFamily: "'Space Grotesk',sans-serif" }}>{value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart + Auto-Form ───────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Activity Chart */}
        <div className="glass p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                Platform Activity
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Teams formed & projects submitted over time</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-brand-400"><span className="w-2 h-2 rounded-full bg-brand-400" /> Teams</span>
              <span className="flex items-center gap-1.5 text-violet-400"><span className="w-2 h-2 rounded-full bg-violet-400" /> Projects</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTeams" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradProjects" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="teams" name="Teams" stroke="#6366F1" strokeWidth={2}
                fill="url(#gradTeams)" dot={{ fill:'#6366F1', r:3, strokeWidth:0 }} activeDot={{ r:5, fill:'#818CF8' }} />
              <Area type="monotone" dataKey="projects" name="Projects" stroke="#8B5CF6" strokeWidth={2}
                fill="url(#gradProjects)" dot={{ fill:'#8B5CF6', r:3, strokeWidth:0 }} activeDot={{ r:5, fill:'#A78BFA' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* AI Team Engine */}
        <div className="glass p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-white mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              AI Team Engine
            </h2>
            <p className="text-xs text-slate-500">Greedy complementary skill allocation — balances skills automatically.</p>
          </div>

          <Banner msg={autoFormMsg} />

          <button onClick={handleAutoFormTeams} disabled={autoForming || !selectedEventId} className="btn-primary w-full py-3 text-sm">
            {autoForming ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Forming Teams via AI...
              </span>
            ) : '⚡ Auto-Form Teams'}
          </button>

          <div className="flex-1 overflow-auto space-y-2">
            {teams.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-600">No teams yet. Click Auto-Form to generate.</div>
            ) : teams.map((team, i) => {
              const score = team.skillCoverageScore ?? (75 + i * 3)
              return (
                <div key={team._id} className="p-3 rounded-xl flex items-center gap-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-brand-300 flex-shrink-0"
                    style={{ background: 'rgba(99,102,241,0.12)' }}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{team.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{team.members?.length || 0} members</div>
                    <ScoreBar value={score} color="#6366F1" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 flex-shrink-0">{score}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Google Sheets Sync Panel ────────────────────────── */}
      <div className="glass p-5">
        <SectionHeader icon={Database} title="Google Sheets Integration & Sync" iconColor="#34D399"
          subtitle="Paste your Google Sheet link or Spreadsheet ID to sync live participant registration data">
          <div className="flex gap-2">
            <button onClick={syncRegistrations} disabled={syncingRegs}
              className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5">
              <RefreshCw size={12} className={syncingRegs ? 'animate-spin' : ''} />
              {syncingRegs ? 'Syncing…' : 'Sync Registrations'}
            </button>
            <button onClick={syncSubmissions} disabled={syncingSubs}
              className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5">
              <RefreshCw size={12} className={syncingSubs ? 'animate-spin' : ''} />
              {syncingSubs ? 'Syncing…' : 'Sync Submissions'}
            </button>
          </div>
        </SectionHeader>

        <Banner msg={sheetsMsg} />

        {/* Input box for Google Sheets link */}
        <div className="mt-4 p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-xs font-semibold text-white flex items-center gap-2">
            <span>🔗 Insert Google Sheet Link for Registration</span>
            <span className="text-[10px] text-slate-500 font-normal">(Paste URL or Spreadsheet ID from Google Forms response sheet)</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={regSheetUrl}
              onChange={(e) => setRegSheetUrl(e.target.value)}
              placeholder="e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
              className="input text-xs flex-1 px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
            <button
              onClick={syncRegistrations}
              disabled={syncingRegs}
              className="btn-primary text-xs px-4 py-2 flex-shrink-0"
            >
              {syncingRegs ? 'Importing…' : 'Import & Sync Sheet'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Registrations */}
          <div>
            <button onClick={() => setShowRegs(r => !r)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 mb-3 hover:text-white transition-colors">
              <span className="flex items-center gap-2">
                <Users size={13} style={{ color: '#34D399' }} />
                Registrations ({sheetRegs.length})
              </span>
              {showRegs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showRegs && (
              sheetRegs.length === 0 ? (
                <div className="text-xs text-slate-600 text-center py-4">
                  Click "Sync Registrations" to load data from Google Sheets.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {sheetRegs.map((reg, i) => (
                    <div key={i} className="p-3 rounded-xl"
                      style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.1)' }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-white">{reg.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                          {reg.experienceLevel}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mb-1.5">{reg.email}</div>
                      <div className="flex flex-wrap gap-1">
                        {reg.skills.map(s => (
                          <span key={s} className="badge badge-brand text-[9px] py-0">{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Submissions */}
          <div>
            <button onClick={() => setShowSubs(s => !s)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 mb-3 hover:text-white transition-colors">
              <span className="flex items-center gap-2">
                <GitBranch size={13} style={{ color: '#60A5FA' }} />
                Submissions ({sheetSubs.length})
              </span>
              {showSubs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showSubs && (
              sheetSubs.length === 0 ? (
                <div className="text-xs text-slate-600 text-center py-4">
                  Click "Sync Submissions" to load data from Google Sheets.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {sheetSubs.map((sub, i) => (
                    <div key={i} className="p-3 rounded-xl"
                      style={{ background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.1)' }}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-white">{sub.teamName}</span>
                        <a href={sub.githubRepoUrl} target="_blank" rel="noreferrer"
                          className="text-[10px] text-brand-400 hover:text-brand-300 flex items-center gap-1 flex-shrink-0">
                          <ExternalLink size={10} /> Repo
                        </a>
                      </div>
                      {sub.teamMembers?.length > 0 && (
                        <div className="text-[10px] text-slate-500 mb-1">
                          👥 {sub.teamMembers.join(', ')}
                        </div>
                      )}
                      {sub.teamLeaderEmail && (
                        <div className="text-[10px] text-slate-600 mb-1.5">✉ {sub.teamLeaderEmail}</div>
                      )}
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                        {sub.pitchDescription}
                      </p>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── Compare Teams Panel (Algo vs LLM) ──────────────── */}
      <div className="glass p-5">
        <SectionHeader icon={Scale} title="Compare Team Formation" iconColor="#F59E0B"
          subtitle="Run algorithmic + LLM matching on identical participant input — save the winner to MongoDB">
          <button onClick={handleCompareTeams} disabled={comparing || !selectedEventId}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-2">
            {comparing ? (
              <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg> Comparing…</>
            ) : '⚖ Run Comparison'}
          </button>
        </SectionHeader>

        <Banner msg={compareMsg} />

        {compareResult && (
          <div className="mt-4 space-y-5">

            {/* Winner badge */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <Trophy size={14} style={{ color: '#F59E0B' }} />
                <span className="text-sm font-bold" style={{ color: '#F59E0B', fontFamily: "'Space Grotesk',sans-serif" }}>
                  Winner: {compareResult.winner?.toUpperCase()}
                </span>
              </div>
              {!compareResult.comparison?.llm_available && (
                <span className="text-[10px] text-amber-400 flex items-center gap-1">
                  <AlertCircle size={11} /> LLM unavailable (no ANTHROPIC_API_KEY)
                </span>
              )}
            </div>

            {/* Score bar chart */}
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareBarData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="method" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} formatter={(v) => `${v}%`} />
                  <Bar dataKey="score" name="Avg Coverage Score" radius={[6, 6, 0, 0]}>
                    {compareBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Teams grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {['algorithmic', 'llm'].map(method => {
                const result = compareResult.comparison?.[method]
                if (!result) return (
                  <div key={method} className="p-4 rounded-xl text-center text-xs text-slate-600"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    {method === 'llm' ? 'LLM not available — set ANTHROPIC_API_KEY' : 'No data'}
                  </div>
                )
                const isWinner = compareResult.winner === method
                const color = method === 'algorithmic' ? '#6366F1' : '#A78BFA'
                return (
                  <div key={method} className="p-4 rounded-xl space-y-3"
                    style={{
                      background: isWinner ? `${color}08` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isWinner ? `${color}25` : 'rgba(255,255,255,0.05)'}`
                    }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold capitalize" style={{ color, fontFamily: "'Space Grotesk',sans-serif" }}>
                        {method}
                        {isWinner && <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-400">WINNER</span>}
                      </span>
                      <span className="text-sm font-bold font-mono" style={{ color }}>
                        {result.average_skill_coverage_score}%
                      </span>
                    </div>
                    <ScoreBar value={result.average_skill_coverage_score} color={color} />
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {result.teams?.map((t, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Team {t.team_id}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">{(t.members || t.member_ids || []).length} members</span>
                            <span className="font-mono font-semibold" style={{ color }}>{t.skill_coverage_score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── LLM Project Evaluation (from Sheets) ───────────── */}
      {sheetSubs.length > 0 && (
        <div className="glass p-5">
          <SectionHeader icon={Shield} title="LLM Project Evaluation" iconColor="#F472B6"
            subtitle="Claude evaluates each submission — originality vs other pitches, GitHub effort score, similarity detection">
          </SectionHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sheetSubs.map((sub, i) => {
              const key = sub.teamName
              const result = llmEvalMap[key]
              const loading = llmEvalLoading[key]
              return (
                <div key={i} className="p-4 rounded-xl space-y-3"
                  style={{ background: 'rgba(244,114,182,0.03)', border: '1px solid rgba(244,114,182,0.1)' }}>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white mb-0.5" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                        {sub.teamName}
                      </div>
                      <a href={sub.githubRepoUrl} target="_blank" rel="noreferrer"
                        className="text-[10px] text-brand-400 hover:underline flex items-center gap-1">
                        <ExternalLink size={9} /> {sub.githubRepoUrl?.replace('https://github.com/', '')}
                      </a>
                    </div>
                    <button onClick={() => handleLLMEval(sub)} disabled={loading}
                      className="btn-ghost text-[10px] px-3 py-1.5 flex-shrink-0 flex items-center gap-1">
                      {loading ? (
                        <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg> Running…</>
                      ) : result ? 'Re-Evaluate' : '🤖 LLM Evaluate'}
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{sub.pitchDescription}</p>

                  {result?.error && (
                    <div className="text-[10px] text-red-400 flex items-center gap-1 p-2 rounded-lg bg-red-500/8 border border-red-500/15">
                      <AlertCircle size={11} className="flex-shrink-0" /> {result.error}
                    </div>
                  )}

                  {result && !result.error && (
                    <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      {/* Score grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-slate-500">Originality</span>
                            <span className="font-mono font-bold text-emerald-400">{result.originality_score}%</span>
                          </div>
                          <ScoreBar value={result.originality_score} color="#4ADE80" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-slate-500">Tech Effort</span>
                            <span className="font-mono font-bold text-blue-400">{result.technical_effort_score}%</span>
                          </div>
                          <ScoreBar value={result.technical_effort_score} color="#60A5FA" />
                        </div>
                      </div>

                      {/* GitHub stats */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { label: 'Commits', value: result.github_stats?.commit_count ?? '—', color: '#E2E8F0' },
                          { label: 'Contributors', value: result.github_stats?.contributors_count ?? '—', color: '#FB923C' },
                          { label: 'Language', value: result.github_stats?.primary_language ?? '—', color: '#818CF8' },
                        ].map(({ label, value, color }) => (
                          <div key={label}>
                            <div className="text-[9px] text-slate-600 mb-0.5">{label}</div>
                            <div className="text-[11px] font-bold font-mono" style={{ color }}>{value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Similarity flags */}
                      {result.flagged_as_similar_to?.length > 0 && (
                        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/8 border border-amber-500/15">
                          <AlertCircle size={11} className="text-amber-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-[10px] text-amber-400 font-semibold mb-0.5">Similar to another pitch</div>
                            {result.flagged_as_similar_to.map((f, j) => (
                              <div key={j} className="text-[9px] text-slate-500 line-clamp-1">"{f}"</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feedback */}
                      <p className="text-[10px] text-slate-400 leading-relaxed italic border-l-2 pl-2"
                        style={{ borderColor: '#F472B6' }}>
                        {result.summary_feedback}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Standard Project Evaluation ─────────────────────── */}
      <div className="glass p-5">
        <SectionHeader icon={GitBranch} title="Submitted Projects" iconColor="#60A5FA"
          subtitle="NLP sentence embedding originality check + live GitHub API activity scores">
          <button onClick={loadProjects} className="btn-ghost text-xs px-3 py-2">Refresh</button>
        </SectionHeader>

        {loadingProjects ? (
          <div className="py-10 text-center text-xs text-slate-600 font-mono">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-600">No projects submitted yet.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {projects.map((project) => {
              const ev = project.aiEvaluation || {}
              const hasEval = ev.originalityScore !== undefined
              const isEval = evaluatingMap[project._id]
              return (
                <div key={project._id} className="glass-hover p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {ev.primaryLanguage && <span className="badge badge-brand text-[10px]">{ev.primaryLanguage}</span>}
                        {ev.flaggedAsSimilarTo?.length > 0 && <span className="badge badge-amber text-[10px]">⚠ Similar Pitch</span>}
                      </div>
                      <a href={project.githubRepoUrl} target="_blank" rel="noreferrer"
                        className="text-xs font-mono text-brand-400 hover:text-brand-300 hover:underline truncate block">
                        {project.githubRepoUrl}
                      </a>
                    </div>
                    <button onClick={() => handleEvaluate(project._id)} disabled={isEval}
                      className="btn-ghost text-[10px] px-3 py-1.5 flex-shrink-0">
                      {isEval ? 'Running...' : hasEval ? 'Re-run AI' : 'Run AI'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{project.pitchDescription}</p>

                  {hasEval ? (
                    <div className="grid grid-cols-4 gap-2 pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      {[
                        { label: 'Originality',  value: `${ev.originalityScore}%`, color: '#4ADE80' },
                        { label: 'GitHub',       value: `${ev.githubActivityScore}%`, color: '#818CF8' },
                        { label: 'Commits',      value: ev.commitCount ?? 0, color: '#E2E8F0' },
                        { label: 'Contributors', value: ev.contributorsCount ?? 0, color: '#FB923C' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="text-center">
                          <div className="text-[10px] text-slate-600 mb-0.5">{label}</div>
                          <div className="text-sm font-bold font-mono" style={{ color }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-600 text-center py-2 border-t border-dashed" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      No AI evaluation yet — click Run AI
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Create Event Modal ───────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="glass w-full max-w-md p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                Create Hackathon Event
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="input-label">Event Name</label>
                <input type="text" required value={eventForm.name}
                  onChange={e => setEventForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="HackForge Global AI Hackathon" className="input" />
              </div>
              <div>
                <label className="input-label">Description</label>
                <textarea rows={3} required value={eventForm.description}
                  onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Build state-of-the-art AI apps in 48 hours..." className="input" />
              </div>
              <div>
                <label className="input-label">Team Size</label>
                <input type="number" min={2} max={6} value={eventForm.teamSize}
                  onChange={e => setEventForm(f => ({ ...f, teamSize: Number(e.target.value) }))}
                  className="input font-mono" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-ghost flex-1 py-2.5">Cancel</button>
                <button type="submit" disabled={creatingEvent} className="btn-primary flex-1 py-2.5">
                  {creatingEvent ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
