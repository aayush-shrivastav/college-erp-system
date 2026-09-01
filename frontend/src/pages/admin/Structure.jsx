// src/pages/admin/Structure.jsx — Rewired to New Architecture (Branch -> Batch -> Class -> Group)
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageTitle, Spinner, EmptyState, Modal, FormField } from '../../components/Shared'
import { Plus, ChevronRight, ChevronDown, Users, BookOpen, FlaskConical, Trash2, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

const sApi = {
  // Foundation
  getBranches:      ()    => api.get('/admin/branches').then(r => r.data),
  createBranch:     d     => api.post('/admin/create-branch', d),
  deleteBranch:     id    => api.delete(`/admin/branches/${id}`),
  getBatches:       (p)   => api.get('/admin/batches', { params: p }).then(r => r.data),
  createBatch:      d     => api.post('/admin/create-batch', d),
  
  // Classes
  getClasses:       p     => api.get('/admin/classes', { params: p }).then(r => r.data),
  createClass:      d     => api.post('/admin/create-class', d),
  
  // Class Details
  getAssignments:   cId   => api.get('/admin/assignments', { params: { classId: cId } }).then(r => r.data),
  assignTeacher:    d     => api.post('/admin/assign-teacher', d),
  deleteAssignment: id    => api.delete(`/admin/delete-assignment/${id}`),

  createGroup:      d     => api.post('/admin/create-group', d),
  getGroups:        cId   => api.get('/admin/groups', { params: { classId: cId } }).then(r => r.data),
  getGroupStudents: gId   => api.get(`/admin/group-students/${gId}`).then(r => r.data),
  assignGroupRange: d     => api.post('/admin/assign-group-range', d),
  removeGroupStu:   id    => api.delete(`/admin/remove-group-student/${id}`),

  getSubjects:      p     => api.get('/admin/subjects', { params: p }).then(r => r.data),
  getStudents:      p     => api.get('/admin/students', { params: p }).then(r => r.data),
  getTeachers:      ()    => api.get('/admin/teachers').then(r => r.data),
}

export default function AdminStructure() {
  const [level, setLevel]     = useState(0) // 0=Branches, 1=Batches, 2=Classes, 3=Detail
  const [selBranch, setBranch] = useState(null)
  const [selBatch,  setBatch]  = useState(null)
  const [selClass,  setClass]  = useState(null)
  const [modal, setModal]      = useState(null)
  const qc = useQueryClient()

  const navigate = (lvl, branch=null, batch=null, cls=null) => {
    setLevel(lvl); setBranch(branch); setBatch(batch); setClass(cls)
  }

  // Queries
  const branchesQ  = useQuery({ queryKey:['branches'], queryFn: sApi.getBranches })
  const batchesQ   = useQuery({ queryKey:['batches'], queryFn: () => sApi.getBatches(), enabled: level>=1 && !!selBranch })
  const classesQ   = useQuery({ queryKey:['classes', selBranch?.id, selBatch?.id], queryFn:()=>sApi.getClasses({ branchId: selBranch?.id, batchId: selBatch?.id }), enabled: level>=2 && !!selBranch && !!selBatch })
  
  const assignmentsQ = useQuery({ queryKey:['assignments', selClass?.id], queryFn:()=>sApi.getAssignments(selClass?.id), enabled: level===3 && !!selClass })
  const groupsQ      = useQuery({ queryKey:['groups', selClass?.id], queryFn:()=>sApi.getGroups(selClass?.id), enabled: level===3 && !!selClass })
  const subjectsQ    = useQuery({ queryKey:['subjects', selBranch?.id, selClass?.semester], queryFn:()=>sApi.getSubjects({ branchId: selBranch?.id, semester: selClass?.semester }), enabled: level===3 && !!selClass })
  const teachersQ    = useQuery({ queryKey:['teachers'], queryFn: sApi.getTeachers, enabled: level===3 })
  const classStudentsQ = useQuery({ queryKey:['class-students', selBranch?.id, selBatch?.id, selClass?.semester], queryFn: ()=>sApi.getStudents({ branchId: selBranch?.id, batchYear: selBatch?.year, currentSem: selClass?.semester, limit: 500 }), enabled: level===3 })

  // Mutations
  const createBranchMut  = useMutation({ mutationFn: sApi.createBranch,  onSuccess:()=>{ toast.success('Branch created'); qc.invalidateQueries(['branches']); setModal(null) }, onError: e=>toast.error(e.response?.data?.message||'Error') })
  const deleteBranchMut  = useMutation({ mutationFn: sApi.deleteBranch,  onSuccess:()=>{ toast.success('Branch deleted'); qc.invalidateQueries(['branches']) }, onError: e=>toast.error(e.response?.data?.message||'Cannot delete branch') })
  const createBatchMut   = useMutation({ mutationFn: sApi.createBatch,   onSuccess:()=>{ toast.success('Batch created'); qc.invalidateQueries(['batches']); setModal(null) }, onError: e=>toast.error(e.response?.data?.message||'Error') })
  const createClassMut   = useMutation({ mutationFn: sApi.createClass,   onSuccess:()=>{ toast.success('Class created'); qc.invalidateQueries(['classes']); setModal(null) }, onError: e=>toast.error(e.response?.data?.message||'Error') })
  const createGroupMut   = useMutation({ mutationFn: sApi.createGroup,   onSuccess:()=>{ toast.success('Group created'); qc.invalidateQueries(['assignments', 'classes', 'groups']); setModal(null) }, onError: e=>toast.error(e.response?.data?.message||'Error') })
  const assignTeacherMut = useMutation({ mutationFn: sApi.assignTeacher, onSuccess:()=>{ toast.success('Teacher assigned'); qc.invalidateQueries(['assignments']); setModal(null) }, onError: e=>toast.error(e.response?.data?.message||'Error') })
  const deleteAssignMut  = useMutation({ mutationFn: sApi.deleteAssignment, onSuccess:()=>{ toast.success('Assignment removed'); qc.invalidateQueries(['assignments']); } })
  const assignGroupMut   = useMutation({ mutationFn: sApi.assignGroupRange, onSuccess: (res) => { toast.success(res.data?.message||'Assigned'); qc.invalidateQueries(['groups']); setModal(null) }, onError: e=>toast.error(e.response?.data?.message||'Error') })

  const crumbs = [
    { label:'All Branches', fn:()=>navigate(0) },
    selBranch && { label: selBranch.name, fn:()=>navigate(1,selBranch) },
    selBatch  && { label: `${selBatch.year} Batch`, fn:()=>navigate(2,selBranch,selBatch) },
    selClass  && { label: `Semester ${selClass.semester}` },
  ].filter(Boolean)

  return (
    <div>
      <PageTitle title="Academic Structure">
        {level===0 && <button onClick={()=>setModal({type:'branch'})} className="btn-primary flex items-center gap-2"><Plus size={14}/>Add Branch</button>}
        {level===1 && <button onClick={()=>setModal({type:'batch'})} className="btn-primary flex items-center gap-2"><Plus size={14}/>Add Batch</button>}
        {level===2 && <button onClick={()=>setModal({type:'class'})} className="btn-primary flex items-center gap-2"><Plus size={14}/>Add Class (Semester)</button>}
        {level===3 && (
          <div className="flex gap-2">
            <button onClick={()=>setModal({type:'group'})} className="btn-outline flex items-center gap-2"><FlaskConical size={14}/>Create Group</button>
            <button onClick={()=>setModal({type:'assign-teacher'})} className="btn-primary flex items-center gap-2"><UserCheck size={14}/>Assign Teacher</button>
          </div>
        )}
      </PageTitle>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-5 text-sm flex-wrap">
        {crumbs.map((c,i)=>(
          <div key={i} className="flex items-center gap-1.5">
            {i>0 && <ChevronRight size={14} className="text-gray-300"/>}
            {c.fn
              ? <button onClick={c.fn} className="text-blue-600 hover:underline">{c.label}</button>
              : <span className="font-semibold text-gray-800">{c.label}</span>}
          </div>
        ))}
      </div>

      {/* ── LEVEL 0: BRANCHES ──────────────────────────────────────────── */}
      {level===0 && (
        <div className="space-y-5">
          {branchesQ.isLoading ? <Spinner/> : !branchesQ.data?.data?.length
            ? <EmptyState icon={BookOpen} text="No branches yet" subtext='Add your first branch (e.g. "Computer Science")'/>
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {branchesQ.data.data.map(b=>(
                  <div key={b.id} className="card p-5 cursor-pointer hover:shadow-md transition border hover:border-blue-300"
                    onClick={()=>navigate(1,b)}>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xl font-bold text-blue-800">{b.name}</span>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          if (window.confirm(`"${b.name}" branch delete karna chahte hain? Ye action undo nahi hogi.`))
                            deleteBranchMut.mutate(b.id)
                        }}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Delete branch"
                      >
                        <Trash2 size={15}/>
                      </button>
                    </div>
                    <div className="flex justify-end mt-3">
                      <ChevronRight size={16} className="text-gray-300"/>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ── LEVEL 1: BATCHES ──────────────────────────────────────────── */}
      {level===1 && selBranch && (
        batchesQ.isLoading ? <Spinner/> : !batchesQ.data?.data?.length
          ? <EmptyState icon={Users} text={`No batches configured for ${selBranch.name} yet`} subtext={`Add a Batch (year) first, then create Classes (semesters) inside it`}/>
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {batchesQ.data.data.map(b=>(
                <div key={b.id} className="card p-5 cursor-pointer hover:shadow-md transition border hover:border-blue-300"
                  onClick={()=>navigate(2,selBranch,b)}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-3xl font-bold text-gray-800">{b.year}</span>
                    <div className="text-right">
                      <span className="text-xs text-gray-400">View Classes</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 mt-3"/>
                </div>
              ))}
            </div>
          )
      )}

      {/* ── LEVEL 2: CLASSES ─────────────────────────────────────────── */}
      {level===2 && selBatch && (
        <div className="space-y-4">
          {classesQ.isLoading ? <Spinner/> : !classesQ.data?.data?.length
            ? <EmptyState icon={Users} text="No classes yet for this Branch & Batch" subtext="Add a Class for a specific semester"/>
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classesQ.data.data.map(c=>(
                  <div key={c.id} className="card p-5 cursor-pointer hover:shadow-md transition border hover:border-blue-300"
                    onClick={()=>{ navigate(3,selBranch,selBatch,c) }}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-3xl font-bold text-gray-800">Sem {c.semester}</p>
                        <p className="text-sm text-blue-600 font-mono">{selBranch.name} · {selBatch.year}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 mt-3"/>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ── LEVEL 3: CLASS DETAIL ───────────────────────────────────── */}
      {level===3 && selClass && (
        assignmentsQ.isLoading ? <Spinner/> : (
          <div className="space-y-5">
            {/* Header */}
            <div className="card p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selBranch.name} · {selBatch.year}</h2>
                  <p className="text-lg text-blue-600 font-medium">Semester {selClass.semester}</p>
                </div>
                <div className="flex gap-6 text-center">
                  <div><p className="text-2xl font-bold text-blue-700">{classStudentsQ.data?.data?.length || 0}</p><p className="text-xs text-gray-400">Total Students</p></div>
                  <div><p className="text-2xl font-bold text-green-700">{assignmentsQ.data?.data?.length || 0}</p><p className="text-xs text-gray-400">Teacher Assignments</p></div>
                </div>
              </div>
            </div>

            {/* Teacher Assignments */}
            <div className="card overflow-hidden">
              <h3 className="font-semibold px-5 py-4 border-b">Subject & Teacher Assignments</h3>
              {!assignmentsQ.data?.data?.length
                ? <p className="text-gray-400 text-sm text-center py-6">No teachers assigned yet. Click "Assign Teacher" above.</p>
                : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-md border-b border-slate-100 dark:border-slate-700/50">
                      <tr>
                        {['Subject','Code','Teacher','Group Scope','Action'].map(h => (
                          <th key={h} className="text-left px-5 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {assignmentsQ.data.data.map(a=>(
                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-5 py-3 font-medium">{a.subject?.name}</td>
                          <td className="px-5 py-3 font-mono text-blue-600 text-xs">{a.subject?.code}</td>
                          <td className="px-5 py-3 font-medium text-green-700">{a.teacher?.name || 'Assigned'}</td>
                          <td className="px-5 py-3 text-gray-500 text-xs">{a.group?.groupName || 'Full Class'}</td>
                          <td className="px-5 py-3">
                            <button onClick={()=>deleteAssignMut.mutate(a.id)}
                              className="p-1 text-gray-300 hover:text-red-500 transition"><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>

            {/* Class Groups */}
            <div className="card overflow-hidden">
              <h3 className="font-semibold px-5 py-4 border-b flex items-center gap-2">
                <FlaskConical size={16} className="text-green-600"/> Class Groups
              </h3>
              {!groupsQ.data?.data?.length
                ? <p className="text-gray-400 text-sm text-center py-6">No groups created. Click "Create Group" above.</p>
                : (
                  <div className="divide-y">
                    {groupsQ.data.data.map(g=>(
                      <GroupItem key={g.id} g={g} setModal={setModal} />
                    ))}
                  </div>
                )
              }
            </div>

            {/* Students List */}
            <div className="card overflow-hidden">
              <h3 className="font-semibold px-5 py-4 border-b flex items-center justify-between">
                <span className="flex items-center gap-2"><Users size={16} className="text-blue-600"/>Students logically mapped to this class</span>
              </h3>
              {!classStudentsQ.data?.data?.length
                ? <p className="text-gray-400 text-sm text-center py-6">No students match this Branch, Batch, and Semester yet.</p>
                : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-md border-b border-slate-100 dark:border-slate-700/50">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Roll No</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Name</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {classStudentsQ.data.data.map(s=>(
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-blue-600 text-xs">{s.rollNo}</td>
                          <td className="px-4 py-2.5 font-medium">{s.name}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{s.user?.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          </div>
        )
      )}

      {/* ── MODALS ──────────────────────────────────────────────────────── */}
      {modal?.type==='branch'          && <BranchModal         onClose={()=>setModal(null)} onSubmit={createBranchMut.mutate}  loading={createBranchMut.isPending}/>}
      {modal?.type==='batch'           && <BatchModal          onClose={()=>setModal(null)} onSubmit={createBatchMut.mutate}   loading={createBatchMut.isPending}/>}
      {modal?.type==='class'           && <ClassModal          onClose={()=>setModal(null)} onSubmit={d=>createClassMut.mutate({...d, branchId: selBranch.id, batchId: selBatch.id})} loading={createClassMut.isPending}/>}
      {modal?.type==='assign-teacher'  && <AssignTeacherModal  onClose={()=>setModal(null)} onSubmit={d=>assignTeacherMut.mutate({...d, classId: selClass.id, groupId: d.groupId || undefined})} loading={assignTeacherMut.isPending} teachers={teachersQ.data?.data||[]} subjects={subjectsQ.data?.data || subjectsQ.data || []} classGroups={groupsQ.data?.data||[]} />}
      {modal?.type==='group'           && <GroupModal          onClose={()=>setModal(null)} onSubmit={d=>createGroupMut.mutate({...d, classId: selClass.id})} loading={createGroupMut.isPending} />}
      {modal?.type==='assign-group'    && <AssignGroupModal    onClose={()=>setModal(null)} onSubmit={d=>assignGroupMut.mutate({...d, classId: selClass.id, groupId: modal.group.id})} loading={assignGroupMut.isPending} groupName={modal.group.groupName} />}
    </div>
  )
}

// ── Sub-Components ─────────────────────────────────────────────────────────────
function GroupItem({ g, setModal }) {
  const [expanded, setExpanded] = useState(false)
  const qc = useQueryClient()
  
  const { data, isLoading } = useQuery({
    queryKey: ['group-students', g.id],
    queryFn: () => sApi.getGroupStudents(g.id),
    enabled: expanded
  })

  return (
    <div className="flex flex-col hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all border-b border-white/5 last:border-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 gap-3 cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={18} className="text-gray-400"/> : <ChevronRight size={18} className="text-gray-400"/>}
          <p className="font-semibold text-gray-800 text-lg">{g.groupName}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setModal({ type:'assign-group', group: g }) }} className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50 bg-white">
          <Users size={12}/> Assign Student Range
        </button>
      </div>
      
      {expanded && (
        <div className="px-5 pb-5 pl-11">
          {isLoading ? <Spinner /> : !data?.data?.length ? (
            <p className="text-sm text-gray-500 italic py-2">No students assigned to this group yet.</p>
          ) : (
            <div className="border rounded-md overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Roll No</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Name</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {data.data.map(gs => (
                    <tr key={gs.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-blue-600 text-xs">{gs.student.rollNo}</td>
                      <td className="px-3 py-2 font-medium">{gs.student.name}</td>
                      <td className="px-3 py-2 text-right">
                         <button onClick={() => {
                            if(window.confirm(`Remove ${gs.student.name} from group?`)) {
                               const loadingToast = toast.loading('Removing...')
                               sApi.removeGroupStu(gs.id).then(()=>{ 
                                  toast.success('Removed', {id: loadingToast});
                                  qc.invalidateQueries(['group-students', g.id]);
                               }).catch(e => toast.error('Error removing student', {id: loadingToast}));
                            }
                         }} className="text-gray-400 hover:text-red-500 transition"><Trash2 size={14} className="ml-auto"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Modals ─────────────────────────────────────────────────────────────────────
function BranchModal({ onClose, onSubmit, loading }) {
  const [f,setF]=useState({name:''})
  return (
    <Modal title="Add Branch" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Branch Name (e.g. Computer Science)"><input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} className="input" placeholder="Computer Science"/></FormField>
        <div className="flex gap-3"><button onClick={onClose} className="flex-1 btn-outline">Cancel</button><button onClick={()=>onSubmit(f)} disabled={loading||!f.name} className="flex-1 btn-primary">{loading?'...':'Create Branch'}</button></div>
      </div>
    </Modal>
  )
}

function BatchModal({ onClose, onSubmit, loading }) {
  const [f,setF]=useState({ year: new Date().getFullYear() })
  return (
    <Modal title="Add Global Batch" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Batch Year (Admission Year)"><input type="number" value={f.year} onChange={e=>setF(p=>({...p,year:parseInt(e.target.value)}))} className="input"/></FormField>
        <div className="flex gap-3"><button onClick={onClose} className="flex-1 btn-outline">Cancel</button><button onClick={()=>onSubmit(f)} disabled={loading||!f.year} className="flex-1 btn-primary">{loading?'...':'Create Batch'}</button></div>
      </div>
    </Modal>
  )
}

function ClassModal({ onClose, onSubmit, loading }) {
  const [f,setF]=useState({ semester: '1' })
  return (
    <Modal title="Add Class (Semester)" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Target Semester"><input type="number" value={f.semester} onChange={e=>setF(p=>({...p,semester:parseInt(e.target.value)}))} min="1" max="8" className="input"/></FormField>
        <div className="flex gap-3"><button onClick={onClose} className="flex-1 btn-outline">Cancel</button><button onClick={()=>onSubmit(f)} disabled={loading||!f.semester} className="flex-1 btn-primary">{loading?'...':'Create Class'}</button></div>
      </div>
    </Modal>
  )
}

function GroupModal({ onClose, onSubmit, loading }) {
  const [f,setF]=useState({ groupName: '' })
  return (
    <Modal title="Create Class Group" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Allows you to divide the class into smaller subsets (e.g. Lab 1, Lab 2).</p>
        <FormField label="Group Name"><input value={f.groupName} onChange={e=>setF(p=>({...p,groupName:e.target.value}))} className="input" placeholder="Lab A"/></FormField>
        <div className="flex gap-3"><button onClick={onClose} className="flex-1 btn-outline">Cancel</button><button onClick={()=>onSubmit(f)} disabled={loading||!f.groupName} className="flex-1 btn-primary">{loading?'...':'Create Group'}</button></div>
      </div>
    </Modal>
  )
}

function AssignTeacherModal({ onClose, onSubmit, loading, teachers, subjects, classGroups }) {
  const [f,setF]=useState({subjectId:'',teacherId:'',groupId:''})
  const safeSubjects = Array.isArray(subjects) ? subjects : (subjects?.data || []);
  const safeTeachers = Array.isArray(teachers) ? teachers : (teachers?.data || []);
  console.log('AssignTeacherModal received subjects:', safeSubjects);
  
  return (
    <Modal title="Assign Teacher to Class" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Subject">
          <select value={f.subjectId} onChange={e=>setF(p=>({...p,subjectId:e.target.value}))} className="input">
            <option value="">— Select Subject —</option>{safeSubjects.map(s=><option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </select>
        </FormField>
        <FormField label="Teacher">
          <select value={f.teacherId} onChange={e=>setF(p=>({...p,teacherId:e.target.value}))} className="input">
            <option value="">— Select Teacher —</option>
            {safeTeachers.map(t=>(
              <option key={t.id} value={t.id}>
                {t.name} ({t.designation || 'Faculty'})
              </option>
            ))}
          </select>
        </FormField>
        {classGroups.length > 0 && (
          <FormField label="Confine to Group (Optional)">
            <select value={f.groupId} onChange={e=>setF(p=>({...p,groupId:e.target.value}))} className="input">
              <option value="">— Full Class —</option>{classGroups.map(g=><option key={g.id} value={g.id}>{g.groupName}</option>)}
            </select>
          </FormField>
        )}
        <div className="flex gap-3"><button onClick={onClose} className="flex-1 btn-outline">Cancel</button><button onClick={()=>onSubmit(f)} disabled={loading||!f.subjectId||!f.teacherId} className="flex-1 btn-primary">{loading?'...':'Assign Teacher'}</button></div>
      </div>
    </Modal>
  )
}

function AssignGroupModal({ onClose, onSubmit, loading, groupName }) {
  const [f,setF]=useState({ fromRollNo: '', toRollNo: '' })
  return (
    <Modal title={`Assign Students to ${groupName}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500 mb-2">Automate Lab subject logic: Assign a range of roll numbers to this group.</p>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="From Roll No">
            <input value={f.fromRollNo} onChange={e=>setF(p=>({...p,fromRollNo:e.target.value.toUpperCase()}))} className="input uppercase" placeholder="e.g. 25001" />
          </FormField>
          <FormField label="To Roll No">
            <input value={f.toRollNo} onChange={e=>setF(p=>({...p,toRollNo:e.target.value.toUpperCase()}))} className="input uppercase" placeholder="e.g. 25030" />
          </FormField>
        </div>
        <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-xs">
          <strong>Note:</strong> Students inside this range will automatically be enrolled in the Subject/Teacher assigned to this specific group.
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 btn-outline">Cancel</button>
          <button onClick={()=>onSubmit(f)} disabled={loading||!f.fromRollNo||!f.toRollNo} className="flex-1 btn-primary bg-green-600 hover:bg-green-700">
            {loading?'Assigning...':'Auto Enroll Range'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
