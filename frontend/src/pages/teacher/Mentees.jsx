// src/pages/teacher/Mentees.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { teacherApi } from '../../api/all.api'
import { Spinner, PageTitle, EmptyState, Modal } from '../../components/Shared'
import FeeDetails from '../../components/Shared/FeeDetails'
import { Users, Eye } from 'lucide-react'
import api from '../../api/axios'

export default function TeacherMentees() {
  const [selectedStudent, setSelectedStudent] = useState(null) // { id, name }

  const { data, isLoading } = useQuery({
    queryKey: ['mentees'],
    queryFn: () => teacherApi.getMentees().then(r => r.data)
  })

  // Fetch full fee details when a student is selected
  const { data: feeDetailData, isLoading: feeLoading } = useQuery({
    queryKey: ['mentee-fee', selectedStudent?.id],
    queryFn: () => api.get(`/teacher/mentees/${selectedStudent.id}/fee-account`).then(r => r.data),
    enabled: !!selectedStudent?.id
  })

  // Use detailed data if loaded, else fall back to summary from mentees list
  const feeData = feeDetailData?.data ?? selectedStudent?.feeAccount

  if (isLoading) return <Spinner />
  const mentees = data?.data || []

  return (
    <div>
      <PageTitle title="My Mentees" subtitle={`${mentees.length} students`} />

      {mentees.length === 0
        ? <EmptyState icon={Users} text="No mentees assigned" subtext="Contact admin to assign mentees"/>
        : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Roll No','Name','Batch','Sem','Profile','Fee Paid','Outstanding','Details'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {mentees.map(s => {
                  const bal = s.feeAccount
                    ? Number(s.feeAccount.totalPayable) - Number(s.feeAccount.totalPaid)
                    : null
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-blue-600 text-sm">{s.rollNo}</td>
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-gray-500">{s.batch?.year}</td>
                      <td className="px-4 py-3">
                        <span className="badge-blue">Sem {s.currentSem}</span>
                      </td>
                      <td className="px-4 py-3">
                        {s.profileLocked
                          ? <span className="badge-green">✓ Done</span>
                          : <span className="badge-amber">Pending</span>}
                      </td>
                      <td className="px-4 py-3 text-green-600 font-medium">
                        {s.feeAccount ? `₹${Number(s.feeAccount.totalPaid).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {bal !== null
                          ? <span className={`font-medium ${bal > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ₹{bal.toLocaleString()}
                            </span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedStudent({ id: s.id, name: s.name, feeAccount: s.feeAccount })}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                          <Eye size={13}/> View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Fee Details Modal */}
      {selectedStudent && (
        <Modal
          title={`Fee Details — ${selectedStudent.name}`}
          onClose={() => setSelectedStudent(null)}
          size="lg">
          {feeLoading
            ? <Spinner />
            : <FeeDetails
                fee={feeData}
                showName={false}
              />
          }
        </Modal>
      )}
    </div>
  )
}
