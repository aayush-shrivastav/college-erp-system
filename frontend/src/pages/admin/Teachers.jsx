// src/pages/admin/Teachers.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/admin.api'
import { Spinner, PageTitle, Modal, FormField } from '../../components/Shared'
import toast from 'react-hot-toast'
import { Plus, Upload, Download, Trash2 } from 'lucide-react'
import * as xlsx from 'xlsx'

export default function AdminTeachers() {
  const [modal, setModal] = useState(null) // null | {type: 'add'} | {type: 'assign', teacher: ...} | {type: 'view', teacher: ...}
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => adminApi.listTeachers().then(r => r.data),
  })
  const createMut = useMutation({
    mutationFn: adminApi.createTeacher,
    onSuccess: () => { toast.success('Teacher created!'); qc.invalidateQueries(['teachers']); setModal(null) },
    onError: (e) => toast.error(e.response?.data?.error?.code === 'EMAIL_ALREADY_EXISTS' ? 'This email is already registered' : 'Error!'),
  })

  const bulkMut = useMutation({
    mutationFn: adminApi.bulkImportTeachers,
    onSuccess: res => {
      const d = res.data.data
      if (d.failed > 0) {
        toast.error(`${d.failed} teachers failed to import. Check console.`, { duration: 5000 })
        console.error('Bulk Teacher Import Failures:', d.errors)
      }
      toast.success(`${d.created} teachers imported successfully`)
      qc.invalidateQueries(['teachers'])
    },
    onError: e => {
      const d = e.response?.data?.data
      if (d?.errors?.length > 0) {
        toast.error(`Import Failed: ${d.errors[0].reason}`, { duration: 5000 })
      } else {
        toast.error('Import failed')
      }
    }
  })
  
  const deleteMut = useMutation({
    mutationFn: adminApi.deleteTeacher,
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Teacher deleted')
      qc.invalidateQueries(['teachers'])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error deleting teacher')
  })

  const confirmDelete = (t) => {
    if (window.confirm(`Are you sure you want to delete ${t.name}? This will mark them as deleted but preserve their historical records.`)) {
      deleteMut.mutate(t.id)
    }
  }

  const downloadTemplate = () => {
    const data = [{
      'Name': 'Dr. Alok Verma',
      'Employee ID': 'EMP202401',
      'Post': 'Assistant Professor',
      'Email': 'alok.verma@college.edu',
      'Department': 'Computer Science',
      'Phone': '9876543210'
    }]
    const ws = xlsx.utils.json_to_sheet(data)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "Teachers")
    xlsx.writeFile(wb, "Teacher_Import_Template.xlsx")
  }
  return (
    <div>
      <PageTitle title="Teachers" subtitle={`Total: ${data?.data?.length ?? '…'}`}>
        <div className="flex items-center gap-3">
          <button onClick={downloadTemplate} className="btn-outline flex items-center gap-2 px-4 py-2 text-sm border-white/20 bg-white/10 backdrop-blur-md">
            <Download size={14}/> Template
          </button>
          <label className="btn-outline flex items-center gap-2 cursor-pointer px-4 py-2 text-sm border-white/20 bg-white/10 backdrop-blur-md">
            <Upload size={14}/> Bulk Import
            <input type="file" accept=".xlsx,.csv" className="hidden"
              onChange={e => e.target.files[0] && bulkMut.mutate(e.target.files[0])}/>
          </label>
          <button onClick={() => setModal({ type: 'add' })} className="btn-primary flex items-center gap-2 px-6">
            <Plus size={18}/> Add Faculty Member
          </button>
        </div>
      </PageTitle>
      {isLoading ? <Spinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-md border-b border-slate-100 dark:border-slate-700/50">
              <tr>
                {['Name','Employee ID','Post','Department','Email','Mentees','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {data?.data?.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{t.name}</td>
                  <td className="px-4 py-3 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{t.employeeId}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">{t.designation || 'Faculty'}</td>
                  <td className="px-4 py-3 text-gray-500">{t.department || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.user?.email}</td>
                  <td className="px-4 py-3">
                    {t._count?.mentees > 0 ? (
                      <button onClick={() => setModal({ type: 'view', teacher: t })} className="text-blue-600 font-medium hover:underline text-xs">
                        {t._count.mentees} Students
                      </button>
                    ) : (
                      <span className="text-gray-300 text-xs">0 Students</span>
                    )}
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <button onClick={() => setModal({ type: 'view', teacher: t })} className="btn-outline text-xs px-2 py-1 border-blue-100 text-blue-500 hover:bg-blue-50">
                      View
                    </button>
                    <button onClick={() => setModal({ type: 'assign', teacher: t })} className="btn-outline text-xs px-3 py-1.5 border-blue-200 text-blue-600 hover:bg-blue-50">
                      Assign Range
                    </button>
                    <button onClick={() => confirmDelete(t)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete Teacher">
                      <Trash2 size={16}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal?.type === 'add' && <AddTeacherModal onClose={() => setModal(null)} onSubmit={createMut.mutate} loading={createMut.isPending} />}
      {modal?.type === 'assign' && <AssignMenteesModal onClose={() => setModal(null)} teacher={modal.teacher} />}
      {modal?.type === 'view' && <ViewMenteesModal onClose={() => setModal(null)} teacher={modal.teacher} />}
    </div>
  )
}
function AddTeacherModal({ onClose, onSubmit, loading }) {
  const [form, setForm] = useState({ name:'', employeeId:'', email:'', department:'', designation:'' })
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  return (
    <Modal title="Add New Teacher" onClose={onClose}>
      <div className="space-y-4">
        {[['name','Full Name','text'],['employeeId','Employee ID','text'],['designation','Post (e.g. Professor)','text'],['email','Email','email'],['department','Department','text']].map(([k,l,t]) => (
          <FormField key={k} label={l}><input type={t} value={form[k]} onChange={e=>set(k,e.target.value)} className="input" /></FormField>
        ))}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 btn-outline">Cancel</button>
          <button onClick={() => onSubmit(form)} disabled={loading||!form.name||!form.email||!form.employeeId} className="flex-1 btn-primary">
            {loading?'Creating...':'Create Teacher'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function AssignMenteesModal({ onClose, teacher }) {
  const qc = useQueryClient()
  const [f, setF] = useState({ branchId: '', batchYear: new Date().getFullYear(), currentSem: '1', fromRollNo: '', toRollNo: '' })
  
  const { data: branchesData, isLoading: brLoading } = useQuery({
    queryKey: ['admin-branches'],
    queryFn: () => adminApi.getBranches().then(r => r.data)
  })

  const assignMut = useMutation({
    mutationFn: (d) => adminApi.assignMentorsRange({ ...d, teacherId: teacher.id }),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Mentees assigned successfully')
      qc.invalidateQueries(['teachers'])
      qc.invalidateQueries(['students'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error assigning mentees')
  })

  return (
    <Modal title={`Assign Mentees to ${teacher.name}`} onClose={onClose} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-500 mb-2">Assign a range of students as mentees to this teacher.</p>
        
        <FormField label="Branch">
          {brLoading ? <span className="text-sm text-gray-400">Loading...</span> : (
            <select value={f.branchId} onChange={e=>setF({...f,branchId:e.target.value})} className="input">
              <option value="">Select Branch...</option>
              {branchesData?.data?.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </FormField>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Batch Year"><input type="number" value={f.batchYear} onChange={e=>setF({...f,batchYear:e.target.value})} className="input"/></FormField>
          <FormField label="Semester">
            <select value={f.currentSem} onChange={e=>setF({...f,currentSem:e.target.value})} className="input">
              {[1,2,3,4,5,6,7,8].map(s=><option key={s} value={s}>Semester {s}</option>)}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="From Roll No">
            <input value={f.fromRollNo} onChange={e=>setF({...f,fromRollNo:e.target.value})} className="input uppercase" placeholder="e.g. 25001" />
          </FormField>
          <FormField label="To Roll No">
            <input value={f.toRollNo} onChange={e=>setF({...f,toRollNo:e.target.value})} className="input uppercase" placeholder="e.g. 25030" />
          </FormField>
        </div>

        <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-xs">
          <strong>Note:</strong> Mentees inside this range will automatically be assigned to <strong>{teacher.name}</strong>. Their registration codes will map to this teacher.
        </div>
        
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 btn-outline">Cancel</button>
          <button onClick={()=>assignMut.mutate(f)} disabled={assignMut.isPending||!f.branchId||!f.fromRollNo||!f.toRollNo} className="flex-1 btn-primary bg-blue-600 hover:bg-blue-700">
            {assignMut.isPending?'Assigning...':'Assign Mentees'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ViewMenteesModal({ onClose, teacher }) {
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-mentees', teacher.id],
    queryFn: () => adminApi.listStudents({ mentorId: teacher.id, limit: 100 }).then(r => r.data)
  })

  return (
    <Modal title={`Mentees assigned to ${teacher.name}`} onClose={onClose} size="lg">
      {isLoading ? <Spinner /> : (
        <div className="space-y-4">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Roll No</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Branch</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Batch</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Sem</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data?.data?.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">No mentees assigned yet</td></tr>
                ) : (
                  data.data.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-blue-600">{s.rollNo}</td>
                      <td className="px-4 py-2 font-medium">{s.name}</td>
                      <td className="px-4 py-2 text-gray-500">{s.branch?.name}</td>
                      <td className="px-4 py-2 text-gray-500">{s.batch?.year}</td>
                      <td className="px-4 py-2"><span className="badge-blue">Sem {s.currentSem}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-2 border-t">
            <button onClick={onClose} className="btn-primary px-6">Close</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
