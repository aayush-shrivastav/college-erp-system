// src/pages/accounts/Reports.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageTitle, Spinner, FormField } from '../../components/Shared'
import api from '../../api/axios'
import toast from 'react-hot-toast'

export default function AccountsReports() {
  const [tab, setTab] = useState('outstanding')
  const [filters, setFilters] = useState({ batchYear:'', minBalance:'0', fromDate:'', toDate:'', semester:'', paymentType:'' })
  const setF = (k,v) => setFilters(p=>({...p,[k]:v}))

  const outQ = useQuery({
    queryKey: ['outstanding', filters.batchYear, filters.minBalance],
    queryFn: () => api.get('/accounts/reports/outstanding', { params: { batchYear: filters.batchYear, minBalance: filters.minBalance } }).then(r => r.data),
    enabled: tab === 'outstanding'
  })

  const collQ = useQuery({
    queryKey: ['collection', filters.fromDate, filters.toDate, filters.semester, filters.paymentType],
    queryFn: () => api.get('/accounts/reports/collection', { params: { fromDate: filters.fromDate, toDate: filters.toDate, semester: filters.semester, paymentType: filters.paymentType } }).then(r => r.data),
    enabled: tab === 'collection'
  })

  function handleDownloadOutstanding() {
    const p = new URLSearchParams({ minBalance: filters.minBalance || 0 })
    if (filters.batchYear) p.append('batchYear', filters.batchYear)
    window.open(`http://localhost:3000/api/v1/accounts/reports/outstanding/export?${p.toString()}`)
    toast.success('Downloading Master Excel...')
  }

  function handleDownloadCollection() {
    const p = new URLSearchParams()
    if (filters.fromDate) p.append('fromDate', filters.fromDate)
    if (filters.toDate) p.append('toDate', filters.toDate)
    if (filters.semester) p.append('semester', filters.semester)
    if (filters.paymentType) p.append('paymentType', filters.paymentType)
    window.open(`http://localhost:3000/api/v1/accounts/reports/collection/export?${p.toString()}`)
    toast.success('Downloading Transactions Excel...')
  }

  return (
    <div>
      <PageTitle title="Financial Reports"/>

      <div className="flex gap-1 mb-6 border-b">
        {[['outstanding','Outstanding Dues'],['collection','Collection Summary']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${tab===k?'border-blue-600 text-blue-600':'border-transparent text-gray-500'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── OUTSTANDING ─────────────────────────────────────────────────────── */}
      {tab === 'outstanding' && (
        <div className="space-y-4">
          <div className="card p-4 flex flex-wrap gap-3 items-end">
            <FormField label="Batch Year"><input value={filters.batchYear} onChange={e=>setF('batchYear',e.target.value)} className="input w-28" placeholder="2023"/></FormField>
            <FormField label="Min Balance (₹)"><input type="number" value={filters.minBalance} onChange={e=>setF('minBalance',e.target.value)} className="input w-28" placeholder="0"/></FormField>
          </div>

          {outQ.isLoading ? <Spinner/> : (
            <div className="card overflow-hidden">
              <div className="flex justify-between items-center px-5 py-4 border-b">
                <div>
                  <h3 className="font-semibold">Outstanding Balances</h3>
                  <p className="text-xs text-gray-400">{outQ.data?.meta?.total} students · Total: ₹{Number(outQ.data?.meta?.totalOutstanding||0).toLocaleString()}</p>
                </div>
                <button onClick={handleDownloadOutstanding} className="btn-outline text-xs flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> Download Excel
                </button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>{['Roll No','Name','Semester','Mentor','Fee Due'].map(h=>(
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y">
                  {outQ.data?.data?.map(r=>(
                    <tr key={`${r.studentId}-${r.semester}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-blue-600 text-xs">{r.rollNo}</td>
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-gray-400">Sem {r.semester}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{r.mentor}</td>
                      <td className="px-4 py-3 font-bold text-red-600">₹{r.feeDue.toLocaleString()}</td>
                    </tr>
                  ))}
                  {!outQ.data?.data?.length && <tr><td colSpan={7} className="text-center py-8 text-green-600 font-medium">🎉 No outstanding dues!</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── COLLECTION ──────────────────────────────────────────────────────── */}
      {tab === 'collection' && (
        <div className="space-y-4">
          <div className="card p-4 flex flex-wrap gap-3 items-end">
            <FormField label="From Date"><input type="date" value={filters.fromDate} onChange={e=>setF('fromDate',e.target.value)} className="input"/></FormField>
            <FormField label="To Date"><input type="date" value={filters.toDate} onChange={e=>setF('toDate',e.target.value)} className="input"/></FormField>
            <FormField label="Semester">
              <select value={filters.semester} onChange={e=>setF('semester',e.target.value)} className="input w-28">
                <option value="">All</option>
                {[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>Sem {n}</option>)}
              </select>
            </FormField>
            <FormField label="Payment Type">
              <select value={filters.paymentType} onChange={e=>setF('paymentType',e.target.value)} className="input w-32">
                <option value="">All</option>
                {['CASH','DRCC','SCHOLARSHIP','DD'].map(t=><option key={t}>{t}</option>)}
              </select>
            </FormField>
          </div>

          {collQ.isLoading ? <Spinner/> : (
            <div className="space-y-4">
              {/* Grand total */}
              <div className="card p-5 bg-green-50 border-green-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Total Collection</p>
                    <p className="text-3xl font-bold text-green-700">₹{Number(collQ.data?.data?.grandTotal||0).toLocaleString()}</p>
                    <p className="text-xs text-green-500 mt-1">{collQ.data?.data?.count} transactions</p>
                  </div>
                  <button onClick={handleDownloadCollection} className="bg-white border-2 border-green-200 text-green-700 font-bold px-4 py-2 rounded-xl text-sm hover:bg-green-100 flex items-center gap-2 transition">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> Export History
                  </button>
                </div>
              </div>

              {/* By payment type */}
              <div className="card p-5">
                <h3 className="font-semibold mb-4">By Payment Type</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {Object.entries(collQ.data?.data?.byType||{}).map(([type,amt])=>(
                    <div key={type} className="bg-gray-50 border rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">{type}</p>
                      <p className="font-bold text-gray-800">₹{Number(amt).toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{Math.round(Number(amt)/Number(collQ.data?.data?.grandTotal||1)*100)}%</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* By semester */}
              <div className="card p-5">
                <h3 className="font-semibold mb-4">By Semester</h3>
                <div className="space-y-2">
                  {Object.entries(collQ.data?.data?.bySemester||{}).sort(([a],[b])=>parseInt(a)-parseInt(b)).map(([sem,amt])=>(
                    <div key={sem} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-20">Semester {sem}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width:`${Math.round(Number(amt)/Number(collQ.data?.data?.grandTotal||1)*100)}%` }}/>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-28 text-right">₹{Number(amt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
