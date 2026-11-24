import { useEffect, useState } from 'react'
import apiClient from '@/api/client'

/**
 * Temporary landing / health-check page.
 * Replace with the real home page once backend & AI service are wired up.
 */
export default function HomePage() {
  const [backendStatus, setBackendStatus] = useState('checking…')
  const [aiStatus, setAiStatus] = useState('checking…')

  useEffect(() => {
    // Ping backend health endpoint
    apiClient
      .get('/api/health')
      .then(({ data }) => setBackendStatus(`✅ ${data.message}`))
      .catch(() => setBackendStatus('❌ unreachable'))

    // Ping AI service health via backend proxy (or direct if CORS enabled)
    apiClient
      .get('/api/ai/health')
      .then(({ data }) => setAiStatus(`✅ ${data.message}`))
      .catch(() => setAiStatus('❌ unreachable'))
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      {/* Logo / brand */}
      <div className="text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-white">
          🔥 Hack<span className="text-forge-400">Forge</span>
        </h1>
        <p className="mt-3 text-gray-400 text-lg max-w-md">
          AI-powered hackathon management — team formation &amp; project evaluation.
        </p>
      </div>

      {/* Service status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        <StatusCard label="Frontend" status="✅ running" port="5173" />
        <StatusCard label="Backend" status={backendStatus} port="4000" />
        <StatusCard label="AI Service" status={aiStatus} port="8000" />
      </div>

      <p className="text-xs text-gray-600">Scaffolding mode — no business logic yet.</p>
    </main>
  )
}

function StatusCard({ label, status, port }) {
  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-300">{label}</span>
        <span className="badge">:{port}</span>
      </div>
      <p className="text-xs text-gray-400 break-words">{status}</p>
    </div>
  )
}
