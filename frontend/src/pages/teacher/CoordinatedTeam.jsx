import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { teacherApi } from '../../api/all.api'
import { PageTitle, Spinner, EmptyState } from '../../components/Shared'
import { Users, User, Building2, BookOpen, ChevronLeft, ArrowRight, UploadCloud, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CoordinatedTeam() {
  const { subjectId } = useParams()
  const [examNo, setExamNo] = useState('1')
  const [isUploading, setIsUploading] = useState(false)

  const { data, isLoading } = useQuery({ 
    queryKey: ['teacher-coordinated-team', subjectId], 
    queryFn: () => teacherApi.getCoordinatedTeam(subjectId).then(r => r.data) 
  })

  const { data: analysisData, isLoading: loadingAnalysis } = useQuery({
    queryKey: ['teacher-coordinated-marks-analysis', subjectId],
    queryFn: () => teacherApi.getCoordinatedMarksAnalysis(subjectId).then(r => r.data),
    enabled: !!subjectId
  })

  if (isLoading) return <Spinner />
  const team = data?.data || { assignments: [], sectionAssignments: [] }
  
  // Combine assignments to a unified list
  const allTeam = [
    ...(team.assignments || []).map(a => ({
      class: a.class ? `${a.class.branch?.name || 'N/A'} ${a.class.batch?.year || ''} (Sem ${a.class.semester || '?'})` : 'Unknown Class',
      classNameId: `${a.classId}:${a.groupId || 'FULL'}`,
      semester: a.class?.semester,
      teacher: a.teacher?.name || 'Unknown Teacher',
      teacherId: a.teacher?.employeeId || 'N/A',
      dept: a.teacher?.department || 'N/A',
      group: a.group?.groupName || 'Full Class',
      type: 'Dynamic'
    })),
    ...(team.sectionAssignments || []).map(a => ({
      class: a.section?.displayName || 'Unknown Section',
      classNameId: `${a.sectionId}:FULL`,
      semester: a.section?.semester || a.subject?.semester || 1,
      teacher: a.teacher?.name || 'Unknown Teacher',
      teacherId: a.teacher?.employeeId || 'N/A',
      dept: a.teacher?.department || 'N/A',
      group: a.labGroup?.name || 'Section-wide',
      type: 'Permanent'
    }))
  ]

  const cy = new Date().getFullYear()
  const ay = new Date().getMonth() >= 6 ? `${cy}-${cy+1}` : `${cy-1}-${cy}`
  const semester = allTeam[0]?.semester || 1



  const submissions = analysisData?.data?.submissions || []
  const exams = analysisData?.data?.exams || []
  const classAssignments = analysisData?.data?.classAssignments || []
  const currentExamPaperUrl = exams.find(ex => String(ex.examNo) === String(examNo))?.questionPaperUrl
  const enrollments = analysisData?.data?.enrollments || []

  // Build aggregated student list using enrollments as ground truth
  const studentMap = {}

  enrollments.forEach(enc => {
    const s = enc.student
    if (!s) return
    
    // Find matching class assignment
    // Student's class is determined by branchId, batchId, currentSem
    const matchedAssignment = classAssignments.find(ca => 
      ca.class?.branchId === s.branchId && 
      ca.class?.batchId === s.batchId && 
      ca.class?.semester === s.currentSem
    )

    // Determine Group name
    const groupName = s.classGroups?.[0]?.group?.groupName || 'Full Class'
    const teacherName = matchedAssignment?.teacher?.name || 'N/A'

    studentMap[s.id] = {
      id: s.id,
      name: s.name,
      rollNo: s.rollNo,
      teacher: teacherName,
      group: groupName,
      assignment: 0,
      exams: {}
    }
  })

  // Map internal marks
  submissions.forEach(sub => {
    if (studentMap[sub.studentId]) {
      studentMap[sub.studentId].assignment = sub.marksObtained
    }
  })
  
  // Map exam marks
  exams.forEach(ex => {
    ex.results.forEach(res => {
      if (studentMap[res.studentId]) {
        studentMap[res.studentId].exams[ex.examNo] = Number(res.secA) + Number(res.secB) + Number(res.secC)
      }
    })
  })

  const aggregatedStudents = Object.values(studentMap).sort((a,b) => a.rollNo.localeCompare(b.rollNo))

  const downloadCSV = () => {
    const headers = ['Student Name', 'Roll No', 'Section/Group', 'Assigned Teacher', 'Mid-1 (/24)', 'Mid-2 (/24)', 'Mid-3 (/24)', 'Assignment (/10)'];
    const rows = aggregatedStudents.map(s => [
      `"${s.name}"`,
      `"${s.rollNo}"`,
      `"${s.group}"`,
      `"${s.teacher}"`,
      s.exams[1] !== undefined ? s.exams[1] : '-',
      s.exams[2] !== undefined ? s.exams[2] : '-',
      s.exams[3] !== undefined ? s.exams[3] : '-',
      s.assignment || '-'
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Performance_Report_${subjectId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6 pb-12">
      <Link to="/teacher/coordinated" className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
        <ChevronLeft size={14}/> Back to Subjects
      </Link>
      
      <PageTitle title="Course Team Analysis" />

      {allTeam.length === 0 ? (
        <EmptyState icon={Users} text="No faculty assigned" subtext="There are currently no teachers assigned to any sections for this course." />
      ) : (
        <div className="space-y-6">

          {/* Bulk Exam Paper Upload Card */}
          <div className="card p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <UploadCloud size={18} className="text-indigo-600"/>
                Distribute Common Question Paper
              </h3>
              <p className="text-xs text-slate-500 mt-1">Upload a question paper and it will instantly sync to all {allTeam.length} sections.</p>
            </div>
            <div className="flex items-center gap-3">
              <select 
                value={examNo} 
                onChange={e => setExamNo(e.target.value)}
                className="input w-32 border-indigo-200 py-1.5 text-xs font-semibold focus:ring-indigo-500"
              >
                <option value="1">Exam 1 (Mid-1)</option>
                <option value="2">Exam 2 (Mid-2)</option>
                <option value="3">Exam 3 (Mid-3)</option>
              </select>
              {currentExamPaperUrl && (
                <a 
                  href={currentExamPaperUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs py-2 px-4 rounded font-semibold flex items-center gap-2 shadow-sm"
                >
                  <BookOpen size={16}/> View Paper
                </a>
              )}
              <input 

                type="file" 
                accept=".pdf,.jpg,.jpeg,.png" 
                id="common-paper-upload" 
                className="hidden"
                disabled={isUploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setIsUploading(true)
                  const tId = toast.loading('Syncing paper to all sections...')
                  
                  try {
                    const formData = new FormData()
                    formData.append('paper', file)
                    formData.append('examNo', examNo)
                    // Use current academic year for mapping
                    const cy = new Date().getFullYear()
                    const ay = new Date().getMonth() >= 6 ? `${cy}-${cy+1}` : `${cy-1}-${cy}`
                    formData.append('academicYear', ay)
                    // Assume semester comes from the first section mapping
                    formData.append('semester', allTeam[0]?.semester || 1)
                    // Send unique class names to upsert
                    const classesToSync = [...new Set(allTeam.map(t => t.classNameId))]
                    formData.append('classNames', JSON.stringify(classesToSync))

                    await teacherApi.uploadCoordinatedExamPaper(subjectId, formData)
                    toast.success(`Question paper successfully distributed to ${classesToSync.length} sections!`, { id: tId })
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to upload common paper', { id: tId })
                  } finally {
                    setIsUploading(false)
                    e.target.value = ''
                  }
                }}
              />
              <label htmlFor="common-paper-upload" className={`btn-primary text-xs cursor-pointer py-1.5 px-4 rounded shadow-sm ${isUploading ? 'opacity-50 cursor-not-allowed bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold'}`}>
                {isUploading ? 'Uploading...' : 'Bulk Upload'}
              </label>
            </div>
          </div>

          {/* Summary Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="card p-5 border-l-4 border-l-indigo-500 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Faculty</p>
                <p className="text-3xl font-black text-slate-800">{new Set(allTeam.map(t => t.teacherId)).size}</p>
             </div>
             <div className="card p-5 border-l-4 border-l-emerald-500 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Sections</p>
                <p className="text-3xl font-black text-slate-800">{allTeam.length}</p>
             </div>
          </div>

          {/* Team Table */}
          <div className="card overflow-hidden border-none shadow-sm ring-1 ring-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b">
                    <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Academic Team Member</th>
                    <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Class / Section</th>
                    <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Division/Group</th>
                    <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Assignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allTeam.map((member, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                            {member.teacher.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700">{member.teacher}</p>
                            <p className="text-[10px] text-slate-400 font-medium">ID: {member.teacherId || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2 text-slate-600">
                            <Building2 size={14} className="text-slate-300"/>
                            <span className="font-semibold">{member.class}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-tighter border border-slate-200">
                          {member.group}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-xl text-[10px] font-bold ${member.type === 'Permanent' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                          {member.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Student Marks Analysis Table */}
      {allTeam.length > 0 && (
        <div className="mt-8 space-y-4">
          <PageTitle title="Student Performance Analysis">
            <button 
              onClick={downloadCSV} 
              className="btn-primary flex items-center gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded shadow-sm"
            >
              <Download size={16}/> Download CSV Report
            </button>
          </PageTitle>
          {loadingAnalysis ? (
            <Spinner />
          ) : aggregatedStudents.length === 0 ? (
            <EmptyState icon={Users} text="No students found" subtext="There are no students enrolled or no marks uploaded yet." />
          ) : (
            <div className="card overflow-hidden border-none shadow-sm ring-1 ring-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 border-b">
                      <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Student Name</th>
                      <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Roll No</th>
                      <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Section/Group</th>
                      <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Assigned Teacher</th>
                      <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Mid-1 (/24)</th>
                      <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Mid-2 (/24)</th>
                      <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Mid-3 (/24)</th>
                      <th className="text-left px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Assignment (/10)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {aggregatedStudents.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-700">{s.name}</td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">{s.rollNo}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded text-[10px] uppercase tracking-tighter">
                            {s.group}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-600">{s.teacher}</td>
                        <td className="px-6 py-4 font-semibold text-slate-600">{s.exams[1] !== undefined ? s.exams[1] : '-'}</td>
                        <td className="px-6 py-4 font-semibold text-slate-600">{s.exams[2] !== undefined ? s.exams[2] : '-'}</td>
                        <td className="px-6 py-4 font-semibold text-slate-600">{s.exams[3] !== undefined ? s.exams[3] : '-'}</td>
                        <td className="px-6 py-4 font-semibold text-indigo-600">{s.assignment || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
