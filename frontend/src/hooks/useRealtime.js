import { useEffect, useState, useRef } from 'react'

/**
 * Custom React hook for subscription to HackForge real-time Server-Sent Events (SSE).
 * @param {object} eventHandlers - Object mapping event names to handler functions, e.g. { sync_update: fn, teams_updated: fn }
 * @returns {{ isConnected: boolean, lastEvent: object | null }}
 */
export function useRealtime(eventHandlers = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent]     = useState(null)
  const handlersRef = useRef(eventHandlers)

  useEffect(() => {
    handlersRef.current = eventHandlers
  }, [eventHandlers])

  useEffect(() => {
    let apiBase = import.meta.env.VITE_API_BASE_URL || ''
    if (apiBase && !apiBase.startsWith('http://') && !apiBase.startsWith('https://')) {
      apiBase = `https://${apiBase}.onrender.com`
    }
    const streamUrl = `${apiBase}/api/realtime/stream`
    let eventSource = null

    try {
      eventSource = new EventSource(streamUrl)

      eventSource.onopen = () => {
        setIsConnected(true)
      }

      eventSource.onerror = (err) => {
        setIsConnected(false)
      }

      // Handshake connected event
      eventSource.addEventListener('connected', (e) => {
        setIsConnected(true)
      })

      // Register dynamic handlers for all specified events
      const events = ['connected', 'sync_update', 'teams_updated', 'leaderboard_updated', 'project_evaluated', 'score_updated']
      
      events.forEach((evtName) => {
        eventSource.addEventListener(evtName, (e) => {
          try {
            const data = JSON.parse(e.data)
            setLastEvent({ type: evtName, data, timestamp: new Date() })
            if (handlersRef.current[evtName]) {
              handlersRef.current[evtName](data)
            }
          } catch (err) {
            console.warn('[Realtime Hook] Failed to parse SSE message:', e.data)
          }
        })
      })

    } catch (err) {
      console.warn('[Realtime Hook] EventSource setup failed:', err.message)
      setIsConnected(false)
    }

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [])

  return { isConnected, lastEvent }
}
