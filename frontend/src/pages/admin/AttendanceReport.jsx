// src/pages/admin/AttendanceReport.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageTitle, Spinner, EmptyState, Modal, FormField } from '../../components/Shared'
import { AlertTriangle, Users, BookOpen, User, BarChart2, Edit3, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

// ── API helpers ────────────────────────────────────────────────────────────────
const attApi = {
  overview:    ()     => api.get('/admin/attendance/overview').then(r => r.data),
  classWise:   params => api.get('/admin/attendance/class-wise', { params }).then(r => r.data),
  subjectWise: params => api.get('/admin/attendance/subject-wise', { params }).then(r => r.data),
  studentWise: params => api.get('/admin/attendance/student-wise', { params }).then(r => r.data),
  defaulters:  params => api.get('/admin/attendance/defaulters', { params }).then(r => r.data),
  override:    data   => api.patch('/admin/attendance/override', data).then(r => r.data),
  sessions:    params => api.get('/admin/attendance/sessions', { params }).then(r => r.data),
}

const TABS = [
  { id: 'overview',   label: 'Overview',      icon: BarChart2 },
  { id: 'classwise',  label: 'Class-wise',     icon: BookOpen  },
  { id: 'subjectwise',label: 'Subject-wise',   icon: BookOpen  },
  { id: 'studentwise',label: 'Student-wise',   icon: User      },
  { id: 'defaulters', label: 'Defaulters',     icon: AlertTriangle },
]

// ── Attendance percentage bar ─────────────────────────────────────────────────
function AttBar({ attended, conducted, pct }) {
  const color = pct >= 75 ? 'bg-green-500' : pct >= 65 ? 'bg-amber-500' : 'bg-red-500'
  const text  = pct >= 75 ? 'text-green-700' : pct >= 65 ? 'text-amber-700' : 'text-red-700'
  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <span className={`text-sm font-bold w-16 text-right ${text}`}>{attended}/{conducted}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-[80px]">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }}/>
      </div>
      <span className={`text-xs font-semibold w-12 ${text}`}>{pct}%</span>
    </div>
  )
}

export default function AttendanceReport() {
  const [activeTab, setActiveTab] = useState('overview')
  const [filters, setFilters]     = useState({ academicYear: '', semester: '', subjectId: '', studentId: '', threshold: '75', fromDate: '', toDate: '' })
  const [override, setOverride]   = useState(null) // { sessionId, studentId, currentStatus }
  const qc = useQueryClient()

  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  // Queries
  const overviewQ    = useQuery({ queryKey: ['att-overview'],                             queryFn: attApi.overview,                           enabled: activeTab === 'overview' })
  const classwiseQ   = useQuery({ queryKey: ['att-classwise', filters],                   queryFn: () => attApi.classWise(filters),            enabled: activeTab === 'classwise' })
  const subjectwiseQ = useQuery({ queryKey: ['att-subjectwise', filters.subjectId],       queryFn: () => attApi.subjectWise({ subjectId: filters.subjectId, academicYear: filters.academicYear, semester: filters.semester }), enabled: activeTab === 'subjectwise' && !!filters.subjectId })
  const studentwiseQ = useQuery({ queryKey: ['att-studentwise', filters.studentId],       queryFn: () => attApi.studentWise({ studentId: filters.studentId, academicYear: filters.academicYear, semester: filters.semester }), enabled: activeTab === 'studentwise' && !!filters.studentId })
  const defaultersQ  = useQuery({ queryKey: ['att-defaulters', filters.threshold],        queryFn: () => attApi.defaulters({ threshold: filters.threshold, academicYear: filters.academicYear, semester: filters.semester }), enabled: activeTab === 'defaulters' })
  const subjectsQ    = useQuery({ queryKey: ['subjects'], queryFn: () => api.get('/admin/subjects').then(r => r.data) })
  const studentsQ    = useQuery({ queryKey: ['students-all'], queryFn: () => api.get('/admin/students', { params: { limit: 500 } }).then(r => r.data) })

  const overrideMut = useMutation({
    mutationFn: attApi.override,
    onSuccess: () => { toast.success('Attendance updated'); qc.invalidateQueries(['att-subjectwise']); qc.invalidateQueries(['att-studentwise']); setOverride(null) },
    onError: () => toast.error('Update failed')
  })

  // Export to Excel
  async function exportExcel(data, filename) {
    const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs')
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
    XLSX.writeFile(wb, `${filename}.xlsx`)
    toast.success('Excel downloaded!')
  }

  return (
    <div>
      <PageTitle title="Attendance Reports" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap -mb-px ${
              activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ───────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        overviewQ.isLoading ? <Spinner /> : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Today's Sessions",  value: overviewQ.data?.data?.todaySessionCount, color: 'blue'   },
                { label: 'Total Students',    value: overviewQ.data?.data?.totalStudents,      color: 'green'  },
                { label: 'Defaulter Entries', value: overviewQ.data?.data?.defaulterCount,     color: 'red'    },
                { label: 'Avg Attendance',    value: `${overviewQ.data?.data?.avgAttendance}%`,color: 'amber'  },
              ].map(c => (
                <div key={c.label} className={`card p-4 border-l-4 ${
                  c.color==='blue'?'border-blue-500':c.color==='green'?'border-green-500':c.color==='red'?'border-red-500':'border-amber-500'
                }`}>
                  <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                  <p className={`text-2xl font-bold ${
                    c.color==='blue'?'text-blue-700':c.color==='green'?'text-green-700':c.color==='red'?'text-red-700':'text-amber-700'
                  }`}>{c.value ?? '—'}</p>
                </div>
              ))}
            </div>

            {/* Today's sessions */}
            <div className="card overflow-hidden">
              <h3 className="font-semibold px-5 py-4 border-b">Today's Sessions</h3>
              {overviewQ.data?.data?.todaySessions?.length === 0
                ? <p className="text-gray-400 text-center py-6 text-sm">No sessions today</p>
                : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>{['Subject','Teacher','Class','Time','Status'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {overviewQ.data?.data?.todaySessions?.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{s.subject?.name}</td>
                          <td className="px-4 py-3 text-gray-500">{s.teacher?.name}</td>
                          <td className="px-4 py-3 text-gray-500">{s.className}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{s.startTime || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={s.status === 'CONDUCTED' ? 'badge-green' : s.status === 'HOLIDAY' ? 'badge-blue' : 'badge-amber'}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          </div>
        )
      )}

      {/* ── CLASS-WISE ─────────────────────────────────────────────────────── */}
      {activeTab === 'classwise' && (
        <div className="space-y-4">
          <FilterBar filters={filters} setF={setF} showClass showSemYear />
          {classwiseQ.isLoading ? <Spinner /> :
            !classwiseQ.data?.data?.length
              ? <EmptyState icon={BookOpen} text="No data found" subtext="Apply filters and search" />
              : (
                <div className="space-y-4">
                  {classwiseQ.data.data.map(subj => (
                    <div key={subj.subjectId} className="card overflow-hidden">
                      <div className="flex justify-between items-center px-5 py-3 bg-slate-50 border-b">
                        <div>
                          <span className="font-semibold text-gray-800">{subj.subjectName}</span>
                          <span className="ml-2 font-mono text-blue-600 text-sm">{subj.subjectCode}</span>
                        </div>
                        <span className="badge-blue">{subj.students?.length} students</span>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>{['Roll No','Name','Attended / Total','%','Status'].map(h => (
                            <th key={h} className="text-left px-4 py-2 font-medium text-gray-500 text-xs">{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody className="divide-y">
                          {subj.students?.map(s => (
                            <tr key={s.studentId} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-mono text-blue-600 text-xs">{s.rollNo}</td>
                              <td className="px-4 py-2.5 font-medium">{s.name}</td>
                              <td className="px-4 py-2.5"><AttBar attended={s.attended} conducted={s.conducted} pct={s.pct} /></td>
                              <td className="px-4 py-2.5 font-bold">{s.pct}%</td>
                              <td className="px-4 py-2.5">
                                {s.isDefaulter
                                  ? <span className="badge-red">Below 75%</span>
                                  : <span className="badge-green">OK</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )
          }
        </div>
      )}

      {/* ── SUBJECT-WISE ───────────────────────────────────────────────────── */}
      {activeTab === 'subjectwise' && (
        <div className="space-y-4">
          <FilterBar filters={filters} setF={setF} showSubject showSemYear subjects={subjectsQ.data?.data || []} />
          {!filters.subjectId
            ? <EmptyState icon={BookOpen} text="Select a subject" subtext="Choose from the filter above" />
            : subjectwiseQ.isLoading ? <Spinner />
            : (
              <div className="card overflow-hidden">
                <div className="flex justify-between items-center px-5 py-4 border-b">
                  <div>
                    <h3 className="font-semibold">Subject-wise Attendance</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {subjectwiseQ.data?.meta?.total} students ·
                      Avg: {subjectwiseQ.data?.meta?.avgPct}% ·
                      Defaulters: {subjectwiseQ.data?.meta?.defaulters}
                    </p>
                  </div>
                  <button onClick={() => exportExcel(
                    subjectwiseQ.data?.data?.map(s => ({
                      'Roll No': s.rollNo, 'Name': s.name,
                      'Attended': s.attended, 'Total': s.conducted,
                      'Absent': s.absent, 'Percentage': s.pct,
                      'Status': s.isDefaulter ? 'DEFAULTER' : 'OK'
                    })), 'subject-attendance'
                  )} className="btn-outline text-xs">Export Excel</button>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>{['Roll No','Name','Attended/Total','Absent','%','Status','Override'].map(h => (
                      <th key={h} className="text-left px-4 py-2 font-medium text-gray-500 text-xs">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {subjectwiseQ.data?.data?.map(s => (
                      <tr key={s.studentId} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono text-blue-600 text-xs">{s.rollNo}</td>
                        <td className="px-4 py-2.5 font-medium">{s.name}</td>
                        <td className="px-4 py-2.5"><AttBar attended={s.attended} conducted={s.conducted} pct={s.pct} /></td>
                        <td className="px-4 py-2.5 text-red-500">{s.absent}</td>
                        <td className="px-4 py-2.5 font-bold">{s.pct}%</td>
                        <td className="px-4 py-2.5">
                          {s.isDefaulter ? <span className="badge-red">Below 75%</span> : <span className="badge-green">OK</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => setOverride({ studentId: s.studentId, name: s.name })}
                            className="p-1 text-gray-400 hover:text-blue-600 transition">
                            <Edit3 size={14}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      )}

      {/* ── STUDENT-WISE ───────────────────────────────────────────────────── */}
      {activeTab === 'studentwise' && (
        <div className="space-y-4">
          <FilterBar filters={filters} setF={setF} showStudent showSemYear students={studentsQ.data?.data || []} />
          {!filters.studentId
            ? <EmptyState icon={User} text="Select a student" subtext="Choose from the filter above" />
            : studentwiseQ.isLoading ? <Spinner />
            : (
              <div className="space-y-4">
                {/* Student summary */}
                <div className="card p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                    {studentwiseQ.data?.data?.student?.name?.[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{studentwiseQ.data?.data?.student?.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{studentwiseQ.data?.data?.student?.rollNo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-700">{studentwiseQ.data?.data?.overall?.avgPct}%</p>
                    <p className="text-xs text-gray-400">Overall avg</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-700">
                      {studentwiseQ.data?.data?.overall?.totalAttended}/{studentwiseQ.data?.data?.overall?.totalConducted}
                    </p>
                    <p className="text-xs text-gray-400">Overall classes</p>
                  </div>
                </div>
                {/* Per subject */}
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>{['Subject','Code','Attended/Total','Absent','%','Status'].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 text-xs">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {studentwiseQ.data?.data?.subjects?.map(s => (
                        <tr key={s.subjectId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{s.subjectName}</td>
                          <td className="px-4 py-3 font-mono text-blue-600 text-xs">{s.subjectCode}</td>
                          <td className="px-4 py-3"><AttBar attended={s.attended} conducted={s.conducted} pct={s.pct} /></td>
                          <td className="px-4 py-3 text-red-500">{s.absent}</td>
                          <td className="px-4 py-3 font-bold">{s.pct}%</td>
                          <td className="px-4 py-3">
                            {s.isDefaulter ? <span className="badge-red">Below 75%</span> : <span className="badge-green">OK</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          }
        </div>
      )}

      {/* ── DEFAULTERS ─────────────────────────────────────────────────────── */}
      {activeTab === 'defaulters' && (
        <div className="space-y-4">
          <div className="card p-4 flex flex-wrap gap-4 items-end">
            <FormField label="Threshold %">
              <input type="number" value={filters.threshold} onChange={e => setF('threshold', e.target.value)}
                className="input w-24" min="1" max="100" />
            </FormField>
            <FilterBar inline filters={filters} setF={setF} showSemYear />
          </div>
          {defaultersQ.isLoading ? <Spinner /> : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  <span className="font-bold text-red-600">{defaultersQ.data?.meta?.total}</span> students below {filters.threshold}%
                </p>
                <button onClick={() => exportExcel(
                  defaultersQ.data?.data?.flatMap(s =>
                    s.defaultSubjects.map(d => ({
                      'Roll No': s.rollNo, 'Name': s.name, 'Mentor': s.mentor,
                      'Subject': d.subjectName, 'Code': d.subjectCode,
                      'Attended': d.attended, 'Total': d.conducted, 'Percentage': d.pct
                    }))
                  ) || [], 'defaulters-list'
                )} className="btn-outline text-xs">Export Excel</button>
              </div>
              {!defaultersQ.data?.data?.length
                ? <EmptyState icon={CheckCircle} text="No defaulters!" subtext={`All students are above ${filters.threshold}%`} />
                : defaultersQ.data.data.map(s => (
                  <div key={s.studentId} className="card overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3 bg-red-50 border-b border-red-100">
                      <AlertTriangle size={16} className="text-red-500"/>
                      <span className="font-semibold text-gray-800">{s.name}</span>
                      <span className="font-mono text-blue-600 text-xs">{s.rollNo}</span>
                      <span className="text-gray-400 text-xs">Mentor: {s.mentor}</span>
                      <span className="badge-red ml-auto">{s.defaultSubjects.length} subject{s.defaultSubjects.length > 1 ? 's' : ''} below threshold</span>
                    </div>
                    <div className="divide-y">
                      {s.defaultSubjects.map((d, i) => (
                        <div key={i} className="flex items-center justify-between px-5 py-2.5">
                          <span className="text-sm text-gray-700">{d.subjectName} <span className="text-gray-400 font-mono text-xs">({d.subjectCode})</span></span>
                          <AttBar attended={d.attended} conducted={d.conducted} pct={d.pct} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}

      {/* Override Modal */}
      {override && (
        <OverrideModal student={override}
          onClose={() => setOverride(null)}
          onSubmit={(data) => overrideMut.mutate(data)}
          loading={overrideMut.isPending} />
      )}
    </div>
  )
}

// ── Filter Bar ─────────────────────────────────────────────────────────────────
function FilterBar({ filters, setF, showClass, showSubject, showStudent, showSemYear, subjects=[], students=[], inline }) {
  const wrap = inline ? 'flex flex-wrap gap-3 items-end' : 'card p-4 mb-4 flex flex-wrap gap-3 items-end'
  return (
    <div className={wrap}>
      {showSemYear && <>
        <FormField label="Academic Year">
          <input value={filters.academicYear} onChange={e => setF('academicYear', e.target.value)}
            className="input w-32" placeholder="2024-25"/>
        </FormField>
        <FormField label="Semester">
          <select value={filters.semester} onChange={e => setF('semester', e.target.value)} className="input w-28">
            <option value="">All</option>
            {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Sem {n}</option>)}
          </select>
        </FormField>
      </>}
      {showClass && (
        <FormField label="Class Name">
          <input value={filters.className} onChange={e => setF('className', e.target.value)}
            className="input w-28" placeholder="CS-3A"/>
        </FormField>
      )}
      {showSubject && (
        <FormField label="Subject">
          <select value={filters.subjectId} onChange={e => setF('subjectId', e.target.value)} className="input w-48">
            <option value="">— Select subject —</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
          </select>
        </FormField>
      )}
      {showStudent && (
        <FormField label="Student">
          <select value={filters.studentId} onChange={e => setF('studentId', e.target.value)} className="input w-48">
            <option value="">— Select student —</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.rollNo} — {s.name}</option>)}
          </select>
        </FormField>
      )}
    </div>
  )
}

// ── Override Modal ─────────────────────────────────────────────────────────────
function OverrideModal({ student, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({ sessionId: '', studentId: student.studentId, status: 'PRESENT', reason: '' })
  return (
    <Modal title={`Override Attendance — ${student.name}`} onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Session ID">
          <input value={form.sessionId} onChange={e => setForm(p => ({ ...p, sessionId: e.target.value }))}
            className="input" placeholder="Session UUID"/>
        </FormField>
        <FormField label="New Status">
          <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="input">
            {['PRESENT','ABSENT','LATE','EXCUSED'].map(s => <option key={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="Reason (required)">
          <input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
            className="input" placeholder="Data entry error / Medical leave..."/>
        </FormField>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-outline">Cancel</button>
          <button onClick={() => onSubmit(form)} disabled={loading || !form.sessionId || !form.reason}
            className="flex-1 btn-primary">{loading ? 'Saving...' : 'Update'}</button>
        </div>
      </div>
    </Modal>
  )
}
