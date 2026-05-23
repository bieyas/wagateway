import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Trash2, Mail, ShieldCheck, Crown } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const roleBadge: Record<string, { label: string; color: string; icon: any }> = {
  owner:       { label: 'Owner',       color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: Crown },
  member:      { label: 'Member',      color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: Users },
  superadmin:  { label: 'Superadmin',  color: 'bg-purple-100 text-purple-700 border-purple-200', icon: ShieldCheck },
}

export default function TeamPage() {
  const { role, organizationId } = useAuthStore()
  const qc = useQueryClient()
  const isOwner = role === 'owner' || role === 'superadmin'

  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'member' })
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState('')

  const { data: membersRes, isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => authApi.listMembers(),
    enabled: !!organizationId,
  })
  const members: any[] = (membersRes as any)?.data || []

  const inviteMut = useMutation({
    mutationFn: (data: any) => authApi.inviteMember(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] })
      setForm({ email: '', password: '', fullName: '', role: 'member' })
      setShowForm(false)
      setFormError('')
    },
    onError: (err: any) => setFormError(err?.message || 'Gagal mengundang anggota'),
  })

  const removeMut = useMutation({
    mutationFn: (userId: string) => authApi.removeMember(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) { setFormError('Email dan password wajib diisi'); return }
    inviteMut.mutate(form)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Manajemen Tim</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{members.length} anggota</p>
        </div>
        {isOwner && (
          <Button size="sm" onClick={() => setShowForm(v => !v)}>
            <Plus className="w-4 h-4" />
            Undang Anggota
          </Button>
        )}
      </div>

      {/* Invite form */}
      {showForm && isOwner && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              Undang Anggota Baru
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Email *</label>
                  <Input type="email" placeholder="user@example.com" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Nama Lengkap</label>
                  <Input placeholder="John Doe" value={form.fullName}
                    onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Password *</label>
                  <Input type="password" placeholder="Min. 6 karakter" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Role</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="member">Member</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
              </div>
              {formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
              )}
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={inviteMut.isPending}>Kirim Undangan</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setFormError('') }}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            Anggota Organisasi
          </CardTitle>
          <CardDescription className="text-xs">Semua pengguna yang terhubung ke organisasi ini</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada anggota</p>
          ) : (
            members.map((m: any) => {
              const rb = roleBadge[m.role] || roleBadge.member
              const RoleIcon = rb.icon
              return (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <span className="text-emerald-700 font-semibold text-sm">
                        {(m.fullName || m.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.fullName || m.email}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${rb.color}`}>
                      <RoleIcon className="w-3 h-3" />
                      {rb.label}
                    </span>
                    {isOwner && m.role !== 'owner' && m.role !== 'superadmin' && (
                      <button
                        onClick={() => removeMut.mutate(m.id)}
                        disabled={removeMut.isPending}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {!organizationId && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700 font-medium">Akun ini tidak terhubung ke organisasi</p>
            <p className="text-xs text-amber-600 mt-1">Superadmin dapat melihat semua device tanpa org. Fitur team management tidak tersedia.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
