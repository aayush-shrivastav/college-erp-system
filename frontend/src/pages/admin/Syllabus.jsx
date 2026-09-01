// src/pages/admin/Syllabus.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/admin.api'
import { PageTitle, Modal, FormField, Spinner, EmptyState, ConfirmDialog } from '../../components/Shared'
import toast from 'react-hot-toast'
import { Plus, Upload, BookOpen, ChevronDown, ChevronUp, Trash2, Download, CheckCircle2 } from 'lucide-react'
import api from '../../api/axios'

export default function AdminSyllabus() {
  const [activeTab,    setActiveTab]    = useState('subjects')
  const [showVerModal, setShowVerModal] = useState(false)
  const [showSubModal, setShowSubModal] = useState(false)
  const [selVersion,   setSelVersion]   = useState(null)
  const [selSem,       setSelSem]       = useState('all')
  const [bulkRows,     setBulkRows]     = useState([])
  const [showBulk,     setShowBulk]     = useState(false)
  const qc = useQueryClient()

  const { data: vData } = useQuery({
    queryKey: ['syllabus-versions'],
    queryFn:  () => adminApi.getSyllabusVersions().then(r => r.data)
  })
  const { data: sData, isLoading: sLoad } = useQuery({
    queryKey: ['subjects'],
    queryFn:  () => adminApi.getSubjects().then(r => r.data)
  })

  const createVer = useMutation({
    mutationFn: adminApi.createSyllabusVersion,
    onSuccess: () => { toast.success('Syllabus version created'); qc.invalidateQueries(['syllabus-versions']); setShowVerModal(false) }
  })
  const createSub = useMutation({
    mutationFn: adminApi.createSubject,
    onSuccess: () => { toast.success('Subject created'); qc.invalidateQueries(['subjects']); setShowSubModal(false) }
  })
  const deleteSub = useMutation({
    mutationFn: adminApi.deleteSubject,
    onSuccess: () => { toast.success('Subject deleted'); qc.invalidateQueries(['subjects']) },
    onError: (e) => toast.error(e.response?.data?.message || 'Cannot delete — students are enrolled in this subject')
  })
  const bulkCreate = useMutation({
    mutationFn: async (rows) => {
      let ok = 0; const fail = []
      for (const r of rows) {
        try { await adminApi.createSubject(r); ok++ }
        catch (e) {
          const errs = e.response?.data?.errors ? JSON.stringify(e.response.data.errors) : '';
          fail.push({ code: r.code, reason: e.response?.data?.message || e.response?.data?.error?.code || errs || 'Error' })
        }
      }
      return { ok, fail }
    },
    onSuccess: ({ ok, fail }) => {
      if (fail.length > 0) {
        toast.error(`${fail.length} failed. Reasons: \n` + fail.map(f => `${f.code}: ${f.reason}`).join('\n').substring(0, 150) + '...', { duration: 8000 })
      }
      if (ok > 0) {
        toast.success(`${ok} subjects uploaded successfully!`)
      }
      qc.invalidateQueries(['subjects'])
      setBulkRows([]); setShowBulk(false)
    }
  })

  // Parse Excel — automatically groups by semester column
  async function handleExcel(file) {
    if (!file) return
    try {
      const XLSX  = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs')
      const buf   = await file.arrayBuffer()
      const wb    = XLSX.read(buf)
      const rows  = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
      const mapped = rows
        .map(r => ({
          name:              String(r['Subject Name'] || r.name || '').trim(),
          code:              String(r['Subject Code'] || r.code || '').trim().toUpperCase(),
          subjectType:       String(r['Type']  || r.subject_type || 'THEORY').trim().toUpperCase(),
          semester:          parseInt(r['Semester'] || r.semester || 1),
          credits:           parseInt(r['Credits']  || r.credits  || 3),
          syllabusVersionId: selVersion || '',
        }))
        .filter(r => r.name && r.code)
      if (mapped.length === 0) { toast.error('No valid rows found. Check the Excel format.'); return }
      setBulkRows(mapped); setShowBulk(true)
    } catch (e) { toast.error('Could not read Excel file. Use .xlsx format.') }
  }

  // Download sample Excel template
  async function downloadTemplate() {
    const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs')
    const data = [
      ['Subject Name', 'Subject Code', 'Type', 'Semester', 'Credits'],
      ['Mathematics I',         'MA101', 'THEORY',  1, 4],
      ['Physics',               'PH101', 'THEORY',  1, 3],
      ['Physics Lab',           'PH1L1', 'LAB',     1, 2],
      ['Programming in C',      'CS101', 'THEORY',  1, 4],
      ['Data Structures',       'CS201', 'THEORY',  2, 4],
      ['DS Lab',                'CS2L1', 'LAB',     2, 2],
      ['Operating Systems',     'CS301', 'THEORY',  3, 3],
      ['Database Management',   'CS302', 'THEORY',  3, 4],
      ['OS Lab',                'CS3L1', 'LAB',     3, 2],
      ['Elective: AI Basics',   'CS3E1', 'ELECTIVE',3, 3],
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch:28 }, { wch:16 }, { wch:12 }, { wch:12 }, { wch:10 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Subjects')
    XLSX.writeFile(wb, 'subject_upload_template.xlsx')
    toast.success('Template downloaded!')
  }

  const allSubjects = sData?.data || []
  const filtered    = allSubjects.filter(s => {
    const vm = selVersion ? s.syllabusVersionId === selVersion : true
    const sm = selSem === 'all' ? true : s.semester === parseInt(selSem)
    return vm && sm
  })
  const bySem   = {}
  for (const s of filtered) { if (!bySem[s.semester]) bySem[s.semester] = []; bySem[s.semester].push(s) }
  const semesters = Object.keys(bySem).map(Number).sort((a, b) => a - b)

  return (
    <div>
      <PageTitle title="Syllabus & Subjects">
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadTemplate}
            className="btn-outline flex items-center gap-2 text-sm">
            <Download size={14}/> Download Template
          </button>
          <label className="btn-outline flex items-center gap-2 cursor-pointer text-sm">
            <Upload size={14}/> Upload Excel
            <input type="file" accept=".xlsx,.xls" className="hidden"
              onChange={e => { if (e.target.files[0]) handleExcel(e.target.files[0]); e.target.value = '' }}/>
          </label>
          <button onClick={() => setShowSubModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={14}/> Add Subject
          </button>
        </div>
      </PageTitle>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {[['subjects','Subjects'],['batches','Batch Assignment']].map(([k, l]) => (
          <button key={k} onClick={() => setActiveTab(k)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              activeTab === k ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{l}</button>
        ))}
      </div>

      {/* ── SUBJECTS TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'subjects' && (
        <div>
          {/* Filters */}
          <div className="card p-4 mb-5 space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Syllabus Version</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSelVersion(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    !selVersion ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                  }`}>All Versions</button>
                {(vData?.data || []).map(v => (
                  <button key={v.id} onClick={() => setSelVersion(v.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      selVersion === v.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                    }`}>{v.versionName} {v.isActive ? '✓' : ''}</button>
                ))}
                <button onClick={() => setShowVerModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-600 transition">
                  + New Version
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Semester</p>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setSelSem('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    selSem === 'all' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-gray-600 border-gray-200 hover:border-slate-400'
                  }`}>All</button>
                {[1,2,3,4,5,6,7,8].map(n => (
                  <button key={n} onClick={() => setSelSem(String(n))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      selSem === String(n) ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-gray-600 border-gray-200 hover:border-slate-400'
                    }`}>Sem {n}</button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-3">
            {filtered.length} subject{filtered.length !== 1 ? 's' : ''}
            {selVersion && ` — ${(vData?.data || []).find(v => v.id === selVersion)?.versionName} scheme`}
            {selSem !== 'all' && ` — Semester ${selSem}`}
          </p>

          {sLoad ? <Spinner /> : semesters.length === 0 ? (
            <EmptyState icon={BookOpen}
              text="No subjects found"
              subtext="Add subjects manually or upload an Excel file" />
          ) : (
            <div className="space-y-4">
              {semesters.map(sem => (
                <SemCard key={sem} sem={sem} subjects={bySem[sem]}
                  onDelete={id => deleteSub.mutate(id)}
                  deleteLoading={deleteSub.isPending} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BATCH TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'batches' && <BatchTab versions={vData?.data || []} />}

      {/* ── MODALS ──────────────────────────────────────────────────────── */}
      {showVerModal && (
        <VersionModal onClose={() => setShowVerModal(false)}
          onSubmit={createVer.mutate} loading={createVer.isPending} />
      )}
      {showSubModal && (
        <SubModal onClose={() => setShowSubModal(false)}
          onSubmit={createSub.mutate} loading={createSub.isPending}
          versions={vData?.data || []} defaultVer={selVersion} />
      )}
      {showBulk && (
        <BulkModal rows={bulkRows}
          versions={vData?.data || []} selVer={selVersion}
          onVersionChange={id => setBulkRows(bulkRows.map(r => ({ ...r, syllabusVersionId: id })))}
          onBranchChange={id => setBulkRows(bulkRows.map(r => ({ ...r, branchId: id })))}
          onConfirm={() => bulkCreate.mutate(bulkRows)}
          onClose={() => { setBulkRows([]); setShowBulk(false) }}
          loading={bulkCreate.isPending} />
      )}
    </div>
  )
}

// ── Semester Card ──────────────────────────────────────────────────────────
function SemCard({ sem, subjects, onDelete, deleteLoading }) {
  const [open,    setOpen]    = useState(true)
  const [confirm, setConfirm] = useState(null)
  const tc = { THEORY: 'badge-blue', LAB: 'badge-green', ELECTIVE: 'badge-purple' }
  const theory   = subjects.filter(s => s.subjectType === 'THEORY').length
  const lab      = subjects.filter(s => s.subjectType === 'LAB').length
  const elective = subjects.filter(s => s.subjectType === 'ELECTIVE').length
  const credits  = subjects.reduce((s, x) => s + (x.credits || 0), 0)

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-5 py-4 bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-800/30 dark:hover:bg-slate-800/50 backdrop-blur-sm transition-all text-left">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
            {sem}
          </span>
          <span className="font-semibold text-gray-800">Semester {sem}</span>
          <div className="flex gap-2 text-xs">
            <span className="badge-blue">{subjects.length} subjects</span>
            {theory   > 0 && <span className="text-gray-400">{theory} theory</span>}
            {lab      > 0 && <span className="text-gray-400">{lab} lab</span>}
            {elective > 0 && <span className="text-gray-400">{elective} elective</span>}
            <span className="text-gray-400">{credits} credits total</span>
          </div>
        </div>
        {open
          ? <ChevronUp size={15} className="text-gray-400 shrink-0"/>
          : <ChevronDown size={15} className="text-gray-400 shrink-0"/>}
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-md border-y border-slate-100 dark:border-slate-700/50">
              <tr>
                {['Code', 'Subject Name', 'Type', 'Credits', 'Scheme', 'Delete'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] ${i === 5 ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {subjects.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                  <td className="px-4 py-3 font-mono text-indigo-600 dark:text-indigo-400 text-xs font-bold">{s.code}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{s.name}</td>
                  <td className="px-4 py-3">
                    <span className={tc[s.subjectType] || 'badge-blue'}>{s.subjectType}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.credits}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{s.syllabusVersion?.versionName || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setConfirm({ id: s.id, name: s.name, code: s.code })}
                      className="p-1.5 rounded-lg text-transparent group-hover:text-red-400 hover:!text-red-600 hover:bg-red-50 transition"
                      title="Delete subject">
                      <Trash2 size={15}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete Subject?"
          message={`"${confirm.name}" (${confirm.code}) will be removed from the syllabus. This cannot be undone. If students are enrolled, deletion will be blocked.`}
          onConfirm={() => { onDelete(confirm.id); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
          loading={deleteLoading} />
      )}
    </div>
  )
}

// ── Bulk Preview Modal ─────────────────────────────────────────────────────
function BulkModal({ rows, versions, selVer, onVersionChange, onBranchChange, onConfirm, onClose, loading }) {
  const [ver, setVer] = useState(selVer || '')
  const [branch, setBranch] = useState('')
  const tc = { THEORY: 'badge-blue', LAB: 'badge-green', ELECTIVE: 'badge-purple' }

  const { data: branchesData, isLoading: brLoading } = useQuery({
    queryKey: ['admin-branches'],
    queryFn: () => adminApi.getBranches().then(r => r.data)
  })

  // Group preview by semester
  const bySem = {}
  for (const r of rows) { if (!bySem[r.semester]) bySem[r.semester] = []; bySem[r.semester].push(r) }
  const sems = Object.keys(bySem).map(Number).sort((a, b) => a - b)

  return (
    <Modal title={`Upload Preview — ${rows.length} subjects across ${sems.length} semesters`} onClose={onClose} size="lg">
      <div className="space-y-4">
        {/* Version select */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 grid grid-cols-2 gap-3">
          <FormField label="Assign Syllabus Version">
            <select value={ver}
              onChange={e => { setVer(e.target.value); onVersionChange(e.target.value) }}
              className="input mt-1">
              <option value="">— Select a version —</option>
              {versions.map(v => <option key={v.id} value={v.id}>{v.versionName}</option>)}
            </select>
          </FormField>
          
          <FormField label="Assign Branch">
            {brLoading ? <span className="text-sm text-gray-500 mt-3 block">Loading...</span> : (
              <select value={branch}
                onChange={e => { setBranch(e.target.value); onBranchChange(e.target.value) }}
                className="input mt-1">
                <option value="">— Select Branch —</option>
                {branchesData?.data?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
          </FormField>
        </div>

        {/* Semester-wise grouped preview */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {sems.map(sem => (
            <div key={sem} className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">{sem}</span>
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Semester {sem}</span>
                <span className="badge-blue text-xs font-bold">{bySem[sem].length} subjects</span>
              </div>
              <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {bySem[sem].map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400 w-24 font-bold">{r.code}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">{r.name}</td>
                      <td className="px-3 py-2">
                        <span className={tc[r.subjectType] || 'badge-blue'}>{r.subjectType}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-400">{r.credits} cr</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {!ver && <p className="text-amber-600 text-sm">⚠ Please select a syllabus version before uploading.</p>}
        {!branch && <p className="text-amber-600 text-sm">⚠ Please select a branch before uploading.</p>}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 btn-outline">Cancel</button>
          <button onClick={onConfirm} disabled={loading || !ver || !branch || rows.length === 0}
            className="flex-1 btn-primary">
            {loading ? 'Uploading...' : `Upload ${rows.length} Subjects`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Batch Assignment Tab ───────────────────────────────────────────────────
function BatchTab({ versions }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ batchYear: new Date().getFullYear(), syllabusVersionId: '', branchId: '' })

  const { data: branchesData } = useQuery({
    queryKey: ['admin-branches'],
    queryFn: () => api.get('/admin/branches').then(r => r.data)
  })

  const { data: assignmentsData, isLoading: aLoad } = useQuery({
    queryKey: ['batch-syllabus-assignments'],
    queryFn: () => api.get('/admin/batch-syllabus').then(r => r.data)
  })

  const assign = useMutation({
    mutationFn: d => api.post('/admin/batch-syllabus', d),
    onSuccess: () => {
      toast.success('Syllabus assigned successfully!')
      qc.invalidateQueries(['batch-syllabus-assignments'])
      setForm(p => ({ ...p, syllabusVersionId: '', branchId: '' }))
    },
    onError: e => toast.error(e.response?.data?.message || 'Assignment failed.')
  })

  const deleteAssign = useMutation({
    mutationFn: id => api.delete(`/admin/batch-syllabus/${id}`),
    onSuccess: () => { toast.success('Assignment removed'); qc.invalidateQueries(['batch-syllabus-assignments']) },
    onError: () => toast.error('Could not remove assignment')
  })

  const assignments = assignmentsData?.data || []

  return (
    <div className="space-y-5">
      {/* ── Assignment Form ─────────────────────────── */}
      <div className="card p-5">
        <h3 className="font-semibold mb-1 text-gray-800">Assign Syllabus to a Batch</h3>
        <p className="text-sm text-gray-500 mb-4">
          Set which syllabus scheme a batch-branch follows. Students from that combo will see subjects from the assigned syllabus.
        </p>
        <div className="grid sm:grid-cols-4 gap-4">
          <FormField label="Batch Year (e.g. 2023)">
            <input type="number" value={form.batchYear}
              onChange={e => setForm(p => ({ ...p, batchYear: parseInt(e.target.value) }))}
              className="input" placeholder="2023" min="2000" max="2100"/>
          </FormField>
          <FormField label="Target Branch">
            <select value={form.branchId}
              onChange={e => setForm(p => ({ ...p, branchId: e.target.value }))}
              className="input">
              <option value="">— All Branches —</option>
              {branchesData?.data?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </FormField>
          <FormField label="Syllabus Version">
            <select value={form.syllabusVersionId}
              onChange={e => setForm(p => ({ ...p, syllabusVersionId: e.target.value }))}
              className="input">
              <option value="">— Select —</option>
              {versions.map(v => <option key={v.id} value={v.id}>{v.versionName}</option>)}
            </select>
          </FormField>
          <div className="flex items-end">
            <button onClick={() => assign.mutate(form)}
              disabled={assign.isPending || !form.syllabusVersionId}
              className="w-full btn-primary py-2.5">
              {assign.isPending ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Current Assignments Table ───────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Current Assignments</h3>
          <span className="text-xs text-gray-400">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</span>
        </div>
        {aLoad ? (
          <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
        ) : assignments.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            <p className="text-2xl mb-2">📋</p>
            <p>No assignments yet. Use the form above to assign a syllabus.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50/50 border-b">
              <tr>
                {['Batch Year', 'Branch', 'Syllabus Version', 'Remove'].map((h, i) => (
                  <th key={h} className={`px-5 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[11px] ${i === 3 ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-5 py-3 font-bold text-blue-700">{a.batch?.year}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{a.branch?.name}</td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                      {a.syllabusVersion?.versionName}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove syllabus "${a.syllabusVersion?.versionName}" from ${a.branch?.name} (Batch ${a.batch?.year})?`))
                          deleteAssign.mutate(a.id)
                      }}
                      className="p-1.5 rounded-lg text-transparent group-hover:text-red-400 hover:!text-red-600 hover:bg-red-50 transition"
                      title="Remove assignment"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>


      {/* Excel format guide */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Excel Upload Format</h3>
        <p className="text-sm text-gray-500 mb-3">
          Your Excel file must have these exact column headers in row 1. The <strong>Semester</strong> column
          automatically distributes subjects to the correct semester group.
        </p>
        <div className="overflow-x-auto">
          <table className="text-xs font-mono border border-gray-200 rounded-lg overflow-hidden w-full">
            <thead className="bg-slate-700 dark:bg-slate-800 text-white">
              <tr>
                {['Subject Name','Subject Code','Type','Semester','Credits'].map(h => (
                  <td key={h} className="px-4 py-2.5 font-bold uppercase text-[10px] tracking-wider border-r border-slate-600 last:border-0">{h}</td>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white/5 dark:bg-slate-900/20">
              {[
                ['Mathematics I',       'MA101', 'THEORY',  '1', '4'],
                ['Physics',             'PH101', 'THEORY',  '1', '3'],
                ['Physics Lab',         'PH1L1', 'LAB',     '1', '2'],
                ['Data Structures',     'CS201', 'THEORY',  '3', '4'],
                ['DS Lab',              'CS2L1', 'LAB',     '3', '2'],
                ['Elective: AI Basics', 'CS3E1', 'ELECTIVE','5', '3'],
              ].map((row, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className={`px-4 py-2.5 ${j===1?'text-indigo-600 dark:text-indigo-400 font-bold':j===2?'text-emerald-600 dark:text-emerald-400 font-semibold':'text-slate-700 dark:text-slate-300'}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
          <span><strong>Type</strong> must be: THEORY, LAB, or ELECTIVE</span>
          <span><strong>Semester</strong> must be: 1 to 8</span>
          <span><strong>Credits</strong> is a number (e.g. 4)</span>
        </div>
      </div>
    </div>
  )
}

// ── Version Modal ──────────────────────────────────────────────────────────
function VersionModal({ onClose, onSubmit, loading }) {
  const [form, setForm] = useState({ versionName: '', description: '' })
  return (
    <Modal title="New Syllabus Version" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Version Name (e.g. 2023, 2018-scheme)">
          <input value={form.versionName}
            onChange={e => setForm(p => ({ ...p, versionName: e.target.value }))}
            className="input" placeholder="2023"/>
        </FormField>
        <FormField label="Description (optional)">
          <input value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className="input" placeholder="New AICTE scheme subjects"/>
        </FormField>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-outline">Cancel</button>
          <button onClick={() => onSubmit(form)} disabled={loading || !form.versionName}
            className="flex-1 btn-primary">{loading ? 'Creating...' : 'Create Version'}</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Single Subject Modal ───────────────────────────────────────────────────
function SubModal({ onClose, onSubmit, loading, versions, defaultVer }) {
  const [form, setForm] = useState({
    name: '', code: '', subjectType: 'THEORY',
    semester: '1', credits: '3', syllabusVersionId: defaultVer || '', branchId: ''
  })
  
  const { data: branchesData, isLoading: brLoading } = useQuery({
    queryKey: ['admin-branches'],
    queryFn: () => adminApi.getBranches().then(r => r.data)
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <Modal title="Add New Subject" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Subject Name">
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="input" placeholder="Data Structures"/>
          </FormField>
          <FormField label="Subject Code">
            <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
              className="input" placeholder="CS301"/>
          </FormField>
          <FormField label="Type">
            <select value={form.subjectType} onChange={e => set('subjectType', e.target.value)} className="input">
              <option value="THEORY">Theory</option>
              <option value="LAB">Lab</option>
              <option value="ELECTIVE">Elective</option>
            </select>
          </FormField>
          <FormField label="Semester">
            <select value={form.semester} onChange={e => set('semester', e.target.value)} className="input">
              {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Semester {n}</option>)}
            </select>
          </FormField>
          <FormField label="Credits">
            <input type="number" min="1" max="10" value={form.credits}
              onChange={e => set('credits', e.target.value)} className="input"/>
          </FormField>
          <FormField label="Syllabus Version">
            <select value={form.syllabusVersionId}
              onChange={e => set('syllabusVersionId', e.target.value)} className="input">
              <option value="">— Select version —</option>
              {versions.map(v => <option key={v.id} value={v.id}>{v.versionName}</option>)}
            </select>
          </FormField>
          <FormField label="Branch">
            {brLoading ? <span className="text-sm text-gray-500">Loading...</span> : (
              <select value={form.branchId} onChange={e => set('branchId', e.target.value)} className="input">
                <option value="">— Select Branch —</option>
                {branchesData?.data?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
          </FormField>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 btn-outline">Cancel</button>
          <button onClick={() => onSubmit(form)}
            disabled={loading || !form.name || !form.code || !form.syllabusVersionId || !form.branchId}
            className="flex-1 btn-primary">
            {loading ? 'Creating...' : 'Create Subject'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
