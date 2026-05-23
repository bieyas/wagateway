import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Smartphone,
  Users, LogOut, Menu, X, Wifi, ChevronRight, Download, Share,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

const nav = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard',     color: 'text-violet-600', bg: 'bg-violet-50' },
  { to: '/devices',       icon: Smartphone,      label: 'Devices',       color: 'text-sky-600',    bg: 'bg-sky-50' },
  { to: '/conversations', icon: Users,           label: 'Percakapan',    color: 'text-orange-600', bg: 'bg-orange-50' },
]

const pageTitles: Record<string, string> = {
  '/': 'Dashboard', '/devices': 'Devices',
  '/conversations': 'Percakapan', '/ai-agent': 'AI Agent',
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const { username, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const iosHintRef = useRef<HTMLDivElement>(null)

  const pageTitle = pageTitles[location.pathname] || 'WA Gateway'

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (iosHintRef.current && !iosHintRef.current.contains(e.target as Node)) setShowIosHint(false)
    }
    if (showIosHint) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showIosHint])

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') setInstallPrompt(null)
    } else if (isIos) {
      setShowIosHint(h => !h)
    }
  }

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const showInstallBtn = !isInStandaloneMode && (installPrompt || isIos)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 w-64 bg-white flex flex-col transition-transform duration-250 ease-in-out lg:static lg:translate-x-0 border-r border-gray-100',
        sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full',
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-100 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm shadow-emerald-200">
            <Wifi className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-none">WA Gateway</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Dashboard</p>
          </div>
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Admin chip */}
        {username && (
          <div className="mx-4 mt-4 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-800 truncate">{username}</p>
                <p className="text-[11px] text-emerald-500">Administrator</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
          {nav.map(({ to, icon: Icon, label, color, bg }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? `${bg} ${color} shadow-sm`
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all',
                    isActive ? `${bg} ${color}` : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200',
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-red-100">
              <LogOut className="w-4 h-4" />
            </div>
            Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-gray-100 bg-white flex items-center px-4 gap-3 shrink-0 shadow-xs">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile logo */}
          <div className="lg:hidden w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
            <Wifi className="w-3.5 h-3.5 text-white" />
          </div>

          <h1 className="font-semibold text-gray-900 text-sm">{pageTitle}</h1>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Install PWA button */}
          {showInstallBtn && (
            <div className="relative" ref={iosHintRef}>
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-all"
              >
                {isIos ? <Share className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Install App</span>
              </button>
              {showIosHint && (
                <div className="absolute right-0 top-10 z-50 bg-gray-900 text-white text-xs rounded-xl p-3 w-56 shadow-xl">
                  <p className="font-semibold mb-1">Install di iOS:</p>
                  <p>1. Tap ikon <strong>Share</strong> (kotak + panah atas)</p>
                  <p className="mt-1">2. Pilih <strong>"Add to Home Screen"</strong></p>
                  <div className="absolute -top-1.5 right-4 w-3 h-3 bg-gray-900 rotate-45" />
                </div>
              )}
            </div>
          )}

          {/* API docs link */}
          <a
            href={import.meta.env.VITE_API_DOCS_URL || 'http://localhost:3000/docs'}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-all"
          >
            API Docs
          </a>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden bg-gray-50 relative flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
