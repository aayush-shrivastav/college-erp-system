// src/pages/teacher/Marks.jsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teacherApi } from '../../api/all.api'
import { PageTitle, Spinner, EmptyState } from '../../components/Shared'
import toast from 'react-hot-toast'
import { Save, BookOpen, Lock } from 'lucide-react'

export default function TeacherMarks() {
  const queryClient = useQueryClient()
  const [entryType, setEntryType] = useState('1') // '1','2','3' for exams, 'A' for assignment, 'L' for lab
  const [assignmentId, setAssignmentId] = useState('')
  const [marksState, setMarksState] = useState({})
  const [saving, setSaving] = useState(null)

  const isAssignment = entryType === 'A'
  const isLab = entryType === 'L'

  const { data: assignmentsData, isLoading: loadingAssignments } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: () => teacherApi.getMyAssignments().then(r => r.data)
  })

  const { data: entryData, isLoading: loadingData } = useQuery({
    queryKey: ['teacher-marks-entry', assignmentId, entryType],
    queryFn: () => (isAssignment || isLab)
      ? teacherApi.getAssignmentMarks(assignmentId).then(r => r.data)
      : teacherApi.getExamData(assignmentId, entryType).then(r => r.data),
    enabled: !!assignmentId && !!entryType,
  })

  const assignments = assignmentsData?.data || []
  const examInfo = !isAssignment ? entryData?.data?.exam : null
  const students = entryData?.data?.students || []

  // Initialize local marks state when data loads
  useEffect(() => {
    if (students.length > 0) {
      const init = {}
      students.forEach(s => {
        if (isAssignment) {
          init[s.id] = { marks: s.marks ?? '' }
        } else {
          init[s.id] = {
            secA: s.marks?.secA ?? '',
            secB: s.marks?.secB ?? '',
            secC: s.marks?.secC ?? ''
          }
        }
      })
      setMarksState(init)
    } else {
      setMarksState({})
    }
  }, [students, isAssignment])

  // Set default assignment
  useEffect(() => {
    if (assignments.length > 0 && !assignmentId) {
      setAssignmentId(assignments[0].id)
    }
  }, [assignments, assignmentId])

  const setMark = (sid, field, val) => {
    if (examInfo?.isLocked) return;
    const maxVal = isLab ? 25 : isAssignment ? 10 : 8
    const n = val === '' ? '' : Math.min(maxVal, Math.max(0, Number(val) || 0))
    setMarksState(p => ({...p, [sid]: {...p[sid], [field]:n}}))
  }

  const examTotal = (sid) => { 
    const m = marksState[sid] || {}
    return (Number(m.secA)||0) + (Number(m.secB)||0) + (Number(m.secC)||0) 
  }

  async function save(student) {
    if (examInfo?.isLocked) {
      toast.error('This exam is locked and cannot be modified.')
      return
    }

    const m = marksState[student.id]
    if (!m) { toast.error('Please enter valid marks!'); return }
    
    setSaving(student.id)
    try {
      if (isAssignment || isLab) {
        const assignment = assignments.find(a => a.id === assignmentId)
        const currentYear = new Date().getFullYear();
        const ay = new Date().getMonth() >= 6 ? `${currentYear}-${currentYear+1}` : `${currentYear-1}-${currentYear}`;
        
        await teacherApi.upsertAssignmentMarks(student.id, assignment.subjectId, {
          marks: Number(m.marks) || 0,
          academicYear: ay,
          semester: assignment.class.semester
        })
      } else {
        await teacherApi.upsertMarks(examInfo.id, student.id, { 
          secA: Number(m.secA) || 0, 
          secB: Number(m.secB) || 0, 
          secC: Number(m.secC) || 0 
        })
      }
      toast.success(`${student.name}'s marks saved!`)
    } catch(e) {
      const code = e.response?.data?.error?.code
      if (code === 'EXAM_LOCKED') toast.error('Exam has been locked by admin!')
      else if (code === 'MARKS_EXCEED_MAX') toast.error(isLab ? 'Maximum 25 marks allowed!' : isAssignment ? 'Maximum 10 marks allowed!' : 'Maximum 8 marks allowed per section!')
      else toast.error('Failed to save marks')
    } finally { 
      setSaving(null) 
    }
  }

  const lockMut = useMutation({
    mutationFn: () => teacherApi.lockExam(examInfo.id),
    onSuccess: () => {
      toast.success('Exam locked successfully!')
      queryClient.invalidateQueries(['teacher-marks-entry', assignmentId, entryType])
    },
    onError: () => toast.error('Failed to lock exam')
  })

  if (loadingAssignments) return <Spinner />

  return (
    <div className="space-y-6">
      <PageTitle title="Marks Entry">
        <select 
          value={entryType} 
          onChange={e=>setEntryType(e.target.value)} 
          className="input w-40 border-blue-200 focus:border-blue-500 font-medium"
        >
          <option value="1">Exam 1 (Mid-1)</option>
          <option value="2">Exam 2 (Mid-2)</option>
          <option value="3">Exam 3 (Mid-3)</option>
          <option value="A">Assignment (max 10)</option>
          <option value="L">Lab Practical (max 25)</option>
        </select>
      </PageTitle>

      {/* Assignment Selection */}
      <div className="card p-4">
        {assignments.length > 0 ? (
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Select Class & Subject:</span>
            <select 
              value={assignmentId} 
              onChange={e => setAssignmentId(e.target.value)} 
              className="input w-full bg-blue-50/50 border-blue-200 text-blue-900 font-medium"
            >
              <option value="" disabled>Select Assignment...</option>
              {assignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.subject.name} ({a.subject.code}) — {a.class.branch.name} {a.class.batch.year} (Sem {a.class.semester})
                  {a.group ? ` — ${a.group.groupName}` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No subjects assigned to you for this session.</p>
        )}
      </div>

      {/* Upload Question Paper */}
      {!isAssignment && examInfo && (
        <div className="card p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Question Paper Management</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {examInfo.questionPaperUrl ? 'A common question paper has been synced for this exam.' : 'No question paper uploaded yet.'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {examInfo.questionPaperUrl && (
              <a 
                href={examInfo.questionPaperUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="btn bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 text-xs py-2 px-4 rounded font-bold flex items-center gap-2 shadow-sm"
              >
                <BookOpen size={16}/> Download / View Paper
              </a>
            )}

            {entryData?.data?.isCoordinator && (
              <div>
                <input 
                  type="file" 
                  accept=".pdf,.jpg,.jpeg,.png" 
                  id="paper-upload" 
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    
                    const formData = new FormData()
                    formData.append('paper', file)
                    
                    const tId = toast.loading('Uploading paper...')
                    try {
                      await teacherApi.uploadExamPaper(examInfo.id, formData)
                      toast.success('Paper uploaded successfully!', { id: tId })
                      queryClient.invalidateQueries(['teacher-marks-entry', assignmentId, entryType])
                    } catch(err) {
                      toast.error(err.response?.data?.message || 'Upload failed', { id: tId })
                    }
                  }}
                />
                <label htmlFor="paper-upload" className="btn-primary bg-indigo-600 hover:bg-indigo-700 text-xs cursor-pointer py-2 px-4 rounded font-semibold text-white">
                  {examInfo.questionPaperUrl ? 'Update Paper' : 'Upload Paper'}
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {loadingData ? (
        <div className="py-12"><Spinner /></div>
      ) : !assignmentId ? (
         <EmptyState icon={BookOpen} text="Select a subject" subtext="Please select a subject above to enter marks" />
      ) : students.length === 0 ? (
        <EmptyState icon={BookOpen} text="No students found" subtext="There are no students enrolled in this assignment." />
      ) : (
        <div className="card overflow-hidden">
          {examInfo?.isLocked && (
            <div className="bg-amber-50 px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800">
                <Lock size={16} />
                <span className="text-sm font-medium">This exam record is locked. Modifications are disabled.</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Student</th>
                  {(isAssignment || isLab) ? (
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                      {isLab ? 'Lab Practical Marks (out of 25)' : 'Assignment Marks (out of 10)'}
                    </th>
                  ) : (
                    <>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Sec A /8</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Sec B /8</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Sec C /8</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Total</th>
                    </>
                  )}
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map(s => {
                  const m = marksState[s.id] || {}
                  const isLocked = examInfo?.isLocked
                  
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{s.rollNo}</p>
                      </td>
                      
                      {(isAssignment || isLab) ? (
                        <td className="px-4 py-3">
                          <input 
                            type="number" min="0" max={isLab ? 25 : 10} 
                            value={m.marks ?? ''} 
                            onChange={e => setMark(s.id, 'marks', e.target.value)}
                            className={`w-24 text-center border rounded px-2 py-1.5 focus:outline-none focus:ring-2 ${isLab ? 'focus:ring-emerald-400 border-emerald-300' : 'focus:ring-purple-400 border-gray-300'}`}
                          />
                          <span className="ml-2 text-xs text-gray-400">/ {isLab ? 25 : 10}</span>
                        </td>
                      ) : (
                        <>
                          {['secA','secB','secC'].map(f => (
                            <td key={f} className="px-4 py-3">
                              <input 
                                type="number" min="0" max="8" 
                                value={m[f] ?? ''} 
                                onChange={e => setMark(s.id, f, e.target.value)}
                                disabled={isLocked}
                                className={`w-16 text-center border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 ${isLocked ? 'bg-gray-100 text-gray-500 border-gray-200' : 'border-gray-300'}`}
                              />
                            </td>
                          ))}
                          <td className="px-4 py-3">
                            <span className={`font-bold text-lg ${examTotal(s.id) > 18 ? 'text-green-600' : examTotal(s.id) > 12 ? 'text-blue-600' : 'text-gray-700'}`}>
                              {examTotal(s.id)}/24
                            </span>
                          </td>
                        </>
                      )}

                      <td className="px-4 py-3">
                        <button 
                          onClick={() => save(s)} 
                          disabled={saving === s.id || isLocked}
                          className={`flex items-center gap-1.5 text-white px-4 py-2 rounded-lg text-xs font-medium transition ${isAssignment ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50`}
                        >
                          <Save size={14}/>
                          {saving === s.id ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!isAssignment && !examInfo?.isLocked && students.length > 0 && (
            <div className="bg-gray-50 p-4 border-t flex justify-end">
              <button 
                onClick={() => {
                  if(window.confirm('Are you sure you want to lock this exam? You will not be able to edit marks after locking.')) {
                    lockMut.mutate()
                  }
                }}
                disabled={lockMut.isPending}
                className="btn-outline border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Lock size={16}/> Lock Exam Records
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
