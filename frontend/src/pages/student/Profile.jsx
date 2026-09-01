// src/pages/student/Profile.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentApi } from '../../api/all.api'
import { authApi } from '../../api/auth.api'
import { Spinner, PageTitle, FormField } from '../../components/Shared'
import toast from 'react-hot-toast'
import { Lock, KeyRound } from 'lucide-react'

export default function StudentProfile() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey:['student-profile'], queryFn:()=>studentApi.getProfile().then(r=>r.data) })
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  // Change Password state
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const setPw = (k, v) => setPwForm(p => ({ ...p, [k]: v }))
  const [showPwSection, setShowPwSection] = useState(false)

  const saveMut = useMutation({
    mutationFn: ()=>studentApi.updateProfile(form),
    onSuccess: ()=>{ toast.success('Profile saved and locked successfully!'); qc.invalidateQueries(['student-profile']); setEditing(false) },
    onError: (e)=>{ if(e.response?.data?.error?.code==='PROFILE_LOCKED') toast.error('Profile is locked!'); else toast.error('Error saving profile!') }
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
  const s = data?.data

  const startEdit = () => { setForm({ phone:s?.phone||'', address:s?.address||'', fatherName:s?.fatherName||'', fatherPhone:s?.fatherPhone||'', motherName:s?.motherName||'', motherPhone:s?.motherPhone||'', tenthPercent:s?.tenthPercent||'', twelfthPercent:s?.twelfthPercent||'' }); setEditing(true) }

  return (
    <div>
      <PageTitle title="My Profile">
        {!s?.profileLocked && !editing && <button onClick={startEdit} className="btn-primary">Complete Profile</button>}
        {s?.profileLocked && <span className="flex items-center gap-1 text-green-600 text-sm font-medium"><Lock size={14}/>Profile Locked</span>}
      </PageTitle>
      <div className="card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4 pb-4 border-b">
          <InfoRow label="Roll Number" value={s?.rollNo}/>
          <InfoRow label="Name" value={s?.name}/>
          <InfoRow label="Batch Year" value={s?.batchYear}/>
          <InfoRow label="Current Semester" value={`Semester ${s?.currentSem}`}/>
          <InfoRow label="Mentor" value={s?.mentor?.name || '—'}/>
          <InfoRow label="Email" value={s?.user?.email}/>
        </div>
        {editing ? (
          <div>
            <h3 className="font-semibold text-gray-700 mb-4">Complete Your Profile</h3>
            <div className="grid grid-cols-2 gap-4">
              {[['phone','Phone Number','tel'],['address','Address','text'],['fatherName',"Father's Name",'text'],['fatherPhone',"Father's Phone",'tel'],['motherName',"Mother's Name",'text'],['motherPhone',"Mother's Phone",'tel'],['tenthPercent','10th %','number'],['twelfthPercent','12th %','number']].map(([k,l,t])=>(
                <FormField key={k} label={l}><input type={t} value={form[k]||''} onChange={e=>set(k,e.target.value)} className="input"/></FormField>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setEditing(false)} className="btn-outline">Cancel</button>
              <button onClick={()=>saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary">
                {saveMut.isPending?'Saving...':'Save & Lock Profile'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Phone" value={s?.phone}/><InfoRow label="Address" value={s?.address}/>
            <InfoRow label="Father's Name" value={s?.fatherName}/><InfoRow label="Father's Phone" value={s?.fatherPhone}/>
            <InfoRow label="Mother's Name" value={s?.motherName}/><InfoRow label="10th %" value={s?.tenthPercent ? `${s.tenthPercent}%` : '—'}/>
            <InfoRow label="12th %" value={s?.twelfthPercent ? `${s.twelfthPercent}%` : '—'}/>
          </div>
        )}
      </div>

      {/* Change Password Section */}
      <div className="card p-6 mt-4">
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
function InfoRow({label,value}) {
  return <div><p className="text-xs text-gray-400 mb-0.5">{label}</p><p className="font-medium text-gray-800">{value||<span className="text-gray-300">—</span>}</p></div>
}
