import { useState } from 'react'
import { Plus, Pencil, Trash2, BookOpen, ChevronDown, ChevronUp, Check, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kbApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import Toggle from './Toggle'

type KbType = 'faq' | 'info' | 'rule'

interface KbItem {
  id: string
  type: KbType
  question: string
  answer: string
  isActive: boolean
  sortOrder: number
}

const TYPE_META: Record<KbType, { label: string; color: string }> = {
  faq:  { label: 'FAQ',   color: 'bg-blue-100 text-blue-700' },
  info: { label: 'Info',  color: 'bg-purple-100 text-purple-700' },
  rule: { label: 'Aturan', color: 'bg-orange-100 text-orange-700' },
}

const EMPTY_FORM = { type: 'faq' as KbType, question: '', answer: '' }

interface FormState {
  type: KbType
  question: string
  answer: string
}

interface ItemFormProps {
  initial?: FormState
  onSave: (data: FormState) => void
  onCancel: () => void
  saving?: boolean
}

function ItemForm({ initial = EMPTY_FORM, onSave, onCancel, saving }: ItemFormProps) {
  const [data, setData] = useState<FormState>(initial)
  const set = (k: keyof FormState, v: string) => setData(d => ({ ...d, [k]: v }))
  const valid = data.question.trim() && data.answer.trim()

  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex gap-2">
        {(['faq', 'info', 'rule'] as KbType[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => set('type', t)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              data.type === t
                ? TYPE_META[t].color + ' ring-2 ring-offset-1 ring-current'
                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
            }`}
          >
            {TYPE_META[t].label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {data.type === 'rule' ? 'Nama Aturan' : 'Pertanyaan / Topik'}
        </label>
        <Input
          placeholder={
            data.type === 'faq'  ? 'Contoh: Berapa harga produk X?' :
            data.type === 'info' ? 'Contoh: Informasi Toko' :
            'Contoh: Aturan Pengembalian Barang'
          }
          value={data.question}
          onChange={e => set('question', e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {data.type === 'rule' ? 'Detail Aturan' : 'Jawaban'}
        </label>
        <Textarea
          rows={3}
          placeholder={
            data.type === 'faq'  ? 'Tulis jawaban lengkap di sini...' :
            data.type === 'info' ? 'Tulis informasi detail di sini...' :
            'Tulis aturan yang harus diikuti AI...'
          }
          value={data.answer}
          onChange={e => set('answer', e.target.value)}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="w-3.5 h-3.5" />
          Batal
        </Button>
        <Button size="sm" disabled={!valid} loading={saving} onClick={() => onSave(data)}>
          <Check className="w-3.5 h-3.5" />
          Simpan
        </Button>
      </div>
    </div>
  )
}

interface KbItemRowProps {
  item: KbItem
  onEdit: (item: KbItem) => void
  onDelete: (id: string) => void
  onToggle: (id: string, val: boolean) => void
  editingId: string | null
  onSaveEdit: (id: string, data: FormState) => void
  onCancelEdit: () => void
  saving?: boolean
}

function KbItemRow({ item, onEdit, onDelete, onToggle, editingId, onSaveEdit, onCancelEdit, saving }: KbItemRowProps) {
  const [expanded, setExpanded] = useState(false)
  const meta = TYPE_META[item.type]
  const isEditing = editingId === item.id

  if (isEditing) {
    return (
      <ItemForm
        initial={{ type: item.type, question: item.question, answer: item.answer }}
        onSave={data => onSaveEdit(item.id, data)}
        onCancel={onCancelEdit}
        saving={saving}
      />
    )
  }

  return (
    <div className={`rounded-xl border transition-colors ${item.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
      <div className="flex items-start gap-3 px-3 py-2.5">
        <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${meta.color}`}>
          {meta.label}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 leading-snug">{item.question}</p>
          {expanded && (
            <p className="mt-1.5 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{item.answer}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <Toggle on={item.isActive} onToggle={() => onToggle(item.id, !item.isActive)} />
          <button onClick={() => onEdit(item)} className="p-1 text-gray-400 hover:text-blue-500 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(item.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface TabKnowledgeBaseProps {
  deviceId: string
}

export default function TabKnowledgeBase({ deviceId }: TabKnowledgeBaseProps) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<KbType | 'all'>('all')

  const { data: res, isLoading } = useQuery({
    queryKey: ['kb', deviceId],
    queryFn: () => kbApi.list(deviceId),
    enabled: !!deviceId,
  })

  const items: KbItem[] = (res as any)?.data ?? []
  const invalidate = () => qc.invalidateQueries({ queryKey: ['kb', deviceId] })

  const createMut = useMutation({
    mutationFn: (data: FormState) => kbApi.create(deviceId, data),
    onSuccess: () => { invalidate(); setShowForm(false) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<KbItem> }) =>
      kbApi.update(deviceId, id, data),
    onSuccess: () => { invalidate(); setEditingId(null) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => kbApi.remove(deviceId, id),
    onSuccess: invalidate,
  })

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter)
  const counts = { faq: 0, info: 0, rule: 0 }
  items.forEach(i => counts[i.type]++)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            Knowledge Base
          </CardTitle>
          <CardDescription className="text-xs">
            Daftar pengetahuan, FAQ, dan aturan yang digunakan AI sebagai referensi saat menjawab pelanggan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {(['faq', 'info', 'rule'] as KbType[]).map(t => (
              <div key={t} className={`rounded-lg px-3 py-2 text-center ${TYPE_META[t].color}`}>
                <p className="text-lg font-bold">{counts[t]}</p>
                <p className="text-[10px] font-medium">{TYPE_META[t].label}</p>
              </div>
            ))}
          </div>

          {/* Filter + Add */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 flex-1">
              {(['all', 'faq', 'info', 'rule'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    filter === f ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'Semua' : TYPE_META[f].label}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => { setShowForm(true); setEditingId(null) }}>
              <Plus className="w-3.5 h-3.5" />
              Tambah
            </Button>
          </div>

          {/* Add form */}
          {showForm && (
            <ItemForm
              onSave={data => createMut.mutate(data)}
              onCancel={() => setShowForm(false)}
              saving={createMut.isPending}
            />
          )}

          {/* List */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">
                {items.length === 0
                  ? 'Belum ada item. Tambahkan FAQ, info, atau aturan untuk AI.'
                  : 'Tidak ada item dengan filter ini.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(item => (
                <KbItemRow
                  key={item.id}
                  item={item}
                  editingId={editingId}
                  onEdit={i => { setEditingId(i.id); setShowForm(false) }}
                  onDelete={id => deleteMut.mutate(id)}
                  onToggle={(id, val) => updateMut.mutate({ id, data: { isActive: val } })}
                  onSaveEdit={(id, data) => updateMut.mutate({ id, data })}
                  onCancelEdit={() => setEditingId(null)}
                  saving={updateMut.isPending}
                />
              ))}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Info box */}
      <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5">
        <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-200 shrink-0 mt-0.5">INFO</Badge>
        <p className="text-[11px] text-indigo-700 leading-relaxed">
          Knowledge base ini otomatis ditambahkan ke system prompt AI saat membalas pesan.
          Gunakan <strong>FAQ</strong> untuk tanya-jawab, <strong>Info</strong> untuk profil bisnis/produk, dan <strong>Aturan</strong> untuk panduan perilaku AI.
        </p>
      </div>
    </div>
  )
}
