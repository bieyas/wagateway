import axios from 'axios'

const handleUnauthorized = () => {
  localStorage.removeItem('wa_jwt')
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login'
  }
}

const API_BASE = import.meta.env.VITE_API_URL || ''

// Client untuk API publik (device token) - masih dipakai untuk send-message dll
const api = axios.create({ baseURL: `${API_BASE}/api` })
api.interceptors.request.use((config) => {
  // Try localStorage first, then zustand persisted store as fallback
  const token = localStorage.getItem('wa_token') ||
    (() => { try { const s = JSON.parse(localStorage.getItem('wa-auth') || '{}'); return s?.state?.token || '' } catch { return '' } })()
  if (token) config.headers['Authorization'] = token
  return config
})
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) handleUnauthorized()
    return Promise.reject(err.response?.data || err)
  },
)

// Client untuk Dashboard (JWT Bearer)
const dashApi = axios.create({ baseURL: `${API_BASE}/dashboard` })
dashApi.interceptors.request.use((config) => {
  const jwt = localStorage.getItem('wa_jwt') ||
    (() => { try { const s = JSON.parse(localStorage.getItem('wa-auth') || '{}'); return s?.state?.jwt || '' } catch { return '' } })()
  if (jwt) config.headers['Authorization'] = `Bearer ${jwt}`
  return config
})
dashApi.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) handleUnauthorized()
    return Promise.reject(err.response?.data || err)
  },
)

// Client untuk Auth endpoint

const authClient = axios.create({ baseURL: API_BASE })
authClient.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err.response?.data || err),
)

export default api

// --- Auth ---
export const authApi = {
  login: (username: string, password: string) =>
    authClient.post('/auth/login', { username, password }),
}

// --- Dashboard Device (JWT) ---
export const deviceApi = {
  list: () => dashApi.get('/devices'),
  create: (data: { name: string; webhookUrl?: string; engine?: string }) => dashApi.post('/devices', data),
  update: (id: string, data: object) => dashApi.put(`/devices/${id}`, data),
  delete: (id: string) => dashApi.delete(`/devices/${id}`),
  connect: (id: string) => dashApi.post(`/devices/${id}/connect`),
  disconnect: (id: string) => dashApi.post(`/devices/${id}/disconnect`),
  qr: (id: string) => dashApi.get(`/devices/${id}/qr`),
}

// --- Dashboard AI Agent per-device (JWT) ---
export const aiApi = {
  getConfig: (deviceId: string) => dashApi.get(`/devices/${deviceId}/ai-agent`),
  updateConfig: (deviceId: string, data: object) => dashApi.put(`/devices/${deviceId}/ai-agent`, data),
  getBlacklist: (deviceId: string) => dashApi.get(`/devices/${deviceId}/ai-agent/blacklist`),
  addBlacklist: (deviceId: string, phone: string) => dashApi.post(`/devices/${deviceId}/ai-agent/blacklist`, { phone }),
  removeBlacklist: (deviceId: string, phone: string) => dashApi.delete(`/devices/${deviceId}/ai-agent/blacklist/${phone}`),
  getWhitelist: (deviceId: string) => dashApi.get(`/devices/${deviceId}/ai-agent/whitelist`),
  setDevMode: (deviceId: string, devMode: boolean) => dashApi.put(`/devices/${deviceId}/ai-agent/whitelist/mode`, { devMode }),
  addWhitelist: (deviceId: string, phone: string) => dashApi.post(`/devices/${deviceId}/ai-agent/whitelist`, { phone }),
  removeWhitelist: (deviceId: string, phone: string) => dashApi.delete(`/devices/${deviceId}/ai-agent/whitelist/${phone}`),
}

// --- Messages ---
export const messageApi = {
  sendText: (data: object) => api.post('/send-message', data),
  sendMedia: (data: object) => api.post('/send-message', data),
  status: (id: string) => api.get(`/message/status/${id}`),
}

// --- Media Upload ---
export const mediaApi = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/media/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}


// --- Conversations ---
export const convApi = {
  list: () => api.get('/ai-agent/conversations'),
  get: (phone: string) => api.get(`/ai-agent/conversations/${phone}`),
  reset: (phone: string) => api.delete(`/ai-agent/conversations/${phone}`),
  handoff: (phone: string) => api.post(`/ai-agent/conversations/${phone}/handoff`),
  takeover: (phone: string) => api.post(`/ai-agent/conversations/${phone}/takeover`),
  release: (phone: string) => api.post(`/ai-agent/conversations/${phone}/release`),
}

// --- Unified Chats (WhatsApp Web-style) ---
export const chatApi = {
  list: () => api.get('/ai-agent/conversations/chats/all'),
  get: (phone: string) => api.get(`/ai-agent/conversations/chats/${phone}`),
}
