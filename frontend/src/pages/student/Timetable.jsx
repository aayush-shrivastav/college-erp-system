// src/pages/student/Timetable.jsx — same as teacher view
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageTitle, Spinner, EmptyState } from '../../components/Shared'
import { Clock } from 'lucide-react'
import api from '../../api/axios'
import { studentApi } from '../../api/all.api'

const DAYS    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const PERIODS = [1,2,3,4,5,6,7,8]
const TYPE_COLOR = { THEORY:'bg-blue-50 border-blue-300 text-blue-800', LAB:'bg-green-50 border-green-300 text-green-800', ELECTIVE:'bg-purple-50 border-purple-300 text-purple-800' }
const TODAY = DAYS[new Date().getDay() - 1] || 'Monday'

export default function StudentTimetable() {
  const [viewDay, setViewDay] = useState(TODAY)

  const { data: profileData } = useQuery({ queryKey:['student-profile'], queryFn:()=>studentApi.getProfile().then(r=>r.data) })
  const profile = profileData?.data

  // Get class from profile — in a real system student would have a class assigned
  // For now let student enter class name
  const [className, setClassName] = useState('')

  const { data: ttData, isLoading } = useQuery({
    queryKey: ['timetable-student', className, profile?.currentSem],
    queryFn: () => api.get('/timetable', { params: { className, semester: profile?.currentSem } }).then(r => r.data),
    enabled: !!className && !!profile
  })
  const activeClassesQ = useQuery({ 
    queryKey: ['timetable-classes'], 
    queryFn: () => api.get('/timetable/classes').then(r => r.data) 
  })

  const grid = ttData?.data?.grid || {}
  const todaySlots = grid[viewDay] || {}

  return (
    <div>
      <PageTitle title="My Timetable" subtitle={`Semester ${profile?.currentSem}`}/>
      <div className="card p-4 mb-5 flex items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Your Class</label>
          <input value={className} onChange={e=>setClassName(e.target.value.toUpperCase())} className="input w-28" placeholder="CS-3A"/>
        </div>
        <p className="text-xs text-gray-400 mb-2">Enter your class section code</p>
      </div>

      {!className ? (
        <div className="relative overflow-hidden p-10 rounded-3xl bg-slate-900 border border-slate-800 text-center flex flex-col items-center justify-center shadow-2xl mb-8">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse duration-3000"></div>
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse delay-1000 duration-3000"></div>

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-500/30 relative z-10">
            <Clock size={28} />
          </div>
          <h3 className="text-xl font-black text-white tracking-tight relative z-10">Access Your Course Schedule</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-xs leading-relaxed mb-10 relative z-10">
            Select an available batch section code below or key in yours directly above.
          </p>

          {activeClassesQ.data?.data && activeClassesQ.data.data.length > 0 && (
            <div className="w-full max-w-4xl relative z-10">
              <p className="text-[10px] uppercase font-black tracking-widest text-indigo-400 mb-4 text-center">Available Timetables</p>
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
                          View ➔
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
          <div className="space-y-4">
            {/* Today highlight */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2"><Clock size={16}/>Today — {TODAY}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PERIODS.map(p=>{
                  const s = grid[TODAY]?.[p]
                  return (
                    <div key={p} className={`rounded-lg p-2 border text-xs ${s?TYPE_COLOR[s.subjectType]||TYPE_COLOR.THEORY:'bg-white border-gray-200 text-gray-300'}`}>
                      <p className="font-bold">P{p}</p>
                      {s?<><p className="font-semibold mt-0.5">{s.subjectCode}</p><p className="opacity-70 truncate">{s.teacherName}</p></>:<p>Free</p>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Day tabs */}
            <div className="flex gap-1 border-b overflow-x-auto">
              {DAYS.map(d=>(
                <button key={d} onClick={()=>setViewDay(d)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap -mb-px transition ${viewDay===d?'border-blue-600 text-blue-600':'border-transparent text-gray-500'}`}>
                  {d.slice(0,3)}{d===TODAY&&<span className="ml-1 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">Today</span>}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {PERIODS.map(p=>{
                const slot=todaySlots[p]
                return (
                  <div key={p} className={`card flex items-center gap-4 p-3.5 ${!slot?'opacity-40':''}`}>
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">P{p}</div>
                    {slot?(
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded border text-xs font-bold ${TYPE_COLOR[slot.subjectType]||TYPE_COLOR.THEORY}`}>{slot.subjectCode}</span>
                          <p className="font-semibold text-gray-800">{slot.subjectName}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {slot.teacherName}{slot.room&&<span className="ml-3">Room: {slot.room}</span>}{slot.startTime&&<span className="ml-3">{slot.startTime}–{slot.endTime}</span>}
                        </p>
                      </div>
                    ):<p className="text-gray-300 text-sm">Free Period</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      }
    </div>
  )
}
