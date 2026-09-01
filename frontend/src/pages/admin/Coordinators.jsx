// src/pages/admin/Coordinators.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/all.api'
import { PageTitle, Spinner, EmptyState } from '../../components/Shared'
import toast from 'react-hot-toast'
import { Plus, Trash2, FolderSearch, User, BookOpen, GraduationCap, Building2 } from 'lucide-react'

export default function AdminCoordinators() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    subjectId: '',
    teacherId: '',
    batchId: '',
    branchId: '',
    session: '2024-25'
  })

  // Queries
  const { data: coordData, isLoading: loadingCoord } = useQuery({ queryKey:['admin-coordinators'], queryFn:()=>adminApi.getCoordinators().then(r=>r.data) })
  const { data: teachersData } = useQuery({ queryKey:['admin-teachers-list'], queryFn:()=>adminApi.listTeachers({ limit: 1000 }).then(r=>r.data) })
  const { data: subjectsData } = useQuery({ queryKey:['admin-subjects-list'], queryFn:()=>adminApi.getSubjects().then(r=>r.data) })
  const { data: branchesData } = useQuery({ queryKey:['admin-branches-list'], queryFn:()=>adminApi.getBranches().then(r=>r.data) })
  const { data: batchesData }  = useQuery({ queryKey:['admin-batches-list'],  queryFn:()=>adminApi.getBatches().then(r=>r.data) })

  const coordinators = coordData?.data || []
  const teachers = teachersData?.data?.teachers || teachersData?.teachers || teachersData?.data || []
  const subjects = subjectsData?.data || subjectsData || []
  const branches = branchesData?.data || []
  const batches  = batchesData?.data || []

  // Search states
  const [tSearch, setTSearch] = useState('')
  const [sSearch, setSSearch] = useState('')
  const [showTList, setShowTList] = useState(false)
  const [showSList, setShowSList] = useState(false)

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(tSearch.toLowerCase()) || 
    (t.employeeId && t.employeeId.toLowerCase().includes(tSearch.toLowerCase()))
  )

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(sSearch.toLowerCase()) || 
    s.code.toLowerCase().includes(sSearch.toLowerCase())
  )

  // Mutations
  const assignMut = useMutation({
    mutationFn: (d) => adminApi.assignCoordinator(d),
    onSuccess: () => {
      toast.success('Coordinator assigned successfully!')
      setShowModal(false)
      queryClient.invalidateQueries(['admin-coordinators'])
      setFormData({ subjectId: '', teacherId: '', batchId: '', branchId: '', session: '2024-25' })
      setTSearch(''); setSSearch('')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to assign')
  })

  const removeMut = useMutation({
    mutationFn: (id) => adminApi.removeCoordinator(id),
    onSuccess: () => {
      toast.success('Coordinator removed')
      queryClient.invalidateQueries(['admin-coordinators'])
    }
  })

  if (loadingCoord) return <Spinner />

  return (
    <div className="space-y-6">
      <PageTitle title="Course Coordinators">
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Assign Coordinator
        </button>
      </PageTitle>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Coordinators', value: coordinators.length, icon: FolderSearch, color: 'indigo' },
          { label: 'Subjects Coordinated', value: new Set(coordinators.map(c => c.subjectId)).size, icon: BookOpen, color: 'emerald' },
          { label: 'Academic Session', value: '2024-25', icon: GraduationCap, color: 'amber' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-4">
            <div className={`p-3 rounded-2xl bg-${s.color}-50 text-${s.color}-600`}><s.icon size={22}/></div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-black text-slate-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Coordinators List */}
      {coordinators.length === 0 ? (
        <EmptyState icon={FolderSearch} text="No coordinators assigned" subtext="Assign a senior teacher to oversee a course's material and team." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {coordinators.map(c => (
            <div key={c.id} className="card overflow-hidden group hover:shadow-md transition-all">
              <div className="flex">
                <div className="w-2 bg-indigo-500" />
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-indigo-500 font-bold border-2 border-white shadow-sm">
                        {c.teacher.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{c.teacher.name}</h3>
                        <p className="text-xs text-slate-400 font-mono">{c.teacher.employeeId || 'No ID'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-indigo-100">Coordinator</span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-slate-200">{c.session}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => { if(window.confirm('Remove this coordinator?')) removeMut.mutate(c.id) }} 
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                      title="Remove Coordinator"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Assigned Subject</p>
                      <div className="flex items-center gap-2">
                        <BookOpen size={14} className="text-indigo-400" />
                        <p className="text-sm font-bold text-slate-700 truncate">{c.subject.name}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Target Scope</p>
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-indigo-400" />
                        <p className="text-sm font-bold text-slate-700">
                          {c.batch ? `${c.batch.year} Batch` : c.branch ? c.branch.name : 'Global'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-visible animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800">Assign Coordinator</h3>
                <p className="text-xs text-slate-500 font-medium">Map a teacher to a course core logic.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors">×</button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Teacher Suggestion Box */}
              <div className="relative space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><User size={12}/> Search Teacher</label>
                <input 
                  type="text"
                  placeholder="Type name or employee ID..."
                  value={tSearch}
                  onFocus={() => setShowTList(true)}
                  onChange={e => { setTSearch(e.target.value); setShowTList(true) }}
                  className="input w-full bg-slate-50 border-slate-200"
                />
                {showTList && tSearch && (
                  <div className="absolute z-[60] w-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-1 animate-in slide-in-from-top-2">
                    {filteredTeachers.length > 0 ? filteredTeachers.map(t => (
                      <div key={t.id} 
                        onClick={() => { setFormData({...formData, teacherId: t.id}); setTSearch(t.name); setShowTList(false) }}
                        className="p-2 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-600">{t.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-mono">{t.employeeId}</p>
                        </div>
                        <Plus size={14} className="text-slate-300 group-hover:text-indigo-400" />
                      </div>
                    )) : <p className="p-2 text-xs text-slate-400 italic">No teachers found</p>}
                  </div>
                )}
              </div>

              {/* Subject Suggestion Box */}
              <div className="relative space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><BookOpen size={12}/> Search Subject</label>
                <input 
                  type="text"
                  placeholder="Type subject name or code..."
                  value={sSearch}
                  onFocus={() => setShowSList(true)}
                  onChange={e => { setSSearch(e.target.value); setShowSList(true) }}
                  className="input w-full bg-slate-50 border-slate-200"
                />
                {showSList && sSearch && (
                  <div className="absolute z-[60] w-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-1 animate-in slide-in-from-top-2">
                    {filteredSubjects.length > 0 ? filteredSubjects.map(s => (
                      <div key={s.id} 
                        onClick={() => { setFormData({...formData, subjectId: s.id}); setSSearch(`${s.name} (${s.code})`); setShowSList(false) }}
                        className="p-2 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-600">{s.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-mono">{s.code}</p>
                        </div>
                        <Plus size={14} className="text-slate-300 group-hover:text-indigo-400" />
                      </div>
                    )) : <p className="p-2 text-xs text-slate-400 italic">No subjects found</p>}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Assign to Batch</label>
                  <select 
                    value={formData.batchId} 
                    onChange={e => setFormData({...formData, batchId: e.target.value})}
                    className="input w-full bg-slate-50 border-slate-200"
                  >
                    <option value="">All Batches (Global)</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.year} Batch</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Assign to Branch</label>
                  <select 
                    value={formData.branchId} 
                    onChange={e => setFormData({...formData, branchId: e.target.value})}
                    className="input w-full bg-slate-50 border-slate-200"
                  >
                    <option value="">All Branches</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Academic Session</label>
                <select 
                  value={formData.session} 
                  onChange={e => setFormData({...formData, session: e.target.value})}
                  className="input w-full bg-slate-50 border-slate-200 font-bold text-indigo-600"
                >
                  <option value="2024-25">2024-25</option>
                  <option value="2025-26">2025-26</option>
                </select>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t mt-4 flex gap-3">
              <button onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancel</button>
              <button 
                disabled={assignMut.isPending || !formData.teacherId || !formData.subjectId}
                onClick={() => assignMut.mutate(formData)} 
                className="btn-primary flex-1 shadow-lg shadow-indigo-500/20"
              >
                {assignMut.isPending ? 'Assigning...' : 'Assign Coordinator'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
