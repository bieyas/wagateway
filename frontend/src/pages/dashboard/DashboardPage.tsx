import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Smartphone, MessageSquare, Bot, Wifi, WifiOff, ArrowUpRight, Activity, Users } from 'lucide-react'
import { deviceApi, chatApi, aiApi } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth.store'
import { truncate } from '@/lib/utils'

function StatCard({ icon: Icon, label, value, sub, gradient, iconBg, onClick }: {
  icon: React.ElementType; label: string; value: string | number
  sub?: string; gradient: string; iconBg: string; onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-5 text-white ${gradient} shadow-sm transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-md active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white/70 uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold mt-1.5 leading-none">{value}</p>
          {sub && <p className="text-xs text-white/60 mt-1.5 truncate">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'outline'; icon: typeof Wifi }> = {
  connected:    { label: 'Terhubung',  variant: 'success', icon: Wifi },
  connecting:   { label: 'Connecting', variant: 'warning', icon: Activity },
  disconnected: { label: 'Terputus',   variant: 'outline', icon: WifiOff },
}

export default function DashboardPage() {
  const { deviceId, token } = useAuthStore()
  const navigate = useNavigate()
  const { data: devRes } = useQuery({ queryKey: ['devices'], queryFn: () => deviceApi.list(), enabled: !!token })
  const { data: chatsRes } = useQuery({ queryKey: ['chats'], queryFn: () => chatApi.list(), enabled: !!token })
  const { data: aiRes } = useQuery({ queryKey: ['ai-config', deviceId], queryFn: () => aiApi.getConfig(deviceId!), enabled: !!token && !!deviceId })

  const devices = (devRes as any)?.data || []
  const chats = (chatsRes as any)?.data || []
  const aiConfig = (aiRes as any)?.data || {}
  const device = devices.find((d: any) => d.deviceId === deviceId) || devices[0]
  const statusCfg = STATUS_CONFIG[device?.status] || STATUS_CONFIG.disconnected
  const StatusIcon = statusCfg.icon

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview status dan aktivitas gateway</p>
        </div>
        <span className="hidden sm:block text-xs text-gray-400">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>

      {/* Device status banner */}
      {device && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${device.status === 'connected' ? 'bg-emerald-50' : 'bg-gray-100'}`}>
              <StatusIcon className={`w-6 h-6 ${device.status === 'connected' ? 'text-emerald-600' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <p className="font-semibold text-gray-900">{device.name}</p>
                <Badge variant={statusCfg.variant} dot>{statusCfg.label}</Badge>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {device.phone || 'Belum tersambung'} · <span className="font-mono text-xs">{device.deviceId}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-gray-900">{device.quotaUsed}<span className="text-gray-400 font-normal text-sm">/{device.quotaLimit}</span></p>
              <p className="text-xs text-gray-400">Quota terpakai</p>
              <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (device.quotaUsed / device.quotaLimit) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Smartphone} label="Total Device" value={devices.length}
          sub={`${devices.filter((d: any) => d.status === 'connected').length} terhubung`}
          gradient="bg-gradient-to-br from-violet-500 to-violet-700"
          iconBg="bg-white/20"
          onClick={() => navigate('/devices')} />
        <StatCard icon={MessageSquare} label="Percakapan" value={chats.length}
          sub={`${chats.filter((c: any) => c.isAIActive).length} aktif AI`}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
          iconBg="bg-white/20"
          onClick={() => navigate('/conversations')} />
        <StatCard icon={Users} label="Human Takeover" value={chats.filter((c: any) => c.humanTakeover).length}
          sub="Menunggu agen manusia"
          gradient="bg-gradient-to-br from-purple-500 to-purple-700"
          iconBg="bg-white/20"
          onClick={() => navigate('/conversations?filter=takeover')} />
        <StatCard icon={Bot} label="AI Agent"
          value={aiConfig.enabled ? 'ON' : 'OFF'}
          sub={aiConfig.persona || 'Belum dikonfigurasi'}
          gradient={aiConfig.enabled ? 'bg-gradient-to-br from-pink-500 to-rose-600' : 'bg-gradient-to-br from-gray-400 to-gray-600'}
          iconBg="bg-white/20"
          onClick={() => deviceId && navigate(`/ai-agent/${deviceId}`)} />
      </div>

      {/* Recent Chats */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="font-semibold text-sm text-gray-900">Percakapan Terbaru</span>
          </div>
          <a href="/conversations" className="text-xs text-emerald-600 hover:underline flex items-center gap-0.5">
            Lihat semua <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
        <div className="divide-y divide-gray-50">
          {chats.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">Belum ada percakapan</p>
            : chats.slice(0, 5).map((c: any) => (
              <div key={c.phone} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-xs font-bold text-emerald-600">
                  {(c.contactName || c.phone || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{c.contactName || c.phone}</p>
                  <p className="text-xs text-gray-400 truncate">{truncate(c.lastMessage || '', 50)}</p>
                </div>
                <Badge variant={c.humanTakeover ? 'warning' : c.isAIActive ? 'success' : 'outline'}>
                  {c.humanTakeover ? 'Human' : c.isAIActive ? 'AI' : 'Closed'}
                </Badge>
              </div>
            ))}
        </div>
      </div>
    </div>
    </div>
  )
}
