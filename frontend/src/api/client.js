import axios from 'axios'

/**
 * Shared Axios instance for all API calls from the frontend.
 * Vite's dev proxy rewrites `/api/*` → `http://localhost:4000/api/*`.
 * In production, normalize VITE_API_BASE_URL (prepend https:// if Render provided bare host).
 */
let rawBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
if (rawBaseUrl && !rawBaseUrl.startsWith('http://') && !rawBaseUrl.startsWith('https://')) {
  rawBaseUrl = `https://${rawBaseUrl}.onrender.com`
}

const apiClient = axios.create({
  baseURL: rawBaseUrl,
  timeout: 90_000,  // 90s — LLM evaluation calls can take up to 60s
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor: attach JWT if present ────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('hackforge_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: global error handling ───────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear and redirect to login
      localStorage.removeItem('hackforge_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
