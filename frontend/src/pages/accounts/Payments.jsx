import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageTitle, Spinner } from '../../components/Shared'
import toast from 'react-hot-toast'
import { 
  IndianRupee, Search, Trash2, Download, Shield, 
  CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp,
  GraduationCap, Zap, CreditCard, Receipt, User
} from 'lucide-react'
import { accountsApi } from '../../api/all.api'
import api from '../../api/axios.js'

// ── helpers ─────────────────────────────────────────────────────────────────
const generateReceipt = () =>
  `RC-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 90000))}`

const PAYMENT_MODES = [
  { value: 'CASH',          label: 'Cash' },
  { value: 'UPI',           label: 'UPI / Online Payment' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS)' },
  { value: 'DRCC',          label: 'Debit / Credit Card' },
  { value: 'DD',            label: 'Cheque / DD' },
  { value: 'SCHOLARSHIP',   label: 'Scholarship Adjustment' },
]

function SemStatusBadge({ status }) {
  const cfg = {
    paid:      { icon: <CheckCircle2 size={11}/>, label: 'Paid',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    due:       { icon: <AlertCircle size={11}/>,  label: 'Due',       cls: 'bg-red-50 text-red-700 border-red-200' },
    overdue:   { icon: <AlertCircle size={11}/>,  label: 'Overdue',   cls: 'bg-red-100 text-red-800 border-red-300' },
    projected: { icon: <Clock size={11}/>,        label: 'Projected', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  }
  const { icon, label, cls } = cfg[status] || cfg.projected
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${cls}`}>
      {icon} {label}
    </span>
  )
}

// ── Semester flat dues table ─────────────────────────────────────────────────
function SemesterDuesTable({ ledgers, semMasters, currentSem, onQuickPay, unpaidFines = 0 }) {
  const [showFuture, setShowFuture] = useState(false)

  // Build a flat list of 8 semesters
  const rows = Array.from({ length: 8 }, (_, i) => {
    const sem    = i + 1
    const ledger = ledgers.find(l => l.semester === sem)
    const master = semMasters.find(m => m.semester === sem)
    const globalMaster = semMasters.find(m => m.semester === 0)
    const isProjected = !ledger

    let due = 0
    if (ledger) {
      due = Math.max(0, Number(ledger.netDue || 0))
    } else if (master) {
      due = Number(master.tuitionFee||0) + Number(master.hostelFee||0) + 
            Number(master.busFee||0) + Number(master.messFee||0)
    } else if (globalMaster) {
      // Fallback: (Global Total / 8)
      due = Number(globalMaster.totalFee || 0) / 8
    }

    let status = 'projected'
    if (ledger) {
      if (Number(ledger.netDue) <= 0)     status = 'paid'
      else if (sem < currentSem)           status = 'overdue'
      else                                 status = 'due'
    }

    return { sem, ledger, due, status, isProjected }
  })

  // Default: only actionable rows (due/overdue). Projected + paid hidden.
  const dueRows       = rows.filter(r => r.status === 'due' || r.status === 'overdue')
  const paidRows      = rows.filter(r => r.status === 'paid')
  const projectedRows = rows.filter(r => r.status === 'projected')
  const hiddenCount   = projectedRows.length + paidRows.length
  const visible       = showFuture ? rows : dueRows

  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden text-xs">
      {visible.length === 0 && !showFuture && (
        <div className="text-center py-6 text-emerald-600 font-semibold text-xs">
          ✅ No pending dues — all semesters are clear!
        </div>
      )}
      {visible.length > 0 && (
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] tracking-wider">
              <th className="text-left px-3 py-2 font-bold">Semester</th>
              <th className="text-right px-3 py-2 font-bold">Due</th>
              <th className="text-center px-3 py-2 font-bold">Status</th>
              <th className="text-right px-3 py-2 font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ sem, ledger, due, status, isProjected }) => (
              <tr key={sem} className={`border-t border-slate-50 hover:bg-slate-50/60 transition-colors
                ${sem === currentSem ? 'bg-blue-50/40' : ''}`}>
                <td className="px-3 py-2.5 font-semibold text-slate-700">
                  Sem {sem}
                  {sem === currentSem && (
                    <span className="ml-1.5 text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">Current</span>
                  )}
                </td>
                <td className={`px-3 py-2.5 text-right font-bold
                  ${status === 'paid' ? 'text-emerald-600' : due > 0 ? 'text-red-600' : 'text-slate-400'}
                  ${isProjected ? 'italic text-slate-400' : ''}`}>
                  ₹{due.toLocaleString()}
                  {isProjected && <span className="ml-0.5 text-[9px] font-normal">est.</span>}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <SemStatusBadge status={status} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  {(status === 'due' || status === 'overdue') && ledger ? (
                    <button
                      onClick={() => onQuickPay({ id: ledger.id, semester: sem, netDue: ledger.netDue })}
                      className="inline-flex items-center gap-1 text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg font-bold transition shadow-sm"
                    >
                      <Zap size={10}/> Quick Pay
                    </button>
                  ) : (
                    <span className="text-slate-300 text-[10px]">—</span>
                  )}
                </td>
              </tr>
            ))}
            {unpaidFines > 0 && (
              <tr className="border-t-2 border-red-100 bg-red-50/30 hover:bg-red-50/50 transition-colors">
                <td className="px-3 py-3 font-bold text-red-700">Fines &amp; Penalties</td>
                <td className="px-3 py-3 text-right font-black text-red-600">₹{unpaidFines.toLocaleString()}</td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">
                    <AlertCircle size={11}/> Due
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <a href="/accounts/fines" className="inline-flex items-center gap-1 text-[10px] bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg font-bold transition shadow-sm">
                    Pay Fine
                  </a>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Show / Hide future semesters toggle */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowFuture(s => !s)}
          className="w-full flex items-center justify-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 py-2 border-t border-slate-100 bg-slate-50/50 transition font-medium"
        >
          {showFuture
            ? <><ChevronUp size={12}/> Hide paid &amp; projected</>  
            : <><ChevronDown size={12}/> Show all semesters ({hiddenCount} more)</>}
        </button>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AccountsPayments() {
  const [search, setSearch]               = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [deleteConfirm, setDeleteConfirm]  = useState(null)
  const [lastReceiptId, setLastReceiptId]  = useState(null)
  const formRef = useRef(null)

  const [form, setForm] = useState({
    ledgerId: '', amount: '', paymentMode: 'CASH',
    referenceNo: '', receiptNo: generateReceipt(),
    paymentDate: new Date().toISOString().split('T')[0], remarks: ''
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const qc = useQueryClient()

  // Batches for search filter (not strictly needed here but kept for future)
  const searchQ = useQuery({
    queryKey: ['payment-student-search', search],
    queryFn: () => accountsApi.searchStudents(search).then(r => r.data),
    enabled: search.length > 2
  })

  const feeQ = useQuery({
    queryKey: ['student-fee-account', selectedStudent?.id],
    queryFn: () => accountsApi.getStudentFeeAccount(selectedStudent.id).then(r => r.data),
    enabled: !!selectedStudent?.id
  })

  // All fee masters for projected amounts
  const { data: allMasters } = useQuery({
    queryKey: ['fee-masters'],
    queryFn: () => api.get('/accounts/fee-masters').then(r => r.data),
    staleTime: 60000
  })

  const recordMut = useMutation({
    mutationFn: () => accountsApi.recordPayment({ ...form, studentId: selectedStudent?.id, amount: parseFloat(form.amount) }),
    onSuccess: res => {
      const savedReceiptId = res?.data?.data?.id || res?.data?.id || null
      setLastReceiptId(savedReceiptId)
      toast.success(`Payment recorded! Receipt: ${form.receiptNo}`, { duration: 5000 })
      setForm(p => ({ ...p, amount: '', receiptNo: generateReceipt(), remarks: '', referenceNo: '', ledgerId: '' }))
      qc.invalidateQueries(['student-fee-account', selectedStudent?.id])
      qc.invalidateQueries(['accounts-dashboard'])
    },
    onError: e => toast.error(e.response?.data?.error?.code || 'Payment failed')
  })

  const deleteMut = useMutation({
    mutationFn: id => accountsApi.deletePayment(id),
    onSuccess: () => {
      toast.success('Payment cancelled')
      qc.invalidateQueries(['student-fee-account', selectedStudent?.id])
      setDeleteConfirm(null)
    },
    onError: e => toast.error(e.response?.data?.message || 'Cannot cancel')
  })

  function selectStudent(student) {
    setSelectedStudent(student)
    setSearch(student.rollNo + ' — ' + student.name)
    setForm(p => ({ ...p, ledgerId: '', amount: '', receiptNo: generateReceipt() }))
  }

  function handleQuickPay(semesterData) {
    const studentLabel = selectedStudent
      ? `${selectedStudent.name} (${selectedStudent.rollNo})`
      : ''
    setForm(prev => ({
      ...prev,
      ledgerId: semesterData.id,
      amount: Math.max(0, Number(semesterData.netDue || 0)),
      remarks: `Sem ${semesterData.semester} Fee — ${studentLabel}`.trim()
    }))
    setLastReceiptId(null)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    toast.success(`Form pre-filled for Semester ${semesterData.semester}`, { duration: 2000 })
  }

  function handlePayFullDue() {
    const feeData = feeQ.data?.data
    if (!feeData) return
    const currentLedger = feeData.ledgers?.find(l => l.semester === (selectedStudent?.currentSem))
    if (currentLedger && Number(currentLedger.netDue) > 0) {
      handleQuickPay({ id: currentLedger.id, semester: currentLedger.semester, netDue: currentLedger.netDue })
    } else {
      toast.error('No outstanding due for current semester.')
    }
  }

  const feeData    = feeQ.data?.data
  const ledgers    = feeData?.ledgers || []
  const currentSem = selectedStudent?.currentSem || 1
  const outstanding = feeData ? Number(feeData.outstanding) : 0
  const totalPaid   = feeData ? Number(feeData.totalPaid)   : 0
  const totalScholarship = feeData?.totalScholarship !== undefined ? Number(feeData.totalScholarship) : (feeData?.ledgers?.reduce((s, l) => s + Number(l.scholarshipVerified || 0), 0) || 0)
  const totalPayable= feeData ? Number(feeData.totalPayable): 0
  const unpaidFines = feeData?.fines?.filter(f => !f.isPaid).reduce((s,f) => s + Number(f.amount), 0) || 0
  const currentLedger = ledgers.find(l => l.semester === currentSem)
  const currentDue    = currentLedger ? Math.max(0, Number(currentLedger.netDue)) : 0

  // Semester masters for projected rows
  const mastersList = allMasters?.data?.data || allMasters?.data || []
  const student     = feeData?.student || selectedStudent
  const sBatchId    = student?.batchId  || student?.batch?.id
  const sBranchId   = student?.branchId || student?.branch?.id

  const semMasters = mastersList.filter(m => {
    const mBatchId  = m.batchId  || m.batch?.id
    const mBranchId = m.branchId || m.branch?.id
    const idMatch   = String(mBatchId) === String(sBatchId) && String(mBranchId) === String(sBranchId)
    const softMatch = m.batch?.year === student?.batch?.year &&
                      m.branch?.name?.toLowerCase() === student?.branch?.name?.toLowerCase()
    return (idMatch || softMatch) && Number(m.semester) >= 0
  })

  // Descriptive ledger dropdown labels
  function getLedgerLabel(l) {
    const due = Number(l.netDue)
    const current = l.semester === currentSem ? ' (Current)' : ''
    if (due <= 0) return `Semester ${l.semester} — ✅ Fully Paid`
    return `Semester ${l.semester}${current} — ₹${due.toLocaleString()} Due`
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Fee Payments" subtitle="Record and manage student fee transactions" />

      <div className="grid grid-cols-1 lg:grid-cols-[62%_38%] gap-5 items-start">

        {/* ━━━ LEFT COLUMN: Student Overview & Dues ━━━ */}
        <div className="space-y-4">

          {/* Search */}
          <div className="card p-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedStudent(null) }}
                placeholder="Search by Roll No or Name..."
                className="input pl-9"
              />
            </div>

            {searchQ.data?.data?.length > 0 && !selectedStudent && (
              <div className="border rounded-xl divide-y mt-2 max-h-52 overflow-y-auto shadow-sm">
                {searchQ.data.data.map(s => (
                  <button key={s.id} onClick={() => selectStudent(s)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left transition">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">
                        {s.name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-700">{s.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{s.rollNo} · Sem {s.currentSem}</p>
                      </div>
                    </div>
                    {s.currentNetDue > 0
                      ? <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full font-bold">₹{Number(s.currentNetDue).toLocaleString()} Due</span>
                      : <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">Clear</span>
                    }
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedStudent && (
            <>
              {/* Student Profile Card */}
              <div className="card p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 font-black text-xl flex items-center justify-center shadow-sm">
                    {selectedStudent.name?.[0]}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{selectedStudent.name}</h3>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedStudent.rollNo}</p>
                    <p className="text-xs text-gray-500">Batch {selectedStudent.batch?.year} &nbsp;·&nbsp; Sem {currentSem}</p>
                  </div>
                </div>
              </div>

              {/* Quick Summary 2x2 Grid */}
              {feeQ.isLoading ? <div className="py-10"><Spinner /></div> : feeData ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="card p-4">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-1">Total Payable</p>
                      <p className="text-xl font-black text-slate-700">₹{totalPayable.toLocaleString()}</p>
                      {totalScholarship > 0 && (
                        <p className="text-[10px] text-emerald-500 font-bold mt-1">
                          Includes ₹{totalScholarship.toLocaleString()} Scholarship Credit
                        </p>
                      )}
                    </div>
                    <div className="card p-4">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-1">Total Paid</p>
                      <p className="text-xl font-black text-emerald-600">₹{(totalPaid - totalScholarship).toLocaleString()}</p>
                    </div>
                    <div className={`card p-4 col-span-1 border-2 ${outstanding > 0 ? 'border-red-200 bg-red-50/30' : 'border-emerald-200 bg-emerald-50/20'}`}>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-1">Net Due (Overall)</p>
                      <p className={`text-3xl font-black ${outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        ₹{outstanding.toLocaleString()}
                      </p>
                      {unpaidFines > 0 && (
                        <p className="text-[10px] text-red-500 font-bold mt-1 leading-tight">
                          Includes ₹{unpaidFines.toLocaleString()} in Fines
                        </p>
                      )}
                    </div>
                    <div className="card p-4">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-1">Current Sem Due</p>
                      <p className={`text-xl font-black ${currentDue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        ₹{currentDue.toLocaleString()}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1">Semester {currentSem}</p>
                    </div>
                  </div>

                  {/* Flat Semester Dues Table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <CreditCard size={13}/> Semester-wise Dues
                    </h4>
                    <SemesterDuesTable
                      ledgers={ledgers}
                      semMasters={semMasters}
                      currentSem={currentSem}
                      onQuickPay={handleQuickPay}
                      unpaidFines={unpaidFines}
                    />
                  </div>

                  {/* Recent Transactions */}
                  {feeData.transactions?.length > 0 && (
                    <div className="card p-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Receipt size={13}/> Recent Transactions
                      </h4>
                      <div className="divide-y divide-slate-50">
                        {feeData.transactions.slice(0, 5).map(t => (
                          <div key={t.id} className="flex justify-between items-center py-2.5 px-1 hover:bg-slate-50/50 rounded transition">
                            <div>
                              <p className="font-mono font-semibold text-xs text-slate-700">{t.receiptNo}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {new Date(t.paymentDate).toLocaleDateString('en-IN')} · {t.paymentMode}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-600 font-bold text-sm">+₹{Number(t.amount).toLocaleString()}</span>
                              <a
                                href={`http://localhost:3000/api/v1/accounts/payments/${t.id}/receipt`}
                                target="_blank" rel="noreferrer"
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Download Receipt">
                                <Download size={13}/>
                              </a>
                              <button
                                onClick={() => setDeleteConfirm({ id: t.id, receipt: t.receiptNo, amount: t.amount })}
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition">
                                <Trash2 size={13}/>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="card p-5">
                  <p className="text-amber-600 text-sm p-3 bg-amber-50 rounded-xl border border-amber-200">
                    ⚠ Fee profile not set up for this student. Please go to <strong>Fee Setup</strong> first.
                  </p>
                </div>
              )}
            </>
          )}

          {!selectedStudent && (
            <div className="h-72 flex flex-col items-center justify-center text-slate-300 bg-white/50 rounded-3xl border-2 border-dashed border-slate-100">
              <User size={48} className="mb-3 opacity-20"/>
              <p className="font-bold text-slate-400">Search for a student above</p>
              <p className="text-xs text-center mt-1 px-8">Enter roll number or name to view fee summary and dues</p>
            </div>
          )}
        </div>

        {/* ━━━ RIGHT COLUMN: Smart Payment Form ━━━ */}
        <div ref={formRef} className="card p-5 sticky top-4">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
              <Shield size={18}/>
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Record New Payment</h3>
              <p className="text-[10px] text-slate-400">All fields required unless marked optional</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Target Semester */}
            <div>
              <label className="label text-xs mb-1 block">Target Semester Ledger</label>
              <select
                value={form.ledgerId}
                onChange={e => {
                  set('ledgerId', e.target.value)
                  if (e.target.value === 'ALL') {
                    set('amount', outstanding > 0 ? outstanding : '')
                  } else {
                    const picked = ledgers.find(l => l.id === e.target.value)
                    if (picked && Number(picked.netDue) > 0) set('amount', Math.max(0, Number(picked.netDue)))
                  }
                }}
                className="input text-sm border-slate-200"
              >
                <option value="">— Select Semester to Pay —</option>
                <option value="ALL" className="font-bold text-blue-700 bg-blue-50">⚡ Pay All Semesters / Advance (Smart Allocation)</option>
                {ledgers?.filter(l => Number(l.netDue) > 0).map(l => (
                  <option key={l.id} value={l.id}>{getLedgerLabel(l)}</option>
                ))}
                {ledgers?.filter(l => Number(l.netDue) <= 0).map(l => (
                  <option key={l.id} value={l.id} disabled>{getLedgerLabel(l)}</option>
                ))}
              </select>
            </div>

            {/* Amount + Mode */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs mb-1 block">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="1"
                    value={form.amount}
                    onChange={e => set('amount', e.target.value)}
                    className="input pl-7 font-bold text-slate-800"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="label text-xs mb-1 block">Payment Mode</label>
                <select value={form.paymentMode} onChange={e => set('paymentMode', e.target.value)} className="input text-sm border-slate-200">
                  {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>

            {/* Reference + Receipt */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs mb-1 block">Reference No. <span className="text-slate-400">(optional)</span></label>
                <input
                  value={form.referenceNo}
                  onChange={e => set('referenceNo', e.target.value)}
                  className="input text-sm"
                  placeholder="UTR / Cheque No."
                />
              </div>
              <div>
                <label className="label text-xs mb-1 block">Receipt No.</label>
                <input
                  value={form.receiptNo}
                  readOnly
                  className="input text-xs font-mono bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Date + Remarks */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs mb-1 block">Payment Date</label>
                <input
                  type="date"
                  value={form.paymentDate}
                  onChange={e => set('paymentDate', e.target.value)}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="label text-xs mb-1 block">Remarks <span className="text-slate-400">(optional)</span></label>
                <input
                  value={form.remarks}
                  onChange={e => set('remarks', e.target.value)}
                  className="input text-sm"
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={() => { setLastReceiptId(null); recordMut.mutate() }}
              disabled={recordMut.isPending || !form.amount || !form.ledgerId || Number(form.amount) <= 0}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md mt-2"
            >
              <Shield size={17}/>
              {recordMut.isPending ? 'Recording...' : 'Record Payment Securely'}
            </button>

            {/* Success state — show after payment recorded */}
            {recordMut.isSuccess && lastReceiptId && (
              <a
                href={`http://localhost:3000/api/v1/accounts/payments/${lastReceiptId}/receipt`}
                target="_blank" rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 border-2 border-emerald-400 text-emerald-700 bg-emerald-50 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-100 transition mt-1"
              >
                <Download size={15}/> View / Print Receipt
              </a>
            )}

            {/* Hint when no ledger selected */}
            {!form.ledgerId && !recordMut.isSuccess && (
              <p className="text-center text-[10px] text-slate-400 italic mt-1">
                Select a student and click Quick Pay or choose a semester above
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 mb-2">Cancel Payment?</h3>
            <p className="text-sm text-slate-500 mb-5">
              Are you sure you want to cancel receipt <strong>{deleteConfirm.receipt}</strong> for <strong>₹{Number(deleteConfirm.amount).toLocaleString()}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition">
                Keep It
              </button>
              <button
                onClick={() => deleteMut.mutate(deleteConfirm.id)}
                disabled={deleteMut.isPending}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition">
                {deleteMut.isPending ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
