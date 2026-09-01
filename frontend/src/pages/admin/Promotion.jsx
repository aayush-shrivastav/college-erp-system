// src/pages/admin/Promotion.jsx
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { adminApi } from '../../api/admin.api'
import { PageTitle, FormField } from '../../components/Shared'
import toast from 'react-hot-toast'
import { Play, Square, Key } from 'lucide-react'

export default function AdminPromotion() {
  const [form, setForm] = useState({
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear()+1}`,
    semester: '2', courseName: 'B.Tech CSE'
  })
  const [codes, setCodes] = useState([])
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const openMut = useMutation({
    mutationFn: () => adminApi.openPromotion({ ...form, semester: parseInt(form.semester) }),
    onSuccess: (res) => {
      toast.success('Registration window is now open')
      setCodes(res.data.data.codes || [])
    },
    onError: () => toast.error('Something went wrong'),
  })
  const closeMut = useMutation({
    mutationFn: adminApi.closePromotion,
    onSuccess: () => { toast.success('Registration window has been closed'); setCodes([]) },
  })

  return (
    <div className="space-y-6">
      <PageTitle title="Semester Promotion" subtitle="Registration window open/close karo" />
      <div className="card p-6">
        <h2 className="font-semibold mb-4 text-gray-800">Window Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <FormField label="Academic Year">
            <input value={form.academicYear} onChange={e=>set('academicYear',e.target.value)} className="input" placeholder="2024-25"/>
          </FormField>
          <FormField label="Semester">
            <select value={form.semester} onChange={e=>set('semester',e.target.value)} className="input">
              {[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>Semester {n}</option>)}
            </select>
          </FormField>
          <FormField label="Course Name">
            <input value={form.courseName} onChange={e=>set('courseName',e.target.value)} className="input" placeholder="B.Tech CSE"/>
          </FormField>
        </div>
        <div className="flex gap-3">
          <button onClick={() => openMut.mutate()} disabled={openMut.isPending}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50">
            <Play size={16}/> {openMut.isPending ? 'Opening...' : 'Open Window'}
          </button>
          <button onClick={() => closeMut.mutate()} disabled={closeMut.isPending}
            className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50">
            <Square size={16}/> {closeMut.isPending ? 'Closing...' : 'Close Window'}
          </button>
        </div>
      </div>

      {/* Generated Codes */}
      {codes.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Key size={18} className="text-blue-600"/> Generated Codes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {codes.map((c, i) => (
              <div key={i} className="bg-gray-50 border rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{c.teacher}</p>
                <p className="font-mono font-bold text-lg text-blue-600 tracking-widest">{c.code}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">These codes have been sent to teachers via email.</p>
        </div>
      )}
    </div>
  )
}
