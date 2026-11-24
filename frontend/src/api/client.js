import axios from 'axios'

/**
 * Shared Axios instance for all API calls from the frontend.
 * Vite's dev proxy rewrites `/api/*` → `http://localhost:4000/api/*`.
 * In production, set VITE_API_BASE_URL to the deployed backend URL.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
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
