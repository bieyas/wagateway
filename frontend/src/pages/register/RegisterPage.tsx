import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Wifi, ArrowRight, ArrowLeft, Building2, User, Lock, AtSign } from 'lucide-react'
import { authApi, deviceApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth, setDevice } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    orgName: '', slug: '', email: '', password: '', confirmPassword: '', fullName: '',
  })

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (k === 'orgName') {
      setForm(f => ({ ...f, [k]: v, slug: v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { setError('Password tidak cocok'); return }
    if (form.password.length < 6) { setError('Password minimal 6 karakter'); return }
    setLoading(true)
    setError('')
    try {
      const res = await authApi.register({
        orgName: form.orgName,
        slug: form.slug,
        email: form.email,
        password: form.password,
        fullName: form.fullName,
      }) as any
      const { accessToken, user } = res.data
      setAuth(accessToken, user.username || user.email, user.email, user.role, user.organizationId)
      try {
        const devRes = await deviceApi.list() as any
        const devices = devRes?.data || []
        if (devices.length > 0) setDevice(devices[0].token, devices[0].deviceId)
      } catch (_) {}
      navigate('/')
    } catch (err: any) {
      setError(err?.message || 'Gagal mendaftarkan organisasi')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { key: 'orgName',  label: 'Nama Organisasi',     icon: Building2, type: 'text',     placeholder: 'PT Maju Jaya' },
    { key: 'slug',     label: 'Slug (URL identifier)',icon: AtSign,    type: 'text',     placeholder: 'maju-jaya' },
    { key: 'fullName', label: 'Nama Lengkap',         icon: User,      type: 'text',     placeholder: 'John Doe' },
    { key: 'email',    label: 'Email',                icon: User,      type: 'email',    placeholder: 'admin@example.com' },
    { key: 'password', label: 'Password',             icon: Lock,      type: 'password', placeholder: 'Min. 6 karakter' },
    { key: 'confirmPassword', label: 'Konfirmasi Password', icon: Lock, type: 'password', placeholder: 'Ulangi password' },
  ]

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-emerald-600 to-emerald-800 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Wifi className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-xl">WA Gateway</p>
            <p className="text-emerald-200 text-xs">WhatsApp Business Platform</p>
          </div>
        </div>
        <div className="relative space-y-4">
          <h2 className="text-4xl font-bold text-white leading-tight">Daftarkan<br />Organisasi Anda</h2>
          <p className="text-emerald-100 text-lg leading-relaxed">
            Setiap organisasi memiliki ruang terisolasi — device, percakapan, dan konfigurasi AI sepenuhnya terpisah antar tenant.
          </p>
          <div className="space-y-3 pt-2">
            {[
              'Isolasi data penuh per tenant',
              'Kelola tim dengan role owner/member',
              'Multi-device per organisasi',
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-emerald-100 text-sm">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <span className="text-white text-[10px]">✓</span>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-emerald-300 text-xs">v1.1.0 · Multi-Tenant</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <p className="font-bold text-gray-900">WA Gateway</p>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Daftarkan Organisasi</h1>
            <p className="text-gray-500 mt-1 text-sm">Buat akun owner untuk organisasi baru</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {fields.map(({ key, label, icon: Icon, type, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                  {label}
                </label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={e => set(key, e.target.value)}
                  required={key !== 'fullName'}
                  className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 shadow-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 transition-all"
                />
                {key === 'slug' && (
                  <p className="text-[11px] text-gray-400">Hanya huruf kecil, angka, dan tanda hubung</p>
                )}
              </div>
            ))}

            {error && (
              <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <span className="mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !form.orgName || !form.email || !form.password}
              className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold rounded-xl shadow-sm shadow-emerald-200 transition-all mt-1"
            >
              {loading
                ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <><span>Daftarkan Organisasi</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-100 text-center">
            <Link to="/login" className="text-xs text-gray-400 hover:text-emerald-600 flex items-center justify-center gap-1.5 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Sudah punya akun? Masuk
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
