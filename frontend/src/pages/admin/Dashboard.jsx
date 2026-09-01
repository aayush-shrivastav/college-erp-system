import { useQuery } from '@tanstack/react-query'
import api from '../../api/axios'
import { PageTitle, Spinner, StatCard } from '../../components/Shared'
import { Users, UserCheck, BookOpen, Settings2, DollarSign, AlertCircle, IndianRupee } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

export default function AdminDashboard() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => api.get('/admin/dashboard-stats').then(r => r.data?.data)
  })

  // Format currency
  const formatCur = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  if (isLoading) return <div className="py-20"><Spinner /></div>

  const { stats, monthlyCollection, studentDistribution, topDefaulters } = statsData || {};

  return (
    <div className="space-y-6">
      <PageTitle title="Institute Analytics" subtitle="Real-time academic and financial overview" />
      
      {/* ── TOP STATS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard title="Total Students"   value={stats?.totalStudents}    icon={Users}      color="blue"   />
        <StatCard title="Total Faculty"    value={stats?.totalTeachers}    icon={UserCheck}  color="emerald" />
        <StatCard title="Total Revenue"    value={formatCur(stats?.totalCollection)} icon={IndianRupee} color="emerald" />
        <StatCard title="Total Defaulters" value={stats?.defaultersCount}  icon={AlertCircle}color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── BAR CHART (REVENUE) ── */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Revenue Collection (Last 6 Months)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCollection} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `₹${value/1000}k`} />
                <RechartsTooltip 
                  cursor={{fill: '#f1f5f9'}} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => formatCur(value)}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── PIE CHART (STUDENTS) ── */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Distribution by Branch</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {studentDistribution && studentDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={studentDistribution}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {studentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
                <p className="text-sm text-slate-400">No student data available</p>
            )}
          </div>
        </div>

      </div>

      {/* ── SECOND ROW: QUICK ACTIONS & DEFAULTERS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="card p-6 border-t-4 border-red-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800">Top Defaulters</h3>
            <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full">Top 5</span>
          </div>
          <div className="space-y-3">
             {topDefaulters?.length > 0 ? topDefaulters.map((d, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-bold text-sm text-slate-700">{d.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{d.rollNo} • {d.branch} • Sem {d.semester}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600 text-sm">{formatCur(d.due)}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Due</p>
                  </div>
                </div>
             )) : (
                <p className="text-center text-sm text-emerald-600 py-4 font-semibold">No defaulters found! 🎉</p>
             )}
          </div>
        </div>

        <div className="lg:col-span-2 card p-8 bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-xl shadow-indigo-500/20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold">Quick Management</h2>
              <p className="text-indigo-100 text-sm mt-1 opacity-80">Easily access core administrative tasks</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Add Student', icon: Users, link: '/admin/students' },
              { label: 'Add Teacher', icon: UserCheck, link: '/admin/teachers' },
              { label: 'Classes', icon: Settings2, link: '/admin/structure' },
              { label: 'Fee Reports', icon: BookOpen, link: '/admin/fee-reports' },
            ].map(a => (
              <a key={a.label} href={a.link} className="group flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white text-indigo-600 shadow-md group-hover:scale-110 transition-transform">
                  <a.icon size={24}/>
                </div>
                <span className="font-semibold text-sm text-center">{a.label}</span>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
