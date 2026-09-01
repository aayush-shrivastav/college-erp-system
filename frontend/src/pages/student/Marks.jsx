// src/pages/student/Marks.jsx
import { useQuery } from '@tanstack/react-query'
import { studentApi } from '../../api/all.api'
import { Spinner, PageTitle } from '../../components/Shared'
import { FlaskConical, BookOpen } from 'lucide-react'

export default function StudentMarks() {
  const { data, isLoading } = useQuery({ queryKey:['student-marks'], queryFn:()=>studentApi.getMarks().then(r=>r.data) })
  if (isLoading) return <Spinner />
  const marks = data?.data || []
  return (
    <div>
      <PageTitle title="My Marks Card" />
      {marks.length===0 ? <p className="text-gray-400 text-center py-8">No marks found. They will appear after enrollment is approved.</p> : (
        <div className="space-y-4">
          {marks.map(s=>(
            <details key={s.subjectId} className="card group overflow-hidden">
              <summary className="flex justify-between items-center px-5 py-4 cursor-pointer hover:bg-gray-50 list-none">
                <div className="flex items-center gap-3">
                  {s.subjectType === 'LAB'
                    ? <FlaskConical size={16} className="text-emerald-500 shrink-0"/>
                    : <BookOpen size={16} className="text-blue-500 shrink-0"/>}
                  <div>
                    <p className="font-semibold text-gray-800">{s.subjectName}</p>
                    <p className="text-xs text-gray-400 font-mono">{s.subjectCode}</p>
                  </div>
                  {s.subjectType === 'LAB' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">LAB</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${s.grandTotal>=(s.maxTotal*0.7)?'text-green-600':s.grandTotal>=(s.maxTotal*0.5)?'text-blue-600':'text-amber-600'}`}>
                      {s.grandTotal}/{s.maxTotal||28}
                    </p>
                    <p className="text-xs text-gray-400">{s.subjectType === 'LAB' ? 'Practical Marks' : 'Grand Total'}</p>
                  </div>
                  <span className="text-gray-300 group-open:rotate-180 transition-transform">▼</span>
                </div>
              </summary>
              <div className="px-5 pb-5 border-t bg-gray-50">
                {s.subjectType === 'LAB' ? (
                  /* LAB: Simple practical marks display */
                  <div className="mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Box label="Lab Practical Marks" val={`${s.practicalMarks ?? s.grandTotal}/25`} color="emerald" />
                      <Box label="Max Marks" val="25" color="teal" />
                    </div>
                    <p className="text-xs text-gray-400 mt-3 italic">Lab practical marks are entered at the end of the semester by the lab teacher.</p>
                  </div>
                ) : (
                  /* THEORY: Full MST breakdown */
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 mb-4">
                      <Box label="Exam Avg (Best 2/3)" val={`${s.examAvg}/12`}   color="blue"/>
                      <Box label="Assignment"           val={`${s.assignmentMarks}/10`} color="purple"/>
                      <Box label="Attendance Marks"     val={`${s.attendanceMarks}/6`}  color="teal"/>
                      <Box label="Grand Total" val={`${s.grandTotal}/28`} color="navy" dark/>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {(s.exams||[]).map(e=>(
                        <div key={e.examNo} className="bg-white border rounded-lg p-3 text-sm">
                          <p className="font-medium text-gray-600 mb-2">Exam {e.examNo}</p>
                          <div className="space-y-1 text-gray-500">
                            <div className="flex justify-between"><span>Sec A</span><span>{e.secA}/8</span></div>
                            <div className="flex justify-between"><span>Sec B</span><span>{e.secB}/8</span></div>
                            <div className="flex justify-between"><span>Sec C</span><span>{e.secC}/8</span></div>
                            <div className="flex justify-between font-bold border-t pt-1 text-gray-800"><span>Total</span><span>{e.total}/24</span></div>
                          </div>
                        </div>
                      ))}
                      {(!s.exams||s.exams.length===0)&&<p className="text-gray-400 text-xs col-span-3">Exam marks have not been entered yet.</p>}
                    </div>
                  </>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
function Box({label,val,color,dark}){
  const c={blue:'bg-blue-50 text-blue-700',purple:'bg-purple-50 text-purple-700',teal:'bg-teal-50 text-teal-700',emerald:'bg-emerald-50 text-emerald-700',navy:'bg-slate-800 text-white'}
  return <div className={`rounded-lg p-3 text-center ${c[color]||c.blue}`}><p className={`text-xs mb-1 ${dark?'text-slate-400':'opacity-70'}`}>{label}</p><p className="text-xl font-bold">{val}</p></div>
}
