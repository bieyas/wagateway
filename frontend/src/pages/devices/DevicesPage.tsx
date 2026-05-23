import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Wifi, WifiOff, QrCode, Trash2, RefreshCw, Link2, Bot, Zap, Cpu, Globe } from 'lucide-react'
import { deviceApi } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AppModal } from '@/components/ui/app-modal'
import { useAuthStore } from '@/store/auth.store'
import io from 'socket.io-client'

const STATUS_CFG: Record<string, { variant: 'success' | 'warning' | 'outline'; label: string; icon: typeof Wifi }> = {
  connected:    { variant: 'success', label: 'Terhubung',  icon: Wifi },
  connecting:   { variant: 'warning', label: 'Connecting', icon: Zap },
  disconnected: { variant: 'outline', label: 'Terputus',   icon: WifiOff },
}

export default function DevicesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { jwt } = useAuthStore()
  const [showCreate, setShowCreate] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [showWebhook, setShowWebhook] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<any>(null)
  const [newName, setNewName] = useState('')
  const [newToken, setNewToken] = useState('')
  const [qrImage, setQrImage] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [newEngine, setNewEngine] = useState<'baileys' | 'wwebjs'>('baileys')
  const [showEngineSwitch, setShowEngineSwitch] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceApi.list(),
    refetchInterval: 15000,
    enabled: !!jwt,
  })
  const devices = (data as any)?.data || []

  useEffect(() => {
    const socket = io('/ws', { path: '/socket.io' })
    socket.on('device.qr', ({ deviceId, qr }: any) => {
      if (selectedDevice?.deviceId === deviceId) setQrImage(qr)
    })
    socket.on('device.connected', () => qc.invalidateQueries({ queryKey: ['devices'] }))
    socket.on('device.disconnected', () => qc.invalidateQueries({ queryKey: ['devices'] }))
    return () => { socket.disconnect() }
  }, [qc, selectedDevice])

  const engineSwitchMut = useMutation({
    mutationFn: ({ deviceId, engine }: { deviceId: string; engine: string }) =>
      deviceApi.update(deviceId, { engine }),
    onSuccess: () => { setShowEngineSwitch(false); qc.invalidateQueries({ queryKey: ['devices'] }) },
  })

  const createMut = useMutation({
    mutationFn: () => deviceApi.create({ name: newName, engine: newEngine }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      setNewToken(res.data?.token || '')
      setNewName('')
    },
  })

  const connectMut = useMutation({
    mutationFn: (id: string) => deviceApi.connect(id),
    onSuccess: async (_, id) => {
      setQrImage('')
      setShowQR(true)
      await new Promise(r => setTimeout(r, 2500))
      const res = await deviceApi.qr(id) as any
      if (res.data?.qrcode) setQrImage(res.data.qrcode)
    },
  })

  const disconnectMut = useMutation({
    mutationFn: (id: string) => deviceApi.disconnect(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deviceApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  })

  const webhookMut = useMutation({
    mutationFn: () => deviceApi.update(selectedDevice?.deviceId, {
      ...(webhookUrl ? { webhookUrl } : {}),
      ...(trackingUrl ? { trackingUrl } : {}),
    }),
    onSuccess: () => { setShowWebhook(false); qc.invalidateQueries({ queryKey: ['devices'] }) },
  })

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
    <div className="p-4 sm:p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Devices</h1>
          <p className="text-sm text-gray-500 mt-0.5">{devices.length} perangkat terdaftar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => { setNewToken(''); setShowCreate(true) }}>
            <Plus className="w-4 h-4" /> Tambah Device
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      )}

      {devices.length === 0 && !isLoading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Wifi className="w-8 h-8 text-gray-300" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">Belum ada device</p>
            <p className="text-sm text-gray-400 mt-1">Klik "Tambah Device" untuk memulai</p>
          </div>
          <Button className="mt-2" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Tambah Device
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {devices.map((d: any) => {
          const cfg = STATUS_CFG[d.status] || STATUS_CFG.disconnected
          const StatusIcon = cfg.icon
          const isActive = false

          return (
            <Card key={d.id} className={`transition-all ${isActive ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3.5">
                  {/* Status icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${d.status === 'connected' ? 'bg-emerald-50' : 'bg-gray-100'}`}>
                    <StatusIcon className={`w-5 h-5 ${d.status === 'connected' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{d.name}</p>
                      <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
                      {isActive && <Badge variant="info">Aktif</Badge>}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        d.engine === 'wwebjs'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {d.engine === 'wwebjs' ? <Globe className="w-2.5 h-2.5" /> : <Cpu className="w-2.5 h-2.5" />}
                        {d.engine === 'wwebjs' ? 'WWebJS' : 'Baileys'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{d.deviceId}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {d.phone || 'Belum tersambung'}
                      {d.webhookUrl && <span className="ml-2 text-emerald-600">· Webhook ✓</span>}
                    </p>
                    {/* Quota bar */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (d.quotaUsed / d.quotaLimit) * 100)}%` }} />
                      </div>
                      <span className="text-[11px] text-gray-400 shrink-0">{d.quotaUsed}/{d.quotaLimit}</span>
                    </div>
                  </div>

                  <div className="relative shrink-0">
                    <button
                      onClick={() => navigate(`/devices/${d.deviceId}/ai-agent`)}
                      title="AI Agent"
                      className="p-1.5 rounded-lg hover:bg-pink-50 text-gray-300 hover:text-pink-500 transition-colors"
                    >
                      <Bot className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-4 pt-3.5 border-t border-gray-50">
                  {d.status !== 'connected' ? (
                    <Button size="sm" variant="default" loading={connectMut.isPending && selectedDevice?.deviceId === d.deviceId}
                      onClick={() => { setSelectedDevice(d); connectMut.mutate(d.deviceId) }}>
                      <QrCode className="w-3.5 h-3.5" /> Hubungkan
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" loading={disconnectMut.isPending}
                      onClick={() => disconnectMut.mutate(d.deviceId)}>
                      <WifiOff className="w-3.5 h-3.5" /> Putuskan
                    </Button>
                  )}
                  <Button size="sm" variant="outline"
                    onClick={() => { setSelectedDevice(d); setWebhookUrl(d.webhookUrl || ''); setTrackingUrl(d.trackingUrl || ''); setShowWebhook(true) }}>
                    <Link2 className="w-3.5 h-3.5" /> Webhook
                  </Button>
                  <Button size="sm" variant="outline" className="text-pink-600 border-pink-200 hover:bg-pink-50"
                    onClick={() => navigate(`/devices/${d.deviceId}/ai-agent`)}>
                    <Bot className="w-3.5 h-3.5" /> AI Agent
                  </Button>
                  <Button size="sm" variant="ghost"
                    onClick={() => { setSelectedDevice(d); setShowEngineSwitch(true) }}
                    title="Ganti Engine">
                    <Cpu className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="ml-auto text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => { if (confirm(`Hapus "${d.name}"?`)) deleteMut.mutate(d.deviceId) }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create Dialog */}
      <AppModal
        open={showCreate}
        onClose={v => { setShowCreate(v); if (!v) { setNewName(''); setNewToken(''); setNewEngine('baileys') } }}
        title="Tambah Device Baru"
        description="Device akan dibuat dengan token otomatis"
      >
          {newToken ? (
            <div className="space-y-4 mt-1">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-[10px] font-bold">✓</span>
                  </div>
                  <p className="text-sm font-semibold text-emerald-800">Device berhasil dibuat!</p>
                </div>
                <p className="text-xs text-emerald-700 pl-7">Simpan token berikut — tidak bisa dilihat lagi:</p>
                <div className="bg-white border border-emerald-200 rounded-lg p-3 mt-1">
                  <code className="text-xs text-gray-800 break-all font-mono leading-relaxed">{newToken}</code>
                </div>
              </div>
              <Button className="w-full" onClick={() => setShowCreate(false)}>Selesai</Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Nama Device</label>
                <Input placeholder="Contoh: Toko ABC - CS" value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && newName && createMut.mutate()}
                  autoFocus />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Pilih Engine</label>
                <div className="grid grid-cols-2 gap-3">
                  {([{ key: 'baileys', icon: Cpu, label: 'Baileys', desc: 'Ringan & cepat', sub: 'WebSocket native', color: 'blue' },
                    { key: 'wwebjs', icon: Globe, label: 'WWebJS', desc: 'Lebih kompatibel', sub: 'Browser-based', color: 'purple' }] as const).map(({ key, icon: Icon, label, desc, sub, color }) => (
                    <button key={key} type="button" onClick={() => setNewEngine(key)}
                      className={`flex flex-col items-start gap-0.5 p-3.5 rounded-xl border-2 transition-all text-left ${
                        newEngine === key
                          ? color === 'blue' ? 'border-blue-500 bg-blue-50' : 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                      <div className={`flex items-center gap-2 mb-1 ${
                        newEngine === key ? (color === 'blue' ? 'text-blue-700' : 'text-purple-700') : 'text-gray-700'
                      }`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-semibold">{label}</span>
                      </div>
                      <span className={`text-xs font-medium ${
                        newEngine === key ? (color === 'blue' ? 'text-blue-600' : 'text-purple-600') : 'text-gray-600'
                      }`}>{desc}</span>
                      <span className="text-[11px] text-gray-400">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!newName.trim()}>
                Buat Device
              </Button>
            </div>
          )}
      </AppModal>

      {/* QR Dialog */}
      <AppModal
        open={showQR}
        onClose={setShowQR}
        title="Scan QR Code"
        description="Buka WhatsApp → Perangkat Tertaut → Tautkan Perangkat, lalu arahkan kamera ke QR di bawah"
        size="sm"
      >
        <div className="flex flex-col items-center py-2 gap-3">
          {qrImage ? (
            <div className="p-2.5 bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
              <img src={qrImage} alt="QR Code" className="w-60 h-60 rounded-lg" />
            </div>
          ) : (
            <div className="w-60 h-60 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-gray-300 animate-spin" />
              <p className="text-sm text-gray-400 font-medium">Memuat QR code...</p>
            </div>
          )}
          <div className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5 w-full">
            <span className="text-gray-400 text-sm mt-0.5">ℹ</span>
            <p className="text-xs text-gray-500 leading-relaxed">QR diperbarui otomatis jika expired. Jangan tutup dialog sampai tersambung.</p>
          </div>
        </div>
      </AppModal>

      {/* Engine Switch Dialog */}
      <AppModal
        open={showEngineSwitch}
        onClose={setShowEngineSwitch}
        title="Ganti Engine"
        description={
          <>
            <span className="font-medium text-gray-700">{selectedDevice?.name}</span>
            {' '}· Aktif:{' '}
            <span className={`font-semibold ${
              selectedDevice?.engine === 'wwebjs' ? 'text-purple-600' : 'text-blue-600'
            }`}>{selectedDevice?.engine === 'wwebjs' ? 'WWebJS' : 'Baileys'}</span>
          </>
        }
      >
          <div className="space-y-4 mt-1">
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3">
              <span className="text-amber-500 text-base leading-none mt-0.5">⚠</span>
              <p className="text-xs text-amber-800 leading-relaxed">
                Mengganti engine memerlukan <strong>scan ulang QR code</strong>. Session lama akan dihapus otomatis.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([{ key: 'baileys', icon: Cpu, label: 'Baileys', desc: 'Ringan & cepat', sub: 'WebSocket native', color: 'blue' },
                { key: 'wwebjs', icon: Globe, label: 'WWebJS', desc: 'Lebih kompatibel', sub: 'Browser-based', color: 'purple' }] as const).map(({ key, icon: Icon, label, desc, sub, color }) => {
                const isActive = (selectedDevice?.engine || 'baileys') === key
                return (
                  <button key={key} type="button"
                    disabled={engineSwitchMut.isPending}
                    onClick={() => engineSwitchMut.mutate({ deviceId: selectedDevice?.deviceId, engine: key })}
                    className={`relative flex flex-col items-start gap-0.5 p-3.5 rounded-xl border-2 transition-all text-left ${
                      isActive
                        ? color === 'blue' ? 'border-blue-500 bg-blue-50' : 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    } ${engineSwitchMut.isPending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                    {isActive && (
                      <span className={`absolute top-2.5 right-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        color === 'blue' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                      }`}>Aktif</span>
                    )}
                    <div className={`flex items-center gap-2 mb-1 ${
                      isActive ? (color === 'blue' ? 'text-blue-700' : 'text-purple-700') : 'text-gray-700'
                    }`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-semibold">{label}</span>
                    </div>
                    <span className={`text-xs font-medium ${
                      isActive ? (color === 'blue' ? 'text-blue-600' : 'text-purple-600') : 'text-gray-600'
                    }`}>{desc}</span>
                    <span className="text-[11px] text-gray-400">{sub}</span>
                  </button>
                )
              })}
            </div>
          </div>
      </AppModal>

      {/* Webhook Dialog */}
      <AppModal
        open={showWebhook}
        onClose={setShowWebhook}
        title="Konfigurasi Webhook"
        description={
          <>
            <span className="font-medium text-gray-700">{selectedDevice?.name}</span>
            {' '}· Atur URL penerima notifikasi
          </>
        }
      >
        <div className="space-y-5 mt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Webhook URL
              <span className="ml-1.5 text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Pesan Masuk</span>
            </label>
            <Input
              placeholder="https://yourapp.com/webhook/incoming"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
            />
            <p className="text-[11px] text-gray-400">Dipanggil setiap ada pesan WhatsApp masuk ke device ini</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Tracking URL
              <span className="ml-1.5 text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Status Pesan</span>
            </label>
            <Input
              placeholder="https://yourapp.com/webhook/status"
              value={trackingUrl}
              onChange={e => setTrackingUrl(e.target.value)}
            />
            <p className="text-[11px] text-gray-400">Dipanggil saat status pesan berubah (terkirim, dibaca, gagal)</p>
          </div>
          <div className="pt-1">
            <Button className="w-full" loading={webhookMut.isPending} onClick={() => webhookMut.mutate()}>
              Simpan Konfigurasi
            </Button>
          </div>
        </div>
      </AppModal>
    </div>
    </div>
  )
}
