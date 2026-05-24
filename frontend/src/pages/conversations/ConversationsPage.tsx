import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, RefreshCw, UserCheck, Bot, RotateCcw, Send, Search, ArrowLeft, FileText, Music, Smile, Paperclip, X, FileAudio, FileVideo, MoreVertical, Copy, XCircle, BotMessageSquare, Trash2 } from 'lucide-react'
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react'
import { convApi, chatApi, messageApi, mediaApi, unreadApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPhone, truncate } from '@/lib/utils'

function stripWhatsAppFormat(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~([^~]+)~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n/g, ' ')
    .trim()
}

function relativeTime(date: string | Date | null): string {
  if (!date) return ''
  const now = Date.now()
  const d = new Date(date).getTime()
  const diff = now - d
  if (diff < 60_000) return 'Baru saja'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} mnt lalu`
  if (diff < 86_400_000) return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  if (diff < 172_800_000) return 'Kemarin'
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

type FilterTab = 'all' | 'ai' | 'human' | 'closed'

function getConversationTitle(conversation: any): string {
  return conversation.isGroup
    ? conversation.groupName || conversation.contactName || conversation.phone
    : conversation.contactName || formatPhone(conversation.phone)
}

function getConversationPreview(conversation: any): string {
  const message = stripWhatsAppFormat(conversation.lastMessage || 'Belum ada pesan')
  if (!conversation.isGroup || !conversation.lastSenderName) return message
  return `${conversation.lastSenderName}: ${message}`
}

function MediaPreview({ url, type, caption }: { url: string; type: string; caption?: string }) {
  if (type === 'image') {
    return (
      <div className="mb-1">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={caption || 'image'} className="max-w-full rounded-md max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" />
        </a>
        {caption && <p className="text-xs mt-1 text-gray-600">{caption}</p>}
      </div>
    )
  }
  if (type === 'video') {
    return (
      <div className="mb-1">
        <video src={url} controls className="max-w-full rounded-md max-h-48" />
        {caption && <p className="text-xs mt-1 text-gray-600">{caption}</p>}
      </div>
    )
  }
  if (type === 'audio') {
    return (
      <div className="flex items-center gap-2 mb-1 bg-black/5 rounded-lg px-3 py-2">
        <Music className="w-4 h-4 text-gray-500 shrink-0" />
        <audio src={url} controls className="h-8 w-full" />
      </div>
    )
  }
  if (type === 'document') {
    const filename = url.split('/').pop() || 'file'
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 mb-1 bg-black/5 rounded-lg px-3 py-2 hover:bg-black/10 transition-colors">
        <FileText className="w-4 h-4 text-gray-500 shrink-0" />
        <span className="text-xs text-gray-700 truncate">{caption || filename}</span>
      </a>
    )
  }
  return null
}

function parseWhatsAppText(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const result: React.ReactNode[] = []
  lines.forEach((line, i) => {
    if (i > 0) result.push(<br key={`br-${i}`} />)
    result.push(...parseInlineFormats(line, i))
  })
  return result
}

function parseInlineFormats(text: string, keyOffset: number): React.ReactNode[] {
  // Matches: *bold*, _italic_, ~strike~, `code` — non-greedy, no leading/trailing spaces inside markers
  const tokenRegex = /\*([^*]+)\*|_([^_]+)_|~([^~]+)~|`([^`]+)`/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const key = `${keyOffset}-f-${match.index}`
    if (match[1] !== undefined) parts.push(<strong key={key}>{match[1]}</strong>)
    else if (match[2] !== undefined) parts.push(<em key={key}>{match[2]}</em>)
    else if (match[3] !== undefined) parts.push(<s key={key}>{match[3]}</s>)
    else if (match[4] !== undefined) parts.push(<code key={key} className="bg-black/10 rounded px-1 font-mono text-xs">{match[4]}</code>)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts
}

function ChatBubble({ message, isGroup }: { message: any; isGroup?: boolean }) {
  const isIncoming = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isHumanCS = isAssistant && message.model === 'human-cs'
  const isWebhook = isAssistant && message.model === 'webhook'
  const isAI = isAssistant && !isHumanCS && !isWebhook
  const hasMedia = !!message.mediaUrl && message.type !== 'text'

  return (
    <div className={`flex ${isIncoming ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className={`max-w-[75%] px-3 py-2 text-sm rounded-lg shadow-sm ${
          isIncoming
            ? 'bg-white text-gray-800 rounded-tl-none'
            : isHumanCS
              ? 'bg-blue-100 text-gray-800 rounded-tr-none'
              : isWebhook
                ? 'bg-orange-100 text-gray-800 rounded-tr-none'
                : 'bg-emerald-100 text-gray-800 rounded-tr-none'
        }`}
      >
        {isGroup && isIncoming && message.senderName && (
          <span className="text-[11px] text-emerald-700 font-semibold block mb-0.5">{message.senderName}</span>
        )}
        {isAI && <span className="text-[10px] text-emerald-600 font-medium block mb-0.5">AI</span>}
        {isHumanCS && <span className="text-[10px] text-blue-600 font-medium block mb-0.5">CS</span>}
        {isWebhook && <span className="text-[10px] text-orange-600 font-medium block mb-0.5">Bot</span>}
        {hasMedia && (
          <MediaPreview url={message.mediaUrl} type={message.type} caption={message.content || undefined} />
        )}
        {(!hasMedia || message.content) && message.content && (
          <p className="leading-relaxed">{parseWhatsAppText(message.content)}</p>
        )}
        <div className="flex items-center gap-1 mt-1 justify-end">
          <span className="text-[10px] text-gray-500">
            {new Date(message.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}

function ConversationItem({
  conversation,
  isSelected,
  onClick,
  onTakeover,
  onRelease,
  onReset,
  onClose,
  onDelete,
}: {
  conversation: any
  isSelected: boolean
  onClick: () => void
  onTakeover: () => void
  onRelease: () => void
  onReset: () => void
  onClose: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(conversation.avatarUrl || null)
  const menuRef = useRef<HTMLDivElement>(null)

  const title = getConversationTitle(conversation)
  const initials = title
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    if (conversation.isGroup) return
    if (conversation.avatarUrl) {
      setAvatarUrl(conversation.avatarUrl)
      return
    }
    convApi.avatar(conversation.phone)
      .then((res: any) => { if (res?.data?.avatarUrl) setAvatarUrl(res.data.avatarUrl) })
      .catch(() => {})
  }, [conversation.phone, conversation.avatarUrl, conversation.isGroup])

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const action = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    fn()
  }

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors hover:bg-gray-100 group ${
        isSelected ? 'bg-gray-100' : ''
      }`}
    >
      <div className="w-12 h-12 rounded-full shrink-0 overflow-hidden">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={initials}
            className="w-full h-full object-cover"
            onError={() => setAvatarUrl(null)}
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center text-sm font-semibold ${
              conversation.isGroup
                ? 'bg-indigo-100 text-indigo-600'
                : conversation.humanTakeover
                ? 'bg-orange-100 text-orange-600'
                : 'bg-emerald-100 text-emerald-600'
            }`}
          >
            {conversation.isGroup ? <Users className="w-5 h-5" /> : initials}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900 truncate">
            {title}
          </h3>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {!menuOpen && (
              <span className={`text-xs group-hover:hidden ${conversation.csUnreadCount > 0 ? 'text-[#25d366] font-medium' : 'text-gray-500'}`}>
                {relativeTime(conversation.lastMessageAt)}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
              className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-sm text-gray-500 truncate flex-1">
            {conversation.humanTakeover && (
              <span className="text-orange-600 font-medium mr-1">[CS]</span>
            )}
            {truncate(getConversationPreview(conversation), 48)}
          </p>
          {conversation.csUnreadCount > 0 && (
            <span className="bg-[#25d366] text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shrink-0">
              {conversation.csUnreadCount > 99 ? '99+' : conversation.csUnreadCount}
            </span>
          )}
        </div>
      </div>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-2 top-10 z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-52 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {conversation.humanTakeover ? (
            <button onClick={action(onRelease)} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-emerald-700">
              <BotMessageSquare className="w-4 h-4" />
              Kembalikan ke AI
            </button>
          ) : (
            <button onClick={action(onTakeover)} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-orange-600">
              <UserCheck className="w-4 h-4" />
              Ambil Alih
            </button>
          )}
          <div className="my-1 border-t border-gray-100" />
          <button onClick={action(() => { navigator.clipboard.writeText(conversation.phone) })} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-gray-700">
            <Copy className="w-4 h-4" />
            {conversation.isGroup ? 'Salin ID grup' : 'Salin nomor'}
          </button>
          <button onClick={action(onReset)} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-gray-700">
            <RotateCcw className="w-4 h-4" />
            Reset percakapan
          </button>
          <button onClick={action(onClose)} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-red-500">
            <XCircle className="w-4 h-4" />
            Tutup percakapan
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button onClick={action(onDelete)} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-red-50 text-red-600">
            <Trash2 className="w-4 h-4" />
            Hapus percakapan
          </button>
        </div>
      )}
    </div>
  )
}

export default function ConversationsPage() {
  const qc = useQueryClient()
  const { token, deviceId } = useAuthStore()
  const [searchParams] = useSearchParams()
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>(() => {
    const f = searchParams.get('filter')
    if (f === 'takeover') return 'human'
    if (f === 'ai') return 'ai'
    if (f === 'closed') return 'closed'
    return 'all'
  })
  const [showEmoji, setShowEmoji] = useState(false)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: string; name: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const [isMobileView, setIsMobileView] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleCloseChat = useCallback(() => setSelectedPhone(null), [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showEmoji) { setShowEmoji(false); return }
        if (isMobileView) handleCloseChat()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isMobileView, handleCloseChat, showEmoji])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmoji(false)
      }
    }
    if (showEmoji) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmoji])

  const { data: convData, isLoading: convLoading } = useQuery({
    queryKey: ['chats', token],
    queryFn: () => chatApi.list(),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    enabled: !!token,
  })
  const conversations = (convData as any)?.data || []

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['chat', selectedPhone],
    queryFn: () => chatApi.get(selectedPhone!),
    enabled: !!selectedPhone,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  })
  const chatHistory = (detailData as any)?.data
  const selectedMessages = chatHistory?.messages || []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedMessages, selectedPhone])

  useEffect(() => {
    if (selectedPhone) inputRef.current?.focus()
  }, [selectedPhone])

  const takeoverMut = useMutation({
    mutationFn: (phone: string) => convApi.takeover(phone),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chats'] })
  })

  const releaseMut = useMutation({
    mutationFn: (phone: string) => convApi.release(phone),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chats'] })
  })

  const resetMut = useMutation({
    mutationFn: (phone: string) => convApi.reset(phone),
    onSuccess: (_data, phone) => {
      qc.invalidateQueries({ queryKey: ['chats'] })
      if (selectedPhone === phone) setSelectedPhone(null)
    }
  })

  const closeMut = useMutation({
    mutationFn: (phone: string) => convApi.close(phone),
    onSuccess: (_data, phone) => {
      qc.invalidateQueries({ queryKey: ['chats'] })
      if (selectedPhone === phone) setSelectedPhone(null)
    }
  })

  const deleteMut = useMutation({
    mutationFn: (phone: string) => convApi.delete(phone),
    onSuccess: (_data, phone) => {
      qc.invalidateQueries({ queryKey: ['chats'] })
      if (selectedPhone === phone) setSelectedPhone(null)
    }
  })

  const sendMessageMut = useMutation({
    mutationFn: async (data: { phone: string; message: string }) => {
      const isGroup = !!selectedSummary?.isGroup
      if (mediaFile) {
        const uploaded = await mediaApi.upload(mediaFile)
        const uploadedUrl = (uploaded as any)?.data?.url
        const mediaType = (uploaded as any)?.data?.mediaType || 'document'
        return messageApi.sendMedia({
          phone: data.phone,
          message: data.message || '',
          deviceId,
          type: mediaType,
          mediaUrl: uploadedUrl,
          caption: data.message || '',
          isGroup,
        })
      }
      return messageApi.sendText({ phone: data.phone, message: data.message, deviceId, isGroup })
    },
    onSuccess: () => {
      setNewMessage('')
      setMediaFile(null)
      setMediaPreview(null)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['chat', selectedPhone] }), 1000)
    }
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaFile(file)
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    const isAudio = file.type.startsWith('audio/')
    const previewUrl = (isImage || isVideo) ? URL.createObjectURL(file) : ''
    const type = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'document'
    setMediaPreview({ url: previewUrl, type, name: file.name })
    e.target.value = ''
  }

  const clearMedia = () => {
    if (mediaPreview?.url) URL.revokeObjectURL(mediaPreview.url)
    setMediaFile(null)
    setMediaPreview(null)
  }

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji)
    inputRef.current?.focus()
  }

  const filterFn = (c: any) => {
    if (filterTab === 'ai') return !c.humanTakeover && c.isAIActive
    if (filterTab === 'human') return c.humanTakeover
    if (filterTab === 'closed') return !c.humanTakeover && !c.isAIActive
    return true
  }

  const filteredConversations = conversations.filter((c: any) => {
    const query = searchQuery.toLowerCase()
    const title = getConversationTitle(c).toLowerCase()
    const matchSearch = !query || title.includes(query) || c.phone.toLowerCase().includes(query) || (c.groupName && c.groupName.toLowerCase().includes(query))
    return matchSearch && filterFn(c)
  })

  const selectedSummary = conversations.find((c: any) => c.phone === selectedPhone)

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && !mediaFile) || !selectedPhone || !selectedSummary?.humanTakeover) return
    sendMessageMut.mutate({ phone: selectedPhone, message: newMessage.trim() })
  }

  const counts = {
    all: conversations.length,
    ai: conversations.filter((c: any) => !c.humanTakeover && c.isAIActive).length,
    human: conversations.filter((c: any) => c.humanTakeover).length,
    closed: conversations.filter((c: any) => !c.humanTakeover && !c.isAIActive).length,
  }

  if (conversations.length === 0 && !convLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Belum ada percakapan</h3>
          <p className="text-gray-500 mt-1">Percakapan akan muncul saat ada pesan masuk</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 flex bg-white overflow-hidden">
      {/* Left Sidebar */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col bg-gray-50 ${
          selectedPhone && isMobileView ? 'hidden' : 'flex'
        }`}
      >
        <div className="h-16 bg-gray-100 flex items-center px-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Percakapan</span>
          </div>
        </div>

        <div className="p-3 bg-gray-100 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Cari percakapan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-0 shadow-sm"
            />
          </div>
        </div>

        <div className="px-3 py-2 bg-gray-100 flex items-center gap-1 text-xs shrink-0 overflow-x-auto">
          {([
            { key: 'all', label: 'Semua' },
            { key: 'ai', label: 'AI', icon: Bot },
            { key: 'human', label: 'CS', icon: UserCheck },
            { key: 'closed', label: 'Closed' },
          ] as { key: FilterTab; label: string; icon?: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilterTab(key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
                filterTab === key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-200'
              }`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {label}
              <span className={`ml-0.5 ${filterTab === key ? 'text-emerald-200' : 'text-gray-400'}`}>
                {counts[key]}
              </span>
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 w-6 p-0 shrink-0"
            onClick={() => qc.invalidateQueries({ queryKey: ['chats'] })}
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {convLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded" />
                    <div className="h-3 w-1/2 bg-gray-200 animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Tidak ada percakapan</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredConversations.map((conversation: any) => (
                <ConversationItem
                  key={conversation.phone}
                  conversation={conversation}
                  isSelected={selectedPhone === conversation.phone}
                  onClick={() => {
                    setSelectedPhone(conversation.phone)
                    if (conversation.csUnreadCount > 0) {
                      unreadApi.markRead(conversation.deviceId, conversation.phone)
                        .then(() => qc.invalidateQueries({ queryKey: ['chats'] }))
                        .catch(() => {})
                    }
                  }}
                  onTakeover={() => takeoverMut.mutate(conversation.phone)}
                  onRelease={() => releaseMut.mutate(conversation.phone)}
                  onReset={() => resetMut.mutate(conversation.phone)}
                  onClose={() => closeMut.mutate(conversation.phone)}
                  onDelete={() => deleteMut.mutate(conversation.phone)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div
        className={`flex-1 flex flex-col bg-gray-100 ${
          !selectedPhone && isMobileView ? 'hidden' : 'flex'
        }`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h100v100H0z' fill='%23f0f2f5'/%3E%3C/svg%3E")`
        }}
      >
        {!selectedPhone ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-12 h-12 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Pilih Percakapan</h3>
              <p className="text-gray-500 mt-2">Klik kontak di samping untuk melihat riwayat chat</p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-16 bg-gray-100 border-b border-gray-200 flex items-center px-4 shrink-0">
              {isMobileView && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-2 -ml-2"
                  onClick={handleCloseChat}
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Button>
              )}

              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 mr-3 ${
                  selectedSummary?.isGroup
                    ? 'bg-indigo-100 text-indigo-600'
                    : selectedSummary?.humanTakeover
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {selectedSummary?.isGroup ? (
                  <Users className="w-5 h-5" />
                ) : (
                  (selectedSummary?.contactName || selectedSummary?.phone)
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {selectedSummary ? getConversationTitle(selectedSummary) : formatPhone(selectedPhone)}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedSummary?.isGroup ? (
                    <span className="flex items-center gap-1 text-gray-500">
                      <Users className="w-3 h-3" />
                      Grup · {selectedSummary.humanTakeover ? 'CS aktif' : selectedSummary.isAIActive ? 'AI aktif' : 'Closed'}
                    </span>
                  ) : selectedSummary?.humanTakeover ? (
                    <span className="flex items-center gap-1 text-orange-600">
                      <UserCheck className="w-3 h-3" /> CS Manusia Aktif
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <Bot className="w-3 h-3" /> AI Agent Aktif
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-600"
                  onClick={() => {
                    if (confirm('Reset riwayat percakapan ini?')) {
                      resetMut.mutate(selectedPhone)
                    }
                  }}
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {detailLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                      <div className="h-16 w-48 bg-gray-200 animate-pulse rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : !selectedMessages?.length ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p>Belum ada pesan</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {selectedMessages.map((message: any) => (
                    <ChatBubble key={message.id} message={message} isGroup={selectedSummary?.isGroup} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="px-4 py-2 bg-gray-100 border-t border-gray-200 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedSummary?.humanTakeover ? (
                    <>
                      <span className="text-sm text-orange-600 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4" />
                        CS Sedang Mengambil Alih
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        loading={releaseMut.isPending}
                        onClick={() => releaseMut.mutate(selectedPhone)}
                      >
                        <Bot className="w-3 h-3 mr-1" />
                        Serahkan ke AI
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-emerald-600 flex items-center gap-1.5">
                        <Bot className="w-4 h-4" />
                        AI Sedang Menjawab
                      </span>
                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700"
                        loading={takeoverMut.isPending}
                        onClick={() => takeoverMut.mutate(selectedPhone)}
                      >
                        <UserCheck className="w-3 h-3 mr-1" />
                        Ambil Alih
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {selectedSummary?.humanTakeover && (
              <form
                onSubmit={handleSendMessage}
                className="px-3 py-3 bg-gray-100 border-t border-gray-200 shrink-0"
              >
                {/* Media preview */}
                {mediaPreview && (
                  <div className="mb-2 flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                    {mediaPreview.type === 'image' && (
                      <img src={mediaPreview.url} className="w-12 h-12 object-cover rounded" />
                    )}
                    {mediaPreview.type === 'video' && (
                      <FileVideo className="w-8 h-8 text-blue-500 shrink-0" />
                    )}
                    {mediaPreview.type === 'audio' && (
                      <FileAudio className="w-8 h-8 text-purple-500 shrink-0" />
                    )}
                    {mediaPreview.type === 'document' && (
                      <FileText className="w-8 h-8 text-orange-500 shrink-0" />
                    )}
                    <span className="text-xs text-gray-600 truncate flex-1">{mediaPreview.name}</span>
                    <button type="button" onClick={clearMedia} className="text-gray-400 hover:text-red-500 shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Emoji picker */}
                {showEmoji && (
                  <div ref={emojiPickerRef} className="absolute bottom-28 left-4 z-50 shadow-xl rounded-xl overflow-hidden">
                    <EmojiPicker
                      onEmojiClick={onEmojiClick}
                      theme={Theme.LIGHT}
                      height={380}
                      width={320}
                      searchDisabled={false}
                      skinTonesDisabled
                    />
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  {/* Emoji button */}
                  <button
                    type="button"
                    onClick={() => setShowEmoji(v => !v)}
                    className={`p-2 rounded-full transition-colors shrink-0 ${
                      showEmoji ? 'bg-emerald-100 text-emerald-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  {/* Media upload button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors shrink-0"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  <Input
                    ref={inputRef}
                    placeholder={mediaFile ? 'Tambah caption (opsional)...' : 'Ketik pesan...'}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 bg-white border-0 shadow-sm"
                    disabled={sendMessageMut.isPending}
                  />

                  <Button
                    type="submit"
                    size="icon"
                    className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
                    disabled={(!newMessage.trim() && !mediaFile) || sendMessageMut.isPending}
                    loading={sendMessageMut.isPending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
