import { useState, useEffect } from 'react'
import { Trophy, TrendingUp, Medal } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import apiClient from '../api/client'

const JUDGE_WEIGHT = 0.6
const AI_WEIGHT    = 0.4

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass px-3 py-2 text-xs">
        <p className="text-slate-300 mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="font-semibold font-mono" style={{ color: p.fill }}>
            Score: {p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

import { useCallback } from 'react'
import { useRealtime } from '../hooks/useRealtime'

export default function LeaderboardPage() {
  const [events, setEvents]     = useState([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [entries, setEntries]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [judgeWeight, setJudgeWeight] = useState(JUDGE_WEIGHT)
  const aiWeight = +(1 - judgeWeight).toFixed(2)

  useEffect(() => { loadEvents() }, [])
  useEffect(() => { if (selectedEventId) loadLeaderboard() }, [selectedEventId, judgeWeight])

  const loadEvents = async () => {
    try {
      const { data } = await apiClient.get('/api/events')
      if (data.success && data.events.length > 0) {
        setEvents(data.events)
        setSelectedEventId(data.events[0]._id)
      }
    } catch {} finally { setLoading(false) }
  }

  const loadLeaderboard = useCallback(async () => {
    if (!selectedEventId) return
    setLoading(true)
    try {
      const { data } = await apiClient.get(`/api/leaderboard/${selectedEventId}?judgeWeight=${judgeWeight}&aiWeight=${aiWeight}`)
      if (data.success) setEntries(data.leaderboard || [])
    } catch {} finally { setLoading(false) }
  }, [selectedEventId, judgeWeight, aiWeight])

  // ── Realtime SSE subscription for live leaderboard updates ────────────────
  const { isConnected: isRealtimeConnected } = useRealtime({
    leaderboard_updated: useCallback(() => {
      loadLeaderboard()
    }, [loadLeaderboard]),
    score_updated: useCallback(() => {
      loadLeaderboard()
    }, [loadLeaderboard]),
    project_evaluated: useCallback(() => {
      loadLeaderboard()
    }, [loadLeaderboard]),
  })

  const MEDAL_COLORS = ['#F59E0B', '#94A3B8', '#B45309']
  const RANK_COLORS  = ['rgba(245,158,11,0.12)', 'rgba(148,163,184,0.08)', 'rgba(180,83,9,0.08)']

  const chartData = entries.slice(0, 8).map((e, i) => ({
    name: e.teamName || `Team ${i+1}`,
    score: e.finalScore || e.score || 0,
  }))

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              <span className="gradient-text">Live</span> Leaderboard
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
          <p className="text-sm text-slate-500">Weighted ranking — AI evaluation + judge scores</p>
        </div>
        <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}
          className="input py-2 text-sm w-52 cursor-pointer">
          {events.map(evt => <option key={evt._id} value={evt._id}>{evt.name}</option>)}
        </select>
      </div>

      {/* Weight Control */}
      <div className="glass p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              Score Formula — Adjust Weighting
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Final Score = <span className="font-mono text-amber-400">{Math.round(judgeWeight * 100)}% Judge</span>
              {' '}+{' '}
              <span className="font-mono text-brand-400">{Math.round(aiWeight * 100)}% AI</span>
            </p>
          </div>
          <button onClick={loadLeaderboard} className="btn-ghost text-xs px-3 py-2">Recalculate</button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-amber-400 w-24 font-mono flex-shrink-0">
            Judge {Math.round(judgeWeight * 100)}%
          </span>
          <div className="flex-1 h-2 rounded-full overflow-hidden relative"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${judgeWeight * 100}%`, background: 'linear-gradient(90deg,#F59E0B,#6366F1)' }}></div>
          </div>
          <span className="text-xs text-brand-400 w-16 font-mono text-right flex-shrink-0">
            {Math.round(aiWeight * 100)}% AI
          </span>
        </div>
        <input type="range" min={0.1} max={0.9} step={0.05} value={judgeWeight}
          onChange={e => setJudgeWeight(+e.target.value)}
          className="w-full mt-2 cursor-pointer" style={{ accentColor: '#6366F1' }} />
      </div>

      {loading ? (
        <div className="glass p-16 text-center text-xs text-slate-600 font-mono">Computing rankings...</div>
      ) : entries.length === 0 ? (
        <div className="glass p-16 text-center text-sm text-slate-500">No scored projects yet. Judges need to submit scores first.</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

          {/* Bar Chart */}
          <div className="glass p-5 xl:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              Score Distribution
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B' }} angle={-35} textAnchor="end" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#B45309' : '#6366F1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Ranked List */}
          <div className="glass p-5 xl:col-span-3 space-y-3">
            <h3 className="text-sm font-semibold text-white mb-2" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              Rankings
            </h3>
            {entries.map((entry, idx) => {
              const finalScore = Math.round(entry.finalScore || entry.score || 0)
              const judgeScore = Math.round(entry.judgeScore || 0)
              const aiScore    = Math.round(entry.aiScore || 0)
              const isTop3     = idx < 3

              return (
                <div key={entry._id || idx}
                  className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200"
                  style={{
                    background: isTop3 ? RANK_COLORS[idx] : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isTop3 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                  }}>

                  {/* Rank Badge */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{
                      background: isTop3 ? `${MEDAL_COLORS[idx]}22` : 'rgba(255,255,255,0.04)',
                      color: isTop3 ? MEDAL_COLORS[idx] : '#64748B',
                      fontFamily: "'Space Grotesk',sans-serif",
                    }}>
                    {idx < 3 ? <Medal size={14} /> : idx + 1}
                  </div>

                  {/* Team Name + Progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-white truncate" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                        {entry.teamName || entry.projectTitle || `Entry ${idx + 1}`}
                      </span>
                      <span className="text-lg font-black font-mono ml-3 flex-shrink-0"
                        style={{ color: isTop3 ? MEDAL_COLORS[idx] : '#94A3B8' }}>
                        {finalScore}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{
                        width: `${finalScore}%`,
                        background: isTop3
                          ? `linear-gradient(90deg, ${MEDAL_COLORS[idx]}, ${MEDAL_COLORS[idx]}88)`
                          : 'linear-gradient(90deg,#6366F1,#8B5CF6)',
                      }}></div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-slate-500">
                      <span style={{ color: '#FCD34D' }}>J:{judgeScore}</span>
                      <span style={{ color: '#818CF8' }}>AI:{aiScore}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      )}
    </div>
  )
}
