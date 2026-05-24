import { useState } from 'react'
import { Sparkles, Sliders, ChevronDown, Cpu, Eye, EyeOff, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const MODELS = [
  { value: 'gpt-4o',        label: 'GPT-4o (Terbaru & Terbaik)' },
  { value: 'gpt-4o-mini',   label: 'GPT-4o Mini (Lebih Hemat)' },
  { value: 'gpt-4-turbo',   label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Paling Cepat)' },
]

interface ProviderPreset {
  id: string
  name: string
  baseUrl: string
  models: string[]
  freeNote?: string
  docsUrl: string
}

const PROVIDERS: ProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    freeNote: 'Ada free tier — gemini-2.0-flash gratis',
    docsUrl: 'https://aistudio.google.com/apikey',
  },
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    freeNote: 'Free tier — sangat cepat (LPU)',
    docsUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['google/gemma-3-27b-it:free', 'meta-llama/llama-3.3-70b-instruct:free', 'mistralai/mistral-small-3.1-24b-instruct:free'],
    freeNote: 'Ada 10+ model gratis (suffix :free)',
    docsUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    models: ['mistral-small-latest', 'mistral-medium-latest', 'open-mistral-7b'],
    freeNote: 'Free tier tersedia',
    docsUrl: 'https://console.mistral.ai/api-keys',
  },
  {
    id: 'custom',
    name: 'Custom / Self-hosted',
    baseUrl: '',
    models: [],
    docsUrl: '',
  },
]

interface TabConfigProps {
  form: any
  set: (key: string, val: unknown) => void
}

export default function TabConfig({ form, set }: TabConfigProps) {
  const [showKey, setShowKey] = useState(false)
  const isCustomModel = !!form.model && !MODELS.find(m => m.value === form.model)

  const activeProvider = PROVIDERS.find(p => p.id === (form.aiProvider || 'openai')) ?? PROVIDERS[0]
  const providerModels = activeProvider.models

  const handleProviderSelect = (p: ProviderPreset) => {
    set('aiProvider', p.id)
    set('aiBaseUrl', p.baseUrl)
    if (p.models.length > 0) set('model', p.models[0])
  }

  const addKeyword = (word: string) => {
    if (!word.trim()) return
    set('handoffKeywords', [...(form.handoffKeywords || []), word.trim()])
  }

  const removeKeyword = (kw: string) => {
    set('handoffKeywords', (form.handoffKeywords || []).filter((k: string) => k !== kw))
  }

  return (
    <div className="space-y-4">

      {/* Persona & System Prompt */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-600" />
            Persona & System Prompt
          </CardTitle>
          <CardDescription className="text-xs">
            Identitas dan instruksi dasar yang selalu diikuti AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nama Persona</label>
            <Input
              placeholder="Contoh: Sari, CS Toko ABC"
              value={form.persona || ''}
              onChange={e => set('persona', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">System Prompt</label>
            <Textarea
              rows={6}
              placeholder={"Kamu adalah CS Toko ABC yang ramah dan helpful.\nBantu pelanggan dengan pertanyaan seputar produk dan layanan.\nSelalu jawab dalam bahasa Indonesia yang santun."}
              value={form.systemPrompt || ''}
              onChange={e => set('systemPrompt', e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {(form.systemPrompt || '').length} karakter
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Provider */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="w-4 h-4 text-violet-500" />
            Provider AI
          </CardTitle>
          <CardDescription className="text-xs">
            Pilih penyedia AI. Gunakan API key milik tenant sendiri agar biaya terpisah.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleProviderSelect(p)}
                className={`relative flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all ${
                  activeProvider.id === p.id
                    ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-400'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-xs font-semibold text-gray-800">{p.name}</span>
                {p.freeNote && (
                  <span className="text-[10px] text-green-600 font-medium mt-0.5 leading-tight">{p.freeNote}</span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">API Key</label>
              {activeProvider.docsUrl && (
                <a
                  href={activeProvider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700"
                >
                  Dapatkan API Key <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder={`Masukkan API key ${activeProvider.name}...`}
                value={form.aiApiKey || ''}
                onChange={e => set('aiApiKey', e.target.value)}
                className="pr-9 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowKey(s => !s)}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {!form.aiApiKey && (
              <p className="text-[10px] text-red-600 font-medium">
                ⚠ Wajib diisi — AI tidak akan berjalan tanpa API key
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Base URL</label>
            <Input
              placeholder="https://api.openai.com/v1"
              value={form.aiBaseUrl || ''}
              onChange={e => set('aiBaseUrl', e.target.value)}
              readOnly={activeProvider.id !== 'custom'}
              className={activeProvider.id !== 'custom' ? 'bg-gray-50 text-gray-500 font-mono text-xs' : 'font-mono text-xs'}
            />
            {activeProvider.id !== 'custom' && (
              <p className="text-[10px] text-muted-foreground">URL otomatis diisi sesuai provider yang dipilih</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Model & Parameter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-500" />
            Model & Parameter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Model AI</label>
            <div className="relative">
              <select
                value={isCustomModel ? '__custom' : (form.model || 'gpt-4o')}
                onChange={e => {
                  if (e.target.value !== '__custom') set('model', e.target.value)
                }}
                className="w-full appearance-none border border-input rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 pr-8"
              >
                {(providerModels.length > 0 ? providerModels : MODELS.map(m => m.value)).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value="__custom">Custom model...</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {isCustomModel && (
              <Input
                placeholder="Nama model custom, misal: claude-3-opus"
                value={form.model}
                onChange={e => set('model', e.target.value)}
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Kreativitas (Temperature)</label>
              <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                {Number(form.temperature || 0.7).toFixed(1)}
              </span>
            </div>
            <input
              type="range" min="0" max="2" step="0.1"
              value={form.temperature || 0.7}
              onChange={e => set('temperature', parseFloat(e.target.value))}
              className="w-full accent-green-600"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Presisi</span><span>Seimbang</span><span>Kreatif</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Max Token</label>
              <Input
                type="number" min="256" max="8192"
                value={form.maxTokens || 2048}
                onChange={e => set('maxTokens', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Konteks (pesan)</label>
              <Input
                type="number" min="5" max="100"
                value={form.contextWindow || 20}
                onChange={e => set('contextWindow', parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Handoff Keywords */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Kata Kunci Handoff ke CS Manusia</CardTitle>
          <CardDescription className="text-xs">
            AI akan melakukan handoff hanya jika customer <strong>secara eksplisit</strong> meminta berbicara dengan CS manusia
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(form.handoffKeywords || []).map((kw: string) => (
              <span key={kw} className="flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-full text-xs">
                {kw}
                <button
                  onClick={() => removeKeyword(kw)}
                  className="text-gray-400 hover:text-red-500 ml-0.5 leading-none"
                >×</button>
              </span>
            ))}
            <Input
              placeholder="+ tambah kata kunci"
              className="w-36 h-7 text-xs"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  addKeyword((e.target as HTMLInputElement).value)
                  ;(e.target as HTMLInputElement).value = ''
                }
              }}
            />
          </div>

          <div className="border-t pt-3 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Auto-kembali ke Mode AI</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                className="w-24 h-8 text-sm"
                value={form.handoffTimeout ?? 30}
                onChange={e => set('handoffTimeout', parseInt(e.target.value) || 0)}
              />
              <span className="text-xs text-muted-foreground">menit tanpa balasan CS</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {(form.handoffTimeout ?? 30) === 0
                ? '⚠ Dinonaktifkan — AI tidak akan otomatis kembali aktif'
                : `AI akan otomatis aktif kembali setelah ${form.handoffTimeout ?? 30} menit tidak ada balasan dari CS`}
            </p>
          </div>

          <div className="border-t pt-3 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Jeda Sebelum AI Balas</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={60}
                className="w-24 h-8 text-sm"
                value={form.typingDelay ?? 10}
                onChange={e => set('typingDelay', parseInt(e.target.value) || 0)}
              />
              <span className="text-xs text-muted-foreground">detik setelah pesan terakhir</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {(form.typingDelay ?? 10) === 0
                ? 'AI membalas langsung tanpa jeda (tidak direkomendasikan)'
                : `AI menunggu ${form.typingDelay ?? 10} detik setelah pesan terakhir masuk — pesan bertahap dari pelanggan digabung sebelum dibalas`}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
