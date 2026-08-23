import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { judgeClient } from '../supabase/client'

export default function JudgesRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const { data: { session } } = await judgeClient.auth.getSession()
        if (cancelled) return
        if (!session || !session.user) {
          navigate('/judges/login', { replace: true })
        } else {
          setAuthorized(true)
        }
      } catch (err) {
        console.error('Judge session check failed:', err)
        if (!cancelled) navigate('/judges/login', { replace: true })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-mainBackground flex flex-col items-center justify-center p-4">
        <div className="bg-card rounded-2xl p-8 border border-secondary/30 text-center max-w-sm w-full shadow-xl">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-mainText font-semibold text-base">Loading Judge Panel...</p>
          <p className="text-mutedText text-xs mt-1">Verifying judge session credentials</p>
        </div>
      </div>
    )
  }

  return authorized ? children : null
}
