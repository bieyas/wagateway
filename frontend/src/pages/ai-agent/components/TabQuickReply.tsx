import { useState } from 'react'
import { Plus, Pencil, Trash2, Zap, Search, Check, X, Copy, Hash } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { qrApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface QuickReply {
  id: string
  shortcut: string
  title: string
  content: string
  tags: string[]
  usageCount: number
}

interface FormState {
  shortcut: string
  title: string
  content: string
  tags: string
}

const EMPTY_FORM: FormState = { shortcut: '', title: '', content: '', tags: '' }

interface ItemFormProps {
  initial?: FormState
  onSave: (data: FormState) => void
  onCancel: () => void
  saving?: boolean
}

function ItemForm({ initial = EMPTY_FORM, onSave, onCancel, saving }: ItemFormProps) {
  const [data, setData] = useState<FormState>(initial)
  const set = (k: keyof FormState, v: string) => setData(d => ({ ...d, [k]: v }))
  const valid = data.shortcut.trim() && data.title.trim() && data.content.trim()

  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Shortcut</label>
          <div className="relative">
            <span className="absolute left-2.5 top-2 text-gray-400 text-sm">/</span>
            <Input
              className="pl-6"
              placeholder="salam, harga, retur..."
              value={data.shortcut}
              onChange={e => set('shortcut', e.target.value.replace(/\s/g, '-').toLowerCase())}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Judul</label>
          <Input
            placeholder="Salam Pembuka"
            value={data.title}
            onChange={e => set('title', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Isi Template</label>
        <Textarea
          rows={4}
          placeholder={"Halo! Selamat datang di Toko ABC 😊\nAda yang bisa kami bantu?"}
          value={data.content}
          onChange={e => set('content', e.target.value)}
        />
        <p className="text-[10px] text-muted-foreground text-right">{data.content.length} karakter</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Tag <span className="font-normal">(pisah dengan koma)</span>
        </label>
        <Input
          placeholder="salam, pembuka, umum"
          value={data.tags}
          onChange={e => set('tags', e.target.value)}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="w-3.5 h-3.5" /> Batal
        </Button>
        <Button size="sm" disabled={!valid} loading={saving} onClick={() => onSave(data)}>
          <Check className="w-3.5 h-3.5" /> Simpan
        </Button>
      </div>
    </div>
  )
}

interface QrCardProps {
  item: QuickReply
  isEditing: boolean
  onEdit: () => void
  onDelete: () => void
  onSaveEdit: (data: FormState) => void
  onCancelEdit: () => void
  onCopy: () => void
  saving?: boolean
}

function QrCard({ item, isEditing, onEdit, onDelete, onSaveEdit, onCancelEdit, onCopy, saving }: QrCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(item.content)
    setCopied(true)
    onCopy()
    setTimeout(() => setCopied(false), 1500)
  }

  if (isEditing) {
    return (
      <ItemForm
        initial={{
          shortcut: item.shortcut,
          title: item.title,
          content: item.content,
          tags: (item.tags || []).join(', '),
        }}
        onSave={onSaveEdit}
        onCancel={onCancelEdit}
        saving={saving}
      />
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors">
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded shrink-0">
                /{item.shortcut}
              </span>
              <span className="text-sm font-medium text-gray-800 truncate">{item.title}</span>
              {item.usageCount > 0 && (
                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                  {item.usageCount}× dipakai
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 whitespace-pre-wrap leading-relaxed">
              {item.content}
            </p>
            {item.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {item.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded-full">
                    <Hash className="w-2.5 h-2.5" />{tag.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex border-t border-gray-100 divide-x divide-gray-100">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Disalin!' : 'Salin'}
        </button>
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Hapus
        </button>
      </div>
    </div>
  )
}

interface TabQuickReplyProps {
  deviceId: string
}

export default function TabQuickReply({ deviceId }: TabQuickReplyProps) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')

  const { data: res, isLoading } = useQuery({
    queryKey: ['qr', deviceId, searchDebounced],
    queryFn: () => qrApi.list(deviceId, searchDebounced || undefined),
    enabled: !!deviceId,
  })

  const items: QuickReply[] = (res as any)?.data ?? []
  const invalidate = () => qc.invalidateQueries({ queryKey: ['qr', deviceId] })

  const toPayload = (d: FormState) => ({
    shortcut: d.shortcut.trim(),
    title: d.title.trim(),
    content: d.content.trim(),
    tags: d.tags ? d.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
  })

  const createMut = useMutation({
    mutationFn: (d: FormState) => qrApi.create(deviceId, toPayload(d)),
    onSuccess: () => { invalidate(); setShowForm(false) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: FormState }) => qrApi.update(deviceId, id, toPayload(d)),
    onSuccess: () => { invalidate(); setEditingId(null) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => qrApi.remove(deviceId, id),
    onSuccess: invalidate,
  })

  const useMut = useMutation({
    mutationFn: (id: string) => qrApi.use(deviceId, id),
    onSuccess: invalidate,
  })

  const handleSearch = (v: string) => {
    setSearch(v)
    clearTimeout((handleSearch as any)._t)
    ;(handleSearch as any)._t = setTimeout(() => setSearchDebounced(v), 300)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            Template Balasan Cepat
          </CardTitle>
          <CardDescription className="text-xs">
            Template siap pakai untuk CS manusia saat menangani percakapan. Gunakan shortcut untuk menemukan dengan cepat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">

          {/* Search + Add */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <Input
                className="pl-8"
                placeholder="Cari shortcut atau judul..."
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={() => { setShowForm(true); setEditingId(null) }}>
              <Plus className="w-3.5 h-3.5" />
              Tambah
            </Button>
          </div>

          {/* Add form */}
          {showForm && (
            <ItemForm
              onSave={d => createMut.mutate(d)}
              onCancel={() => setShowForm(false)}
              saving={createMut.isPending}
            />
          )}

          {/* List */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">
                {search ? 'Tidak ada template yang cocok.' : 'Belum ada template. Tambahkan template balasan cepat pertama Anda.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <QrCard
                  key={item.id}
                  item={item}
                  isEditing={editingId === item.id}
                  onEdit={() => { setEditingId(item.id); setShowForm(false) }}
                  onDelete={() => deleteMut.mutate(item.id)}
                  onSaveEdit={d => updateMut.mutate({ id: item.id, d })}
                  onCancelEdit={() => setEditingId(null)}
                  onCopy={() => useMut.mutate(item.id)}
                  saving={updateMut.isPending}
                />
              ))}
            </div>
          )}

          {items.length > 0 && (
            <p className="text-[10px] text-muted-foreground text-center">
              {items.length} template · diurutkan berdasarkan paling sering digunakan
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2.5">
        <Zap className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-yellow-700 leading-relaxed">
          Template ini digunakan oleh <strong>CS manusia</strong> saat mengambil alih percakapan.
          Klik <strong>Salin</strong> untuk menyalin isi ke clipboard, lalu tempel ke kotak chat.
          Statistik pemakaian dicatat otomatis.
        </p>
      </div>
    </div>
  )
}
