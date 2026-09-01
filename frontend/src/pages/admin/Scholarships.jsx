import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageTitle, Spinner } from '../../components/Shared'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { GraduationCap, CheckCircle, Clock, XCircle, Search, DollarSign, Upload, Plus } from 'lucide-react'

export default function AdminScholarships() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('applications')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', defaultAmount: 0,
    minCgpa: 0, minAttendancePercent: 0, familyIncomeLimit: 0,
    minTenthPercent: 0, minTwelfthPercent: 0,
    applicationDeadline: '',
    category: '', gender: '', skipMarksFilter: false
  })
  
  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['admin-scholarship-apps'],
    queryFn: () => api.get('/admin/scholarships/applications').then(r => r.data)
  })
  
  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['admin-scholarship-config'],
    queryFn: () => api.get('/admin/scholarships/setup').then(r => r.data)
  })

  // Approve/Reject logic
  const approveMut = useMutation({
    mutationFn: ({ id, approvedAmount }) => api.post(`/admin/scholarships/applications/${id}/approve`, { approvedAmount }),
    onSuccess: () => { toast.success('Application Approved and Ledger adjusted!'); qc.invalidateQueries(['admin-scholarship-apps']) },
    onError: (e) => toast.error(e.response?.data?.message || 'Error approving')
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, rejectionReason }) => api.post(`/admin/scholarships/applications/${id}/reject`, { rejectionReason }),
    onSuccess: () => { toast.success('Application Rejected'); qc.invalidateQueries(['admin-scholarship-apps']) },
    onError: (e) => toast.error(e.response?.data?.message || 'Error rejecting')
  })

  const createMut = useMutation({
    mutationFn: (data) => api.post('/admin/scholarships/setup', data),
    onSuccess: () => {
      toast.success('Scholarship Scheme Created!')
      setShowModal(false)
      setForm({ name: '', description: '', defaultAmount: 0, minCgpa: 0, minAttendancePercent: 0, familyIncomeLimit: 0, minTenthPercent: 0, minTwelfthPercent: 0, applicationDeadline: '', category: '', gender: '', skipMarksFilter: false })
      qc.invalidateQueries(['admin-scholarship-config'])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error creating scholarship')
  })

  const handleApprove = (app) => {
    const amt = window.prompt(`Approve ${app.student.name} for ${app.scholarship.name}?\nEnter approved amount:`, app.scholarship.defaultAmount)
    if (amt !== null) {
      approveMut.mutate({ id: app.id, approvedAmount: Number(amt) })
    }
  }

  const handleReject = (app) => {
    const reason = window.prompt(`Reject ${app.student.name} for ${app.scholarship.name}?\nEnter reason:`, "Did not meet eligibility criteria")
    if (reason !== null) {
      rejectMut.mutate({ id: app.id, rejectionReason: reason })
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Scholarship Management" subtitle="Approve applications and manage scholarship schemes" />

      <div className="flex gap-4 border-b border-slate-200">
        <button className={`pb-3 font-semibold ${tab === 'applications' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`} onClick={() => setTab('applications')}>
          Student Applications
        </button>
        <button className={`pb-3 font-semibold ${tab === 'config' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`} onClick={() => setTab('config')}>
          Scholarship Schemes
        </button>
      </div>

      {tab === 'applications' && (
        <div className="card p-5">
           {appsLoading ? <Spinner /> : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="p-3">Student</th>
                    <th className="p-3">Scholarship</th>
                    <th className="p-3">Sem</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appsData?.data?.map(app => (
                    <tr key={app.id}>
                      <td className="p-3">
                        <p className="font-bold">{app.student.name}</p>
                        <p className="text-xs text-slate-400">{app.student.rollNo}</p>
                      </td>
                      <td className="p-3">
                        {app.scholarship.name}
                        {app.documentUrl && (
                          <span className="block text-xs mt-1 text-blue-500 hover:underline">
                            <a href={`http://localhost:3000${app.documentUrl}`} target="_blank" rel="noreferrer">View Certificate</a>
                          </span>
                        )}
                      </td>
                      <td className="p-3">{app.semester}</td>
                      <td className="p-3">
                        {app.status === 'PENDING' && <span className="text-amber-500 font-bold">Pending</span>}
                        {app.status === 'APPROVED' && <span className="text-emerald-500 font-bold">Approved</span>}
                        {app.status === 'REJECTED' && <span className="text-red-500 font-bold">Rejected</span>}
                        {app.status === 'APPEALED' && <span className="text-purple-500 font-bold">Appealed</span>}
                      </td>
                      <td className="p-3 text-right gap-2 flex justify-end">
                        {(app.status === 'PENDING' || app.status === 'APPEALED') && (
                          <>
                            <button onClick={() => handleApprove(app)} className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded hover:bg-emerald-200 font-bold">Approve</button>
                            <button onClick={() => handleReject(app)} className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 font-bold">Reject</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {appsData?.data?.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-slate-400">No applications found.</td></tr>}
                </tbody>
              </table>
           )}
        </div>
      )}

      {tab === 'config' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
             <h3 className="font-bold text-slate-700">Active Scholarship Schemes</h3>
             <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                <Plus size={18} /> Add New Scheme
             </button>
          </div>

          <div className="card p-5">
            {configLoading ? <Spinner /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {configData?.data?.map(s => (
                   <div key={s.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50 hover:shadow-md transition-all">
                      <div className="flex justify-between mb-2">
                         <h4 className="font-bold text-lg text-blue-600">{s.name}</h4>
                         <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">₹{s.defaultAmount.toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-500 mb-3">{s.description}</p>
                      
                      <div className="grid grid-cols-2 gap-y-2 text-xs border-t pt-3">
                         <div className="text-slate-400 uppercase tracking-tighter font-bold">Eligibility</div>
                         <div className="text-right font-medium">
                            {s.minCgpa > 0 && <span>Min CGPA: {s.minCgpa} • </span>}
                            {s.minAttendancePercent > 0 && <span>Attn: {s.minAttendancePercent}% • </span>}
                            {s.minTenthPercent > 0 && <span>10th: {s.minTenthPercent}% • </span>}
                            {s.minTwelfthPercent > 0 && <span>12th: {s.minTwelfthPercent}%</span>}
                            {s.minCgpa === 0 && s.minAttendancePercent === 0 && s.minTenthPercent === 0 && s.minTwelfthPercent === 0 && <span>None</span>}
                         </div>

                         <div className="text-slate-400 uppercase tracking-tighter font-bold">Category/Income</div>
                         <div className="text-right font-medium">
                            {s.category || 'Any'} / ₹{s.familyIncomeLimit?.toLocaleString() || 'Any'}
                         </div>

                         <div className="text-slate-400 uppercase tracking-tighter font-bold">Deadline</div>
                         <div className="text-right font-medium">
                            {s.applicationDeadline ? new Date(s.applicationDeadline).toLocaleDateString() : 'No Limit'}
                         </div>
                         
                         {s.skipMarksFilter && (
                           <div className="col-span-2 mt-2 text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle size={14} /> Bypasses Academic Filters (DRCC Style)
                           </div>
                         )}
                      </div>
                   </div>
                 ))}
                 {configData?.data?.length === 0 && <p className="col-span-2 text-center py-10 text-slate-400">No scholarship schemes defined yet.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-2xl shadow-2xl relative animate-in fade-in zoom-in duration-200">
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500 transition-colors">
                <XCircle size={24} />
              </button>
              
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <GraduationCap className="text-blue-600" /> Create New Scholarship
              </h2>

              <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Scheme Name</label>
                    <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input w-full" placeholder="e.g. Merit-cum-Means Scholarship" />
                 </div>

                 <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                    <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input w-full h-20" placeholder="Brief details about the scholarship..." />
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Amount (₹)</label>
                    <input type="number" required value={form.defaultAmount} onChange={e => setForm({...form, defaultAmount: Number(e.target.value)})} className="input w-full" />
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Category Restriction</label>
                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input w-full">
                       <option value="">Any Category</option>
                       <option value="GENERAL">General</option>
                       <option value="OBC">OBC</option>
                       <option value="SC_ST">SC/ST</option>
                       <option value="DRCC">DRCC</option>
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Min CGPA</label>
                      <input type="number" step="0.1" value={form.minCgpa} onChange={e => setForm({...form, minCgpa: Number(e.target.value)})} className="input w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Min Attendance %</label>
                      <input type="number" value={form.minAttendancePercent} onChange={e => setForm({...form, minAttendancePercent: Number(e.target.value)})} className="input w-full" />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Min 10th %</label>
                      <input type="number" value={form.minTenthPercent} onChange={e => setForm({...form, minTenthPercent: Number(e.target.value)})} className="input w-full" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Min 12th %</label>
                      <input type="number" value={form.minTwelfthPercent} onChange={e => setForm({...form, minTwelfthPercent: Number(e.target.value)})} className="input w-full" />
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Application Deadline</label>
                    <input type="date" value={form.applicationDeadline} onChange={e => setForm({...form, applicationDeadline: e.target.value})} className="input w-full" />
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Income Limit (₹)</label>
                    <input type="number" value={form.familyIncomeLimit} onChange={e => setForm({...form, familyIncomeLimit: Number(e.target.value)})} className="input w-full" />
                 </div>

                 <div className="md:col-span-2 p-4 bg-emerald-50 rounded-2xl flex items-center justify-between">
                    <div>
                       <p className="font-bold text-emerald-800 text-sm">Bypass Academic Filter</p>
                       <p className="text-xs text-emerald-600">Check this for DRCC or specialized govt schemes</p>
                    </div>
                    <input type="checkbox" checked={form.skipMarksFilter} onChange={e => setForm({...form, skipMarksFilter: e.target.checked})} className="w-6 h-6 rounded accent-emerald-600" />
                 </div>

                 <div className="md:col-span-2 flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="btn-outline">Cancel</button>
                    <button type="submit" disabled={createMut.isLoading} className="btn-primary px-8">
                       {createMut.isLoading ? 'Creating...' : 'Create Scholarship Scheme'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  )
}
