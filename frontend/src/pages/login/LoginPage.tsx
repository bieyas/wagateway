import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wifi, User, Lock, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { authApi, deviceApi } from '@/lib/api'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setAuth, setDevice } = useAuthStore()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await authApi.login(username.trim(), password) as any
      const { accessToken, user } = res.data
      setAuth(accessToken, user.username || user.email, user.email, user.role, user.organizationId)
      // Auto-set first device token so chatApi and dashboardApi work immediately
      try {
        const devRes = await deviceApi.list() as any
        const devices = devRes?.data || []
        if (devices.length > 0) {
          setDevice(devices[0].token, devices[0].deviceId)
        }
      } catch (_) { /* non-critical */ }
      navigate('/')
    } catch (err: any) {
      setError(err?.message || 'Username atau password salah.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left panel - branding (desktop only) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-emerald-600 to-emerald-800 flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-0 w-40 h-40 rounded-full bg-white/5" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Wifi className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-xl">WA Gateway</p>
              <p className="text-emerald-200 text-xs">WhatsApp Business Platform</p>
            </div>
          </div>
        </div>

        <div className="relative space-y-6">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Gateway WhatsApp<br />dengan AI CS
            </h2>
            <p className="mt-4 text-emerald-100 text-lg leading-relaxed">
              Kelola pesan, automasi balasan, dan pantau percakapan dalam satu dashboard.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Multi Device', desc: 'Kelola banyak nomor' },
              { label: 'AI Powered', desc: 'GPT-4o CS Agent' },
              { label: 'Real-time', desc: 'WebSocket updates' },
              { label: 'Wablas API', desc: 'Drop-in compatible' },
            ].map(f => (
              <div key={f.label} className="bg-white/10 backdrop-blur rounded-xl p-3">
                <p className="text-white font-semibold text-sm">{f.label}</p>
                <p className="text-emerald-200 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="text-emerald-300 text-xs">v1.0.0 · Wablas Compatible</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900">WA Gateway</p>
              <p className="text-xs text-gray-400">WhatsApp Business Platform</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Selamat datang</h1>
            <p className="text-gray-500 mt-1.5">Masuk ke dashboard dengan akun admin Anda</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                Username
              </label>
              <input
                type="text"
                placeholder="Masukkan username..."
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 shadow-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                Password
              </label>
              <input
                type="password"
                placeholder="Masukkan password..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 shadow-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <span className="mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password.trim()}
              className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold rounded-xl shadow-sm shadow-emerald-200 transition-all"
            >
              {loading
                ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <><span>Masuk ke Dashboard</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-2">
            <p className="text-xs text-gray-400">Default: <span className="font-mono font-medium text-gray-600">admin@localhost / admin123</span></p>
            <p className="text-xs text-gray-400">
              Belum punya akun?{' '}
              <a href="/register" className="text-emerald-600 font-medium hover:underline">Daftarkan organisasi</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
