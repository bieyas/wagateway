import { useState } from 'react'
import { Users, Plus, Trash2, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Toggle from './Toggle'

interface TabGroupProps {
  form: any
  set: (key: string, val: unknown) => void
}

export default function TabGroup({ form, set }: TabGroupProps) {
  const [newGroup, setNewGroup] = useState('')

  const addGroup = () => {
    if (!newGroup.trim()) return
    set('allowedGroups', [...(form.allowedGroups || []), newGroup.trim()])
    setNewGroup('')
  }

  const removeGroup = (id: string) => {
    set('allowedGroups', (form.allowedGroups || []).filter((g: string) => g !== id))
  }

  return (
    <div className="space-y-4">

      {/* Toggle grup */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.groupEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Users className={`w-5 h-5 ${form.groupEnabled ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm font-medium">AI di Grup WhatsApp</p>
              <p className="text-xs text-muted-foreground">Aktifkan AI untuk menjawab pesan di grup</p>
            </div>
          </div>
          <Toggle on={!!form.groupEnabled} onToggle={() => set('groupEnabled', !form.groupEnabled)} />
        </CardContent>
      </Card>

      {form.groupEnabled && (
        <>
          {/* Opsi mention */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Aturan Balas di Grup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="text-sm font-medium">Hanya jika di-mention</p>
                  <p className="text-xs text-muted-foreground">AI hanya membalas jika nomor bot di-tag (@mention)</p>
                </div>
                <Toggle
                  on={!!form.groupMentionOnly}
                  onToggle={() => set('groupMentionOnly', !form.groupMentionOnly)}
                />
              </div>

              <div className={`space-y-1.5 transition-opacity ${form.groupMentionOnly ? 'opacity-40 pointer-events-none' : ''}`}>
                <label className="text-xs font-medium text-muted-foreground">Prefix Trigger</label>
                <Input
                  placeholder="Contoh: /ai atau !cs (kosongkan = balas semua pesan)"
                  value={form.groupPrefix || ''}
                  onChange={e => set('groupPrefix', e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Jika diisi, AI hanya membalas pesan yang diawali prefix ini
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Allowed groups */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Grup yang Diizinkan</CardTitle>
              <CardDescription className="text-xs">
                Kosongkan untuk mengizinkan semua grup. Isi nama grup untuk membatasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Masukkan nama grup WhatsApp persis seperti yang terlihat di aplikasi WA. Pencocokan tidak membedakan huruf besar/kecil.
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Contoh: Teknisi Abal-abal"
                  value={newGroup}
                  onChange={e => setNewGroup(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addGroup() }}
                  className="text-xs"
                />
                <Button size="sm" variant="outline" onClick={addGroup}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {(form.allowedGroups || []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Semua grup diizinkan
                </p>
              ) : (
                <div className="space-y-1.5">
                  {(form.allowedGroups || []).map((g: string) => (
                    <div key={g} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 text-sm">
                      <span className="font-mono text-xs text-gray-700 truncate">{g}</span>
                      <button onClick={() => removeGroup(g)} className="text-gray-400 hover:text-red-500 ml-2 shrink-0 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

    </div>
  )
}
