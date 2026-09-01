import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountsApi } from '../../api/accounts.api'
import api from '../../api/axios.js'
import { 
  Search, GraduationCap, 
  Calendar, CreditCard, 
  CheckCircle2, AlertCircle,
  FileText, History, ChevronDown, ChevronUp,
  Clock, TrendingUp
} from 'lucide-react'
import { Spinner, PageTitle } from '../../components/Shared'

// ── helpers ──────────────────────────────────────────────────────────────────
const TOTAL_SEMESTERS = 8

function getSemStatus(sem, currentSem, ledger) {
  if (!ledger) {
    // No record => Upcoming / Projected
    return sem <= currentSem ? 'overdue_projected' : 'upcoming'
  }
  if (Number(ledger.netDue) > 0) {
    return sem < currentSem ? 'overdue' : 'due'
  }
  return 'paid'
}

function StatusBadge({ status }) {
  const map = {
    paid:             { icon: '✅', label: 'Fully Paid',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    due:              { icon: '⚠️', label: 'Partial Due', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    overdue:          { icon: '❌', label: 'Overdue',     cls: 'bg-red-50 text-red-700 border-red-200' },
    upcoming:         { icon: '⏳', label: 'Upcoming',    cls: 'bg-slate-50 text-slate-500 border-slate-200' },
    overdue_projected:{ icon: '⏳', label: 'Projected',   cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  }
  const { icon, label, cls } = map[status] || map.upcoming
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {icon} {label}
    </span>
  )
}

// ── Year-wise compact summary table ──────────────────────────────────────────
function YearSummaryTable({ ledgers, semMasters, mastersList, currentSem, unpaidFines = 0 }) {
  const years = [1, 2, 3, 4]

  const getSemData = (sem) => {
    const ledger  = ledgers.find(l => l.semester === sem)
    const master  = semMasters.find(m => m.semester === sem)
    const courseMaster = mastersList.find(m => m.semester === 0)
    const isProjected = !ledger

    let totalFee = 0
    if (ledger) {
      totalFee = Number(ledger.baseFeeDue||0)+Number(ledger.hostelFeeDue||0)+Number(ledger.busFeeDue||0)+Number(ledger.messFeeDue||0)
    } else if (master) {
      totalFee = Number(master.tuitionFee||0)+Number(master.hostelFee||0)+Number(master.busFee||0)+Number(master.messFee||0)
    } else if (courseMaster) {
      totalFee = Number(courseMaster.totalFee || 0) / 8
    }

    const totalPaid = ledger ? Number(ledger.totalPaid||0)+Number(ledger.scholarshipVerified||0) : 0
    const balance   = ledger ? Math.max(0, Number(ledger.netDue||0)) : totalFee
    const status    = getSemStatus(sem, currentSem, ledger)

    return { totalFee, totalPaid, balance, status, isProjected }
  }

  let grandFee = 0, grandPaid = 0, grandBalance = 0
  const yearRows = years.map(year => {
    const s1 = getSemData(year * 2 - 1)
    const s2 = getSemData(year * 2)
    const fee     = s1.totalFee + s2.totalFee
    const paid    = s1.totalPaid + s2.totalPaid
    const balance = s1.balance + s2.balance
    grandFee      += fee
    grandPaid     += paid
    grandBalance  += balance

    // Year status: worst of the two semesters
    const priority = { overdue: 4, due: 3, overdue_projected: 2, upcoming: 1, paid: 0 }
    const yearStatus = priority[s1.status] >= priority[s2.status] ? s1.status : s2.status
    const bothProjected = s1.isProjected && s2.isProjected

    return { year, fee, paid, balance, yearStatus, bothProjected }
  })

  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden text-xs">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] tracking-wider">
            <th className="text-left px-4 py-2.5 font-bold">Year</th>
            <th className="text-left px-3 py-2.5 font-bold hidden sm:table-cell">Semesters</th>
            <th className="text-right px-3 py-2.5 font-bold">Total Fee</th>
            <th className="text-right px-3 py-2.5 font-bold">Paid</th>
            <th className="text-right px-3 py-2.5 font-bold">Balance</th>
            <th className="text-center px-3 py-2.5 font-bold">Status</th>
          </tr>
        </thead>
        <tbody>
          {yearRows.map(({ year, fee, paid, balance, yearStatus, bothProjected }) => (
            <tr key={year} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
              <td className="px-4 py-3 font-bold text-slate-700">Year {year}</td>
              <td className="px-3 py-3 text-slate-400 hidden sm:table-cell">Sem {year*2-1} + Sem {year*2}</td>
              <td className={`px-3 py-3 text-right font-semibold ${bothProjected ? 'text-slate-400 italic' : 'text-slate-700'}`}>
                ₹{fee.toLocaleString()}
                {bothProjected && <span className="ml-1 text-[9px] text-slate-400 not-italic">est.</span>}
              </td>
              <td className="px-3 py-3 text-right font-semibold text-emerald-600">₹{paid.toLocaleString()}</td>
              <td className={`px-3 py-3 text-right font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                ₹{balance.toLocaleString()}
              </td>
              <td className="px-3 py-3 text-center"><StatusBadge status={yearStatus} /></td>
            </tr>
          ))}
          {unpaidFines > 0 && (
            <tr className="border-t-2 border-red-100 bg-red-50/20 hover:bg-red-50/40 transition-colors">
              <td className="px-4 py-3 font-bold text-red-700">Fines</td>
              <td className="px-3 py-3 text-slate-400 text-[10px] hidden sm:table-cell">Additional Penalties</td>
              <td className="px-3 py-3 text-right font-semibold text-red-600">₹{unpaidFines.toLocaleString()}</td>
              <td className="px-3 py-3 text-right font-semibold text-emerald-600">₹0</td>
              <td className="px-3 py-3 text-right font-bold text-red-600">₹{unpaidFines.toLocaleString()}</td>
              <td className="px-3 py-3 text-center"><span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">⚠️ Due</span></td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 bg-slate-50">
            <td className="px-4 py-3 font-black text-slate-800">Grand Total</td>
            <td className="px-3 py-3 text-slate-400 text-[10px] hidden sm:table-cell">8 Semesters + Fines</td>
            <td className="px-3 py-3 text-right font-black text-slate-800">₹{(grandFee + unpaidFines).toLocaleString()}</td>
            <td className="px-3 py-3 text-right font-black text-emerald-600">₹{grandPaid.toLocaleString()}</td>
            <td className="px-3 py-3 text-right font-black text-red-600">₹{(grandBalance + unpaidFines).toLocaleString()}</td>
            <td className="px-3 py-3"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── Single semester row inside Year Card ─────────────────────────────────────
function SemesterRow({ sem, ledger, master, courseMaster, currentSem }) {
  const isProjected = !ledger
  const status = getSemStatus(sem, currentSem, ledger)

  // Use semester-specific master, or fallback to fractional courseMaster
  const fallbackTuition = master ? Number(master.tuitionFee||0) : (courseMaster ? Number(courseMaster.tuitionFee||0)/8 : 0)
  const fallbackHostel  = master ? Number(master.hostelFee||0) : (courseMaster ? Number(courseMaster.hostelFee||0)/8 : 0)
  const fallbackMess    = master ? Number(master.messFee||0) : (courseMaster ? Number(courseMaster.messFee||0)/8 : 0)
  const fallbackBus     = master ? Number(master.busFee||0) : (courseMaster ? Number(courseMaster.busFee||0)/8 : 0)

  const tuition = ledger ? Number(ledger.baseFeeDue||0) : fallbackTuition
  const hostel  = ledger ? Number(ledger.hostelFeeDue||0) : fallbackHostel
  const mess    = ledger ? Number(ledger.messFeeDue||0) : fallbackMess
  const bus     = ledger ? Number(ledger.busFeeDue||0) : fallbackBus
  
  const paid    = ledger ? Number(ledger.totalPaid||0)+Number(ledger.scholarshipVerified||0) : 0
  const total   = tuition + hostel + mess + bus
  const balance = ledger ? Math.max(0, Number(ledger.netDue||0)) : total

  return (
    <div className={`rounded-xl border overflow-hidden ${isProjected ? 'border-dashed border-slate-200 bg-slate-50/30' : 'border-slate-100 bg-white'}`}>
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black
            ${status === 'paid' ? 'bg-emerald-100 text-emerald-600' :
              status === 'due' || status === 'overdue' ? 'bg-red-100 text-red-600' :
              'bg-slate-100 text-slate-400'}`}>
            {sem}
          </div>
          <div>
            <p className={`text-sm font-bold ${isProjected ? 'text-slate-400 italic' : 'text-slate-700'}`}>
              Semester {sem}
            </p>
            {isProjected && (
              <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                Projected
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Breakdown */}
      <div className={`px-4 pb-4 grid grid-cols-2 gap-x-8 gap-y-1.5 text-[11px] border-t border-slate-50 pt-3 ${isProjected ? 'opacity-60' : ''}`}>
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"/>Tuition
          </span>
          <span className="font-semibold text-slate-700">₹{tuition.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block"/>Hostel
          </span>
          <span className="font-semibold text-slate-700">₹{hostel.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"/>Mess
          </span>
          <span className="font-semibold text-slate-700">₹{mess.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block"/>Transport
          </span>
          <span className="font-semibold text-slate-700">₹{bus.toLocaleString()}</span>
        </div>

        {!isProjected && (
          <div className="col-span-2 mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
            <span className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[9px] tracking-wide">
              <CreditCard size={11}/> Total Recovered
            </span>
            <span className="font-black text-emerald-600 text-sm">₹{paid.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Year expandable card ──────────────────────────────────────────────────────
function YearCard({ year, ledgers, semMasters, courseMaster, currentSem, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const sem1 = year * 2 - 1
  const sem2 = year * 2

  const ledger1 = ledgers.find(l => l.semester === sem1)
  const ledger2 = ledgers.find(l => l.semester === sem2)
  const master1 = semMasters.find(m => m.semester === sem1)
  const master2 = semMasters.find(m => m.semester === sem2)

  const getFullFee = (ledger, master, cMaster) => {
    if (ledger) return Number(ledger.baseFeeDue||0)+Number(ledger.hostelFeeDue||0)+Number(ledger.busFeeDue||0)+Number(ledger.messFeeDue||0)
    if (master) return Number(master.tuitionFee||0)+Number(master.hostelFee||0)+Number(master.busFee||0)+Number(master.messFee||0)
    if (cMaster) return Number(cMaster.totalFee || 0) / 8
    return 0
  }

  const fee1 = getFullFee(ledger1, master1, courseMaster)
  const fee2 = getFullFee(ledger2, master2, courseMaster)

  const paid1 = ledger1 ? Number(ledger1.totalPaid||0)+Number(ledger1.scholarshipVerified||0) : 0
  const paid2 = ledger2 ? Number(ledger2.totalPaid||0)+Number(ledger2.scholarshipVerified||0) : 0
  const due1  = ledger1 ? Math.max(0, Number(ledger1.netDue||0)) : fee1
  const due2  = ledger2 ? Math.max(0, Number(ledger2.netDue||0)) : fee2

  const yearFee  = fee1 + fee2
  const yearPaid = paid1 + paid2
  const yearDue  = due1 + due2

  const hasAnyRecord = !!(ledger1 || ledger2)
  const isCurrentYear = currentSem === sem1 || currentSem === sem2

  return (
    <div className={`border rounded-2xl overflow-hidden shadow-sm transition-all ${isCurrentYear ? 'border-blue-200 shadow-blue-100' : 'border-slate-100'}`}>
      {/* Card header – always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors
          ${isCurrentYear ? 'bg-blue-50/50 hover:bg-blue-50' : 'bg-white hover:bg-slate-50/50'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-sm font-black leading-none
            ${isCurrentYear ? 'bg-blue-600 text-white' : hasAnyRecord ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}>
            <span className="text-[9px] font-normal opacity-70">YR</span>
            <span>{year}</span>
          </div>
          <div>
            <p className="font-bold text-slate-800">Year {year}</p>
            <p className="text-[10px] text-slate-400">Semester {sem1} &amp; {sem2}</p>
          </div>
          {isCurrentYear && (
            <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Current</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Year Total</p>
            <p className={`text-sm font-black ${!hasAnyRecord ? 'text-slate-400 italic' : 'text-slate-800'}`}>
              ₹{yearFee.toLocaleString()}
              {!hasAnyRecord && <span className="text-[9px] ml-1 font-normal">est.</span>}
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Balance</p>
            <p className={`text-sm font-black ${yearDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              ₹{yearDue.toLocaleString()}
            </p>
          </div>
          <div className="text-slate-400">
            {open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
          </div>
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/30 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SemesterRow sem={sem1} ledger={ledger1} master={master1} courseMaster={courseMaster} currentSem={currentSem} />
          <SemesterRow sem={sem2} ledger={ledger2} master={master2} courseMaster={courseMaster} currentSem={currentSem} />
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentLedger() {
  const [q, setQ] = useState('')
  const [batchId, setBatchId] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)

  const { data: batches } = useQuery({ 
    queryKey:['batches'], 
    queryFn: () => api.get('/admin/batches').then(r=>r.data?.data) 
  })

  const { data: searchData, isFetching: searching } = useQuery({
    queryKey: ['fee-search-students-ledger', q, batchId],
    queryFn: () => accountsApi.searchStudents(q, batchId).then(r=>r.data)
  })

  const { data: accountData, isLoading: loadingHistory } = useQuery({
    queryKey: ['student-ledger-history', selectedStudent?.id],
    queryFn: () => accountsApi.getStudentFeeAccount(selectedStudent.id).then(r=>r.data),
    enabled: !!selectedStudent
  })

  const { data: allMasters } = useQuery({ 
    queryKey: ['fee-masters'], 
    queryFn: () => accountsApi.getFeeMasters().then(r=>r.data),
    staleTime: 60000 
  })

  return (
    <div className="space-y-6">
      <PageTitle 
        title="Student Ledger" 
        subtitle="Comprehensive semester-wise financial history"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="md:col-span-1 space-y-4">
          <div className="card p-4">
            <label className="label mb-3">Quick Search &amp; Filter</label>
            <div className="space-y-3">
               <div className="flex gap-2">
                  <select 
                    className="input text-xs py-1.5 h-auto bg-gray-50 border-gray-100" 
                    value={batchId} 
                    onChange={e=>setBatchId(e.target.value)}
                  >
                     <option value="">All Batches</option>
                     {batches?.map(b=><option key={b.id} value={b.id}>{b.year}</option>)}
                  </select>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2 text-gray-400" size={16}/>
                    <input 
                      type="text" 
                      placeholder="Roll No / Name..." 
                      className="input pl-9 text-xs py-1.5 h-auto bg-gray-50/50 border-gray-100 focus:bg-white transition-all shadow-sm" 
                      value={q} 
                      onChange={e=>setQ(e.target.value)}
                    />
                  </div>
               </div>
            </div>

            {searching && <p className="text-[10px] text-blue-500 mt-2 animate-pulse">Filtering data...</p>}

            <div className="mt-4 space-y-2 max-h-[600px] overflow-y-auto pr-1 thin-scrollbar">
              {searchData?.data?.map(s => (
                <div 
                  key={s.id} 
                  onClick={()=>setSelectedStudent(s)}
                  className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition ${selectedStudent?.id===s.id?'border-blue-500 bg-blue-50/50 shadow-sm':'border-gray-100'}`}
                >
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-sm text-slate-700">{s.name}</p>
                    {s.currentNetDue !== null ? (
                      s.currentNetDue > 0 ? (
                        <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold border border-red-100">₹{Number(s.currentNetDue).toLocaleString()} DUE</span>
                      ) : (
                        <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold border border-emerald-100">PAID</span>
                      )
                    ) : null}
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono mt-1">{s.rollNo}</p>
                </div>
              ))}
              {batchId && searchData?.data?.length === 0 && !searching && (
                <p className="text-center text-gray-400 py-10 text-xs italic">No students found matching filters.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="md:col-span-2">
          {selectedStudent ? (
            <div className="card overflow-hidden">
              {/* Student header */}
              <div className="bg-gradient-to-r from-gray-50 to-white p-5 border-b flex gap-4 items-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                  <GraduationCap size={24}/>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{selectedStudent.name}</h3>
                  <p className="text-xs text-gray-500">{selectedStudent.rollNo} • Batch {selectedStudent.batch?.year} • Sem {selectedStudent.currentSem}</p>
                </div>
              </div>

              {loadingHistory ? <div className="p-20"><Spinner /></div> : (() => {
                const ledgers     = accountData?.data?.ledgers || []
                const mastersList = allMasters?.data?.data || allMasters?.data || []
                const student     = accountData?.data?.student || selectedStudent
                const currentSem  = student.currentSem || selectedStudent.currentSem || 1

                // Find semester-level masters for this student's batch/branch
                const sBatchId  = student.batchId  || student.batch?.id
                const sBranchId = student.branchId || student.branch?.id

                const semMasters = mastersList.filter(m => {
                  const mBatchId  = m.batchId  || m.batch?.id
                  const mBranchId = m.branchId || m.branch?.id
                  const idMatch   = String(mBatchId) === String(sBatchId) && String(mBranchId) === String(sBranchId)
                  const softMatch = m.batch?.year === student.batch?.year &&
                                    m.branch?.name?.toLowerCase() === student.branch?.name?.toLowerCase()
                  return (idMatch || softMatch) && Number(m.semester) > 0
                })

                // Course-level master (semester 0) for the global benchmark
                const courseMaster = mastersList.find(m => {
                  const mBatchId  = m.batchId  || m.batch?.id
                  const mBranchId = m.branchId || m.branch?.id
                  const idMatch   = String(mBatchId) === String(sBatchId) && String(mBranchId) === String(sBranchId)
                  const softMatch = m.batch?.year === student.batch?.year &&
                                    m.branch?.name?.toLowerCase() === student.branch?.name?.toLowerCase()
                  return (idMatch || softMatch) && Number(m.semester) === 0
                })

                const ledgerTotals = ledgers.reduce((acc, l) => ({
                  paid: acc.paid + (Number(l.totalPaid||0) + Number(l.scholarshipVerified||0))
                }), { paid: 0 })

                let aggAcademic = 0, aggHostel = 0, aggBus = 0, aggMess = 0, aggOther = 0;
                for (let sem = 1; sem <= 8; sem++) {
                  const l = ledgers.find(x => x.semester === sem)
                  const m = semMasters.find(x => x.semester === sem)
                  if (l) {
                    aggAcademic += Number(l.baseFeeDue||0)
                    aggHostel   += Number(l.hostelFeeDue||0)
                    aggBus      += Number(l.busFeeDue||0)
                    aggMess     += Number(l.messFeeDue||0)
                  } else if (m) {
                    aggAcademic += Number(m.tuitionFee||0)
                    aggHostel   += Number(m.hostelFee||0)
                    aggBus      += Number(m.busFee||0)
                    aggMess     += Number(m.messFee||0)
                    aggOther    += Number(m.otherFee||0)
                  } else if (courseMaster) {
                    aggAcademic += Number(courseMaster.tuitionFee||0) / 8
                    aggHostel   += Number(courseMaster.hostelFee||0) / 8
                    aggBus      += Number(courseMaster.busFee||0) / 8
                    aggMess     += Number(courseMaster.messFee||0) / 8
                    aggOther    += Number(courseMaster.otherFee||0) / 8
                  }
                }

                const totals = {
                  academic: aggAcademic,
                  hostel: aggHostel,
                  bus: aggBus,
                  mess: aggMess,
                  other: aggOther,
                  paid: ledgerTotals.paid
                }

                const unpaidFines  = accountData?.data?.fines?.filter(f => !f.isPaid).reduce((s,f) => s + Number(f.amount), 0) || 0
                const grandTotal   = (totals.academic||0)+(totals.hostel||0)+(totals.bus||0)+(totals.mess||0)+(totals.other||0) + unpaidFines
                const grandDue     = Math.max(0, grandTotal - totals.paid)
                const paidPercent  = grandTotal > 0 ? Math.round((totals.paid / grandTotal) * 100) : 0
                const currentYear  = Math.ceil(currentSem / 2)

                return (
                  <div className="p-6 space-y-8">

                    {/* ── GLOBAL PROGRAM BENCHMARK ─────────────────── */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                          <Calendar size={14}/> {courseMaster ? 'Global Program Benchmark' : 'Aggregated Semester History'}
                        </div>
                        {courseMaster && <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-black">GLOBAL CONFIG ACTIVE</span>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 card p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <CreditCard size={120}/>
                          </div>
                          <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                              <p className="text-slate-400 text-[10px] font-bold uppercase">Total Course Value</p>
                              <h4 className="text-4xl font-black mt-1">₹{grandTotal.toLocaleString()}</h4>
                            </div>
                            <div className="mt-8">
                              <div className="flex justify-between items-end mb-2">
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Collection Progress</p>
                                <p className="text-xl font-black text-emerald-400">{paidPercent}%</p>
                              </div>
                              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${paidPercent}%` }}/>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="card p-6 border-2 border-red-100 bg-red-50/30 flex flex-col justify-between">
                          <div>
                            <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">Aggregate Outstanding</p>
                            <h4 className="text-3xl font-black text-red-600 mt-2">₹{grandDue.toLocaleString()}</h4>
                          </div>
                          <div className="mt-4 pt-4 border-t border-red-100/50">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-500">Total Paid</span>
                              <span className="font-bold text-emerald-600">₹{totals.paid.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                        {[
                          { label:'Academic',  val: totals.academic, color:'blue' },
                          { label:'Hostel',    val: totals.hostel,   color:'orange' },
                          { label:'Transport', val: totals.bus,      color:'teal' },
                          { label:'Mess',      val: totals.mess,     color:'purple' },
                          { label:'Fines',     val: unpaidFines,     color:'red' },
                        ].map(cat => (
                          <div key={cat.label} className={`p-3 rounded-xl border border-${cat.color}-100 bg-${cat.color}-50/20`}>
                            <p className={`text-[9px] font-bold text-${cat.color}-500 uppercase tracking-tighter`}>{cat.label}</p>
                            <p className="text-sm font-black text-slate-700 mt-1">₹{cat.val.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── YEAR-WISE SUMMARY TABLE ───────────────────── */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={14}/> Year-wise Fee Roadmap
                      </h4>
                      <YearSummaryTable
                        ledgers={ledgers}
                        semMasters={semMasters}
                        mastersList={mastersList}
                        currentSem={currentSem}
                        unpaidFines={unpaidFines}
                      />
                      <p className="text-[10px] text-slate-400 italic flex items-center gap-1">
                        <Clock size={11}/> Rows marked "est." are projected from the Fee Master structure and may vary.
                      </p>
                    </div>

                    {/* ── EXPANDABLE YEAR CARDS ─────────────────────── */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <History size={14}/> Detailed Year-wise Breakdown
                      </h4>
                      {[1,2,3,4].map(year => (
                        <YearCard
                          key={year}
                          year={year}
                          ledgers={ledgers}
                          semMasters={semMasters}
                          courseMaster={courseMaster}
                          currentSem={currentSem}
                          defaultOpen={year === currentYear}
                        />
                      ))}
                    </div>

                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="h-[500px] flex flex-col items-center justify-center text-slate-300 bg-white/50 rounded-3xl border-2 border-dashed border-slate-100">
              <CreditCard size={64} className="mb-4 opacity-20"/>
              <p className="font-bold text-lg text-slate-400">Select a student from the ledger list</p>
              <p className="text-sm px-10 text-center">Filter by batch and search by name/roll to view complete financial standing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
