// src/pages/accounts/Fines.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from '../../api/all.api'
import { PageTitle, FormField, Modal, Spinner } from '../../components/Shared'
import toast from 'react-hot-toast'
import { Plus, CheckCircle, IndianRupee } from 'lucide-react'

export default function AccountsFines() {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ studentId:'', reason:'', amount:'' })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey:['fines'], queryFn:()=>accountsApi.getFines().then(r=>r.data) })
  const addMut  = useMutation({ mutationFn:()=>accountsApi.addFine(form), onSuccess:()=>{ toast.success('Fine added successfully'); qc.invalidateQueries(['fines']); setShowAdd(false) } })
  const waiveMut = useMutation({ mutationFn:(id)=>accountsApi.waiveFine(id,{reason:'Waived by accounts'}), onSuccess:()=>{ toast.success('Fine waived successfully'); qc.invalidateQueries(['fines']) } })
  const payMut = useMutation({ mutationFn:(id)=>accountsApi.payFine(id,{paymentMode:'CASH'}), onSuccess:()=>{ toast.success('Fine marked as paid! Receipt generated.'); qc.invalidateQueries(['fines']); qc.invalidateQueries(['accounts-dashboard']) }, onError: e => toast.error(e.response?.data?.message || 'Error processing payment') })
  const fines = data?.data || []
  return (
    <div>
      <PageTitle title="Fines" subtitle={`${fines.length} total`}>
        <button onClick={()=>setShowAdd(true)} className="btn-primary flex items-center gap-2"><Plus size={14}/>Add Fine</button>
      </PageTitle>
      {isLoading ? <Spinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>{['Student','Reason','Amount','Date','Status','Action'].map(h=><th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {fines.map(f=>(
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{f.student?.rollNo||f.studentId.slice(0,8)+'...'}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{f.reason}</td>
                  <td className="px-4 py-3 font-medium text-red-600">₹{Number(f.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(f.fineDate).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3">{f.isPaid?<span className="badge-green">Paid</span>:<span className="badge-red">Unpaid</span>}</td>
                  <td className="px-4 py-3">
                    {!f.isPaid && (
                      <div className="flex items-center gap-3">
                        <button onClick={()=>payMut.mutate(f.id)} className="flex items-center gap-1 text-blue-600 text-xs font-bold hover:text-blue-800"><IndianRupee size={13}/>Pay Cash</button>
                        <button onClick={()=>waiveMut.mutate(f.id)} className="flex items-center gap-1 text-green-600 text-xs hover:text-green-800"><CheckCircle size={13}/>Waive</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {fines.length===0&&<tr><td colSpan={6} className="text-center py-8 text-gray-400">No fines found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {showAdd&&<Modal title="Fine Add Karo" onClose={()=>setShowAdd(false)}><div className="space-y-4">
        <FormField label="Student ID / Roll No"><input value={form.studentId} onChange={e=>setForm(p=>({...p,studentId:e.target.value}))} className="input" placeholder="e.g. 250010 or UUID"/></FormField>
        <FormField label="Reason"><input value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} className="input" placeholder="Late fee / Damage..."/></FormField>
        <FormField label="Amount (₹)"><input type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} className="input" placeholder="500"/></FormField>
        <div className="flex gap-3"><button onClick={()=>setShowAdd(false)} className="flex-1 btn-outline">Cancel</button><button onClick={()=>addMut.mutate()} disabled={addMut.isPending||!form.studentId||!form.reason||!form.amount} className="flex-1 btn-primary">{addMut.isPending?'...':'Add Fine'}</button></div>
      </div></Modal>}
    </div>
  )
}
