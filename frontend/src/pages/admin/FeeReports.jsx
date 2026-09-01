import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageTitle, Spinner, FormField } from '../../components/Shared'
import { FileText, Download } from 'lucide-react'
import { adminApi } from '../../api/admin.api'
import api from '../../api/axios'

export default function AdminFeeReports() {
  const [batchId, setBatchId] = useState('')
  const [status, setStatus] = useState('all') // all | paid | defaulter

  // Batches for dropdown
  const batchesQ = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get('/admin/batches').then(res => res.data.data)
  })

  // Fee Report Data
  const reportQ = useQuery({
    queryKey: ['admin-fee-report', batchId, status],
    queryFn: () => adminApi.getFeeReportsStatus({ batchId, status }).then(res => res.data.data),
    enabled: !!batchId
  })

  return (
    <div className="space-y-6">
      <PageTitle title="Batch-wise Fee Reports" subtitle="View fee defaulters and collections by batch">
        {reportQ.data?.length > 0 && (
          <button className="btn-outline flex items-center gap-2"
            onClick={() => {
              const headers = ['Roll No', 'Name', 'Phone', 'Branch', 'Payable', 'Paid', 'Outstanding']
              const csv = [
                headers.join(','),
                ...reportQ.data.map(r => [
                  r.rollNo, `"${r.name}"`, r.phone, r.branch, 
                  r.payable, r.paid, r.outstanding
                ].join(','))
              ].join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `fee-report-${status}-${new Date().toISOString().split('T')[0]}.csv`
              a.click()
            }}>
            <Download size={16}/> Export CSV
          </button>
        )}
      </PageTitle>

      {/* Filters */}
      <div className="card p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-5 mb-5">
          <FormField label="Select Batch" required>
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="input">
              <option value="">-- Choose Batch --</option>
              {batchesQ.data?.map(b => (
                <option key={b.id} value={b.id}>Batch {b.year}</option>
              ))}
            </select>
          </FormField>
          
          <FormField label="Fee Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
              <option value="all">All Students</option>
              <option value="paid">Fully Paid</option>
              <option value="defaulter">Defaulters (Pending Dues)</option>
            </select>
          </FormField>
        </div>

        {/* Results */}
        {!batchId ? (
          <div className="text-center py-10 text-gray-400">
            <FileText size={48} className="mx-auto mb-3 opacity-20" />
            <p>Select a batch to view the fee report</p>
          </div>
        ) : reportQ.isLoading ? (
          <Spinner />
        ) : reportQ.data?.length > 0 ? (
          <div className="overflow-x-auto">
            <p className="text-sm text-gray-500 mb-3">Showing {reportQ.data.length} student(s)</p>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Roll No', 'Student', 'Branch', 'Status', 'Payable (₹)', 'Paid (₹)', 'Outstanding (₹)'].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-medium text-gray-500 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {reportQ.data.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-gray-500 text-xs">{s.rollNo}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.phone}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{s.branch}</td>
                    <td className="py-3 px-4">
                      {!s.isSetup ? <span className="badge-amber">Not Setup</span> :
                        s.outstanding > 0 ? <span className="badge-red">Defaulter</span> :
                        <span className="badge-green">Paid</span>}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-600">{s.payable.toLocaleString()}</td>
                    <td className="py-3 px-4 font-semibold text-green-600">{s.paid.toLocaleString()}</td>
                    <td className={`py-3 px-4 font-bold ${s.outstanding > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {s.outstanding.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500 text-sm">
            No students found matching these filters.
          </div>
        )}
      </div>
    </div>
  )
}
