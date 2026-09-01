// src/pages/teacher/CoordinatedSubjects.jsx
import { useQuery } from '@tanstack/react-query'
import { teacherApi } from '../../api/all.api'
import { PageTitle, Spinner, EmptyState } from '../../components/Shared'
import { Link } from 'react-router-dom'
import { BookOpen, Users, ArrowRight, GraduationCap } from 'lucide-react'

export default function CoordinatedSubjects() {
  const { data, isLoading } = useQuery({ queryKey:['teacher-coordinated'], queryFn:()=>teacherApi.getCoordinatedSubjects().then(r=>r.data) })
  
  if (isLoading) return <Spinner />
  const subjects = data?.data || []

  return (
    <div className="space-y-6">
      <PageTitle title="My Coordinated Courses" />
      
      {subjects.length === 0 ? (
        <EmptyState icon={GraduationCap} text="No coordination assigned" subtext="You are not currently assigned as a coordinator for any subjects." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {subjects.map(c => (
            <div key={c.id} className="card overflow-hidden group hover:shadow-xl transition-all border-none shadow-sm ring-1 ring-slate-100">
               <div className="h-2 w-full bg-gradient-to-r from-indigo-500 to-blue-600" />
               <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                      <BookOpen size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-slate-100 text-slate-500 rounded-full border border-slate-200">{c.session}</span>
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{c.subject.name}</h3>
                  <p className="text-xs text-slate-400 font-mono mb-4">{c.subject.code}</p>
                  
                  <div className="space-y-3 pt-4 border-t border-slate-50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 font-medium italic">Scope</span>
                      <span className="font-bold text-slate-700">{c.batch ? `${c.batch.year} Batch` : c.branch ? c.branch.name : 'Global'}</span>
                    </div>
                  </div>

                  <Link to={`/teacher/coordinated/${c.subjectId}`} className="mt-6 flex items-center justify-center w-full py-3 bg-slate-50 hover:bg-slate-800 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all gap-2 group-hover:shadow-lg group-hover:shadow-indigo-500/10">
                    Manage Course Team <ArrowRight size={14} />
                  </Link>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
