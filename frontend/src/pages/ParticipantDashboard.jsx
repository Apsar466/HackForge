import { useState, useEffect } from 'react'
import { Plus, X, GitBranch, Code2, Cpu, Loader2 } from 'lucide-react'
import apiClient from '../api/client'
import { useAuthStore } from '../store/useAuthStore'

const SKILL_SUGGESTIONS = [
  'React','Node.js','Python','TypeScript','Machine Learning','FastAPI','MongoDB',
  'GraphQL','Docker','Kubernetes','TensorFlow','PyTorch','Next.js','Rust','Go',
  'AWS','NLP','Computer Vision','Data Science','UI/UX Design','Blockchain'
]

const EXPERIENCE_LEVELS = [
  { value: 'beginner',      label: 'Beginner',      desc: '< 1 year',    color: '#4ADE80' },
  { value: 'intermediate',  label: 'Intermediate',  desc: '1–3 years',   color: '#818CF8' },
  { value: 'advanced',      label: 'Advanced',      desc: '3–5 years',   color: '#FB923C' },
  { value: 'expert',        label: 'Expert',        desc: '5+ years',    color: '#F472B6' },
]

export default function ParticipantDashboard() {
  const { user } = useAuthStore()
  const [events, setEvents]   = useState([])
  const [skills, setSkills]   = useState(user?.skills || [])
  const [expLevel, setExpLevel] = useState(user?.experienceLevel || 'intermediate')
  const [customSkill, setCustomSkill] = useState('')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  // Project submission
  const [projectForm, setProjectForm] = useState({
    githubRepoUrl: '',
    pitchDescription: '',
    selectedEventId: '',
    selectedTeamId: '',
  })
  const [teams, setTeams]       = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState(null)

  useEffect(() => { loadEvents() }, [])
  useEffect(() => {
    if (projectForm.selectedEventId) loadTeamsForEvent(projectForm.selectedEventId)
  }, [projectForm.selectedEventId])

  const loadEvents = async () => {
    try {
      const { data } = await apiClient.get('/api/events')
      if (data.success) {
        setEvents(data.events || [])
        if (data.events.length > 0)
          setProjectForm(f => ({ ...f, selectedEventId: data.events[0]._id }))
      }
    } catch {}
  }

  const loadTeamsForEvent = async (eventId) => {
    try {
      const { data } = await apiClient.get(`/api/teams?eventId=${eventId}`)
      if (data.success) setTeams(data.teams || [])
    } catch {}
  }

  const addSkill = (skill) => {
    const s = skill.trim()
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s])
    setCustomSkill('')
  }

  const removeSkill = (skill) => setSkills(prev => prev.filter(s => s !== skill))

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await apiClient.put('/api/auth/profile', { skills, experienceLevel: expLevel })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) { alert(err.response?.data?.message || 'Save failed') }
    finally { setSaving(false) }
  }

  const handleSubmitProject = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      const { data } = await apiClient.post('/api/projects', {
        githubRepoUrl:    projectForm.githubRepoUrl,
        pitchDescription: projectForm.pitchDescription,
        eventId:          projectForm.selectedEventId,
        teamId:           projectForm.selectedTeamId || undefined,
      })
      if (data.success) {
        setSubmitMsg({ type: 'success', text: 'Project submitted successfully! Judges can now score it.' })
        setProjectForm(f => ({ ...f, githubRepoUrl: '', pitchDescription: '' }))
      }
    } catch (err) {
      setSubmitMsg({ type: 'error', text: err.response?.data?.message || 'Submission failed.' })
    } finally { setSubmitting(false) }
  }

  const selectedExp = EXPERIENCE_LEVELS.find(l => l.value === expLevel) || EXPERIENCE_LEVELS[1]

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
          Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0] || 'Hacker'}</span>
        </h1>
        <p className="text-sm text-slate-500">Configure your profile and submit your project</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Skills & Profile Card ─────────────────────── */}
        <div className="glass p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Cpu size={17} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                Skills Profile
              </h2>
              <p className="text-[11px] text-slate-500">Used by AI engine for team matching</p>
            </div>
          </div>

          {/* Experience Level */}
          <div>
            <label className="input-label">Experience Level</label>
            <div className="grid grid-cols-2 gap-2">
              {EXPERIENCE_LEVELS.map(({ value, label, desc, color }) => (
                <button key={value} onClick={() => setExpLevel(value)}
                  className="p-3 rounded-xl text-left transition-all duration-200 border"
                  style={{
                    background: expLevel === value ? `${color}12` : 'rgba(255,255,255,0.02)',
                    borderColor: expLevel === value ? `${color}35` : 'rgba(255,255,255,0.06)',
                  }}>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: expLevel === value ? color : '#94A3B8', fontFamily: "'Space Grotesk',sans-serif" }}>
                    {label}
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Skill Chips */}
          <div>
            <label className="input-label">Your Skills</label>
            <div className="flex flex-wrap gap-2 min-h-12 p-3 rounded-xl border mb-3"
              style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.06)' }}>
              {skills.length === 0 && (
                <span className="text-xs text-slate-600 self-center">Add at least 3 skills</span>
              )}
              {skills.map(skill => (
                <span key={skill} className="badge badge-brand flex items-center gap-1 text-[11px]">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="hover:text-white ml-0.5">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>

            {/* Quick Add */}
            <div className="flex gap-2 mb-3">
              <input type="text" value={customSkill}
                onChange={e => setCustomSkill(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(customSkill) } }}
                placeholder="Type a skill and press Enter..."
                className="input text-xs py-2 flex-1" />
              <button onClick={() => addSkill(customSkill)}
                className="btn-ghost px-3 py-2 text-xs">
                <Plus size={14} />
              </button>
            </div>

            {/* Suggestion Pills */}
            <div className="flex flex-wrap gap-1.5">
              {SKILL_SUGGESTIONS.filter(s => !skills.includes(s)).slice(0, 10).map(skill => (
                <button key={skill} onClick={() => addSkill(skill)}
                  className="text-[10px] px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  + {skill}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSaveProfile} disabled={saving}
            className="btn-primary w-full py-3 text-sm">
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Skill Profile'}
          </button>
        </div>

        {/* ── Submit Project Card ───────────────────────── */}
        <div className="glass p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <Code2 size={17} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                Submit Project
              </h2>
              <p className="text-[11px] text-slate-500">AI will auto-score originality & GitHub activity</p>
            </div>
          </div>

          {submitMsg && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-xs ${
              submitMsg.type === 'success'
                ? 'bg-emerald-500/8 border border-emerald-500/15 text-emerald-400'
                : 'bg-red-500/8 border border-red-500/15 text-red-400'
            }`}>
              <span>{submitMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmitProject} className="space-y-4">
            <div>
              <label className="input-label">Hackathon Event</label>
              <select value={projectForm.selectedEventId}
                onChange={e => setProjectForm(f => ({ ...f, selectedEventId: e.target.value }))}
                className="input py-2 cursor-pointer">
                {events.map(evt => <option key={evt._id} value={evt._id}>{evt.name}</option>)}
              </select>
            </div>

            <div>
              <label className="input-label">Team (optional)</label>
              <select value={projectForm.selectedTeamId}
                onChange={e => setProjectForm(f => ({ ...f, selectedTeamId: e.target.value }))}
                className="input py-2 cursor-pointer">
                <option value="">— No team assigned —</option>
                {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="input-label flex items-center gap-1.5">
                <GitBranch size={11} /> GitHub Repo URL
              </label>
              <input type="url" required value={projectForm.githubRepoUrl}
                onChange={e => setProjectForm(f => ({ ...f, githubRepoUrl: e.target.value }))}
                placeholder="https://github.com/username/repo" className="input font-mono text-xs" />
            </div>

            <div>
              <label className="input-label">Pitch Description</label>
              <textarea rows={4} required value={projectForm.pitchDescription}
                onChange={e => setProjectForm(f => ({ ...f, pitchDescription: e.target.value }))}
                placeholder="Describe your project — what problem does it solve, what makes it unique, and what AI or ML technologies does it use?"
                className="input leading-relaxed text-xs" />
            </div>

            <button type="submit" disabled={submitting}
              className="btn w-full py-3 text-sm text-white"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#8B5CF6)', boxShadow: '0 0 20px rgba(139,92,246,0.25)' }}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Submitting...
                </span>
              ) : 'Submit Project for AI Evaluation'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
