import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teacherApi } from '../../api/all.api'
import { PageTitle, Spinner, EmptyState } from '../../components/Shared'
import { BookOpen, CheckCircle, XCircle, Calendar, Hash } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

const STATUS_STYLES = {
  PRESENT: 'bg-green-100 text-green-700 border-green-400',
  ABSENT:  'bg-red-100   text-red-700   border-red-400',
  LATE:    'bg-amber-100 text-amber-700 border-amber-400',
  EXCUSED: 'bg-blue-100  text-blue-700  border-blue-400',
}

export default function Attendance() {
  const queryClient = useQueryClient()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selAssignment, setSelAssignment] = useState('')
  const [sessionId, setSessionId] = useState(null)
  
  // 1. Get Teacher's assigned subjects
  const { data: assignmentsRes } = useQuery({
    queryKey: ['my-subjects'],
    queryFn: () => api.get('/teacher/my-subjects').then(r => r.data)
  })
  const assignments = assignmentsRes?.data || []

  // 2. If session opened, get real records
  const { data: recordsRes, isLoading: recordsLoading } = useQuery({
    queryKey: ['session-records', sessionId],
    queryFn: () => teacherApi.getSessionRecords(sessionId).then(r => r.data),
    enabled: !!sessionId
  })
  const [records, setRecords] = useState([])

  // Update records local state when API data arrives
  useEffect(() => {
    if (recordsRes?.data) {
      setRecords(recordsRes.data.map(r => ({ studentId: r.id, status: r.status, name: r.name, rollNo: r.rollNo })))
    }
  }, [recordsRes])

  const createSess = useMutation({
    mutationFn: () => teacherApi.createSession({ 
      classAssignmentId: selAssignment, 
      sessionDate: date,
      startTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) // HH:MM
    }),
    onSuccess: (res) => { 
      setSessionId(res.data.data.session.id); 
      toast.success('Session opened! Attendance marked as ABSENT by default.') 
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error!'),
  })

  const saveMut = useMutation({
    mutationFn: () => teacherApi.markAttendance(sessionId, records.map(({studentId, status}) => ({studentId, status}))),
    onSuccess: () => {
      toast.success('Attendance saved!');
      queryClient.invalidateQueries(['session-records', sessionId]);
    },
  })

  const skipMut = useMutation({
    mutationFn: (data) => teacherApi.skipSession(sessionId, data),
    onSuccess: (_, vars) => { 
      toast.success(`Session ${vars.status} marked`); 
      setSessionId(null);
      setRecords([]);
    },
  })

  const toggle = (sid, status) => setRecords(p => p.map(r => r.studentId === sid ? { ...r, status } : r))
  const markAll = () => setRecords(p => p.map(r => ({ ...r, status: 'PRESENT' })))
  
  const presentCount = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length

  return (
    <div>
      <PageTitle title="Attendance" />
      
      {/* Controls */}
      <div className="card p-5 mb-5 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input w-40" />
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Select Subject / Class</label>
          <select 
            value={selAssignment} 
            onChange={e => setSelAssignment(e.target.value)}
            disabled={!!sessionId}
            className="input w-full"
          >
            <option value="">-- Select --</option>
            {assignments.map(a => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.className})
              </option>
            ))}
          </select>
        </div>

        {!sessionId ? (
          <button 
            onClick={() => createSess.mutate()} 
            disabled={createSess.isPending || !selAssignment}
            className="btn-primary"
          >
            {createSess.isPending ? 'Opening...' : 'Open Session'}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={markAll} className="btn-outline border-green-400 text-green-600 hover:bg-green-50">All Present</button>
            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary bg-green-600 hover:bg-green-700">
              {saveMut.isPending ? 'Saving...' : 'Save Attendance'}
            </button>
            <button onClick={() => skipMut.mutate({ status: 'CANCELLED', reason: 'Holiday' })}
              className="btn-outline text-amber-600 border-amber-400">Cancel</button>
          </div>
        )}
      </div>

      {/* Summary */}
      {sessionId && (
        <div className="flex gap-3 mb-4 text-sm px-1">
          <span className="badge-green">✓ Present: {presentCount}</span>
          <span className="badge-red">✗ Absent: {records.length - presentCount}</span>
        </div>
      )}

      {/* Students List */}
      <div className="card divide-y">
        {recordsLoading ? (
          <div className="p-10"><Spinner /></div>
        ) : records.length === 0 ? (
          <EmptyState 
            icon={BookOpen} 
            text={sessionId ? "No students enrolled in this class" : "Select a subject and Open Session to see students"} 
          />
        ) : (
          records.map(student => (
            <div key={student.studentId} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition">
              <div>
                <p className="font-medium text-gray-800">{student.name}</p>
                <p className="text-xs text-gray-400 font-mono uppercase">{student.rollNo}</p>
              </div>
              <div className="flex gap-1.5">
                {['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].map(s => (
                  <button 
                    key={s} 
                    onClick={() => toggle(student.studentId, s)}
                    className={`px-3 py-1.5 rounded border text-[10px] font-bold tracking-wider transition
                      ${student.status === s ? STATUS_STYLES[s] : 'bg-white text-gray-300 border-gray-100 hover:border-gray-200'}
                    `}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

