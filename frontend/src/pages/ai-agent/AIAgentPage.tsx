import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, Plus, Trash2, Save, Clock, Sparkles, Ban, ArrowLeft, FlaskConical, ShieldCheck, Users } from 'lucide-react'
import { aiApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

export default function AIAgentPage() {
  const { deviceId } = useParams<{ deviceId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [newBlPhone, setNewBlPhone] = useState('')
  const [newWlPhone, setNewWlPhone] = useState('')
  const [newGroupId, setNewGroupId] = useState('')
  const [groupPrefixInput, setGroupPrefixInput] = useState('')
  const [form, setForm] = useState<any>({
    enabled: false, persona: '', systemPrompt: '', model: 'gpt-4o',
    temperature: 0.7, operatingStart: '08:00', operatingEnd: '22:00',
    timezone: 'Asia/Jakarta', simulateTyping: true, alwaysOn: false,
    handoffKeywords: ['agen', 'manusia', 'cs', 'operator'],
    outsideHoursMessage: 'Maaf, kami sedang offline. Kami akan membalas pesan Anda segera.',
  })
  const [saveSuccess, setSaveSuccess] = useState(false)
  const { jwt } = useAuthStore()

  const { data: configRes } = useQuery({
    queryKey: ['ai-config', deviceId],
    queryFn: () => aiApi.getConfig(deviceId!),
    enabled: !!jwt && !!deviceId,
  })
  const { data: blRes, refetch: refetchBl } = useQuery({
    queryKey: ['ai-blacklist', deviceId],
    queryFn: () => aiApi.getBlacklist(deviceId!),
    enabled: !!jwt && !!deviceId,
  })
  const { data: wlRes, refetch: refetchWl } = useQuery({
    queryKey: ['ai-whitelist', deviceId],
    queryFn: () => aiApi.getWhitelist(deviceId!),
    enabled: !!jwt && !!deviceId,
  })
  const { data: grpRes, refetch: refetchGrp } = useQuery({
    queryKey: ['ai-groups', deviceId],
    queryFn: () => aiApi.getGroupConfig(deviceId!),
    enabled: !!jwt && !!deviceId,
  })

  const config = (configRes as any)?.data
  const blData = (blRes as any)?.data || { phones: [] }
  const wlData = (wlRes as any)?.data || { devMode: false, phones: [] }
  const grpData = (grpRes as any)?.data || { groupEnabled: false, allowedGroups: [], groupMentionOnly: true, groupPrefix: '' }

  useEffect(() => {
    if (config) setForm((f: any) => ({ ...f, ...config }))
  }, [config])

  useEffect(() => {
    if (grpRes) setGroupPrefixInput((grpRes as any)?.data?.groupPrefix || '')
  }, [grpRes])

  const saveMut = useMutation({
    mutationFn: () => aiApi.updateConfig(deviceId!, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-config', deviceId] })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    },
  })

  const addBlMut = useMutation({
    mutationFn: (phone: string) => aiApi.addBlacklist(deviceId!, phone),
    onSuccess: () => { setNewBlPhone(''); refetchBl() },
  })

  const removeBlMut = useMutation({
    mutationFn: (phone: string) => aiApi.removeBlacklist(deviceId!, phone),
    onSuccess: () => refetchBl(),
  })

  const toggleDevMut = useMutation({
    mutationFn: (devMode: boolean) => aiApi.setDevMode(deviceId!, devMode),
    onSuccess: () => refetchWl(),
  })
  const addWlMut = useMutation({
    mutationFn: (phone: string) => aiApi.addWhitelist(deviceId!, phone),
    onSuccess: () => { setNewWlPhone(''); refetchWl() },
  })
  const removeWlMut = useMutation({
    mutationFn: (phone: string) => aiApi.removeWhitelist(deviceId!, phone),
    onSuccess: () => refetchWl(),
  })
  const saveGrpMut = useMutation({
    mutationFn: (data: object) => aiApi.updateGroupConfig(deviceId!, data),
    onSuccess: () => refetchGrp(),
  })

  const set = (key: string, val: unknown) => setForm((f: any) => ({ ...f, [key]: val }))

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
    <div className="p-4 sm:p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/devices')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold">AI Agent</h1>
            <p className="text-sm text-muted-foreground font-mono">{deviceId}</p>
          </div>
        </div>
        <Badge variant={form.enabled ? 'success' : 'outline'}>
          {form.enabled ? 'Aktif' : 'Nonaktif'}
        </Badge>
      </div>

      {/* Toggle */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Bot className={`w-5 h-5 ${form.enabled ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="font-medium text-sm">AI Customer Service</p>
              <p className="text-xs text-muted-foreground">Balas pesan otomatis dengan AI</p>
            </div>
          </div>
          <button
            onClick={() => set('enabled', !form.enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${form.enabled ? 'bg-green-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.enabled ? 'translate-x-5' : ''}`} />
          </button>
        </CardContent>
      </Card>

      {/* Persona & Prompt */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4" /> Persona & Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nama Persona</label>
            <Input placeholder="Contoh: Sari, CS Toko ABC" value={form.persona || ''} onChange={e => set('persona', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">System Prompt</label>
            <Textarea
              rows={5}
              placeholder="Kamu adalah CS Toko ABC yang ramah dan helpful. Bantu pelanggan dengan pertanyaan seputar produk dan layanan..."
              value={form.systemPrompt || ''}
              onChange={e => set('systemPrompt', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Model</label>
              <Input value={form.model || 'gpt-4o'} onChange={e => set('model', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Temperature ({form.temperature})</label>
              <input type="range" min="0" max="2" step="0.1" value={form.temperature} onChange={e => set('temperature', parseFloat(e.target.value))}
                className="w-full mt-2 accent-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operating hours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Jam Operasional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
            <div>
              <p className="text-sm font-medium">Aktif 24 Jam</p>
              <p className="text-xs text-muted-foreground">AI membalas kapan saja tanpa batasan jam</p>
            </div>
            <button
              onClick={() => set('alwaysOn', !form.alwaysOn)}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.alwaysOn ? 'bg-green-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.alwaysOn ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <div className={`grid grid-cols-2 gap-3 transition-opacity ${form.alwaysOn ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Mulai</label>
              <Input type="time" value={form.operatingStart || '08:00'} onChange={e => set('operatingStart', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Selesai</label>
              <Input type="time" value={form.operatingEnd || '22:00'} onChange={e => set('operatingEnd', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Timezone</label>
            <Input value={form.timezone || 'Asia/Jakarta'} onChange={e => set('timezone', e.target.value)} />
          </div>
          <div className={`space-y-1.5 transition-opacity ${form.alwaysOn ? 'opacity-40 pointer-events-none' : ''}`}>
            <label className="text-xs font-medium text-muted-foreground">Pesan di luar jam operasional</label>
            <Textarea rows={2} value={form.outsideHoursMessage || ''} onChange={e => set('outsideHoursMessage', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Handoff keywords */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Kata Kunci Handoff ke CS Manusia</CardTitle>
          <CardDescription className="text-xs">Jika pelanggan mengetik kata ini, percakapan dialihkan ke CS manusia</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {(form.handoffKeywords || []).map((kw: string) => (
              <span key={kw} className="flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-full text-xs">
                {kw}
                <button onClick={() => set('handoffKeywords', form.handoffKeywords.filter((k: string) => k !== kw))}
                  className="text-gray-400 hover:text-red-500">×</button>
              </span>
            ))}
            <Input
              placeholder="+ tambah kata kunci"
              className="w-36 h-7 text-xs"
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                  set('handoffKeywords', [...(form.handoffKeywords || []), (e.target as HTMLInputElement).value])
                  ;(e.target as HTMLInputElement).value = ''
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <Button className="w-full" loading={saveMut.isPending} onClick={() => saveMut.mutate()}>
        <Save className="w-4 h-4" />
        {saveSuccess ? '✓ Tersimpan!' : 'Simpan Konfigurasi'}
      </Button>

      {/* Blacklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Ban className="w-4 h-4 text-red-500" />
            Blacklist (Nomor Diabaikan AI)
          </CardTitle>
          <CardDescription className="text-xs">
            Nomor dalam daftar ini tidak akan mendapat balasan dari AI — cocok untuk nomor admin atau operator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex gap-2">
            <Input
              placeholder="628xxxx"
              value={newBlPhone}
              onChange={e => setNewBlPhone(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newBlPhone) { addBlMut.mutate(newBlPhone) } }}
            />
            <Button size="sm" variant="outline" loading={addBlMut.isPending}
              onClick={() => newBlPhone && addBlMut.mutate(newBlPhone)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {blData.phones.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Belum ada nomor yang diblokir dari AI</p>
          ) : (
            <div className="space-y-1.5">
              {blData.phones.map((p: string) => (
                <div key={p} className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-50 text-sm">
                  <span className="font-mono text-xs text-red-700">{p}</span>
                  <button onClick={() => removeBlMut.mutate(p)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Group Handling */}
      <Card className={`border-2 transition-colors ${grpData.groupEnabled ? 'border-blue-300 bg-blue-50/20' : 'border-gray-100'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className={`w-4 h-4 ${grpData.groupEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
              Penanganan Grup
              {grpData.groupEnabled && <Badge variant="default" className="text-[10px] px-1.5 py-0.5 bg-blue-500">AKTIF</Badge>}
            </CardTitle>
            <button
              onClick={() => saveGrpMut.mutate({ ...grpData, groupEnabled: !grpData.groupEnabled })}
              disabled={saveGrpMut.isPending}
              className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${grpData.groupEnabled ? 'bg-blue-500' : 'bg-gray-200'} ${saveGrpMut.isPending ? 'opacity-50' : ''}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${grpData.groupEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <CardDescription className="text-xs mt-1">
            AI membalas pesan di grup. Pesan grup selalu disimpan agar CS bisa melihat.
          </CardDescription>
        </CardHeader>

        {grpData.groupEnabled && (
          <CardContent className="space-y-4 pt-0">
            {/* Mention only toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div>
                <p className="text-sm font-medium">Hanya reply jika di-mention atau ada prefix</p>
                <p className="text-xs text-muted-foreground">AI diam jika tidak di-tag atau tidak ada trigger</p>
              </div>
              <button
                onClick={() => saveGrpMut.mutate({ ...grpData, groupMentionOnly: !grpData.groupMentionOnly })}
                className={`relative w-11 h-6 rounded-full transition-colors ${grpData.groupMentionOnly ? 'bg-blue-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${grpData.groupMentionOnly ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {/* Prefix trigger */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Prefix Trigger (opsional)</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Contoh: !tanya atau /ai"
                  value={groupPrefixInput}
                  onChange={e => setGroupPrefixInput(e.target.value)}
                  onBlur={() => saveGrpMut.mutate({ ...grpData, groupPrefix: groupPrefixInput })}
                  className="text-sm"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Pesan yang diawali prefix ini akan trigger AI, selain dari mention</p>
            </div>

            {/* Allowed groups */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Grup yang Diizinkan (kosong = semua grup)</label>
              <div className="flex gap-2">
                <Input
                  placeholder="ID atau nama grup"
                  value={newGroupId}
                  onChange={e => setNewGroupId(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newGroupId) {
                      saveGrpMut.mutate({ ...grpData, allowedGroups: [...(grpData.allowedGroups || []), newGroupId] })
                      setNewGroupId('')
                    }
                  }}
                />
                <Button size="sm" variant="outline" loading={saveGrpMut.isPending}
                  onClick={() => { if (newGroupId) { saveGrpMut.mutate({ ...grpData, allowedGroups: [...(grpData.allowedGroups || []), newGroupId] }); setNewGroupId('') } }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {(!grpData.allowedGroups || grpData.allowedGroups.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-2">Semua grup diizinkan</p>
              ) : (
                <div className="space-y-1.5">
                  {grpData.allowedGroups.map((g: string) => (
                    <div key={g} className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-sm">
                      <span className="font-mono text-xs text-blue-800">{g}</span>
                      <button
                        onClick={() => saveGrpMut.mutate({ ...grpData, allowedGroups: grpData.allowedGroups.filter((x: string) => x !== g) })}
                        className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Dev Mode */}
      <Card className={`border-2 transition-colors ${wlData.devMode ? 'border-amber-300 bg-amber-50/30' : 'border-gray-100'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FlaskConical className={`w-4 h-4 ${wlData.devMode ? 'text-amber-500' : 'text-gray-400'}`} />
              Mode Development
              {wlData.devMode && (
                <Badge variant="warning" className="text-[10px] px-1.5 py-0.5">AKTIF</Badge>
              )}
            </CardTitle>
            <button
              onClick={() => toggleDevMut.mutate(!wlData.devMode)}
              disabled={toggleDevMut.isPending}
              className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${
                wlData.devMode ? 'bg-amber-400' : 'bg-gray-200'
              } ${toggleDevMut.isPending ? 'opacity-50' : ''}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                wlData.devMode ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
          <CardDescription className="text-xs mt-1">
            {wlData.devMode
              ? `Aktif — hanya ${wlData.phones.length} nomor terdaftar yang dilayani AI (nomor lain diabaikan)`
              : 'Nonaktif — semua nomor dilayani AI (mode produksi)'}
          </CardDescription>
        </CardHeader>

        {wlData.devMode && (
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Hanya nomor di bawah yang akan mendapat balasan AI. Gunakan untuk testing sebelum go-live.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="628xxxx"
                value={newWlPhone}
                onChange={e => setNewWlPhone(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newWlPhone) addWlMut.mutate(newWlPhone) }}
              />
              <Button size="sm" variant="outline" loading={addWlMut.isPending}
                onClick={() => newWlPhone && addWlMut.mutate(newWlPhone)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {wlData.phones.length === 0 ? (
              <p className="text-xs text-amber-700 text-center py-2 font-medium">
                ⚠ Daftar kosong — semua nomor diblokir saat dev mode aktif
              </p>
            ) : (
              <div className="space-y-1.5">
                {wlData.phones.map((p: string) => (
                  <div key={p} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-sm">
                    <span className="font-mono text-xs text-amber-800">{p}</span>
                    <button onClick={() => removeWlMut.mutate(p)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
    </div>
  )
}
