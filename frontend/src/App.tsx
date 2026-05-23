import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { deviceApi } from '@/lib/api'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/login/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import DevicesPage from '@/pages/devices/DevicesPage'
import ConversationsPage from '@/pages/conversations/ConversationsPage'
import AIAgentPage from '@/pages/ai-agent/AIAgentPage'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 5000 } } })

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { jwt, token, setDevice } = useAuthStore()

  useEffect(() => {
    // If logged in but no device token (returning user on new browser), auto-fetch
    if (jwt && !token) {
      deviceApi.list().then((res: any) => {
        const devices = res?.data || []
        if (devices.length > 0) setDevice(devices[0].token, devices[0].deviceId)
      }).catch(() => {})
    }
  }, [jwt, token, setDevice])

  if (!jwt) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="devices" element={<DevicesPage />} />
            <Route path="conversations" element={<ConversationsPage />} />
            <Route path="devices/:deviceId/ai-agent" element={<AIAgentPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
