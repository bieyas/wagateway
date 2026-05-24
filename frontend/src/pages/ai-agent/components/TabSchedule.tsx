import { Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Toggle from './Toggle'

interface TabScheduleProps {
  form: any
  set: (key: string, val: unknown) => void
}

export default function TabSchedule({ form, set }: TabScheduleProps) {
  return (
    <div className="space-y-4">

      {/* Jam Operasional */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            Jam Operasional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
            <div>
              <p className="text-sm font-medium">Aktif 24 Jam</p>
              <p className="text-xs text-muted-foreground">AI membalas kapan saja tanpa batasan waktu</p>
            </div>
            <Toggle on={!!form.alwaysOn} onToggle={() => set('alwaysOn', !form.alwaysOn)} />
          </div>

          <div className={`grid grid-cols-2 gap-3 transition-opacity ${form.alwaysOn ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Jam Mulai</label>
              <Input
                type="time"
                value={form.operatingStart || '08:00'}
                onChange={e => set('operatingStart', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Jam Selesai</label>
              <Input
                type="time"
                value={form.operatingEnd || '22:00'}
                onChange={e => set('operatingEnd', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Timezone</label>
            <Input
              value={form.timezone || 'Asia/Jakarta'}
              onChange={e => set('timezone', e.target.value)}
              placeholder="Asia/Jakarta"
            />
          </div>

          <div className={`space-y-1.5 transition-opacity ${form.alwaysOn ? 'opacity-40 pointer-events-none' : ''}`}>
            <label className="text-xs font-medium text-muted-foreground">Pesan di luar jam operasional</label>
            <Textarea
              rows={3}
              placeholder="Maaf, kami sedang offline. Kami akan membalas pesan Anda segera."
              value={form.outsideHoursMessage || ''}
              onChange={e => set('outsideHoursMessage', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Simulasi Typing */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Simulasi Mengetik</p>
            <p className="text-xs text-muted-foreground">Tampilkan indikator "sedang mengetik..." sebelum balasan dikirim</p>
          </div>
          <Toggle on={!!form.simulateTyping} onToggle={() => set('simulateTyping', !form.simulateTyping)} />
        </CardContent>
      </Card>

    </div>
  )
}
