import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { aiApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import AgentHeader, { type TabId } from './components/AgentHeader'
import TabConfig from './components/TabConfig'
import TabSchedule from './components/TabSchedule'
import TabAccess from './components/TabAccess'
import TabGroup from './components/TabGroup'
import TabKnowledgeBase from './components/TabKnowledgeBase'
import TabQuickReply from './components/TabQuickReply'

const DEFAULT_FORM = {
  enabled: false,
  persona: '',
  systemPrompt: '',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2048,
  contextWindow: 20,
  operatingStart: '08:00',
  operatingEnd: '22:00',
  timezone: 'Asia/Jakarta',
  simulateTyping: true,
  alwaysOn: false,
  handoffKeywords: ['agen', 'manusia', 'cs', 'operator'],
  outsideHoursMessage: 'Maaf, kami sedang offline. Kami akan membalas pesan Anda segera.',
  groupEnabled: false,
  allowedGroups: [],
  groupMentionOnly: true,
  groupPrefix: '',
  aiProvider: 'openai',
  aiApiKey: '',
  aiBaseUrl: '',
  handoffTimeout: 30,
  typingDelay: 10,
}

export default function AIAgentPage() {
  const { deviceId } = useParams<{ deviceId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { jwt } = useAuthStore()

  const [tab, setTab] = useState<TabId>('config')
  const [form, setForm] = useState<any>(DEFAULT_FORM)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const enabled = !!jwt && !!deviceId

  const { data: configRes } = useQuery({
    queryKey: ['ai-config', deviceId],
    queryFn: () => aiApi.getConfig(deviceId!),
    enabled,
  })
  const { data: blRes, refetch: refetchBl } = useQuery({
    queryKey: ['ai-blacklist', deviceId],
    queryFn: () => aiApi.getBlacklist(deviceId!),
    enabled,
  })
  const { data: wlRes, refetch: refetchWl } = useQuery({
    queryKey: ['ai-whitelist', deviceId],
    queryFn: () => aiApi.getWhitelist(deviceId!),
    enabled,
  })
  const { data: groupRes, refetch: refetchGroup } = useQuery({
    queryKey: ['ai-group', deviceId],
    queryFn: () => aiApi.getGroupConfig(deviceId!),
    enabled,
  })

  const config   = (configRes as any)?.data
  const blData   = (blRes as any)?.data   || { phones: [] }
  const wlData   = (wlRes as any)?.data   || { devMode: false, phones: [] }
  const groupData = (groupRes as any)?.data

  useEffect(() => {
    if (config) setForm((f: any) => ({ ...f, ...config }))
  }, [config])

  useEffect(() => {
    if (groupData) setForm((f: any) => ({
      ...f,
      groupEnabled:     groupData.groupEnabled     ?? false,
      allowedGroups:    groupData.allowedGroups     ?? [],
      groupMentionOnly: groupData.groupMentionOnly  ?? true,
      groupPrefix:      groupData.groupPrefix       ?? '',
    }))
  }, [groupData])

  const set = (key: string, val: unknown) => setForm((f: any) => ({ ...f, [key]: val }))

  const saveMut = useMutation({
    mutationFn: () => Promise.all([
      aiApi.updateConfig(deviceId!, form),
      aiApi.updateGroupConfig(deviceId!, {
        groupEnabled:     form.groupEnabled,
        allowedGroups:    form.allowedGroups,
        groupMentionOnly: form.groupMentionOnly,
        groupPrefix:      form.groupPrefix || undefined,
      }),
    ]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-config', deviceId] })
      refetchGroup()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    },
  })

  const addBlMut    = useMutation({ mutationFn: (p: string) => aiApi.addBlacklist(deviceId!, p),    onSuccess: () => refetchBl() })
  const removeBlMut = useMutation({ mutationFn: (p: string) => aiApi.removeBlacklist(deviceId!, p), onSuccess: () => refetchBl() })
  const addWlMut    = useMutation({ mutationFn: (p: string) => aiApi.addWhitelist(deviceId!, p),    onSuccess: () => refetchWl() })
  const removeWlMut = useMutation({ mutationFn: (p: string) => aiApi.removeWhitelist(deviceId!, p), onSuccess: () => refetchWl() })
  const toggleDevMut = useMutation({ mutationFn: (v: boolean) => aiApi.setDevMode(deviceId!, v),    onSuccess: () => refetchWl() })

  return (
    <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
      <AgentHeader
        deviceId={deviceId!}
        enabled={form.enabled}
        activeTab={tab}
        onBack={() => navigate('/devices')}
        onToggleEnabled={() => set('enabled', !form.enabled)}
        onTabChange={setTab}
      />

      <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full">
        <div className="space-y-4">

          {tab === 'config' && <TabConfig form={form} set={set} />}
          {tab === 'schedule' && <TabSchedule form={form} set={set} />}
          {tab === 'access' && (
            <TabAccess
              blData={blData}
              wlData={wlData}
              addingBl={addBlMut.isPending}
              removingBl={removeBlMut.isPending}
              addingWl={addWlMut.isPending}
              removingWl={removeWlMut.isPending}
              togglingDev={toggleDevMut.isPending}
              onAddBl={p => addBlMut.mutate(p)}
              onRemoveBl={p => removeBlMut.mutate(p)}
              onAddWl={p => addWlMut.mutate(p)}
              onRemoveWl={p => removeWlMut.mutate(p)}
              onToggleDev={v => toggleDevMut.mutate(v)}
            />
          )}
          {tab === 'group' && <TabGroup form={form} set={set} />}
          {tab === 'kb' && <TabKnowledgeBase deviceId={deviceId!} />}
          {tab === 'qr' && <TabQuickReply deviceId={deviceId!} />}

          {tab !== 'kb' && tab !== 'qr' && (
            <Button
              className="w-full"
              loading={saveMut.isPending}
              onClick={() => saveMut.mutate()}
            >
              <Save className="w-4 h-4" />
              {saveSuccess ? '✓ Tersimpan!' : 'Simpan Konfigurasi'}
            </Button>
          )}

        </div>
      </div>
    </div>
  )
}
