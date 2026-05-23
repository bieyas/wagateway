import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  jwt: string
  username: string
  email: string
  role: string
  organizationId: string
  token: string
  deviceId: string
  setAuth: (jwt: string, username: string, email?: string, role?: string, organizationId?: string) => void
  setDevice: (token: string, deviceId: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      jwt: '',
      username: '',
      email: '',
      role: '',
      organizationId: '',
      token: '',
      deviceId: '',
      setAuth: (jwt, username, email = '', role = '', organizationId = '') => {
        localStorage.setItem('wa_jwt', jwt)
        set({ jwt, username, email, role, organizationId })
      },
      setDevice: (token, deviceId) => {
        localStorage.setItem('wa_token', token)
        localStorage.setItem('wa_device_id', deviceId)
        set({ token, deviceId })
      },
      clearAuth: () => {
        localStorage.removeItem('wa_jwt')
        localStorage.removeItem('wa_token')
        localStorage.removeItem('wa_device_id')
        set({ jwt: '', username: '', email: '', role: '', organizationId: '', token: '', deviceId: '' })
      },
    }),
    {
      name: 'wa-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.jwt) localStorage.setItem('wa_jwt', state.jwt)
        if (state?.token) localStorage.setItem('wa_token', state.token)
        if (state?.deviceId) localStorage.setItem('wa_device_id', state.deviceId)
      },
    },
  ),
)
