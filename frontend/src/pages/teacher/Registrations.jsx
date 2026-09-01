// src/pages/teacher/Registrations.jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teacherApi } from '../../api/all.api'
import { Spinner, PageTitle, EmptyState, StatusBadge } from '../../components/Shared'
import { ClipboardCheck, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function TeacherRegistrations() {
  const qc = useQueryClient()
  const [rejectNote, setRejectNote] = useState({})

  const { data, isLoading } = useQuery({
    queryKey: ['pending-regs'],
    queryFn: () => teacherApi.getPendingRegs().then(r => r.data)
  })

  const approveMut = useMutation({
    mutationFn: (id) => teacherApi.approveReg(id),
    onSuccess: () => { toast.success('Registration approved. Student advanced to next semester.'); qc.invalidateQueries(['pending-regs']) },
    onError: (e) => toast.error(e.response?.data?.error?.code || 'Error'),
  })
  const rejectMut = useMutation({
    mutationFn: ({ id, reason }) => teacherApi.rejectReg(id, reason),
    onSuccess: () => { toast.success('Rejected'); qc.invalidateQueries(['pending-regs']) },
  })

  if (isLoading) return <Spinner />
  const regs = data?.data || []

  return (
    <div>
      <PageTitle title="Semester Registrations" subtitle={`${regs.length} pending`} />
      {regs.length===0 ? (
        <EmptyState icon={ClipboardCheck} text="No pending registrations" subtext="All registrations have been reviewed" />
      ) : (
        <div className="space-y-4">
          {regs.map(reg => {
            return (
              <div key={reg.id} className="card p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-800 text-lg">{reg.student?.name}</p>
                    <p className="text-sm text-gray-500 font-mono">{reg.student?.rollNo} · Sem {reg.activeSem?.semester}</p>
                  </div>
                  <StatusBadge status={reg.status} />
                </div>
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Selected Subjects ({reg.selectedSubjectNames?.length || 0})</p>
                  <p className="text-sm text-gray-600">
                    {reg.selectedSubjectNames?.length > 0 
                      ? reg.selectedSubjectNames.join(', ') 
                      : 'No subjects selected'}
                  </p>
                </div>
                {reg.status === 'PENDING' && (
                  <div className="space-y-3">
                    <input value={rejectNote[reg.id]||''} onChange={e=>setRejectNote(p=>({...p,[reg.id]:e.target.value}))}
                      placeholder="Reject karne ka reason (optional)..." className="input text-sm"/>
                    <div className="flex gap-3">
                      <button onClick={() => rejectMut.mutate({ id: reg.id, reason: rejectNote[reg.id]||'Rejected by mentor' })}
                        disabled={rejectMut.isPending}
                        className="flex items-center gap-2 btn-danger flex-1">
                        <XCircle size={16}/> Reject
                      </button>
                      <button onClick={() => approveMut.mutate(reg.id)}
                        disabled={approveMut.isPending}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex-1 justify-center">
                        <CheckCircle size={16}/> {approveMut.isPending ? 'Approving...' : 'Approve'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
