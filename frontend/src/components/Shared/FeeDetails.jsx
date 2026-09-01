// src/components/Shared/FeeDetails.jsx
// Reusable fee details component — used in Student, Teacher (mentees), Admin
import { useState } from 'react'
import { AlertCircle, CreditCard, CheckCircle, ChevronDown, ChevronUp, History } from 'lucide-react'

function getSemStatus(sem, currentSem, ledger) {
  if (!ledger) {
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

function SemesterRow({ sem, ledger, currentSem }) {
  const isProjected = !ledger
  const status = getSemStatus(sem, currentSem, ledger)

  const tuition = ledger ? Number(ledger.baseFeeDue||0) : 50000
  const hostel  = ledger ? Number(ledger.hostelFeeDue||0) : 0
  const mess    = ledger ? Number(ledger.messFeeDue||0) : 0
  const bus     = ledger ? Number(ledger.busFeeDue||0) : 0
  
  const paid    = ledger ? Number(ledger.totalPaid||0)+Number(ledger.scholarshipVerified||0) : 0
  const total   = tuition + hostel + mess + bus
  const balance = ledger ? Math.max(0, Number(ledger.netDue||0)) : total

  return (
    <div className={`rounded-xl border overflow-hidden ${isProjected ? 'border-dashed border-slate-200 bg-slate-50/30' : 'border-slate-100 bg-white'}`}>
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
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

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
              Total Recovered
            </span>
            <span className="font-black text-emerald-600 text-sm">₹{paid.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function YearCard({ year, ledgers, currentSem, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const sem1 = year * 2 - 1
  const sem2 = year * 2

  const ledger1 = ledgers.find(l => l.semester === sem1)
  const ledger2 = ledgers.find(l => l.semester === sem2)

  const getFullFee = (ledger) => {
    if (ledger) return Number(ledger.baseFeeDue||0)+Number(ledger.hostelFeeDue||0)+Number(ledger.busFeeDue||0)+Number(ledger.messFeeDue||0)
    return 50000
  }

  const fee1 = getFullFee(ledger1)
  const fee2 = getFullFee(ledger2)

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
            <p className={`text-sm font-black text-slate-800`}>
              ₹{yearFee.toLocaleString()}
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

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/30 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SemesterRow sem={sem1} ledger={ledger1} currentSem={currentSem} />
          <SemesterRow sem={sem2} ledger={ledger2} currentSem={currentSem} />
        </div>
      )}
    </div>
  )
}

const PAYMENT_TYPE_INFO = {
  CASH:        { label: 'Cash',               color: 'bg-green-100  text-green-700',  desc: 'Counter pe physical cash' },
  DD:          { label: 'Demand Draft',        color: 'bg-blue-100   text-blue-700',   desc: 'Bank se DD' },
  DRCC:        { label: 'Debit/Credit Card',   color: 'bg-purple-100 text-purple-700', desc: 'Card swipe at counter' },
  SCHOLARSHIP: { label: 'Scholarship',         color: 'bg-amber-100  text-amber-700',  desc: 'Government / College' },
}

export default function FeeDetails({ fee, showName = false, studentName = '' }) {
  if (!fee) return (
    <div className="text-center py-10">
      <CreditCard size={40} className="mx-auto text-gray-300 mb-3"/>
      <p className="text-gray-500 font-medium">Fee account not set up</p>
      <p className="text-gray-400 text-sm mt-1">Contact accounts department</p>
    </div>
  )

  const outstanding   = Number(fee.outstanding || 0)
  const totalPayable  = Number(fee.totalPayable || 0)
  const totalPaid     = Number(fee.totalPaid || 0)
  const ledgers    = fee.ledgers || []
  const currentSem = fee.student?.currentSem || fee.currentSem || 1
  const currentYear= Math.ceil(currentSem / 2)
  const paidPct       = totalPayable > 0 ? Math.min(Math.round((totalPaid / totalPayable) * 100), 100) : 0

  // Dynamic Semesters Logic
  const getSemestersCount = (courseName) => {
    const c = (courseName || '').toUpperCase();
    if (c.includes('B.TECH')) return 8;
    if (c.includes('DIPLOMA')) return 6;
    if (c.includes('MBA') || c.includes('M.TECH')) return 4;
    return 8; // default
  }

  const totalSems = fee.feeStructure?.courseName
    ? getSemestersCount(fee.feeStructure.courseName)
    : 8;
  const perSemDue = Math.round(totalPayable / totalSems);

  // Group transactions by payment type
  const byType = {}
  for (const t of (fee.transactions || [])) {
    const pMode = t.paymentMode || t.paymentType || 'UNKNOWN'
    byType[pMode] = (byType[pMode] || 0) + Number(t.amount)
  }

  const unpaidFines = (fee.fines || []).filter(f => !f.isPaid)
  const paidFines   = (fee.fines || []).filter(f => f.isPaid)

  return (
    <div className="space-y-5">

      {showName && studentName && (
        <div className="flex items-center gap-3 pb-3 border-b">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
            {studentName[0]}
          </div>
          <p className="font-semibold text-gray-800">{studentName}</p>
        </div>
      )}

      {/* ── Main balance card ── */}
      <div className={`rounded-xl p-5 border-2 ${outstanding > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
        <div className="grid grid-cols-3 gap-4 text-center mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Payable</p>
            <p className="text-2xl font-bold text-gray-800">₹{totalPayable.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Outstanding</p>
            <p className={`text-2xl font-bold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{outstanding.toLocaleString()}
            </p>
          </div>
        </div>

        {perSemDue > 0 && (
          <div className="bg-white/50 rounded-lg p-2 mb-3 flex justify-between items-center text-sm border border-white/60">
            <span className="text-gray-600 font-medium">Recommended Dues (per Semester)</span>
            <span className="font-bold text-blue-700">₹{perSemDue.toLocaleString()}</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full bg-white/60 rounded-full h-2.5 mb-1">
          <div className={`h-2.5 rounded-full transition-all ${paidPct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${paidPct}%` }}/>
        </div>
        <p className="text-xs text-center text-gray-500">{paidPct}% paid</p>

        {outstanding === 0 && (
          <p className="text-center text-green-600 mt-2 text-sm font-medium flex items-center justify-center gap-1">
            <CheckCircle size={14}/> Fee fully paid
          </p>
        )}
      </div>

      {/* ── Fee Structure Breakdown ── */}
      {fee.feeStructure && (
        <div className="card p-4">
          <h4 className="font-semibold text-gray-700 mb-3 text-sm">Fee Structure</h4>
          <div className="space-y-2 text-sm">
            <FeeRow label="Tuition Fee"     value={Number(fee.feeStructure.totalFee)} />
            {fee.isHostel && <FeeRow label="Hostel Fee" value={Number(fee.feeStructure.hostelFee)} />}
            {fee.usesBus  && <FeeRow label="Bus Fee"    value={Number(fee.feeStructure.busFee)}    />}
            {fee.usesMess && <FeeRow label="Mess Fee"   value={Number(fee.feeStructure.messFee)}   />}
            {Number(fee.scholarshipAmt) > 0 && (
              <FeeRow label="Scholarship / Discount" value={-Number(fee.scholarshipAmt)} negative />
            )}
            <div className="flex justify-between items-center pt-2 border-t font-semibold">
              <span>Total Payable</span>
              <span>₹{totalPayable.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment by Type Summary ── */}
      {Object.keys(byType).length > 0 && (
        <div className="card p-4">
          <h4 className="font-semibold text-gray-700 mb-3 text-sm">Payment Mode Summary</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(byType).map(([type, amt]) => {
              const info = PAYMENT_TYPE_INFO[type] || { label: type, color: 'bg-gray-100 text-gray-700', desc: '' }
              return (
                <div key={type} className={`rounded-lg p-3 ${info.color}`}>
                  <p className="text-xs font-medium opacity-70">{info.label}</p>
                  <p className="font-bold text-lg">₹{Number(amt).toLocaleString()}</p>
                  <p className="text-xs opacity-60">{info.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── All Payment Types Info ── */}
      <div className="card p-4">
        <h4 className="font-semibold text-gray-700 mb-3 text-sm">Accepted Payment Modes</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PAYMENT_TYPE_INFO).map(([type, info]) => (
            <div key={type} className={`rounded-lg px-3 py-2 flex items-center gap-2 ${info.color}`}>
              <div className="w-2 h-2 rounded-full bg-current opacity-60"/>
              <div>
                <p className="text-xs font-semibold">{info.label}</p>
                <p className="text-xs opacity-60">{info.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Semester-wise Summary Table ── */}
      <div className="card overflow-hidden">
        <h4 className="font-semibold px-5 py-3 border-b text-gray-800 text-sm bg-slate-50">
          📊 Semester-wise Payment Breakdown
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-100/80 text-slate-700 text-xs font-bold">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3">Semester</th>
                <th className="px-4 py-3">Total Fee</th>
                <th className="px-4 py-3 text-green-700">Paid</th>
                <th className="px-4 py-3 text-red-600">Pending</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: 8 }, (_, i) => {
                const sem = i + 1;
                const ledger = ledgers.find(l => l.semester === sem);
                const status = getSemStatus(sem, currentSem, ledger);

                const tuition = ledger ? Number(ledger.baseFeeDue||0) : 50000;
                const hostel  = ledger ? Number(ledger.hostelFeeDue||0) : 0;
                const mess    = ledger ? Number(ledger.messFeeDue||0) : 0;
                const bus     = ledger ? Number(ledger.busFeeDue||0) : 0;
                
                const paid    = ledger ? Number(ledger.totalPaid||0)+Number(ledger.scholarshipVerified||0) : 0;
                const total   = tuition + hostel + mess + bus;
                const pending = ledger ? Math.max(0, Number(ledger.netDue||0)) : total;

                return (
                  <tr key={sem} className="hover:bg-slate-50/50 font-medium">
                    <td className="px-4 py-3 font-bold text-slate-800">Sem {sem}</td>
                    <td className="px-4 py-3">₹{total.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-green-600">₹{paid.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-red-600">₹{pending.toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Payment History ── */}
      {fee.transactions?.length > 0 && (
        <div className="card overflow-hidden">
          <h4 className="font-semibold px-5 py-3 border-b text-gray-800 text-sm">
            Payment History ({fee.transactions.length} transactions)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Receipt No','Semester','Amount','Mode','Date','Remarks'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {fee.transactions.map(t => {
                  const pMode = t.paymentMode || t.paymentType || 'UNKNOWN'
                  const info = PAYMENT_TYPE_INFO[pMode] || { label: pMode, color: 'bg-gray-100 text-gray-700' }
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-blue-600 text-xs">{t.receiptNo}</td>
                      <td className="px-4 py-2.5 text-gray-500">Sem {t.semester}</td>
                      <td className="px-4 py-2.5 font-bold text-green-600">₹{Number(t.amount).toLocaleString()}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>
                          {info.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">
                        {new Date(t.paymentDate || t.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{t.remarks || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EXPANDABLE YEAR CARDS ─────────────────────── */}
      {ledgers?.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1 mt-6">
            <History size={14}/> Detailed Year-wise Breakdown
          </h4>
          {[1,2,3,4].map(year => (
            <YearCard
              key={year}
              year={year}
              ledgers={ledgers}
              currentSem={currentSem}
              defaultOpen={year === currentYear}
            />
          ))}
        </div>
      )}


      {/* ── Fines ── */}
      {fee.fines?.length > 0 && (
        <div className="card overflow-hidden">
          <h4 className="font-semibold px-5 py-3 border-b text-gray-800 text-sm flex items-center gap-2">
            <AlertCircle size={15} className="text-red-500"/>
            Fines ({fee.fines.length})
            {unpaidFines.length > 0 && (
              <span className="badge-red ml-auto">
                {unpaidFines.length} unpaid — ₹{unpaidFines.reduce((s,f)=>s+Number(f.amount),0).toLocaleString()}
              </span>
            )}
          </h4>
          <div className="divide-y">
            {fee.fines.map(f => (
              <div key={f.id} className="flex justify-between items-center px-5 py-3">
                <div>
                  <p className="font-medium text-sm text-gray-800">{f.reason}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(f.fineDate).toLocaleDateString('en-IN')}
                    {f.waiverReason && <span className="ml-2 text-green-600">· Waived: {f.waiverReason}</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">₹{Number(f.amount).toLocaleString()}</p>
                  <span className={f.isPaid ? 'badge-green' : 'badge-red'}>
                    {f.isPaid ? (f.waivedBy ? 'Waived' : 'Paid') : 'Unpaid'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FeeRow({ label, value, negative }) {
  return (
    <div className="flex justify-between items-center text-gray-600">
      <span>{label}</span>
      <span className={negative ? 'text-green-600 font-medium' : ''}>
        {negative ? '-' : ''}₹{Math.abs(value).toLocaleString()}
      </span>
    </div>
  )
}
