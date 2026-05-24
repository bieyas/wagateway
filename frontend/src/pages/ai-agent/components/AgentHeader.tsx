import { ArrowLeft, Sparkles, Clock, Ban, Users, BookOpen, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Toggle from './Toggle'

export type TabId = 'config' | 'schedule' | 'access' | 'group' | 'kb' | 'qr'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'config',   label: 'Konfigurasi', icon: Sparkles },
  { id: 'schedule', label: 'Jam & Bahasa', icon: Clock },
  { id: 'access',   label: 'Akses',        icon: Ban },
  { id: 'group',    label: 'Grup',         icon: Users },
  { id: 'kb',       label: 'Knowledge Base', icon: BookOpen },
  { id: 'qr',       label: 'Quick Reply',    icon: Zap },
]

interface AgentHeaderProps {
  deviceId: string
  enabled: boolean
  activeTab: TabId
  onBack: () => void
  onToggleEnabled: () => void
  onTabChange: (tab: TabId) => void
}

export default function AgentHeader({
  deviceId,
  enabled,
  activeTab,
  onBack,
  onToggleEnabled,
  onTabChange,
}: AgentHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 pt-3 pb-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold leading-tight">AI Agent</h1>
            <p className="text-xs text-muted-foreground font-mono truncate max-w-[140px] sm:max-w-none">{deviceId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Badge variant={enabled ? 'success' : 'outline'} className="text-xs hidden sm:inline-flex">
            {enabled ? 'Aktif' : 'Nonaktif'}
          </Badge>
          <Toggle on={enabled} onToggle={onToggleEnabled} />
        </div>
      </div>

      <div className="flex gap-0.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === t.id
                ? 'border-green-600 text-green-700 bg-green-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
