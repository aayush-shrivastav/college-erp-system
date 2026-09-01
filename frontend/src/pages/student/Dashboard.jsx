// src/pages/student/Dashboard.jsx
import { useQuery } from '@tanstack/react-query'
import { studentApi } from '../../api/all.api'
import { Spinner, PageTitle } from '../../components/Shared'
import { 
  AlertTriangle, 
  TrendingUp, 
  CreditCard, 
  Clock, 
  Award, 
  Calendar,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Users
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function StudentDashboard() {
  const { data: attData, isLoading: loadingAtt } = useQuery({ queryKey:['student-att'],  queryFn:()=>studentApi.getAttendance().then(r=>r.data) })
  const { data: feeData, isLoading: loadingFee } = useQuery({ queryKey:['student-fee'],  queryFn:()=>studentApi.getFee().then(r=>r.data) })
  const { data: profileData } = useQuery({ queryKey:['student-profile'], queryFn:()=>studentApi.getProfile().then(r=>r.data) })

  if (loadingAtt || loadingFee) return <Spinner />

  const att = attData?.data || []
  const fee = feeData?.data
  const profile = profileData?.data
  const lowAtt = att.filter(a => a.attendancePct < 75)
  
  // Calculate average attendance
  const avgAtt = att.length > 0 ? Math.round(att.reduce((acc, s) => acc + s.attendancePct, 0) / att.length) : 0

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">
            Hello, <span className="text-indigo-600 dark:text-indigo-400">{profile?.name?.split(' ')[0] || 'Student'}!</span> 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Here's what's happening with your studies today.</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Calendar size={20} />
          </div>
          <div className="pr-4">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Today</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {lowAtt.length > 0 && (
        <div className="relative overflow-hidden bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-3xl p-6 group animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <AlertTriangle size={120} />
          </div>
          <div className="flex gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/25 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-rose-900 dark:text-rose-400">Critical Attendance Warning</h3>
              <p className="text-rose-700 dark:text-rose-300/80 font-medium mt-1 leading-relaxed">
                Your attendance is below 75% in <span className="font-black underline decoration-rose-300 underline-offset-4">{lowAtt.length} subjects</span>. 
                This might affect your eligibility for exams.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {lowAtt.slice(0, 3).map(s => (
                  <span key={s.subjectId} className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800/50">
                    {s.subjectCode}: {s.attendancePct}%
                  </span>
                ))}
                {lowAtt.length > 3 && <span className="text-rose-500 text-[10px] font-black py-1">+{lowAtt.length-3} more</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Attendance Pulse */}
        <Link to="/student/attendance" className="group card p-6 bg-gradient-to-br from-indigo-500 to-blue-600 border-none relative overflow-hidden shadow-xl shadow-indigo-500/20 hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -right-4 -bottom-4 opacity-15 group-hover:scale-110 transition-transform duration-500">
            <TrendingUp size={140} />
          </div>
          <p className="text-indigo-100 text-xs font-black uppercase tracking-widest mb-1">Attendance Pulse</p>
          <h2 className="text-5xl font-black text-white mb-2">{avgAtt}%</h2>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white transition-all duration-1000" style={{ width: `${avgAtt}%` }} />
            </div>
            <span className="text-white text-xs font-bold whitespace-nowrap">Avg Score</span>
          </div>
          <div className="mt-6 flex items-center text-white/80 text-xs font-bold group-hover:translate-x-1 transition-transform">
            View Subject-wise <ChevronRight size={14} />
          </div>
        </Link>

        {/* Fee Status */}
        <Link to="/student/fee" className="group card p-6 bg-white dark:bg-slate-800 relative shadow-sm border-slate-100 dark:border-slate-700/50 hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CreditCard size={24} />
            </div>
            {Number(fee?.outstanding||0) === 0 ? (
              <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50">Fee Cleared</span>
            ) : (
              <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/50">Dues Pending</span>
            )}
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Outstanding Balance</p>
          <h2 className={`text-3xl font-black ${Number(fee?.outstanding||0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>
            ₹{Number(fee?.outstanding||0).toLocaleString()}
          </h2>
          <div className="mt-6 flex items-center text-indigo-600 dark:text-indigo-400 text-xs font-bold group-hover:translate-x-1 transition-transform">
            Check Payment Record <ChevronRight size={14} />
          </div>
        </Link>

        {/* Next Achievement */}
        <div className="card p-6 bg-white dark:bg-slate-800 relative shadow-sm border-slate-100 dark:border-slate-700/50">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Award size={24} />
            </div>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Upcoming Milestone</p>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Semester Exam Results</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium italic">Release expected next month</p>
          <div className="mt-4 flex items-center gap-2">
            <Clock size={14} className="text-slate-300" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stay Focused</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Attendance List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-indigo-500" /> Attendance Breakdown
            </h3>
            <Link to="/student/attendance" className="text-xs font-bold text-indigo-600 hover:underline">View All</Link>
          </div>
          
          <div className="space-y-3">
            {att.slice(0, 5).map(s => (
              <div key={s.subjectId} className="group glass-card p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.attendancePct >= 75 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600'}`}>
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate max-w-[140px] md:max-w-none">{s.subjectName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{s.subjectCode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black leading-none ${s.attendancePct >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {s.attendancePct}%
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">
                      {s.totalAttended}/{s.totalConducted} Lectures
                    </p>
                  </div>
                </div>
                <div className="mt-3 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${s.attendancePct >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min(s.attendancePct, 100)}%` }} />
                </div>
              </div>
            ))}
            {att.length === 0 && (
              <div className="py-12 px-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700/50">
                <BookOpen size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 text-sm font-bold">No academic data found</p>
                <p className="text-slate-400 text-xs mt-1">Enrollments pending approval</p>
              </div>
            )}
            {att.length > 5 && (
              <Link to="/student/attendance" className="block text-center p-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-800/20 rounded-xl">
                See {att.length - 5} More Subjects
              </Link>
            )}
          </div>
        </div>

        {/* Quick Actions Column */}
        <div className="space-y-6">
          <div className="px-1">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Quick Operations</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {[
              { to: '/student/profile', label: 'Identity', icon: Award, sub: 'ID & Profile', color: 'indigo' },
              { to: '/student/timetable', label: 'Schedule', icon: Clock, sub: 'Weekly Plan', color: 'emerald' },
              { to: '/student/register', label: 'Enrollment', icon: Calendar, sub: 'New Semester', color: 'amber' },
              { to: '/student/scholarships', label: 'Finances', icon: CreditCard, sub: 'Scholarships', color: 'rose' },
            ].map(a => (
              <Link key={a.label} to={a.to} className="group card p-5 flex flex-col items-center justify-center gap-3 text-center transition-all hover:bg-indigo-600 hover:border-indigo-600 shadow-sm hover:shadow-indigo-500/20">
                <div className={`p-3 rounded-2xl bg-${a.color}-50 dark:bg-${a.color}-900/20 text-${a.color}-600 dark:text-${a.color}-400 group-hover:bg-white group-hover:text-indigo-600 transition-all`}>
                  <a.icon size={22} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-white transition-colors">{a.label}</p>
                  <p className="text-[10px] font-bold text-slate-400 group-hover:text-white/60 transition-colors uppercase tracking-widest">{a.sub}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="card p-6 bg-gradient-to-tr from-slate-800 to-slate-900 border-none shadow-xl text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <Users size={80} />
             </div>
             <h4 className="font-black text-lg mb-1">Mentor Support</h4>
             <p className="text-slate-300 text-xs font-medium mb-4 leading-relaxed">Need help with academic decisions or attendance issues? Reach out to your mentor.</p>
             <button onClick={() => window.open('/student/profile')} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">
               View Contact
             </button>
          </div>
        </div>
      </div>
    </div>
  )
}
