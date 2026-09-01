// src/pages/admin/Timetable.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageTitle, Spinner, EmptyState, Modal, FormField } from '../../components/Shared'
import { Plus, Trash2, Copy, Clock, Upload, Download } from 'lucide-react'
import { adminApi } from '../../api/admin.api'
import * as xlsx from 'xlsx'
import toast from 'react-hot-toast'
import api from '../../api/axios'

const DAYS    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const PERIODS = [1,2,3,4,5,6,7,8]

const TYPE_COLOR = {
  THEORY:   'bg-blue-500/10   border-blue-500/20   text-blue-600   dark:text-blue-400',
  LAB:      'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  ELECTIVE: 'bg-purple-500/10  border-purple-500/20  text-purple-600  dark:text-purple-400',
  BREAK:    'bg-slate-500/10   border-slate-500/20   text-slate-600   dark:text-slate-400',
}

export default function AdminTimetable() {
  const [className,    setClassName]    = useState('')
  const [academicYear, setAcademicYear] = useState('2024-25')
  const [semester,     setSemester]     = useState('3')
  const [slotModal,    setSlotModal]    = useState(null) // { day, period }
  const [copyModal,    setCopyModal]    = useState(false)
  const qc = useQueryClient()

  const { data: ttData, isLoading } = useQuery({
    queryKey: ['timetable', className, academicYear, semester],
    queryFn: () => api.get('/timetable', { params: { className, academicYear, semester } }).then(r => r.data),
    enabled: !!className
  })

  const subjectsQ = useQuery({ queryKey: ['subjects'], queryFn: () => api.get('/admin/subjects').then(r => r.data) })
  const teachersQ = useQuery({ queryKey: ['teachers'], queryFn: () => api.get('/admin/teachers').then(r => r.data) })
  const activeClassesQ = useQuery({ queryKey: ['timetable-classes'], queryFn: () => api.get('/timetable/classes').then(r => r.data) })

  const saveMut = useMutation({
    mutationFn: d => api.post('/timetable/slot', d),
    onSuccess: () => { toast.success('Slot saved'); qc.invalidateQueries(['timetable']); setSlotModal(null) },
    onError: e => toast.error(e.response?.data?.message || 'Teacher conflict or error')
  })

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/timetable/slot/${id}`),
    onSuccess: () => { toast.success('Slot cleared'); qc.invalidateQueries(['timetable']) }
  })

  const copyMut = useMutation({
    mutationFn: d => api.post('/timetable/copy', d),
    onSuccess: res => { toast.success(res.data.message); qc.invalidateQueries(['timetable']); setCopyModal(false) },
    onError: () => toast.error('Copy failed')
  })
  
  const bulkMut = useMutation({
    mutationFn: adminApi.bulkImportTimetable,
    onSuccess: res => {
      const d = res.data.data
      if (d.failed > 0) {
        toast.error(`${d.failed} slots failed. Example error: ${d.errors[0]?.reason || 'Check console'}`, { duration: 6000 })
        console.error('Import Errors:', d.errors)
      } else {
        toast.success(`${d.created} timetable slots imported!`)
      }
      qc.invalidateQueries(['timetable'])
    },
    onError: e => {
      const d = e.response?.data?.data
      if (d?.errors?.length > 0) {
        toast.error(`Import Failed: ${d.errors[0].reason}`, { duration: 6000 })
      } else {
        toast.error(e.response?.data?.message || 'Bulk upload failed. Check Excel format.')
      }
    }
  })

  const downloadTemplate = () => {
    const data = [
      { 'Class Name': 'CS-3A', 'Day': 'Monday', 'Period': 1, 'Subject Code': 'CS101', 'Teacher Emp ID': 'EMP001', 'Room': '101', 'Academic Year': '2024-25', 'Semester': 3 },
      { 'Class Name': 'CS-3A', 'Day': 'Monday', 'Period': 2, 'Subject Code': 'MA101', 'Teacher Emp ID': 'EMP002', 'Room': '102', 'Academic Year': '2024-25', 'Semester': 3 }
    ]
    const ws = xlsx.utils.json_to_sheet(data)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "Timetable")
    xlsx.writeFile(wb, "Timetable_Bulk_Template.xlsx")
  }

  const grid = ttData?.data?.grid || {}

  return (
    <div>
      <PageTitle title="Timetable">
        <div className="flex items-center gap-2">
          <button onClick={downloadTemplate} className="btn-outline flex items-center gap-2 px-3 py-2 text-xs">
            <Download size={14}/> Template
          </button>
          <label className="btn-outline flex items-center gap-2 cursor-pointer px-3 py-2 text-xs">
            <Upload size={14}/> Bulk Upload
            <input type="file" accept=".xlsx,.csv" className="hidden"
              onChange={e => e.target.files[0] && bulkMut.mutate(e.target.files[0])}/>
          </label>
          <button onClick={() => setCopyModal(true)} className="btn-outline flex items-center gap-2 px-3 py-2 text-xs">
            <Copy size={14}/> Copy Class
          </button>
        </div>
      </PageTitle>

      {/* Filter bar */}
      <div className="card p-4 mb-5 flex flex-wrap gap-3 items-end">
        <FormField label="Class Name">
          <input value={className} onChange={e => setClassName(e.target.value.toUpperCase())}
            className="input w-28" placeholder="CS-3A"/>
        </FormField>
        <FormField label="Academic Year">
          <input value={academicYear} onChange={e => setAcademicYear(e.target.value)}
            className="input w-28" placeholder="2024-25"/>
        </FormField>
        <FormField label="Semester">
          <select value={semester} onChange={e => setSemester(e.target.value)} className="input w-28">
            {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Sem {n}</option>)}
          </select>
        </FormField>
      </div>

      {/* Timetable grid */}
      {!className ? (
        <div className="relative overflow-hidden p-10 rounded-3xl bg-slate-900 border border-slate-800 text-center flex flex-col items-center justify-center shadow-2xl mb-8">
          {/* Decorative background glow */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse duration-3000"></div>
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse delay-1000 duration-3000"></div>

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-500/30 relative z-10">
            <Clock size={28} />
          </div>
          <h3 className="text-xl font-black text-white tracking-tight relative z-10">Active Time Schedule Matrix</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-xs leading-relaxed mb-10 relative z-10">
            Access created timetables instantly or configure new assignments dynamically.
          </p>

          {activeClassesQ.data?.data && activeClassesQ.data.data.length > 0 && (
            <div className="w-full max-w-4xl relative z-10">
              <p className="text-[10px] uppercase font-black tracking-widest text-indigo-400 mb-4 text-center">Select a Published Timetable</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeClassesQ.data.data.map((c, idx) => {
                  const gradients = [
                    'from-indigo-600 to-blue-700 shadow-indigo-500/20',
                    'from-emerald-600 to-teal-700 shadow-emerald-500/20',
                    'from-purple-600 to-pink-700 shadow-purple-500/20',
                    'from-amber-500 to-orange-600 shadow-amber-500/20'
                  ]
                  const grad = gradients[idx % gradients.length]

                  return (
                    <button 
                      key={idx}
                      onClick={() => {
                        setClassName(c.className)
                        setAcademicYear(c.academicYear)
                        setSemester(String(c.semester))
                      }}
                      className={`p-5 rounded-2xl bg-gradient-to-br ${grad} text-white text-left shadow-xl hover:-translate-y-1.5 hover:scale-[1.02] active:scale-95 transition-all duration-300 border border-white/10 flex flex-col justify-between h-36 relative group overflow-hidden`}
                    >
                      <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-125 group-hover:opacity-20 transition-all duration-500 pointer-events-none">
                        <Clock size={120} />
                      </div>

                      <div>
                        <span className="bg-white/20 backdrop-blur-sm text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border border-white/10">
                          Sem {c.semester}
                        </span>
                        <h4 className="text-lg font-black tracking-tight mt-3 truncate group-hover:text-amber-200 transition-colors">{c.className}</h4>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                        <span className="text-[11px] font-medium text-white/80">{c.academicYear}</span>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-white text-slate-900 px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1">
                          Open ➔
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : isLoading ? <Spinner /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-max w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800/80 dark:bg-slate-900/80 backdrop-blur-md text-white">
                  <th className="px-5 py-4 text-left font-bold uppercase tracking-wider text-[11px] w-32 border-r border-white/5">Day / Period</th>
                  {PERIODS.map(p => (
                    <th key={p} className="px-3 py-4 text-center font-bold uppercase tracking-wider text-[11px] w-32 border-r border-white/5 last:border-0">Period {p}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {DAYS.map((day, di) => (
                  <tr key={day} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30 text-[10px] uppercase tracking-widest">
                      {day}
                    </td>
                    {PERIODS.map(period => {
                      const slot = grid[day]?.[period]
                      return (
                        <td key={period} className="border border-slate-100 dark:border-slate-800/50 p-1.5 align-top h-24 min-w-[120px]">
                          {slot ? (
                            <div className={`h-full rounded-2xl border-2 p-2 relative group cursor-pointer shadow-sm transition-all hover:scale-[1.02] active:scale-95 ${TYPE_COLOR[slot.subjectType] || TYPE_COLOR.THEORY}`}
                              onClick={() => setSlotModal({ day, period, existing: slot })}>
                              <p className="text-[10px] font-black leading-tight uppercase tracking-tighter mb-1">{slot.subjectCode}</p>
                              <p className="text-[13px] font-bold leading-tight">{slot.subjectName}</p>
                              <p className="text-[11px] font-medium opacity-70 mt-1 truncate">{slot.teacherName}</p>
                              {slot.room && <p className="text-[10px] opacity-50 mt-1 flex items-center gap-1">🏛 {slot.room}</p>}
                              <button
                                onClick={e => { e.stopPropagation(); deleteMut.mutate(slot.id) }}
                                className="absolute -top-1 -right-1 p-1 bg-white dark:bg-slate-800 rounded-full shadow-md opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 transition-all">
                                <Trash2 size={12}/>
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setSlotModal({ day, period, existing: null })}
                              className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all border-2 border-dashed border-slate-100 dark:border-slate-800/50 hover:border-indigo-200 dark:hover:border-indigo-500/30">
                              <Plus size={20}/>
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 backdrop-blur-md text-[11px] font-bold">
            {Object.entries(TYPE_COLOR).filter(([k]) => k !== 'BREAK').map(([type, cls]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full border ${cls.split(' ')[0]}`}/>
                <span className="text-slate-500 dark:text-slate-400 uppercase tracking-widest">{type}</span>
              </div>
            ))}
            <span className="text-slate-400 dark:text-slate-500 ml-auto font-medium">Click a cell to add/edit · Hover to delete</span>
          </div>
        </div>
      )}

      {/* Slot Edit Modal */}
      {slotModal && (
        <SlotModal
          day={slotModal.day} period={slotModal.period} existing={slotModal.existing}
          className={className} academicYear={academicYear} semester={semester}
          subjects={subjectsQ.data?.data || []} teachers={teachersQ.data?.data || []}
          onSave={d => saveMut.mutate(d)} loading={saveMut.isPending}
          onClose={() => setSlotModal(null)}
        />
      )}

      {/* Copy Modal */}
      {copyModal && (
        <CopyModal
          toClass={className} academicYear={academicYear} semester={semester}
          onCopy={d => copyMut.mutate(d)} loading={copyMut.isPending}
          onClose={() => setCopyModal(false)}
        />
      )}
    </div>
  )
}

function SlotModal({ day, period, existing, className, academicYear, semester, subjects, teachers, onSave, loading, onClose }) {
  const [form, setForm] = useState({
    subjectId:   existing?.subjectId   || '',
    teacherId:   existing?.teacherId   || '',
    room:        existing?.room        || '',
    startTime:   existing?.startTime   || '',
    endTime:     existing?.endTime     || '',
  })
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  function handleSave() {
    onSave({ className, academicYear, semester, day, period: parseInt(period), ...form })
  }

  return (
    <Modal title={`${day} — Period ${period}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Subject">
            <select value={form.subjectId} onChange={e=>set('subjectId',e.target.value)} className="input">
              <option value="">— Free Period —</option>
              {subjects.map(s=><option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
            </select>
          </FormField>
          <FormField label="Teacher">
            <select value={form.teacherId} onChange={e=>set('teacherId',e.target.value)} className="input">
              <option value="">— Select —</option>
              {teachers.map(t=><option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>)}
            </select>
          </FormField>
          <FormField label="Room / Venue">
            <input value={form.room} onChange={e=>set('room',e.target.value)} className="input" placeholder="Room 301"/>
          </FormField>
          <FormField label="Time (optional)">
            <div className="flex gap-2">
              <input type="time" value={form.startTime} onChange={e=>set('startTime',e.target.value)} className="input text-xs"/>
              <input type="time" value={form.endTime}   onChange={e=>set('endTime',e.target.value)}   className="input text-xs"/>
            </div>
          </FormField>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-outline">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 btn-primary">
            {loading ? 'Saving...' : 'Save Slot'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CopyModal({ toClass, academicYear, semester, onCopy, loading, onClose }) {
  const [fromClass, setFromClass] = useState('')
  return (
    <Modal title="Copy Timetable from Another Class" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">This will copy all slots from the source class to <strong>{toClass}</strong>. Existing slots will be overwritten.</p>
        <FormField label="Copy FROM class">
          <input value={fromClass} onChange={e=>setFromClass(e.target.value.toUpperCase())} className="input" placeholder="CS-3A"/>
        </FormField>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-outline">Cancel</button>
          <button onClick={() => onCopy({ fromClass, toClass, academicYear, semester: parseInt(semester) })}
            disabled={loading || !fromClass} className="flex-1 btn-primary">
            {loading ? 'Copying...' : 'Copy Timetable'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
