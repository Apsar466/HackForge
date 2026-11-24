import { create } from 'zustand'
import apiClient from '../api/client'

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('hackforge_user') || 'null'),
  token: localStorage.getItem('hackforge_token') || null,
  selectedEvent: null,
  isAuthLoading: false,

  setAuth: (token, user) => {
    localStorage.setItem('hackforge_token', token)
    localStorage.setItem('hackforge_user', JSON.stringify(user))
    set({ token, user })
  },

  logout: () => {
    localStorage.removeItem('hackforge_token')
    localStorage.removeItem('hackforge_user')
    set({ token: null, user: null, selectedEvent: null })
  },

  setSelectedEvent: (event) => {
    set({ selectedEvent: event })
  },

  fetchCurrentUser: async () => {
    const { token } = get()
    if (!token) return
    set({ isAuthLoading: true })
    try {
      const { data } = await apiClient.get('/api/auth/me')
      if (data.success && data.user) {
        localStorage.setItem('hackforge_user', JSON.stringify(data.user))
        set({ user: data.user })
      }
    } catch {
      get().logout()
    } finally {
      set({ isAuthLoading: false })
    }
  },
}))
