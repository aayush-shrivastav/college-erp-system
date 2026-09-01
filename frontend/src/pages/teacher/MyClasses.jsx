// src/pages/teacher/MyClasses.jsx
// Lists all classes assigned to the teacher with section/group details
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { PageTitle, Spinner, EmptyState } from '../../components/Shared'
import { BookOpen, Users, BarChart2, ChevronRight } from 'lucide-react'

export default function MyClasses() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['my-subjects'],
    queryFn: () => api.get('/teacher/my-subjects').then(r => r.data).catch(() => ({ data: [] }))
  })

  const subjects = data?.data || []

  // Group by class name
  const byClass = {}
  for (const s of subjects) {
    if (!byClass[s.className]) byClass[s.className] = []
    byClass[s.className].push(s)
  }

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <PageTitle title="My Classes" />

      {subjects.length === 0 ? (
        <EmptyState icon={BookOpen} text="No classes assigned" subtext="Ask the admin to assign subjects to your classes" />
      ) : (
        <div className="space-y-4">
          {Object.entries(byClass).map(([className, subs]) => (
            <div key={className} className="card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Class Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-b border-indigo-100 dark:border-indigo-800/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
                      <BookOpen size={18} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100">{className}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sem {subs[0]?.semester} &bull; {subs.length} subject{subs.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subjects in this class */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {subs.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => navigate(`/teacher/classes/${s.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${s.subjectType === 'LAB' ? 'bg-emerald-500' : s.subjectType === 'ELECTIVE' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                      <div>
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{s.name}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{s.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        s.subjectType === 'LAB' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        s.subjectType === 'ELECTIVE' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>{s.subjectType}</span>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">
                        <BarChart2 size={13} /> Analytics
                        <ChevronRight size={13} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
