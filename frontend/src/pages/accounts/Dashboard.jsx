// src/pages/accounts/Dashboard.jsx
import { useQuery } from '@tanstack/react-query'
import { PageTitle, Spinner } from '../../components/Shared'
import { IndianRupee, AlertCircle, Users, UserX, TrendingUp } from 'lucide-react'
import api from '../../api/axios'

export default function AccountsDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['accounts-dashboard'],
    queryFn: () => api.get('/accounts/dashboard').then(r => r.data)
  })
  const d = data?.data

  if (isLoading) return <Spinner/>

  return (
    <div className="space-y-6">
      <PageTitle title="Accounts Dashboard" subtitle={new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}/>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        {[
          { label: "Today's Collection",  value: `₹${Number(d?.todayCollection||0).toLocaleString()}`,  sub: `${d?.todayPaymentCount||0} payments today`, icon: TrendingUp,  color: 'emerald'  },
          { label: 'Total Collection',    value: `₹${Number(d?.totalCollection||0).toLocaleString()}`,   sub: 'All time',                                   icon: IndianRupee, color: 'indigo'   },
          { label: 'Unpaid Fines',        value: `₹${Number(d?.unpaidFinesAmount||0).toLocaleString()}`, sub: `${d?.unpaidFinesCount||0} fines pending`,     icon: AlertCircle, color: 'rose'    },
          { label: 'Total Students',      value: d?.totalStudents,    sub: 'Registered',              icon: Users,    color: 'indigo'   },
          { label: 'Fee Account Setup',   value: d?.accountsSetup,   sub: `${d?.noAccount||0} pending setup`,   icon: Users,    color: 'emerald'  },
          { label: 'No Fee Account',      value: d?.noAccount,       sub: 'Need setup',               icon: UserX,    color: 'amber'  },
        ].map(c => (
          <div key={c.label} className={`card p-6 border-t-4 shadow-sm hover:shadow-md transition-shadow ${
            c.color==='emerald'?'border-t-emerald-500':c.color==='indigo'?'border-t-indigo-500':c.color==='rose'?'border-t-rose-500':'border-t-amber-500'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{c.label}</p>
                <p className={`text-2xl font-bold ${c.color==='emerald'?'text-emerald-700 dark:text-emerald-400':c.color==='indigo'?'text-indigo-700 dark:text-indigo-400':c.color==='rose'?'text-rose-700 dark:text-rose-400':'text-amber-700 dark:text-amber-400'}`}>{c.value}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{c.sub}</p>
              </div>
              <div className={`p-2 rounded-xl ${c.color==='emerald'?'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500':c.color==='indigo'?'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500':c.color==='rose'?'bg-rose-50 dark:bg-rose-900/20 text-rose-500':'bg-amber-50 dark:bg-amber-900/20 text-amber-500'}`}>
                <c.icon size={22} className="opacity-80"/>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Payments */}
      <div className="card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Recent Payments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/80">
              <tr>{['Student','Roll No','Amount','Type','Receipt','Time'].map(h=>(
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {(d?.recentPayments||[]).map(p=>(
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-200">{p.ledger?.studentFeeProfile?.student?.name || '—'}</td>
                  <td className="px-5 py-4 font-mono text-indigo-600 dark:text-indigo-400 text-xs">{p.ledger?.studentFeeProfile?.student?.rollNo || '—'}</td>
                  <td className="px-5 py-4 font-bold text-emerald-600 dark:text-emerald-400">₹{Number(p.amount).toLocaleString()}</td>
                  <td className="px-5 py-4"><span className="badge-blue dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/30">{p.paymentType}</span></td>
                  <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-xs font-mono">{p.receiptNo}</td>
                  <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-xs">{new Date(p.createdAt).toLocaleTimeString('en-IN')}</td>
                </tr>
              ))}
              {!d?.recentPayments?.length && <tr><td colSpan={6} className="text-center py-8 text-slate-400 dark:text-slate-500 italic">No payments today</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
