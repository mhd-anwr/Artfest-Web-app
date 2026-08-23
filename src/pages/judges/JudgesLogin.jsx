import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { judgeClient } from '../../supabase/client'
import { Eye, EyeOff, Scale } from 'lucide-react'

export default function JudgesLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Enter your judge email and password')
      return
    }
    setLoading(true)
    setError('')

    try {
      await judgeClient.auth.signOut().catch(() => {})

      const { data, error } = await judgeClient.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setError(error.message || 'Invalid credentials. Try again.')
        return
      }

      if (!data?.user) {
        await judgeClient.auth.signOut().catch(() => {})
        setError('Invalid credentials. Try again.')
        return
      }

      navigate('/judges/results', { replace: true })
    } catch (err) {
      console.error('Judge login failed:', err)
      setError('Login failed. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#01233D] text-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background atmospheric glows */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#017D8B]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#01B998]/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 bg-[#013157]/90 backdrop-blur-xl rounded-2xl p-6 sm:p-8 w-full max-w-sm mx-4 sm:mx-0 shadow-2xl border border-[#017D8B]/40">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Scale size={24} className="text-[#01B998]" />
          <h2 className="text-2xl font-poppins font-bold text-white text-center">Judges Login</h2>
        </div>
        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
        <input
          className="w-full bg-[#011D33] text-white rounded-xl p-3 mb-4 outline-none border border-[#017D8B]/50 focus:border-[#01B998] transition"
          placeholder="Judge username"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
        <div className="relative mb-6">
          <input
            type={showPassword ? 'text' : 'password'}
            className="w-full bg-[#011D33] text-white rounded-xl p-3 pr-12 outline-none border border-[#017D8B]/50 focus:border-[#01B998] transition"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#01B998] hover:text-white transition"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#01B998] via-[#19BB47] to-[#AEE515] text-[#011D33] rounded-xl p-3 font-extrabold hover:opacity-95 transition shadow-md"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <button
          onClick={() => navigate('/')}
          className="w-full text-[#D8EDE4] text-sm mt-4 hover:text-white transition text-center"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
