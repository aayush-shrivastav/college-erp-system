import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from '../../api/all.api'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import * as xlsx from 'xlsx'
import { Search, Info, Plus, GraduationCap, UploadCloud, Download, Trash2 } from 'lucide-react'
import { PageTitle, Spinner, EmptyState, ConfirmDialog } from '../../components/Shared'

export default function FeeSetup() {
  const [tab, setTab] = useState('MASTERS') // MASTERS | HOSTELS | BUSES | STUDENTS
  
  return (
    <div className="space-y-6">
      <PageTitle title="Fee Customization & Setup" />

      {/* TABS */}
      <div className="flex flex-wrap gap-2 bg-white rounded-lg shadow-sm border p-1 w-full max-w-3xl">
        {['MASTERS', 'COURSE', 'HOSTELS', 'BUSES', 'MESS', 'STUDENTS'].map(t => (
          <button key={t} onClick={()=>setTab(t)} 
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition ${tab===t?'bg-blue-50 text-blue-700':'text-gray-500 hover:bg-gray-50'}`}>
            {t === 'MASTERS' ? 'Fee Masters' : t === 'COURSE' ? 'Course Master' : t === 'HOSTELS' ? 'Hostels' : t === 'BUSES' ? 'Buses' : t === 'MESS' ? 'Mess' : 'Student Profiles'}
          </button>
        ))}
      </div>

      {tab === 'MASTERS' && <FeeMastersTab />}
      {tab === 'COURSE' && <CourseMasterTab />}
      {tab === 'HOSTELS' && <HostelsTab />}
      {tab === 'BUSES' && <BusesTab />}
      {tab === 'MESS' && <MessTab />}
      {tab === 'STUDENTS' && <StudentSetupTab />}
    </div>
  )
}

function FeeMastersTab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [f, setF] = useState({ batchId: '', branchId: '', semester: '1', tuitionFee: '', developmentFee: '', examFee: '', otherFee: '' })
  const [deletingId, setDeletingId] = useState(null)

  const { data: qData, isLoading } = useQuery({ queryKey: ['fee-masters'], queryFn: () => accountsApi.getFeeMasters().then(r=>r.data) })
  const masters = (qData?.data || []).filter(m => m.semester > 0)

  // Get Batches & Branches for Dropdowns
  const { data: batches } = useQuery({ queryKey:['batches'], queryFn: () => api.get('/admin/batches').then(r=>r.data?.data) })
  const { data: branches }  = useQuery({ queryKey:['branches'],  queryFn: () => api.get('/admin/branches').then(r=>r.data?.data) })

  const mutCreate = useMutation({
    mutationFn: () => accountsApi.createFeeMaster(f),
    onSuccess: () => {
      toast.success('Fee Master saved!')
      queryClient.invalidateQueries(['fee-masters'])
      setShowForm(false)
      setF({ ...f, tuitionFee:'', developmentFee:'', examFee:'', otherFee:'' }) // reset amounts
    },
    onError: () => toast.error('Failed to save fee master')
  })

  const mutDelete = useMutation({
    mutationFn: (id) => accountsApi.deleteFeeMaster(id),
    onSuccess: () => {
      toast.success('Fee Master deleted')
      queryClient.invalidateQueries(['fee-masters'])
      setDeletingId(null)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to delete fee master')
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Master Fee Structures (Per Semester)</h2>
        <button onClick={()=>setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16}/> New Master
        </button>
      </div>

      {showForm && (
        <div className="card p-5 bg-blue-50/30 border-blue-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Batch</label>
              <select className="input" value={f.batchId} onChange={e=>setF({...f,batchId:e.target.value})}>
                <option value="">Select Batch</option>
                {batches?.map(b=><option key={b.id} value={b.id}>{b.year}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Branch</label>
              <select className="input" value={f.branchId} onChange={e=>setF({...f,branchId:e.target.value})}>
                <option value="">Select Branch</option>
                {branches?.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Semester</label>
              <select className="input" value={f.semester} onChange={e=>setF({...f,semester:e.target.value})}>
                {[1,2,3,4,5,6,7,8].map(s=><option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div><label className="label">Tuition Fee (₹)</label><input type="number" className="input" value={f.tuitionFee} onChange={e=>setF({...f,tuitionFee:e.target.value})}/></div>
            <div><label className="label">Development Fee (₹)</label><input type="number" className="input" value={f.developmentFee} onChange={e=>setF({...f,developmentFee:e.target.value})}/></div>
            <div><label className="label">Exam & Other (₹)</label><input type="number" className="input" value={f.examFee} onChange={e=>setF({...f,examFee:e.target.value})}/></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button className="btn-outline" onClick={()=>setShowForm(false)}>Cancel</button>
            <button className="btn-primary" onClick={()=>mutCreate.mutate()} disabled={mutCreate.isPending || !f.batchId || !f.branchId}> {mutCreate.isPending ? 'Saving...' : 'Save Master'} </button>
          </div>
        </div>
      )}

      {isLoading ? <Spinner /> : masters.length === 0 ? (
        <EmptyState icon={Info} text="No fee masters found" subtext="Create base fees for branches and batches." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Batch / Branch</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Semester</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Tuition</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Development</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Total Base Fee</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {masters.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.batch?.year} — {m.branch?.name}</td>
                  <td className="px-4 py-3 text-center">Sem {m.semester}</td>
                  <td className="px-4 py-3 text-right">₹{Number(m.tuitionFee||0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">₹{Number(m.developmentFee||0).toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-right text-blue-700">₹{Number(m.totalFee||0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDeletingId(m.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deletingId && (
        <ConfirmDialog 
          title="Delete Fee Master?"
          message="Are you sure you want to delete this fee master? This action cannot be undone."
          onConfirm={() => mutDelete.mutate(deletingId)}
          onCancel={() => setDeletingId(null)}
          loading={mutDelete.isPending}
        />
      )}
    </div>
  )
}

function HostelsTab() {
  const qc = useQueryClient()
  const [f, setF] = useState({ roomType: '', capacity: 3, feeAmount: '' })
  const [deletingId, setDeletingId] = useState(null)
  
  const { data, isLoading } = useQuery({ queryKey: ['hostels'], queryFn: () => accountsApi.getHostels().then(r=>r.data) })
  const hostels = data?.data || []

  const mutCreate = useMutation({
    mutationFn: () => accountsApi.createHostel(f),
    onSuccess: () => { toast.success('Hostel added'); qc.invalidateQueries(['hostels']); setF({roomType:'', capacity:3, feeAmount:''}) },
    onError: () => toast.error('Failed to add hostel')
  })

  const mutDelete = useMutation({
    mutationFn: (id) => accountsApi.deleteHostel(id),
    onSuccess: () => { toast.success('Hostel deleted'); qc.invalidateQueries(['hostels']); setDeletingId(null) },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to delete hostel')
  })

  return (
    <div className="space-y-6">
      <div className="card p-5 bg-orange-50/50 border-orange-100 flex gap-4 items-end">
        <div><label className="label">Room Type</label><input className="input w-48" placeholder="e.g. 3-Seater Non-AC" value={f.roomType} onChange={e=>setF({...f,roomType:e.target.value})}/></div>
        <div><label className="label">Fee / Semester (₹)</label><input type="number" className="input w-36" placeholder="0" value={f.feeAmount} onChange={e=>setF({...f,feeAmount:e.target.value})}/></div>
        <button className="btn-primary" onClick={()=>mutCreate.mutate()} disabled={!f.roomType || !f.feeAmount}>Add Hostel</button>
      </div>
      
      {isLoading ? <Spinner/> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {hostels.map(h => (
            <div key={h.id} className="card p-4 border-l-4 border-l-orange-500 relative group">
              <button onClick={() => setDeletingId(h.id)} className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-gray-50 rounded transition-all opacity-0 group-hover:opacity-100">
                <Trash2 size={14} />
              </button>
              <h3 className="font-bold text-gray-800">{h.roomType}</h3>
              <p className="text-sm text-gray-500 mt-1">Capacity: {h.capacity} beds</p>
              <div className="mt-3 text-xl font-bold text-orange-700">₹{Number(h.feeAmount).toLocaleString()} <span className="text-xs text-gray-500 font-normal">/ sem</span></div>
            </div>
          ))}
          {hostels.length===0 && <p className="text-gray-400 p-4">No hostels configured.</p>}
        </div>
      )}

      {deletingId && (
        <ConfirmDialog 
          title="Delete Hostel Type?"
          message="Are you sure you want to delete this hostel type? You cannot delete it if students are currently assigned."
          onConfirm={() => mutDelete.mutate(deletingId)}
          onCancel={() => setDeletingId(null)}
          loading={mutDelete.isPending}
        />
      )}
    </div>
  )
}

function BusesTab() {
  const qc = useQueryClient()
  const [f, setF] = useState({ routeName: '', stops: '', feeAmount: '' })
  const [deletingId, setDeletingId] = useState(null)
  
  const { data, isLoading } = useQuery({ queryKey: ['buses'], queryFn: () => accountsApi.getBuses().then(r=>r.data) })
  const buses = data?.data || []

  const mutCreate = useMutation({
    mutationFn: () => accountsApi.createBus(f),
    onSuccess: () => { toast.success('Bus Route added'); qc.invalidateQueries(['buses']); setF({routeName:'', stops:'', feeAmount:''}) },
    onError: () => toast.error('Failed to add bus route')
  })

  const mutDelete = useMutation({
    mutationFn: (id) => accountsApi.deleteBus(id),
    onSuccess: () => { toast.success('Bus Route deleted'); qc.invalidateQueries(['buses']); setDeletingId(null) },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to delete bus route')
  })

  return (
    <div className="space-y-6">
      <div className="card p-5 bg-teal-50/50 border-teal-100 flex flex-wrap gap-4 items-end">
        <div><label className="label">Route Name</label><input className="input w-48" placeholder="e.g. Route 1 (City Center)" value={f.routeName} onChange={e=>setF({...f,routeName:e.target.value})}/></div>
        <div><label className="label">Major Stops</label><input className="input w-64" placeholder="Stop A, Stop B" value={f.stops} onChange={e=>setF({...f,stops:e.target.value})}/></div>
        <div><label className="label">Fee / Semester (₹)</label><input type="number" className="input w-36" placeholder="0" value={f.feeAmount} onChange={e=>setF({...f,feeAmount:e.target.value})}/></div>
        <button className="btn-primary" onClick={()=>mutCreate.mutate()} disabled={!f.routeName || !f.feeAmount}>Add Route</button>
      </div>
      
      {isLoading ? <Spinner/> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {buses.map(b => (
            <div key={b.id} className="card p-4 border-l-4 border-l-teal-500 relative group">
              <button onClick={() => setDeletingId(b.id)} className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-gray-50 rounded transition-all opacity-0 group-hover:opacity-100">
                <Trash2 size={14} />
              </button>
              <h3 className="font-bold text-gray-800">{b.routeName}</h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">Stops: {b.stops || 'N/A'}</p>
              <div className="mt-3 text-xl font-bold text-teal-700">₹{Number(b.feeAmount).toLocaleString()} <span className="text-xs text-gray-500 font-normal">/ sem</span></div>
            </div>
          ))}
          {buses.length===0 && <p className="text-gray-400 p-4">No bus routes configured.</p>}
        </div>
      )}

      {deletingId && (
        <ConfirmDialog 
          title="Delete Bus Route?"
          message="Are you sure you want to delete this bus route? You cannot delete it if students are currently using it."
          onConfirm={() => mutDelete.mutate(deletingId)}
          onCancel={() => setDeletingId(null)}
          loading={mutDelete.isPending}
        />
      )}
    </div>
  )
}

function MessTab() {
  const qc = useQueryClient()
  const [f, setF] = useState({ planName: '', feeAmount: '', description: '' })
  const [deletingId, setDeletingId] = useState(null)
  
  const { data, isLoading } = useQuery({ queryKey: ['mess-plans'], queryFn: () => accountsApi.getMess().then(r=>r.data) })
  const plans = data?.data || []

  const mutCreate = useMutation({
    mutationFn: () => accountsApi.createMess(f),
    onSuccess: () => { toast.success('Mess Plan added'); qc.invalidateQueries(['mess-plans']); setF({planName:'', feeAmount:'', description:''}) },
    onError: () => toast.error('Failed to add mess plan')
  })

  const mutDelete = useMutation({
    mutationFn: (id) => accountsApi.deleteMess(id),
    onSuccess: () => { toast.success('Mess Plan deleted'); qc.invalidateQueries(['mess-plans']); setDeletingId(null) },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to delete mess plan')
  })

  return (
    <div className="space-y-6">
      <div className="card p-5 bg-purple-50/50 border-purple-100 flex flex-wrap gap-4 items-end">
        <div><label className="label">Plan Name</label><input className="input w-48" placeholder="e.g. Veg Standard" value={f.planName} onChange={e=>setF({...f,planName:e.target.value})}/></div>
        <div><label className="label">Description</label><input className="input w-64" placeholder="Breakfast, Lunch, Dinner" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/></div>
        <div><label className="label">Fee / Semester (₹)</label><input type="number" className="input w-36" placeholder="0" value={f.feeAmount} onChange={e=>setF({...f,feeAmount:e.target.value})}/></div>
        <button className="btn-primary" onClick={()=>mutCreate.mutate()} disabled={!f.planName || !f.feeAmount}>Add Plan</button>
      </div>
      
      {isLoading ? <Spinner/> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(p => (
            <div key={p.id} className="card p-4 border-l-4 border-l-purple-500 relative group">
              <button onClick={() => setDeletingId(p.id)} className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-gray-50 rounded transition-all opacity-0 group-hover:opacity-100">
                <Trash2 size={14} />
              </button>
              <h3 className="font-bold text-gray-800">{p.planName}</h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description || 'N/A'}</p>
              <div className="mt-3 text-xl font-bold text-purple-700">₹{Number(p.feeAmount).toLocaleString()} <span className="text-xs text-gray-500 font-normal">/ sem</span></div>
            </div>
          ))}
          {plans.length===0 && <p className="text-gray-400 p-4">No mess plans configured.</p>}
        </div>
      )}

      {deletingId && (
        <ConfirmDialog 
          title="Delete Mess Plan?"
          message="Are you sure you want to delete this mess plan? You cannot delete it if students are currently on it."
          onConfirm={() => mutDelete.mutate(deletingId)}
          onCancel={() => setDeletingId(null)}
          loading={mutDelete.isPending}
        />
      )}
    </div>
  )
}


function StudentSetupTab() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const [q, setQ] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  
  // Form State
  const [f, setF] = useState({ 
    category: 'GENERAL', 
    isHosteller: false, hostelRoomId: '', 
    usesBus: false, busRouteId: '', 
    usesMess: false, messPlanId: '',
    hasScholarship: false, scholarshipName: '' 
  })

  const { data: searchData, isFetching: searching } = useQuery({
    queryKey: ['fee-search-student', q],
    queryFn: () => accountsApi.searchStudents(q).then(r=>r.data),
    enabled: q.length >= 2
  })

  const { data: hostelsData } = useQuery({ queryKey:['hostels'], queryFn: () => accountsApi.getHostels().then(r=>r.data) })
  const { data: busesData } = useQuery({ queryKey:['buses'], queryFn: () => accountsApi.getBuses().then(r=>r.data) })
  const { data: messData } = useQuery({ queryKey:['mess-plans'], queryFn: () => accountsApi.getMess().then(r=>r.data) })

  // Fetch full account info if student exists
  const { data: accountData, isLoading: loadingAccount } = useQuery({
    queryKey: ['student-fee-acct', selectedStudent?.id],
    queryFn: () => accountsApi.getStudentFeeAccount(selectedStudent.id).then(r=>r.data),
    enabled: !!selectedStudent
  })

  const p = accountData?.data

  const handleSelectStudent = (s) => {
    setSelectedStudent(s)
  }

  useEffect(() => {
    if (!selectedStudent) return

    if (accountData?.data) {
      const p = accountData.data
      setF({
        category: p.category || 'GENERAL',
        isHosteller: !!p.isHosteller,
        hostelRoomId: p.hostelRoomId || '',
        usesBus: !!p.usesBus,
        busRouteId: p.busRouteId || '',
        usesMess: !!p.usesMess,
        messPlanId: p.messPlanId || '',
        hasScholarship: !!p.hasScholarship,
        scholarshipName: p.scholarshipName || ''
      })
    } else {
      setF({
        category: 'GENERAL',
        isHosteller: false,
        hostelRoomId: '',
        usesBus: false,
        busRouteId: '',
        usesMess: false,
        messPlanId: '',
        hasScholarship: false,
        scholarshipName: ''
      })
    }
  }, [accountData, selectedStudent])

  const mutSave = useMutation({
    mutationFn: () => accountsApi.initFeeAccount(selectedStudent.id, f),
    onSuccess: () => {
      toast.success('Student Fee Profile Updated!')
      queryClient.invalidateQueries(['student-fee-acct', selectedStudent.id])
      queryClient.invalidateQueries(['fee-search-student'])
    },
    onError: () => toast.error('Failed to update account')
  })

  // Bulk Import Logic
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
          toast.error('Excel sheet is empty');
          return;
        }
        
        mutBulk.mutate({ students: data });
      } catch (err) {
        toast.error('Failed to parse Excel file');
      } finally {
        if(fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const mutBulk = useMutation({
    mutationFn: (data) => accountsApi.bulkInitFeeProfiles(data).then(r=>r.data),
    onSuccess: (data) => {
      toast.success(`Bulk Profile Import: ${data.meta.successCount} Success, ${data.meta.failCount} Failed.`);
      if (data.meta.failCount > 0) {
        toast.error(`${data.meta.failCount} rows failed. Check console for details.`, { duration: 5000 });
        console.error('Bulk Import Errors:', data.meta.errors);
      }
      queryClient.invalidateQueries(['fee-search-student']);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to bulk import profiles')
  });

  const downloadSample = () => {
    const ws = xlsx.utils.json_to_sheet([{
      'Roll No': 'CSE21001',
      'Fee Category': 'GENERAL',
      'Hostel Room Type': '3-Seater Non-AC',
      'Bus Route Name': 'Route 1 (City Center)',
      'Mess Plan Name': 'Veg Standard'
    }]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Profiles");
    xlsx.writeFile(wb, "Student_Fee_Profiles_Template.xlsx");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Left Col: Search */}
      <div className="md:col-span-1 space-y-4">
        <div className="card p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="label mb-0">Search Student</label>
            <div className="flex gap-2">
              <button onClick={downloadSample} title="Download Template" className="p-1 bg-gray-100 rounded hover:bg-gray-200 text-gray-600">
                <Download size={16}/>
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={mutBulk.isPending}
                className="flex items-center gap-1 p-1 px-2.5 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] font-semibold hover:bg-green-100 uppercase tracking-widest transition disabled:opacity-50">
                <UploadCloud size={14}/> {mutBulk.isPending ? 'UPLOADING...' : 'EXCEL IMPORT'}
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
            <input type="text" placeholder="Name or Roll No (min 2 chars)" className="input pl-10" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          {searching && <p className="text-xs text-blue-500 mt-2">Searching...</p>}
          <div className="mt-4 space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {searchData?.data?.map(s => (
              <div key={s.id} onClick={()=>handleSelectStudent(s)}
                   className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition ${selectedStudent?.id===s.id?'border-blue-500 bg-blue-50/50':'border-gray-200'}`}>
                <p className="font-medium text-sm">{s.name}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-500 font-mono tracking-tight">{s.rollNo}</p>
                  {s.feeProfile ? <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded shadow-sm">Setup Done</span> 
                                : <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded shadow-sm border border-amber-200">Pending Setup</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Col: Setup Form */}
      <div className="md:col-span-2">
        {selectedStudent ? (
          <div className="card overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-white p-5 border-b flex gap-4 items-center">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-blue-50">
                <GraduationCap size={28}/>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-xl">{selectedStudent.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{selectedStudent.rollNo} • Batch {selectedStudent.batch?.year} • Sem {selectedStudent.currentSem}</p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {loadingAccount ? <Spinner /> : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="label">Fee Category</label>
                      <select className="input" value={f.category} onChange={e=>setF({...f,category:e.target.value})}>
                        {['GENERAL','OBC','SC','ST','EWS','TFW','MANAGEMENT'].map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider border-b pb-2">Facilities</h4>
                    
                    {/* Hostel Area */}
                    <div className="flex items-center gap-4 bg-orange-50/50 p-4 rounded-lg border border-orange-100">
                      <input type="checkbox" className="w-5 h-5 text-orange-600 rounded" checked={f.isHosteller} onChange={e=>setF({...f,isHosteller:e.target.checked})} />
                      <div className="flex-1">
                        <p className="font-medium text-orange-900">Hostel Facility</p>
                        {f.isHosteller && (
                          <select className="input mt-2 bg-white" value={f.hostelRoomId} onChange={e=>setF({...f,hostelRoomId:e.target.value})}>
                            <option value="">-- Choose Hostel Room --</option>
                            {hostelsData?.data?.map(h=><option key={h.id} value={h.id}>{h.roomType} (₹{Number(h.feeAmount).toLocaleString()})</option>)}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Bus Area */}
                    <div className="flex items-center gap-4 bg-teal-50/50 p-4 rounded-lg border border-teal-100">
                      <input type="checkbox" className="w-5 h-5 text-teal-600 rounded" checked={f.usesBus} onChange={e=>setF({...f,usesBus:e.target.checked})} />
                      <div className="flex-1">
                        <p className="font-medium text-teal-900">Transport Facility</p>
                        {f.usesBus && (
                          <select className="input mt-2 bg-white" value={f.busRouteId} onChange={e=>setF({...f,busRouteId:e.target.value})}>
                            <option value="">-- Choose Bus Route --</option>
                            {busesData?.data?.map(b=><option key={b.id} value={b.id}>{b.routeName} (₹{Number(b.feeAmount).toLocaleString()})</option>)}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Mess Area */}
                    <div className="flex items-center gap-4 bg-purple-50/50 p-4 rounded-lg border border-purple-100">
                      <input type="checkbox" className="w-5 h-5 text-purple-600 rounded" checked={f.usesMess} onChange={e=>setF({...f,usesMess:e.target.checked})} />
                      <div className="flex-1">
                        <p className="font-medium text-purple-900">Mess Facility</p>
                        {f.usesMess && (
                          <select className="input mt-2 bg-white" value={f.messPlanId} onChange={e=>setF({...f,messPlanId:e.target.value})}>
                            <option value="">-- Choose Mess Plan --</option>
                            {messData?.data?.map(m=><option key={m.id} value={m.id}>{m.planName} (₹{Number(m.feeAmount).toLocaleString()})</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                     <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider border-b pb-2">Scholarships</h4>
                     <div className="flex items-center gap-4 bg-purple-50/50 p-4 rounded-lg border border-purple-100">
                        <input type="checkbox" className="w-5 h-5 text-purple-600 rounded" checked={f.hasScholarship} onChange={e=>setF({...f,hasScholarship:e.target.checked})} />
                        <div className="flex-1">
                          <p className="font-medium text-purple-900">Applied for Scholarship</p>
                          {f.hasScholarship && (
                            <input type="text" placeholder="e.g. State Govt SC/ST Scholarship" className="input mt-2 bg-white" value={f.scholarshipName} onChange={e=>setF({...f,scholarshipName:e.target.value})} />
                          )}
                        </div>
                     </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex items-center justify-between shadow-sm mt-8">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Current Semester Ledger Base Due</p>
                      <h4 className="text-3xl font-bold text-slate-800">
                        {p?.ledgers?.find(l=>l.semester === selectedStudent.currentSem) 
                          ? `₹${Number(p.ledgers.find(l=>l.semester === selectedStudent.currentSem).netDue).toLocaleString()}` 
                          : 'Will calculate on save'}
                      </h4>
                    </div>
                    <button className="btn-primary py-3 px-6 shadow-md hover:shadow-lg transition-all" onClick={()=>mutSave.mutate()} disabled={mutSave.isPending}>
                      {mutSave.isPending ? 'Saving...' : 'Save Profile & Update Ledger'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyState icon={Info} text="Select a student" subtext="Search and select a student from the left panel to configure their fee profile." />
        )}
      </div>
    </div>
  )
}

function CourseMasterTab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [f, setF] = useState({ batchId: '', branchId: '', semester: '0', tuitionFee: '', hostelFee: '', busFee: '', messFee: '', otherFee: '' })
  const [deletingId, setDeletingId] = useState(null)

  const { data: qData, isLoading } = useQuery({ queryKey: ['fee-masters'], queryFn: () => accountsApi.getFeeMasters().then(r=>r.data) })
  const courseMasters = (qData?.data || []).filter(m => m.semester === 0)

  const { data: batches } = useQuery({ queryKey:['batches'], queryFn: () => api.get('/admin/batches').then(r=>r.data?.data) })
  const { data: branches }  = useQuery({ queryKey:['branches'],  queryFn: () => api.get('/admin/branches').then(r=>r.data?.data) })

  const mutCreate = useMutation({
    mutationFn: () => accountsApi.createFeeMaster(f),
    onSuccess: () => {
      toast.success('Course Master saved!')
      queryClient.invalidateQueries(['fee-masters'])
      setShowForm(false)
      setF({ ...f, tuitionFee:'', hostelFee:'', busFee:'', messFee:'', otherFee:'' })
    },
    onError: () => toast.error('Failed to save course master')
  })

  const mutDelete = useMutation({
    mutationFn: (id) => accountsApi.deleteFeeMaster(id),
    onSuccess: () => {
      toast.success('Course Master deleted')
      queryClient.invalidateQueries(['fee-masters'])
      setDeletingId(null)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to delete course master')
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl text-white shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
           <GraduationCap size={120}/>
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black italic tracking-tight">Full Course Master Setup</h2>
          <p className="text-slate-400 text-sm mt-1 font-medium">Define total program-level fees for 4-year / 3-year durations.</p>
        </div>
        <button onClick={()=>setShowForm(!showForm)} className="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-100 transition shadow-lg relative z-10">
          <Plus size={18}/> {showForm ? 'Close Form' : 'Setup New Program'}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 bg-slate-50 border-slate-200 shadow-inner">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
               <div>
                  <label className="label text-slate-500 font-bold uppercase text-[10px]">Target Academic Batch</label>
                  <select className="input h-12 border-slate-200" value={f.batchId} onChange={e=>setF({...f,batchId:e.target.value})}>
                    <option value="">Select Batch</option>
                    {batches?.map(b=><option key={b.id} value={b.id}>{b.year} Admissions</option>)}
                  </select>
               </div>
               <div>
                  <label className="label text-slate-500 font-bold uppercase text-[10px]">Target Branch / Department</label>
                  <select className="input h-12 border-slate-200" value={f.branchId} onChange={e=>setF({...f,branchId:e.target.value})}>
                    <option value="">Select Branch</option>
                    {branches?.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="col-span-2">
                  <label className="label text-blue-600 font-bold uppercase text-[10px]">Total Academic / Tuition Fee (Course Total)</label>
                  <input type="number" className="input h-12 border-blue-100 bg-blue-50/10 focus:bg-white" placeholder="₹ 0.00" value={f.tuitionFee} onChange={e=>setF({...f,tuitionFee:e.target.value})}/>
               </div>
               <div>
                  <label className="label text-orange-600 font-bold uppercase text-[10px]">Total Hostel Charges</label>
                  <input type="number" className="input h-12 border-orange-100 bg-orange-50/10 focus:bg-white" placeholder="₹ 0.00" value={f.hostelFee} onChange={e=>setF({...f,hostelFee:e.target.value})}/>
               </div>
               <div>
                  <label className="label text-teal-600 font-bold uppercase text-[10px]">Total Transport Fee</label>
                  <input type="number" className="input h-12 border-teal-100 bg-teal-50/10 focus:bg-white" placeholder="₹ 0.00" value={f.busFee} onChange={e=>setF({...f,busFee:e.target.value})}/>
               </div>
               <div>
                  <label className="label text-purple-600 font-bold uppercase text-[10px]">Total Mess Fee</label>
                  <input type="number" className="input h-12 border-purple-100 bg-purple-50/10 focus:bg-white" placeholder="₹ 0.00" value={f.messFee} onChange={e=>setF({...f,messFee:e.target.value})}/>
               </div>
               <div>
                  <label className="label text-slate-500 font-bold uppercase text-[10px]">Other Miscellaneous</label>
                  <input type="number" className="input h-12 border-slate-200" placeholder="₹ 0.00" value={f.otherFee} onChange={e=>setF({...f,otherFee:e.target.value})}/>
               </div>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button className="btn-outline px-8" onClick={()=>setShowForm(false)}>Discard</button>
            <button className="btn-primary px-10 h-11 bg-slate-900 border-none shadow-xl" onClick={()=>mutCreate.mutate()} disabled={mutCreate.isPending || !f.batchId || !f.branchId}> 
               {mutCreate.isPending ? 'Processing...' : 'Save Full Program Master'} 
            </button>
          </div>
        </div>
      )}

      {isLoading ? <Spinner /> : courseMasters.length === 0 ? (
        <EmptyState icon={Info} text="No program masters configured" subtext="Define the 4-year total fee to benchamrk student ledgers." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {courseMasters.map(m => (
            <div key={m.id} className="card p-6 border-l-8 border-l-slate-900 group relative">
               <button onClick={() => setDeletingId(m.id)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                  <Trash2 size={18} />
               </button>
               <h3 className="text-xl font-black text-slate-800 tracking-tight">{m.batch?.year} — {m.branch?.name}</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Global Course Master</p>
               
               <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-6">
                  <div className="flex justify-between border-b pb-1">
                     <span className="text-xs text-slate-500">Academic Total</span>
                     <span className="text-xs font-bold">₹{Number(m.tuitionFee||0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                     <span className="text-xs text-slate-500">Hostel Total</span>
                     <span className="text-xs font-bold">₹{Number(m.hostelFee||0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                     <span className="text-xs text-slate-500">Bus Total</span>
                     <span className="text-xs font-bold">₹{Number(m.busFee||0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                     <span className="text-xs text-slate-500">Mess Total</span>
                     <span className="text-xs font-bold">₹{Number(m.messFee||0).toLocaleString()}</span>
                  </div>
               </div>

               <div className="mt-6 flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Aggregate Program Value</span>
                  <span className="text-2xl font-black text-slate-900">₹{Number(m.totalFee).toLocaleString()}</span>
               </div>
            </div>
          ))}
        </div>
      )}

      {deletingId && (
        <ConfirmDialog 
          title="Remove Course Master?"
          message="This will remove the global benchmark for this batch/branch. Ledger totals will revert to summing semesters."
          onConfirm={() => mutDelete.mutate(deletingId)}
          onCancel={() => setDeletingId(null)}
          loading={mutDelete.isPending}
        />
      )}
    </div>
  )
}
