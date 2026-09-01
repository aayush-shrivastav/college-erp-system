import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageTitle, Spinner } from '../../components/Shared'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { GraduationCap, CheckCircle, Clock, XCircle, Search, UploadCloud } from 'lucide-react'

export default function StudentScholarships() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('eligible')
  
  const { data: elData, isLoading: elLoading } = useQuery({
    queryKey: ['student-scholarship-eligible'],
    queryFn: () => api.get('/student/scholarships/eligible').then(r => r.data)
  })
  
  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['student-scholarship-apps'],
    queryFn: () => api.get('/student/scholarships/applications').then(r => r.data)
  })

  const [document, setDocument] = useState(null)
  
  const applyMut = useMutation({
    mutationFn: ({ scholarshipId, } ) => {
       const formData = new FormData();
       formData.append('scholarshipId', scholarshipId)
       // Assuming user's current semester from auth or local storage, defaulting to 1 for dummy
       formData.append('semester', '1') 
       formData.append('academicYear', '2026')
       if (document) formData.append('document', document)
       
       return api.post('/student/scholarships/apply', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
       })
    },
    onSuccess: () => { 
      toast.success('Application Submitted!')
      setDocument(null)
      setTab('applications')
      qc.invalidateQueries(['student-scholarship-apps']) 
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error applying')
  })

  // Basic presentation logic
  const checkStatus = (status) => {
    if (status === 'APPROVED') return <span className="text-emerald-500 font-bold bg-emerald-50 px-2 py-1 rounded">Approved</span>
    if (status === 'REJECTED') return <span className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded">Rejected</span>
    if (status === 'APPEALED') return <span className="text-purple-500 font-bold bg-purple-50 px-2 py-1 rounded">Appealed</span>
    return <span className="text-amber-500 font-bold bg-amber-50 px-2 py-1 rounded">Pending</span>
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Scholarships" subtitle="Find and apply for merit and category based scholarships" />

      <div className="flex gap-4 border-b border-slate-200">
        <button className={`pb-3 font-semibold ${tab === 'eligible' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`} onClick={() => setTab('eligible')}>
          Eligible For You
        </button>
        <button className={`pb-3 font-semibold ${tab === 'applications' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`} onClick={() => setTab('applications')}>
          My Applications
        </button>
      </div>

      {tab === 'eligible' && (
        <div className="space-y-6">
           {elLoading ? <Spinner /> : (
             <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {elData?.data?.eligible?.map(sch => (
                    <div key={sch.id} className="card p-5 border-2 border-emerald-100 bg-emerald-50/20">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-emerald-800">{sch.name}</h3>
                        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded">₹{sch.defaultAmount}</span>
                      </div>
                      <p className="text-sm text-slate-600 mb-4">{sch.description}</p>
                      
                      <div className="mb-4">
                         <label className="text-xs font-bold text-slate-500 block mb-1">Upload Certificate (Income/Bonafide/Category)</label>
                         <input type="file" onChange={e => setDocument(e.target.files[0])} className="text-xs" />
                      </div>

                      <button onClick={() => applyMut.mutate({ scholarshipId: sch.id })} disabled={applyMut.isPending} className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">
                         {applyMut.isPending ? 'Applying...' : 'Apply Now'}
                      </button>
                    </div>
                  ))}
                  {elData?.data?.eligible?.length === 0 && (
                    <div className="col-span-2 text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <GraduationCap className="mx-auto block text-slate-300 mb-2" size={32} />
                      <p className="text-slate-500 font-bold">No eligible scholarships right now.</p>
                      <p className="text-xs text-slate-400">Keep your marks up to unlock merit scholarships!</p>
                    </div>
                  )}
                </div>

                <h4 className="text-sm font-bold text-slate-500 uppercase mt-8">Not Eligible (Missing Criteria)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {elData?.data?.notEligible?.map(sch => (
                    <div key={sch.id} className="card p-5 opacity-70">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-700">{sch.name}</h3>
                        <span className="text-slate-400 font-bold">₹{sch.defaultAmount}</span>
                      </div>
                      <div className="mt-3">
                         {sch.reasons.map((r, i) => (
                           <p key={i} className="text-xs text-red-500 flex items-center gap-1"><XCircle size={12}/> {r}</p>
                         ))}
                      </div>
                    </div>
                  ))}
                </div>
             </>
           )}
        </div>
      )}

      {tab === 'applications' && (
        <div className="card p-5">
           {appsLoading ? <Spinner /> : (
              <div className="space-y-4">
                {appsData?.data?.map(app => (
                  <div key={app.id} className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-xl hover:bg-slate-50 transition">
                    <div>
                      <p className="font-bold text-slate-800">{app.scholarship?.name}</p>
                      <p className="text-xs text-slate-400">Applied on {new Date(app.appliedAt).toLocaleDateString()} · Sem {app.semester}</p>
                      {app.status === 'REJECTED' && <p className="text-xs text-red-500 mt-1 font-bold">Reason: {app.rejectionReason}</p>}
                    </div>
                    <div className="mt-3 sm:mt-0 text-right">
                       <span className="block mb-1">{checkStatus(app.status)}</span>
                       {app.status === 'APPROVED' && <span className="text-xs text-emerald-600 font-bold block">Approved Amt: ₹{app.approvedAmount}</span>}
                    </div>
                  </div>
                ))}
                {appsData?.data?.length === 0 && <p className="text-slate-500 text-center py-5">You haven't applied for any scholarships yet.</p>}
              </div>
           )}
        </div>
      )}
    </div>
  )
}
