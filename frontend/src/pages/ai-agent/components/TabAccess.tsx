import { Ban, FlaskConical, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Toggle from './Toggle'
import PhoneList from './PhoneList'

interface BlacklistData { phones: string[] }
interface WhitelistData { devMode: boolean; phones: string[] }

interface TabAccessProps {
  blData: BlacklistData
  wlData: WhitelistData
  addingBl: boolean
  removingBl: boolean
  addingWl: boolean
  removingWl: boolean
  togglingDev: boolean
  onAddBl: (phone: string) => void
  onRemoveBl: (phone: string) => void
  onAddWl: (phone: string) => void
  onRemoveWl: (phone: string) => void
  onToggleDev: (val: boolean) => void
}

export default function TabAccess({
  blData,
  wlData,
  addingBl,
  addingWl,
  togglingDev,
  onAddBl,
  onRemoveBl,
  onAddWl,
  onRemoveWl,
  onToggleDev,
}: TabAccessProps) {
  return (
    <div className="space-y-4">

      {/* Blacklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Ban className="w-4 h-4 text-red-500" />
            Blacklist
          </CardTitle>
          <CardDescription className="text-xs">
            Nomor ini tidak akan mendapat balasan dari AI — cocok untuk nomor admin atau operator internal.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <PhoneList
            phones={blData.phones}
            onAdd={onAddBl}
            onRemove={onRemoveBl}
            adding={addingBl}
            emptyText="Belum ada nomor yang diblokir dari AI"
            itemClassName="bg-red-50"
            textClassName="text-red-700"
          />
        </CardContent>
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
            <Toggle
              on={wlData.devMode}
              onToggle={() => onToggleDev(!wlData.devMode)}
              disabled={togglingDev}
              color="amber"
            />
          </div>
          <CardDescription className="text-xs mt-1">
            {wlData.devMode
              ? `Aktif — hanya ${wlData.phones.length} nomor terdaftar yang dilayani AI`
              : 'Nonaktif — semua nomor dilayani AI (mode produksi)'}
          </CardDescription>
        </CardHeader>

        {wlData.devMode && (
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Hanya nomor di bawah yang akan mendapat balasan AI. Gunakan untuk testing sebelum go-live.
              </p>
            </div>
            <PhoneList
              phones={wlData.phones}
              onAdd={onAddWl}
              onRemove={onRemoveWl}
              adding={addingWl}
              emptyText="⚠ Daftar kosong — semua nomor diblokir saat dev mode aktif"
              itemClassName="bg-amber-50 border border-amber-100"
              textClassName="text-amber-800"
            />
          </CardContent>
        )}
      </Card>

    </div>
  )
}
