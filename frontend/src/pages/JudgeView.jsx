import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, ChevronDown } from 'lucide-react'
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts'
import apiClient from '../api/client'

export default function JudgeView() {
  const [events, setEvents]     = useState([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [scoresMap, setScoresMap]     = useState({})
  const [feedbackMap, setFeedbackMap] = useState({})
  const [savingMap, setSavingMap]     = useState({})
  const [savedMap, setSavedMap]       = useState({})

  useEffect(() => { loadEvents() }, [])
  useEffect(() => { if (selectedEventId) loadProjects() }, [selectedEventId])

  const loadEvents = async () => {
    try {
      const { data } = await apiClient.get('/api/events')
      if (data.success && data.events.length > 0) {
        setEvents(data.events)
        setSelectedEventId(data.events[0]._id)
      }
    } catch {} finally { setLoading(false) }
  }

  const loadProjects = async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get('/api/projects')
      if (data.success) {
        setProjects(data.projects || [])
        const initScores = {}; const initFeedback = {}
        data.projects.forEach(p => {
          initScores[p._id]   = p.score ?? 75
          initFeedback[p._id] = p.feedback ?? ''
        })
        setScoresMap(initScores)
        setFeedbackMap(initFeedback)
      }
    } catch {} finally { setLoading(false) }
  }

  const handleSave = async (projectId) => {
    setSavingMap(m => ({ ...m, [projectId]: true }))
    setSavedMap(m => ({ ...m, [projectId]: false }))
    try {
      await apiClient.put(`/api/projects/${projectId}`, {
        score: scoresMap[projectId],
        feedback: feedbackMap[projectId],
      })
      setSavedMap(m => ({ ...m, [projectId]: true }))
      setTimeout(() => setSavedMap(m => ({ ...m, [projectId]: false })), 3000)
    } catch (err) { alert(err.response?.data?.message || 'Save failed') }
    finally { setSavingMap(m => ({ ...m, [projectId]: false })) }
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Judge <span className="gradient-text">Evaluation Panel</span>
          </h1>
          <p className="text-sm text-slate-500">AI-assisted scoring — review pitch originality and GitHub activity alongside your manual score</p>
        </div>
        <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}
          className="input py-2 text-sm w-52 cursor-pointer">
          {events.map(evt => <option key={evt._id} value={evt._id}>{evt.name}</option>)}
        </select>
      </div>

      {/* Projects */}
      {loading ? (
        <div className="glass p-16 text-center text-xs text-slate-600 font-mono">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="glass p-16 text-center text-sm text-slate-500">
          No submitted projects in this event yet.
        </div>
      ) : (
        <div className="space-y-5">
          {projects.map((project, idx) => {
            const ev = project.aiEvaluation || {}
            const currentScore = scoresMap[project._id] ?? 75
            const isSaving = savingMap[project._id]
            const isSaved  = savedMap[project._id]

            const radialData = [
              { name: 'Originality', value: ev.originalityScore ?? 0,      fill: '#4ADE80' },
              { name: 'GitHub',      value: ev.githubActivityScore ?? 0,    fill: '#818CF8' },
              { name: 'Judge',       value: currentScore,                   fill: '#FCD34D' },
            ]

            return (
              <div key={project._id} className="glass p-6 space-y-5 animate-fade-in">

                {/* Top Bar */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="badge badge-amber text-[10px]">Project #{idx + 1}</span>
                      {ev.primaryLanguage && <span className="badge badge-brand text-[10px]">{ev.primaryLanguage}</span>}
                      {ev.flaggedAsSimilarTo?.length > 0 && <span className="badge badge-red text-[10px]">Similarity Flag</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                      {project.teamId?.name || 'Submitted Project'}
                    </h3>
                    <a href={project.githubRepoUrl} target="_blank" rel="noreferrer"
                      className="text-xs font-mono text-brand-400 hover:underline truncate block mt-0.5">
                      {project.githubRepoUrl}
                    </a>
                  </div>
                  {isSaved && (
                    <span className="badge badge-green text-xs flex items-center gap-1">
                      <CheckCircle size={11} /> Saved
                    </span>
                  )}
                </div>

                {/* Pitch */}
                <div className="p-4 rounded-xl text-xs text-slate-300 leading-relaxed"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  {project.pitchDescription}
                </div>

                {/* Side-by-side: AI Scores vs Judge Input */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                  {/* AI Scores */}
                  <div className="p-4 rounded-xl space-y-4"
                    style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                        AI Evaluation Metrics
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">sentence-transformers + GitHub API</span>
                    </div>

                    {ev.originalityScore !== undefined ? (
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Originality',  value: `${ev.originalityScore}%`,      color: '#4ADE80' },
                          { label: 'GitHub Score', value: `${ev.githubActivityScore}%`,    color: '#818CF8' },
                          { label: 'Commits',      value: ev.commitCount ?? 0,            color: '#E2E8F0' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="text-center p-3 rounded-lg"
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div className="text-[10px] text-slate-500 mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{label}</div>
                            <div className="text-base font-bold font-mono" style={{ color }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 text-center py-4">
                        AI evaluation not run yet
                      </div>
                    )}
                  </div>

                  {/* Manual Judge Score */}
                  <div className="p-4 rounded-xl space-y-4"
                    style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                        Judge Score Input
                      </h4>
                      <span className="text-2xl font-black font-mono text-amber-300">{currentScore}</span>
                    </div>

                    {/* Slider */}
                    <div className="space-y-2">
                      <input type="range" min={0} max={100} value={currentScore}
                        onChange={e => setScoresMap(m => ({ ...m, [project._id]: Number(e.target.value) }))}
                        className="w-full cursor-pointer"
                        style={{ accentColor: '#F59E0B' }} />
                      <div className="flex justify-between text-[10px] font-mono text-slate-600">
                        <span>0</span><span>50</span><span>100</span>
                      </div>
                    </div>

                    {/* Feedback */}
                    <div>
                      <label className="input-label text-[10px]">Remarks</label>
                      <input type="text" value={feedbackMap[project._id] || ''}
                        onChange={e => setFeedbackMap(m => ({ ...m, [project._id]: e.target.value }))}
                        placeholder="Innovative approach, clean API design..."
                        className="input text-xs py-2" />
                    </div>

                    <button onClick={() => handleSave(project._id)} disabled={isSaving}
                      className="btn w-full py-2.5 text-xs font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg,#B45309,#F59E0B)', boxShadow: '0 0 20px rgba(245,158,11,0.2)' }}>
                      {isSaving ? 'Saving...' : 'Save Official Score'}
                    </button>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
