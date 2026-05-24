import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PhoneListProps {
  phones: string[]
  onAdd: (phone: string) => void
  onRemove: (phone: string) => void
  adding?: boolean
  removing?: boolean
  placeholder?: string
  emptyText?: string
  itemClassName?: string
  textClassName?: string
}

export default function PhoneList({
  phones,
  onAdd,
  onRemove,
  adding,
  placeholder = '628xxxx',
  emptyText = 'Belum ada nomor',
  itemClassName = 'bg-gray-50',
  textClassName = 'text-gray-700',
}: PhoneListProps) {
  const [value, setValue] = useState('')

  const handleAdd = () => {
    if (!value.trim()) return
    onAdd(value.trim())
    setValue('')
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
        />
        <Button size="sm" variant="outline" loading={adding} onClick={handleAdd}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {phones.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">
          {phones.map(phone => (
            <div key={phone} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${itemClassName}`}>
              <span className={`font-mono text-xs ${textClassName}`}>{phone}</span>
              <button onClick={() => onRemove(phone)} className="text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
