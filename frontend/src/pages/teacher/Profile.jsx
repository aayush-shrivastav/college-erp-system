// src/pages/teacher/Profile.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teacherApi } from '../../api/teacher.api'
import { authApi } from '../../api/auth.api'
import { Spinner, PageTitle, FormField } from '../../components/Shared'
import toast from 'react-hot-toast'
import { Lock, KeyRound, User } from 'lucide-react'

export default function TeacherProfile() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['teacher-profile'], queryFn: () => teacherApi.getProfile().then(r => r.data) })

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const setPw = (k, v) => setPwForm(p => ({ ...p, [k]: v }))
  const [showPwSection, setShowPwSection] = useState(false)

  const saveMut = useMutation({
    mutationFn: () => teacherApi.updateProfile(form),
    onSuccess: () => { toast.success('Profile updated!'); qc.invalidateQueries(['teacher-profile']); setEditing(false) },
    onError: () => toast.error('Update fail!')
  })

  const pwMut = useMutation({
    mutationFn: () => authApi.changePassword({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword }),
    onSuccess: () => { toast.success('Password changed successfully!'); setPwForm({ oldPassword: '', newPassword: '', confirm: '' }); setShowPwSection(false) },
    onError: (e) => {
      const code = e.response?.data?.error?.code
      if (code === 'WRONG_OLD_PASSWORD') toast.error('Incorrect old password!')
      else if (code === 'PASSWORD_TOO_SHORT') toast.error('New password must be at least 8 characters!')
      else toast.error('Failed to change password!')
    }
  })

  function handlePwSubmit(e) {
    e.preventDefault()
    if (pwForm.newPassword.length < 8) return toast.error('New password must be at least 8 characters')
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match!')
    pwMut.mutate()
  }

  if (isLoading) return <Spinner />
  const t = data?.data

  return (
    <div>
      <PageTitle title="My Profile">
        {!editing && <button onClick={() => { setForm({ name: t?.name||'', department: t?.department||'', phone: t?.phone||'' }); setEditing(true) }} className="btn-primary">Edit Profile</button>}
      </PageTitle>

      <div className="card p-6 mb-4">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b">
          <div className="bg-blue-100 rounded-full p-3">
            <User size={24} className="text-blue-600"/>
          </div>
          <div>
            <p className="font-bold text-gray-800 text-lg">{t?.name}</p>
            <p className="text-gray-500 text-sm">{t?.user?.email}</p>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4 max-w-md">
            <FormField label="Name">
              <input type="text" value={form.name||''} onChange={e => set('name', e.target.value)} className="input" placeholder="Your name"/>
            </FormField>
            <FormField label="Department">
              <input type="text" value={form.department||''} onChange={e => set('department', e.target.value)} className="input" placeholder="e.g. Computer Science"/>
            </FormField>
            <FormField label="Phone">
              <input type="tel" value={form.phone||''} onChange={e => set('phone', e.target.value)} className="input" placeholder="Phone number"/>
            </FormField>
            <div className="flex gap-3">
              <button onClick={() => setEditing(false)} className="btn-outline">Cancel</button>
              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary">
                {saveMut.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Employee ID" value={t?.employeeId}/>
            <InfoRow label="Department" value={t?.department}/>
            <InfoRow label="Phone" value={t?.phone}/>
          </div>
        )}
      </div>

      {/* Change Password Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-blue-600"/>
            <h3 className="font-semibold text-gray-800">Change Password</h3>
          </div>
          <button onClick={() => setShowPwSection(p => !p)} className="btn-outline text-sm">
            {showPwSection ? 'Cancel' : 'Change Password'}
          </button>
        </div>
        {showPwSection && (
          <form onSubmit={handlePwSubmit} className="space-y-4 max-w-sm">
            <FormField label="Old Password">
              <input type="password" value={pwForm.oldPassword} onChange={e => setPw('oldPassword', e.target.value)} className="input" required placeholder="Old password"/>
            </FormField>
            <FormField label="New Password (min 8 chars)">
              <input type="password" value={pwForm.newPassword} onChange={e => setPw('newPassword', e.target.value)} className="input" required minLength={8} placeholder="New password"/>
            </FormField>
            <FormField label="Confirm New Password">
              <input type="password" value={pwForm.confirm} onChange={e => setPw('confirm', e.target.value)} className="input" required placeholder="Repeat new password"/>
            </FormField>
            <button type="submit" disabled={pwMut.isPending} className="btn-primary">
              {pwMut.isPending ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="font-medium text-gray-800">{value || <span className="text-gray-300">—</span>}</p>
    </div>
  )
}
