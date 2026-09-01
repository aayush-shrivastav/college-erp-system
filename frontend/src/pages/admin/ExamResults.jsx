// src/pages/admin/ExamResults.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageTitle, Spinner, EmptyState, Modal, FormField } from '../../components/Shared'
import { Lock, Unlock, Calendar, FileText, BarChart2, User } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

// ── API helpers ────────────────────────────────────────────────────────────────
const examApi = {
  dashboard:      params => api.get('/admin/exams/dashboard', { params }).then(r => r.data),
  subjectResult:  params => api.get('/admin/exams/subject-result', { params }).then(r => r.data),
  consolidated:   params => api.get('/admin/exams/consolidated', { params }).then(r => r.data),
  marksCard:      (id, p) => api.get(`/admin/exams/marks-card/${id}`, { params: p }).then(r => r.data),
  lockExam:       (id, lock) => api.patch(`/admin/exams/${id}/lock`, { lock }).then(r => r.data),
  schedule:       data => api.post('/admin/exams/schedule', data).then(r => r.data),
}

const TABS = [
  { id: 'dashboard',     label: 'Exam Dashboard',      icon: BarChart2   },
  { id: 'schedule',      label: 'Schedule',             icon: Calendar    },
  { id: 'subjectresult', label: 'Subject Result',       icon: FileText    },
  { id: 'consolidated',  label: 'Consolidated Sheet',   icon: FileText    },
  { id: 'markscard',     label: 'Marks Card',           icon: User        },
]

// Marks formula display
// 3 exams × 24 → Best 2 → avg = /12 + Assignment /10 + Attendance /6 = 28

export default function ExamResults() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [filters, setFilters]     = useState({ academicYear: '', semester: '', subjectId: '', studentId: '', className: '' })
  const [scheduleModal, setScheduleModal] = useState(false)
  const qc = useQueryClient()
  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  // Queries
  const dashQ    = useQuery({ queryKey: ['exam-dash', filters.academicYear, filters.semester], queryFn: () => examApi.dashboard({ academicYear: filters.academicYear, semester: filters.semester }), enabled: activeTab === 'dashboard' })
  const subjResQ = useQuery({ queryKey: ['exam-subj', filters.subjectId, filters.academicYear, filters.semester], queryFn: () => examApi.subjectResult({ subjectId: filters.subjectId, academicYear: filters.academicYear, semester: filters.semester }), enabled: activeTab === 'subjectresult' && !!filters.subjectId })
  const consQ    = useQuery({ queryKey: ['exam-cons', filters.academicYear, filters.semester], queryFn: () => examApi.consolidated({ academicYear: filters.academicYear, semester: filters.semester }), enabled: activeTab === 'consolidated' && !!filters.academicYear && !!filters.semester })
  const mcQ      = useQuery({ queryKey: ['exam-mc', filters.studentId, filters.academicYear], queryFn: () => examApi.marksCard(filters.studentId, { academicYear: filters.academicYear, semester: filters.semester }), enabled: activeTab === 'markscard' && !!filters.studentId })
  const subjectsQ = useQuery({ queryKey: ['subjects'], queryFn: () => api.get('/admin/subjects').then(r => r.data) })
  const studentsQ = useQuery({ queryKey: ['students-all'], queryFn: () => api.get('/admin/students', { params: { limit: 500 } }).then(r => r.data) })

  const lockMut = useMutation({
    mutationFn: ({ id, lock }) => examApi.lockExam(id, lock),
    onSuccess: (_, { lock }) => { toast.success(lock ? 'Exam locked' : 'Exam unlocked'); qc.invalidateQueries(['exam-dash']) },
    onError: () => toast.error('Failed')
  })
  const scheduleMut = useMutation({
    mutationFn: examApi.schedule,
    onSuccess: () => { toast.success('Exam scheduled'); qc.invalidateQueries(['exam-dash']); setScheduleModal(false) },
    onError: () => toast.error('Failed')
  })

  // Export consolidated to Excel
  async function exportConsolidated() {
    const data = consQ.data?.data
    if (!data?.sheet || !data?.subjects) return
    const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs')
    const rows = data.sheet.map(s => {
      const row = { 'Roll No': s.rollNo, 'Name': s.name }
      s.subjects.forEach(sub => {
        row[`${sub.subjectCode} ExamAvg`]   = sub.examAvg
        row[`${sub.subjectCode} Assignment`] = sub.assignmentMarks
        row[`${sub.subjectCode} Attendance`] = sub.attendanceMarks
        row[`${sub.subjectCode} Total`]      = sub.total
      })
      row['Grand Total'] = s.grandTotal
      row['Max']         = s.maxPossible
      row['Percentage']  = `${Math.round(s.grandTotal / s.maxPossible * 100)}%`
      return row
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Results')
    XLSX.writeFile(wb, `consolidated-${filters.academicYear}-sem${filters.semester}.xlsx`)
    toast.success('Excel downloaded!')
  }

  // Export marks card
  async function exportMarksCard() {
    const data = mcQ.data?.data
    if (!data) return
    const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs')
    const rows = data.subjects.map(s => ({
      'Subject': s.subjectName, 'Code': s.subjectCode,
      'Exam1 Total': s.exams?.[0]?.total || 0,
      'Exam2 Total': s.exams?.[1]?.total || 0,
      'Exam3 Total': s.exams?.[2]?.total || 0,
      'Best 2 Avg (/12)': s.examAvg,
      'Assignment (/10)': s.assignmentMarks,
      'Attendance %': s.attendancePct,
      'Attendance Marks (/6)': s.attendanceMarks,
      'Grand Total (/28)': s.grandTotal
    }))
    rows.push({
      'Subject': 'TOTAL', 'Code': '',
      'Grand Total (/28)': data.summary.totalObtained,
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'MarkCard')
    XLSX.writeFile(wb, `markcard-${data.student.rollNo}.xlsx`)
    toast.success('Excel downloaded!')
  }

  return (
    <div>
      <PageTitle title="Exam & Results">
        <button onClick={() => setScheduleModal(true)} className="btn-primary flex items-center gap-2">
          <Calendar size={14}/> Schedule Exam
        </button>
      </PageTitle>

      {/* Formula reminder */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 text-xs text-blue-700 flex flex-wrap gap-4">
        <span>📐 <strong>Marks Formula:</strong></span>
        <span>3 Exams × 24 marks (Sec A/B/C = 8 each)</span>
        <span>→ Best 2 of 3: (top1 + top2) ÷ 2 = <strong>/12</strong></span>
        <span>+ Assignment <strong>/10</strong></span>
        <span>+ Attendance <strong>/6</strong></span>
        <span>= Grand Total <strong>/28</strong></span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap -mb-px ${
              activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      {/* Shared filter row */}
      <div className="card p-4 mb-5 flex flex-wrap gap-3 items-end">
        <FormField label="Academic Year">
          <input value={filters.academicYear} onChange={e => setF('academicYear', e.target.value)} className="input w-32" placeholder="2024-25"/>
        </FormField>
        <FormField label="Semester">
          <select value={filters.semester} onChange={e => setF('semester', e.target.value)} className="input w-28">
            <option value="">All</option>
            {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Sem {n}</option>)}
          </select>
        </FormField>
        {(activeTab === 'subjectresult') && (
          <FormField label="Subject">
            <select value={filters.subjectId} onChange={e => setF('subjectId', e.target.value)} className="input w-48">
              <option value="">— Select —</option>
              {(subjectsQ.data?.data || []).map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
            </select>
          </FormField>
        )}
        {(activeTab === 'markscard') && (
          <FormField label="Student">
            <select value={filters.studentId} onChange={e => setF('studentId', e.target.value)} className="input w-48">
              <option value="">— Select student —</option>
              {(studentsQ.data?.data || []).map(s => <option key={s.id} value={s.id}>{s.rollNo} — {s.name}</option>)}
            </select>
          </FormField>
        )}
      </div>

      {/* ── DASHBOARD ──────────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        dashQ.isLoading ? <Spinner /> : (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Exams',   value: dashQ.data?.data?.stats?.total,      color: 'blue'   },
                { label: 'Locked',        value: dashQ.data?.data?.stats?.locked,     color: 'green'  },
                { label: 'Unlocked',      value: dashQ.data?.data?.stats?.unlocked,   color: 'amber'  },
                { label: 'No Results Yet',value: dashQ.data?.data?.stats?.pending,    color: 'red'    },
              ].map(c => (
                <div key={c.label} className={`card p-4 border-l-4 ${
                  c.color==='blue'?'border-blue-500':c.color==='green'?'border-green-500':c.color==='red'?'border-red-500':'border-amber-500'
                }`}>
                  <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                  <p className={`text-2xl font-bold ${c.color==='blue'?'text-blue-700':c.color==='green'?'text-green-700':c.color==='red'?'text-red-700':'text-amber-700'}`}>{c.value ?? '—'}</p>
                </div>
              ))}
            </div>
            {/* Exam list */}
            <div className="card overflow-hidden">
              <h3 className="font-semibold px-5 py-4 border-b">All Exams</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>{['Subject','Class','Sem','Exam No','Date','Results','Status','Action'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y">
                  {dashQ.data?.data?.exams?.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{e.subject?.name}</td>
                      <td className="px-4 py-3 text-gray-500">{e.className}</td>
                      <td className="px-4 py-3 text-gray-500">Sem {e.semester}</td>
                      <td className="px-4 py-3"><span className="badge-blue whitespace-nowrap">Exam {e.examNo}</span></td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{e.examDate ? new Date(e.examDate).toLocaleDateString('en-IN') : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{e._count?.results || 0}</td>
                      <td className="px-4 py-3">
                        {e.isLocked
                          ? <span className="flex items-center gap-1 text-green-600 text-xs"><Lock size={11}/>Locked</span>
                          : <span className="flex items-center gap-1 text-amber-600 text-xs"><Unlock size={11}/>Open</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => lockMut.mutate({ id: e.id, lock: !e.isLocked })}
                          disabled={lockMut.isPending}
                          className={`text-xs px-2 py-1 rounded border transition ${
                            e.isLocked
                              ? 'border-amber-300 text-amber-600 hover:bg-amber-50'
                              : 'border-green-300 text-green-600 hover:bg-green-50'
                          }`}>
                          {e.isLocked ? 'Unlock' : 'Lock'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── SCHEDULE TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'schedule' && (
        <div className="card p-6 max-w-2xl">
          <h3 className="font-semibold mb-4">Create / Update Exam Schedule</h3>
          <ScheduleForm subjects={subjectsQ.data?.data || []} onSubmit={scheduleMut.mutate} loading={scheduleMut.isPending} />
        </div>
      )}

      {/* ── SUBJECT RESULT ─────────────────────────────────────────────────── */}
      {activeTab === 'subjectresult' && (
        !filters.subjectId
          ? <EmptyState icon={FileText} text="Select a subject" subtext="Use the filter above" />
          : subjResQ.isLoading ? <Spinner />
          : (
            <div className="card overflow-hidden">
              <div className="flex justify-between items-center px-5 py-4 border-b">
                <div>
                  <h3 className="font-semibold">Subject Result — Sec A / B / C</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{subjResQ.data?.meta?.total} students</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Roll No</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Name</th>
                      {[1,2,3].map(n => (
                        <th key={n} colSpan={4} className="text-center px-4 py-2.5 font-medium text-gray-500 text-xs border-l">
                          Exam {n} (max 24)
                        </th>
                      ))}
                      <th className="text-center px-4 py-2.5 font-medium text-blue-600 text-xs border-l">Best 2 Avg</th>
                    </tr>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-1.5 text-xs"></th>
                      <th className="px-4 py-1.5 text-xs"></th>
                      {[1,2,3].map(n => (
                        ['A','B','C','Tot'].map(s => (
                          <th key={`${n}${s}`} className={`px-3 py-1.5 text-xs text-gray-400 font-medium text-center ${s==='A'?'border-l':''}`}>
                            {s==='Tot'?'/24':s}
                          </th>
                        ))
                      ))}
                      <th className="px-4 py-1.5 text-xs text-blue-600 font-semibold border-l text-center">/12</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {subjResQ.data?.data?.map(s => (
                      <tr key={s.studentId} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono text-blue-600 text-xs">{s.rollNo}</td>
                        <td className="px-4 py-2.5 font-medium">{s.name}</td>
                        {[1,2,3].map(examNo => {
                          const e = s.exams[examNo]
                          return e ? (
                            ['secA','secB','secC','total'].map((f, i) => (
                              <td key={`${examNo}${f}`} className={`px-3 py-2.5 text-center text-sm ${i===0?'border-l':''} ${f==='total'?'font-bold':''}`}>
                                {e[f]}
                              </td>
                            ))
                          ) : (
                            ['','','',''].map((_, i) => (
                              <td key={`${examNo}${i}`} className={`px-3 py-2.5 text-center text-gray-300 text-xs ${i===0?'border-l':''}`}>—</td>
                            ))
                          )
                        })}
                        <td className="px-4 py-2.5 text-center font-bold text-blue-700 border-l">{s.examAvg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
      )}

      {/* ── CONSOLIDATED SHEET ─────────────────────────────────────────────── */}
      {activeTab === 'consolidated' && (
        !filters.academicYear || !filters.semester
          ? <EmptyState icon={FileText} text="Select Academic Year and Semester" subtext="Both are required for consolidated result" />
          : consQ.isLoading ? <Spinner />
          : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {consQ.data?.data?.meta?.studentCount} students ·
                  {consQ.data?.data?.meta?.subjectCount} subjects ·
                  {filters.academicYear} Sem {filters.semester}
                </p>
                <button onClick={exportConsolidated} className="btn-outline text-xs">Export Excel</button>
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="text-xs min-w-max">
                    <thead className="bg-slate-700 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium sticky left-0 bg-slate-700">Roll No</th>
                        <th className="px-4 py-3 text-left font-medium">Name</th>
                        {consQ.data?.data?.subjects?.map(s => (
                          <th key={s.id} className="px-3 py-3 text-center font-medium min-w-[80px]">{s.code}<br/><span className="font-normal opacity-70">/28</span></th>
                        ))}
                        <th className="px-4 py-3 text-center font-medium bg-blue-700">Grand Total</th>
                        <th className="px-4 py-3 text-center font-medium">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {consQ.data?.data?.sheet?.map((s, i) => (
                        <tr key={s.studentId} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 font-mono text-blue-600 sticky left-0 bg-inherit">{s.rollNo}</td>
                          <td className="px-4 py-2 font-medium whitespace-nowrap">{s.name}</td>
                          {s.subjects.map(sub => (
                            <td key={sub.subjectId} className={`px-3 py-2 text-center font-semibold ${sub.total >= 14 ? 'text-gray-700' : 'text-red-600'}`}>
                              {sub.total}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-center font-bold text-blue-700">{s.grandTotal}</td>
                          <td className="px-4 py-2 text-center text-gray-500">
                            {Math.round(s.grandTotal / s.maxPossible * 100)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
      )}

      {/* ── MARKS CARD ─────────────────────────────────────────────────────── */}
      {activeTab === 'markscard' && (
        !filters.studentId
          ? <EmptyState icon={User} text="Select a student" subtext="Choose from the filter above" />
          : mcQ.isLoading ? <Spinner />
          : (
            <div className="space-y-4">
              {/* Student header */}
              <div className="card p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                    {mcQ.data?.data?.student?.name?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-lg">{mcQ.data?.data?.student?.name}</p>
                    <p className="text-sm text-gray-400 font-mono">{mcQ.data?.data?.student?.rollNo} · Semester {mcQ.data?.data?.student?.semester}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-700">{mcQ.data?.data?.summary?.totalObtained}</p>
                    <p className="text-xs text-gray-400">out of {mcQ.data?.data?.summary?.totalMax}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-700">{mcQ.data?.data?.summary?.percentage}%</p>
                    <p className="text-xs text-gray-400">Overall</p>
                  </div>
                  <button onClick={exportMarksCard} className="btn-outline text-xs">Export Excel</button>
                </div>
              </div>

              {/* Subject-wise marks */}
              <div className="space-y-3">
                {mcQ.data?.data?.subjects?.map(s => (
                  <details key={s.subjectId} className="card overflow-hidden group">
                    <summary className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 list-none">
                      <div>
                        <p className="font-semibold text-gray-800">{s.subjectName}</p>
                        <p className="text-xs text-gray-400 font-mono">{s.subjectCode} · {s.subjectType}</p>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-blue-600">{s.examAvg}<span className="text-gray-400 font-normal">/12</span></p>
                          <p className="text-xs text-gray-400">Exam avg</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-purple-600">{s.assignmentMarks}<span className="text-gray-400 font-normal">/10</span></p>
                          <p className="text-xs text-gray-400">Assignment</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-teal-600">{s.attendanceMarks}<span className="text-gray-400 font-normal">/6</span></p>
                          <p className="text-xs text-gray-400">{s.attendanceDisplay} ({s.attendancePct}%)</p>
                        </div>
                        <div className="text-center bg-slate-700 text-white px-3 py-1 rounded-lg">
                          <p className="font-bold text-lg">{s.grandTotal}</p>
                          <p className="text-xs opacity-70">/28</p>
                        </div>
                        <span className="text-gray-300 group-open:rotate-180 transition-transform">▼</span>
                      </div>
                    </summary>
                    {/* Exam breakdown */}
                    <div className="px-5 pb-4 border-t bg-gray-50">
                      <p className="text-xs text-gray-400 font-medium mt-3 mb-2">Exam Breakdown (Best 2 highlighted)</p>
                      <div className="grid grid-cols-3 gap-3">
                        {s.exams.map(e => {
                          const isBest = s.best2?.some(b => b.includes(`Exam ${e.examNo}`))
                          return (
                            <div key={e.examNo} className={`border rounded-lg p-3 text-sm ${isBest ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                              <div className="flex justify-between items-center mb-2">
                                <p className="font-semibold text-gray-700">Exam {e.examNo}</p>
                                {isBest && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Best</span>}
                              </div>
                              <div className="space-y-1 text-xs text-gray-500">
                                {['secA','secB','secC'].map(sec => (
                                  <div key={sec} className="flex justify-between">
                                    <span>Sec {sec.replace('sec','').toUpperCase()}</span>
                                    <span>{e[sec]}/8</span>
                                  </div>
                                ))}
                                <div className="flex justify-between font-bold text-gray-800 border-t pt-1">
                                  <span>Total</span><span>{e.total}/24</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {s.exams.length === 0 && <p className="text-gray-400 text-xs col-span-3">No exam results entered yet.</p>}
                      </div>
                      {s.best2?.length > 0 && (
                        <p className="text-xs text-blue-600 mt-2">
                          Best 2: {s.best2.join(', ')} → Avg = {s.examAvg}/12
                        </p>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )
      )}

      {/* Schedule Modal */}
      {scheduleModal && (
        <Modal title="Schedule Exam" onClose={() => setScheduleModal(false)}>
          <ScheduleForm subjects={subjectsQ.data?.data || []} onSubmit={scheduleMut.mutate} loading={scheduleMut.isPending} />
        </Modal>
      )}
    </div>
  )
}

function ScheduleForm({ subjects, onSubmit, loading }) {
  const [form, setForm] = useState({
    subjectId: '', className: '', academicYear: '', semester: '1',
    examNo: '1', examDate: ''
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Subject">
          <select value={form.subjectId} onChange={e => set('subjectId', e.target.value)} className="input">
            <option value="">— Select —</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
          </select>
        </FormField>
        <FormField label="Class Name">
          <input value={form.className} onChange={e => set('className', e.target.value)} className="input" placeholder="CS-3A"/>
        </FormField>
        <FormField label="Academic Year">
          <input value={form.academicYear} onChange={e => set('academicYear', e.target.value)} className="input" placeholder="2024-25"/>
        </FormField>
        <FormField label="Semester">
          <select value={form.semester} onChange={e => set('semester', e.target.value)} className="input">
            {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Semester {n}</option>)}
          </select>
        </FormField>
        <FormField label="Exam Number">
          <select value={form.examNo} onChange={e => set('examNo', e.target.value)} className="input">
            <option value="1">Exam 1</option>
            <option value="2">Exam 2</option>
            <option value="3">Exam 3</option>
          </select>
        </FormField>
        <FormField label="Exam Date">
          <input type="date" value={form.examDate} onChange={e => set('examDate', e.target.value)} className="input"/>
        </FormField>
      </div>
      <button onClick={() => onSubmit(form)}
        disabled={loading || !form.subjectId || !form.className || !form.academicYear}
        className="w-full btn-primary">{loading ? 'Saving...' : 'Schedule Exam'}</button>
    </div>
  )
}
