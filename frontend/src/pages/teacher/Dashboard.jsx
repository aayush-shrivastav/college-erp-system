// src/pages/teacher/Dashboard.jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teacherApi } from '../../api/all.api'
import { Spinner, PageTitle, StatCard, EmptyState } from '../../components/Shared'
import { Users, ClipboardCheck, BookOpen, ChevronDown, ChevronUp, KeyRound, CheckCircle2, Eye, EyeOff, BarChart2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import toast from 'react-hot-toast'

export default function TeacherDashboard() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: mentees } = useQuery({ queryKey: ['mentees'], queryFn: () => teacherApi.getMentees().then(r => r.data) })
  const { data: pending } = useQuery({ queryKey: ['pending-regs'], queryFn: () => teacherApi.getPendingRegs().then(r => r.data) })
  const { data: pinData } = useQuery({ queryKey: ['mentee-pins'], queryFn: () => teacherApi.getMenteePins().then(r => r.data) })
  const { data: mySubjects } = useQuery({
    queryKey: ['my-subjects'],
    queryFn: () => api.get('/teacher/my-subjects').then(r => r.data).catch(() => ({ data: [] }))
  })

  const subjects = mySubjects?.data || []
  const bySem = {}
  for (const s of subjects) {
    if (!bySem[s.semester]) bySem[s.semester] = []
    bySem[s.semester].push(s)
  }

  const pinInfo = pinData?.data
  const menteePins = pinInfo?.mentees || []
  const isWindowOpen = !!pinInfo?.activeSem
  const pinsGenerated = menteePins.some(m => m.pin !== null)

  const genMut = useMutation({
    mutationFn: () => teacherApi.generatePins(),
    onSuccess: (res) => {
      const { generated, skipped } = res.data.data
      toast.success(`${generated.length} PINs generated${skipped.length ? `, ${skipped.length} already existed` : ''}`)
      qc.invalidateQueries(['mentee-pins'])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error generating PINs')
  })

  return (
    <div className="space-y-6">
      <PageTitle title="Teacher Dashboard" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="My Mentees" value={mentees?.data?.length} icon={Users} color="blue" />
        <StatCard title="Pending Registrations" value={pending?.data?.length} icon={ClipboardCheck} color="amber" />
        <StatCard title="My Subjects" value={subjects.length} icon={BookOpen} color="green" />
      </div>

      {/* Mentee PINs Section */}
      <div className="card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between px-6 py-5 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-md border-b border-slate-100 dark:border-slate-700/50">
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><KeyRound size={18} className="text-indigo-500"/> Student Registration PINs</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
              {isWindowOpen
                ? `Window Open: ${pinInfo.activeSem.academicYear} — Sem ${pinInfo.activeSem.semester}`
                : 'Registration window is currently CLOSED'}
            </p>
          </div>
          {isWindowOpen && (
            <button
              onClick={() => genMut.mutate()}
              disabled={genMut.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {genMut.isPending ? 'Generating...' : pinsGenerated ? 'Regenerate Missing' : 'Generate PINs'}
            </button>
          )}
        </div>

        {menteePins.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-6">No mentees assigned.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/80">
                <tr>
                  {['Roll No', 'Name', 'Section', 'Sem', 'PIN', 'Status'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {menteePins.map(m => <PinRow key={m.id} student={m} windowOpen={isWindowOpen} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* My Subjects — semester wise */}
      <div>
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <BookOpen size={18} className="text-blue-600 dark:text-blue-400" /> My Assigned Subjects
        </h2>
        {subjects.length === 0 ? (
          <EmptyState icon={BookOpen} text="No subjects assigned" subtext="Ask the admin to assign subjects to you" />
        ) : (
          <div className="space-y-3">
            {Object.keys(bySem).map(Number).sort((a, b) => a - b).map(sem => (
              <SubjectGroup key={sem} sem={sem} subjects={bySem[sem]} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PinRow({ student, windowOpen }) {
  const [visible, setVisible] = useState(false)
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <td className="px-5 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">{student.rollNo}</td>
      <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-200">{student.name}</td>
      <td className="px-5 py-4">
        <span className="badge-blue text-[10px] font-bold px-2 py-0.5">{student.section || '—'}</span>
      </td>
      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">Sem {student.currentSem}</td>
      <td className="px-5 py-4">
        {student.pin ? (
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-base tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md">
              {visible ? student.pin : '••••••'}
            </span>
            <button onClick={() => setVisible(v => !v)} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50">
              {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        ) : (
          <span className="text-slate-400 dark:text-slate-500 italic text-xs">{windowOpen ? 'Not generated' : 'Window closed'}</span>
        )}
      </td>
      <td className="px-5 py-4">
        {student.isUsed
          ? <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full w-fit"><CheckCircle2 size={14} /> Used</span>
          : <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">{student.pin ? 'Pending' : '—'}</span>}
      </td>
    </tr>
  )
}

function SubjectGroup({ sem, subjects, navigate }) {
  const [open, setOpen] = useState(true)
  const tc = { THEORY: 'badge-blue', LAB: 'badge-green', ELECTIVE: 'badge-purple' }
  return (
    <div className="card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <button onClick={() => setOpen(!open)} className="w-full flex justify-between items-center px-5 py-4 bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-800/30 dark:hover:bg-slate-800/50 backdrop-blur-sm transition-all border-b border-transparent dark:border-transparent">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-blue-500 text-white text-xs font-bold flex items-center justify-center shadow-md shadow-indigo-500/20">{sem}</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Semester {sem}</span>
          <span className="badge-blue text-xs font-bold">{subjects.length}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50 border-t border-slate-100 dark:border-slate-700/50">
          {subjects.map(s => (
            <div key={s.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div>
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{s.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">{s.code} · {s.className} · {s.academicYear}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={tc[s.subjectType] || 'badge-blue'}>{s.subjectType}</span>
                <button onClick={() => navigate(`/teacher/classes/${s.id}`)} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                  <BarChart2 size={14}/> Analytics
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
