// src/pages/admin/Students.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/admin.api'
import { Spinner, PageTitle, Modal, FormField, Pagination, ConfirmDialog } from '../../components/Shared'
import FeeDetails from '../../components/Shared/FeeDetails'
import toast from 'react-hot-toast'
import { Plus, Search, Upload, Trash2, Lock, Unlock, Eye, Download } from 'lucide-react'
import * as xlsx from 'xlsx'
import api from '../../api/axios'

export default function AdminStudents() {
  const [search,     setSearch]     = useState('')
  const [page,       setPage]       = useState(1)
  const [showAdd,    setShowAdd]    = useState(false)
  const [confirm,    setConfirm]    = useState(null)
  const [feeStudent, setFeeStudent] = useState(null) // { id, name, rollNo }
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, search],
    queryFn: () => adminApi.listStudents({ page, limit: 20, search: search || undefined }).then(r => r.data),
    keepPreviousData: true,
  })

  // Fee details for selected student
  const { data: feeData, isLoading: feeLoading } = useQuery({
    queryKey: ['admin-student-fee', feeStudent?.id],
    queryFn: () => api.get(`/admin/students/${feeStudent.id}/fee-account`).then(r => r.data),
    enabled: !!feeStudent?.id
  })

  const createMut = useMutation({
    mutationFn: adminApi.createStudent,
    onSuccess: () => { toast.success('Student created'); qc.invalidateQueries(['students']); setShowAdd(false) },
    onError: e => {
      const errCode = e.response?.data?.error?.code;
      const errMsg = e.response?.data?.error?.message || e.response?.data?.message;
      if (errCode === 'EMAIL_ALREADY_EXISTS') toast.error('Email already registered');
      else if (errCode === 'BATCH_NOT_FOUND') toast.error('Batch Year does not exist. Please create the batch first.');
      else toast.error(errMsg || 'Something went wrong');
    },
  })

  const deleteMut = useMutation({
    mutationFn: id => adminApi.deleteStudent(id),
    onSuccess: () => { toast.success('Student deleted'); qc.invalidateQueries(['students']); setConfirm(null) },
    onError: () => toast.error('Delete failed'),
  })

  const bulkMut = useMutation({
    mutationFn: adminApi.bulkImportStudents,
    onSuccess: res => {
      const d = res.data.data
      if (d.failed > 0) {
        toast.error(`${d.failed} students failed. Check console or verify your Excel headers/data.`, { duration: 6000 })
        console.error('Import Failures:', d.errors)
      } else {
        toast.success(`${d.created} students imported successfully`)
      }
      qc.invalidateQueries(['students'])
    },
    onError: e => {
      const d = e.response?.data?.data
      if (d?.errors?.length > 0) {
        toast.error(`Import Failed: ${d.errors[0].reason}`, { duration: 6000 })
      } else {
        toast.error(e.response?.data?.message || 'Import failed. Check file format.')
      }
    },
  })

  const downloadTemplate = () => {
    const data = [{
      'Name': 'Rahul Sharma',
      'Roll No': 'CS2024-001',
      'Email': 'student@college.edu',
      'Batch Year': 2024,
      'Branch Name': 'Computer Science',
      'Semester': 1
    }]
    const ws = xlsx.utils.json_to_sheet(data)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "Students")
    xlsx.writeFile(wb, "Student_Import_Template.xlsx")
  }

  return (
    <div>
      <PageTitle title="Students" subtitle={`Total: ${data?.meta?.total ?? '…'}`}>
        <button onClick={downloadTemplate} className="btn-outline flex items-center gap-2">
          <Download size={14}/> Template
        </button>
        <label className="btn-outline flex items-center gap-2 cursor-pointer">
          <Upload size={14}/> Bulk Import
          <input type="file" accept=".xlsx,.csv" className="hidden"
            onChange={e => e.target.files[0] && bulkMut.mutate(e.target.files[0])}/>
        </label>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={14}/> Add Student
        </button>
      </PageTitle>

      {/* Search & Stats Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full max-w-md group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"/>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name or roll number..."
            className="input pl-12 bg-white/40 dark:bg-slate-800/20 border-white/20 dark:border-white/5 focus:bg-white dark:focus:bg-slate-800/40"/>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 rounded-2xl bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/20 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
             Showing {data?.data?.length || 0} of {data?.meta?.total || 0} Students
           </div>
        </div>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-md border-b border-slate-100 dark:border-slate-700/50 text-slate-600 dark:text-slate-400">
                <tr>
                  {['Roll No','Name','Branch','Batch','Semester','Mentor','Profile','Email','Fee Status','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 font-semibold uppercase tracking-wider text-[11px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {data?.data?.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No students found</td></tr>
                )}
                {data?.data?.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="px-4 py-3 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{s.rollNo}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">{s.branch?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{s.batch?.year}</td>
                    <td className="px-4 py-3">
                      <span className="badge-blue">Sem {s.currentSem}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {s.mentor?.name || <span className="text-gray-300 italic">Not Assigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      {s.profileLocked
                        ? <span className="flex items-center gap-1 text-green-600 text-xs"><Lock size={12}/>Locked</span>
                        : <span className="flex items-center gap-1 text-amber-600 text-xs"><Unlock size={12}/>Pending</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.user?.email}</td>
                    <td className="px-4 py-3">
                      {s.feeAccount ? (
                        <div>
                          <p className="text-xs text-green-600 font-medium">
                            Paid: ₹{Number(s.feeAccount.totalPaid).toLocaleString()}
                          </p>
                          <p className="text-xs text-red-500">
                            Due: ₹{(Number(s.feeAccount.totalPayable) - Number(s.feeAccount.totalPaid)).toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">Not set up</span>
                      )}
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <button
                        onClick={() => setFeeStudent({ id: s.id, name: s.name, rollNo: s.rollNo })}
                        className="p-1 text-blue-400 hover:text-blue-600 transition" title="View fee details">
                        <Eye size={15}/>
                      </button>
                      <button
                        onClick={() => setConfirm({ id: s.id, name: s.name })}
                        className="p-1 text-red-400 hover:text-red-600 transition" title="Delete student">
                        <Trash2 size={15}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={data?.meta} page={page} setPage={setPage}/>
        </div>
      )}

      {/* Add Student Modal */}
      {showAdd && (
        <AddStudentModal
          onClose={() => setShowAdd(false)}
          onSubmit={createMut.mutate}
          loading={createMut.isPending}
        />
      )}

      {/* Delete Confirm */}
      {confirm && (
        <ConfirmDialog
          title="Delete Student?"
          message={`"${confirm.name}" ka account deactivate ho jayega. Kya aap sure hain?`}
          onConfirm={() => deleteMut.mutate(confirm.id)}
          onCancel={() => setConfirm(null)}
          loading={deleteMut.isPending}
        />
      )}

      {/* Fee Details Modal */}
      {feeStudent && (
        <Modal
          title={`Fee Details — ${feeStudent.name} (${feeStudent.rollNo})`}
          onClose={() => setFeeStudent(null)}
          size="lg">
          {feeLoading
            ? <Spinner/>
            : <FeeDetails fee={feeData?.data} />
          }
        </Modal>
      )}
    </div>
  )
}

function AddStudentModal({ onClose, onSubmit, loading }) {
  const [form, setForm] = useState({ name:'', rollNo:'', email:'', batchYear: new Date().getFullYear(), branchId: '', currentSem: '1' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const { data: branchesData, isLoading: brLoading } = useQuery({
    queryKey: ['admin-branches'],
    queryFn: () => adminApi.getBranches().then(r => r.data)
  })

  const fields = [
    { key:'name',      label:'Full Name',   type:'text',   placeholder:'Rahul Sharma' },
    { key:'rollNo',    label:'Roll Number', type:'text',   placeholder:'CS2301' },
    { key:'email',     label:'Email',       type:'email',  placeholder:'student@college.edu' },
    { key:'batchYear', label:'Batch Year',  type:'number', placeholder:'2023' },
  ]
  return (
    <Modal title="Add New Student" onClose={onClose}>
      <div className="space-y-4">
        {fields.map(f => (
          <FormField key={f.key} label={f.label}>
            <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder} className="input"/>
          </FormField>
        ))}
        <FormField label="Branch">
          {brLoading ? <span className="text-sm text-gray-500">Loading branches...</span> : (
            <select
              className="input bg-white"
              value={form.branchId}
              onChange={e => set('branchId', e.target.value)}
            >
              <option value="">Select Branch...</option>
              {branchesData?.data?.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label="Current Semester">
          <select 
            className="input bg-white"
            value={form.currentSem}
            onChange={e => set('currentSem', e.target.value)}
          >
            {[1,2,3,4,5,6,7,8].map(s => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </FormField>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 btn-outline">Cancel</button>
          <button onClick={() => onSubmit(form)}
            disabled={loading || !form.name || !form.rollNo || !form.email || !form.branchId}
            className="flex-1 btn-primary">
            {loading ? 'Creating...' : 'Create Student'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
