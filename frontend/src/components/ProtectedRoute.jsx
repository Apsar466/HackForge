import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, token } = useAuthStore()
  const location = useLocation()

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/50 border border-rose-800/60 flex items-center justify-center text-rose-400 text-2xl mb-4">
          🚫
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-gray-400 text-sm max-w-md mb-6">
          Your role (<span className="text-rose-300 font-mono font-semibold uppercase">{user.role}</span>) does not have permission to view this panel.
        </p>
        <button
          onClick={() => window.history.back()}
          className="btn-secondary text-sm"
        >
          Go Back
        </button>
      </div>
    )
  }

  return children
}
