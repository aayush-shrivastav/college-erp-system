// src/pages/student/Attendance.jsx
import { useQuery } from '@tanstack/react-query'
import { studentApi } from '../../api/all.api'
import { Spinner, PageTitle } from '../../components/Shared'
import { CheckCircle2, AlertTriangle, XCircle, FlaskConical, BookOpen, TrendingUp, Calendar } from 'lucide-react'

function CircleRing({ pct, size = 72, stroke = 7 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const fill = Math.min(pct, 100) / 100
  const color = pct >= 75 ? '#22c55e' : pct >= 65 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - fill)}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  )
}

function StatusBadge({ pct }) {
  if (pct >= 90) return <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700"><CheckCircle2 size={10}/>Excellent</span>
  if (pct >= 75) return <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"><TrendingUp size={10}/>Safe</span>
  if (pct >= 65) return <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"><AlertTriangle size={10}/>Warning</span>
  return <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700"><XCircle size={10}/>Critical</span>
}

export default function StudentAttendance() {
  const { data, isLoading } = useQuery({ queryKey:['student-att'], queryFn:()=>studentApi.getAttendance().then(r=>r.data) })
  if (isLoading) return <Spinner />
  const att = data?.data || []

  const safe     = att.filter(s => s.attendancePct >= 75).length
  const warning  = att.filter(s => s.attendancePct >= 65 && s.attendancePct < 75).length
  const critical = att.filter(s => s.attendancePct < 65).length
  const overall  = att.length > 0 ? Math.round(att.reduce((acc, s) => acc + s.attendancePct, 0) / att.length) : 0

  return (
    <div className="space-y-6">
      <PageTitle title="My Attendance" />

      {/* Summary Strip */}
      {att.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Overall Avg', value: `${overall}%`, icon: TrendingUp,    color: overall >= 75 ? 'emerald' : 'rose' },
            { label: 'Safe Subjects', value: safe,         icon: CheckCircle2,  color: 'green'  },
            { label: 'Warning Zone',  value: warning,      icon: AlertTriangle, color: 'amber'  },
            { label: 'Critical',      value: critical,     icon: XCircle,       color: 'rose'   },
          ].map(c => (
            <div key={c.label} className={`card p-4 flex items-center gap-3 border-l-4 ${
              c.color==='emerald'?'border-l-emerald-500':c.color==='green'?'border-l-green-500':c.color==='amber'?'border-l-amber-400':'border-l-rose-500'
            }`}>
              <div className={`p-2 rounded-xl ${
                c.color==='emerald'?'bg-emerald-50 text-emerald-600':c.color==='green'?'bg-green-50 text-green-600':c.color==='amber'?'bg-amber-50 text-amber-600':'bg-rose-50 text-rose-600'
              }`}><c.icon size={18}/></div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                <p className={`text-xl font-bold ${c.color==='emerald'?'text-emerald-600':c.color==='green'?'text-green-600':c.color==='amber'?'text-amber-600':'text-rose-600'}`}>{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {att.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No attendance data found. Attend a class first!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {att.map(s => {
            const pct = s.attendancePct
            const isLab = s.subjectName?.toLowerCase().includes('lab')
            const needed75 = pct < 75 ? Math.max(0, Math.ceil((0.75 * s.totalConducted - s.totalAttended) / 0.25)) : 0
            const canSkip  = pct > 75 ? Math.floor((s.totalAttended - 0.75 * s.totalConducted) / 0.75) : 0

            return (
              <div key={s.subjectId} className={`card overflow-hidden transition-all hover:shadow-lg ${
                pct < 65 ? 'ring-1 ring-rose-200' : pct < 75 ? 'ring-1 ring-amber-200' : ''
              }`}>
                <div className={`h-1.5 w-full ${pct >= 75 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : pct >= 65 ? 'bg-gradient-to-r from-amber-300 to-orange-400' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}/>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isLab ? <FlaskConical size={14} className="text-emerald-500 shrink-0"/> : <BookOpen size={14} className="text-blue-500 shrink-0"/>}
                        <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{s.subjectName}</p>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mb-3">{s.subjectCode}</p>
                      <StatusBadge pct={pct} />
                    </div>
                    <div className="relative shrink-0">
                      <CircleRing pct={pct} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-sm font-black ${pct >= 75 ? 'text-green-600' : pct >= 65 ? 'text-amber-600' : 'text-rose-600'}`}>{pct}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Calendar size={11}/> {s.totalAttended}/{s.totalConducted} classes</span>
                      <span className="text-rose-400">{s.totalAbsent} absent</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-2 rounded-full transition-all duration-700 ${pct >= 75 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : pct >= 65 ? 'bg-gradient-to-r from-amber-300 to-orange-400' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}
                        style={{width:`${Math.min(pct,100)}%`}}/>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100">
                    {pct >= 75 ? (
                      <p className="text-xs text-slate-400">
                        {canSkip > 0 ? `✅ Can skip ${canSkip} more class${canSkip !== 1 ? 'es' : ''} safely` : '✅ Stay consistent!'}
                      </p>
                    ) : (
                      <p className="text-xs text-rose-500 font-medium">
                        ⚠ Attend {needed75} more class{needed75 !== 1 ? 'es' : ''} to reach 75%
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
