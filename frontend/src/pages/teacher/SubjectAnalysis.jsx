// src/pages/teacher/SubjectAnalysis.jsx
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import api from '../../api/axios'
import { PageTitle, Spinner, EmptyState } from '../../components/Shared'
import { ArrowLeft, BookOpen, User, Users, ClipboardCheck, BarChart4 } from 'lucide-react'

export default function SubjectAnalysis() {
  const { assignmentId } = useParams()

  const { data, isLoading, error } = useQuery({
    queryKey: ['subject-analysis', assignmentId],
    queryFn: () => api.get(`/teacher/my-assignments/${assignmentId}/analysis`).then(r => r.data)
  })

  if (isLoading) return <Spinner />
  if (error || !data?.success) return <EmptyState icon={BookOpen} text="Error loading data" subtext="Could not fetch analytics for this subject." />

  const info = data.data.assignmentInfo
  const students = data.data.students
  const headers = data.data.examHeaders || []

  // Calculates total average for MST (assuming best of 2 if >=3 exams, else simple sum/count scale, or whatever)
  // Just show raw sums for now
  return (
    <div className="space-y-6">
      <PageTitle title="Class Analytical Report">
        <Link to="/teacher/dashboard" className="btn-outline flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </PageTitle>

      {/* Header Info */}
      <div className="card p-6 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{info.subjectName}</h2>
            <p className="text-sm text-slate-500 font-mono mt-1">{info.subjectCode}</p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="font-semibold text-blue-700">{info.className}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Class</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-amber-600">{info.semester}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Semester</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-emerald-600">{info.groupName}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Group Scope</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-blue-500"/>
            <div>
              <p className="text-xs text-slate-500">Total Students</p>
              <p className="text-2xl font-bold text-blue-700">{students.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-l-4 border-emerald-500">
          <div className="flex items-center gap-3">
            <ClipboardCheck size={20} className="text-emerald-500"/>
            <div>
              <p className="text-xs text-slate-500">Registered</p>
              <p className="text-2xl font-bold text-emerald-700">
                {students.filter(s => s.isEnrolled).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-l-4 border-rose-500">
          <div className="flex items-center gap-3">
            <User size={20} className="text-rose-500"/>
            <div>
              <p className="text-xs text-slate-500">Unregistered</p>
              <p className="text-2xl font-bold text-rose-700">
                {students.filter(s => !s.isEnrolled).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-l-4 border-purple-500">
          <div className="flex items-center gap-3">
            <BarChart4 size={20} className="text-purple-500"/>
            <div>
              <p className="text-xs text-slate-500">Avg Attendance</p>
              <p className="text-2xl font-bold text-purple-700">
                {students.length ? (students.reduce((acc, s) => acc + Number(s.attendance.percentage), 0) / students.length).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="card overflow-hidden">
        <h3 className="font-semibold px-5 py-4 border-b">Student Performance & Status Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs">Roll No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs">Student Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs text-center border-l border-r">Registration</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-500 text-xs border-r" colSpan={2}>Attendance</th>
                {headers.map(h => (
                   <th key={h} className="text-center px-4 py-3 font-semibold text-slate-500 text-xs border-r">Exam {h}</th>
                ))}
                <th className="text-center px-4 py-3 font-semibold text-slate-500 text-xs">Assignment</th>
              </tr>
              <tr className="bg-slate-50/50 border-b">
                <th className="px-4 py-1"></th>
                <th className="px-4 py-1"></th>
                <th className="border-l border-r"></th>
                <th className="px-2 py-1 text-xs text-slate-400 font-medium text-center">Conducted</th>
                <th className="px-2 py-1 text-xs text-slate-400 font-medium text-center border-r">%</th>
                {headers.map(h => (
                   <th key={h} className="px-2 py-1 text-xs text-slate-400 font-medium text-center border-r">Max 24</th>
                ))}
                 <th className="px-2 py-1 text-xs text-slate-400 font-medium text-center">Max 10</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-blue-600 text-xs">{s.rollNo}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 text-center border-l border-r">
                    {s.isEnrolled 
                      ? <span className="badge-green text-[10px]">Registered</span> 
                      : <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-[10px] font-bold">Unregistered</span>
                    }
                  </td>
                  
                  {/* Attendance */}
                  <td className="px-4 py-3 text-center text-slate-500">
                    {s.attendance.attended} / {s.attendance.conducted}
                  </td>
                  <td className="px-4 py-3 text-center border-r">
                    <span className={`font-semibold ${s.attendance.percentage < 75 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {s.attendance.percentage}%
                    </span>
                  </td>

                  {/* Exams */}
                  {headers.map(h => {
                    const ex = s.exams.find(e => e.examNo === h)
                    return (
                      <td key={h} className="px-4 py-3 text-center font-medium border-r">
                        {ex?.total !== null ? ex.total : <span className="text-slate-300">—</span>}
                      </td>
                    )
                  })}

                  {/* Assignment */}
                  <td className="px-4 py-3 text-center font-medium">
                     {s.assignment !== null ? s.assignment : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
