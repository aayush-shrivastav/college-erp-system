// src/pages/student/Subjects.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { studentApi } from '../../api/all.api'
import { PageTitle, Spinner, EmptyState } from '../../components/Shared'
import { BookOpen, FlaskConical, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../../api/axios'

const TYPE_ICON  = { THEORY: BookOpen, LAB: FlaskConical, ELECTIVE: Lightbulb }
const TYPE_COLOR = { THEORY: 'badge-blue', LAB: 'badge-green', ELECTIVE: 'badge-purple' }
const TYPE_BG    = { THEORY: 'bg-blue-50 text-blue-700', LAB: 'bg-green-50 text-green-700', ELECTIVE: 'bg-purple-50 text-purple-700' }

export default function StudentSubjects() {
  const [view,      setView]      = useState('current')  // current | all
  const [selType,   setSelType]   = useState('ALL')

  // Student profile (to know current sem)
  const { data: profileData } = useQuery({
    queryKey: ['student-profile'],
    queryFn:  () => studentApi.getProfile().then(r => r.data)
  })

  // All enrolled subjects
  const { data: subjData, isLoading } = useQuery({
    queryKey: ['student-subjects'],
    queryFn:  () => api.get('/student/subjects').then(r => r.data)
  })

  const profile    = profileData?.data
  const currentSem = profile?.currentSem || 1
  const allSubjects= subjData?.data || []

  // Filter by current/all
  const byView = view === 'current'
    ? allSubjects.filter(s => s.semester === currentSem)
    : allSubjects

  // Filter by type
  const filtered = selType === 'ALL' ? byView : byView.filter(s => s.subjectType === selType)

  // Group by semester
  const bySem = {}
  for (const s of filtered) {
    if (!bySem[s.semester]) bySem[s.semester] = []
    bySem[s.semester].push(s)
  }
  const semesters = Object.keys(bySem).map(Number).sort((a,b) => a-b)

  // Stats
  const theory   = allSubjects.filter(s => s.subjectType === 'THEORY' && s.semester === currentSem).length
  const lab      = allSubjects.filter(s => s.subjectType === 'LAB'    && s.semester === currentSem).length
  const elective = allSubjects.filter(s => s.subjectType === 'ELECTIVE'&& s.semester === currentSem).length
  const totalCredits = allSubjects
    .filter(s => s.semester === currentSem)
    .reduce((sum, s) => sum + (s.credits || 0), 0)

  return (
    <div>
      <PageTitle title="My Subjects" subtitle={`Semester ${currentSem} — ${profile?.name || ''}`} />

      {/* Current Sem Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatPill label="Total Subjects" value={allSubjects.filter(s=>s.semester===currentSem).length} color="blue"/>
        <StatPill label="Theory"         value={theory}   color="blue"/>
        <StatPill label="Lab"            value={lab}      color="green"/>
        <StatPill label="Total Credits"  value={totalCredits} color="purple"/>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-wrap gap-4 items-center">
        {/* Current / All toggle */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5 font-medium">View</p>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button onClick={() => setView('current')}
              className={`px-4 py-1.5 text-xs font-medium transition ${view==='current' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              Current Sem ({currentSem})
            </button>
            <button onClick={() => setView('all')}
              className={`px-4 py-1.5 text-xs font-medium border-l transition ${view==='all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              All Semesters
            </button>
          </div>
        </div>

        {/* Type filter */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5 font-medium">Type</p>
          <div className="flex gap-1.5">
            {['ALL','THEORY','LAB','ELECTIVE'].map(t => (
              <button key={t} onClick={() => setSelType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  selType === t ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}>{t === 'ALL' ? 'All' : t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Subject List */}
      {isLoading ? <Spinner /> : semesters.length === 0 ? (
        <EmptyState icon={BookOpen}
          text={view === 'current' ? 'No subjects found for this semester' : 'No enrolled subjects'}
          subtext="Subjects will appear after registration is approved" />
      ) : (
        <div className="space-y-4">
          {semesters.map(sem => (
            <SemGroup key={sem} sem={sem} subjects={bySem[sem]} currentSem={currentSem} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Semester Group ─────────────────────────────────────────────────────────
function SemGroup({ sem, subjects, currentSem }) {
  const [open, setOpen] = useState(true)
  const isCurrent = sem === currentSem
  const totalCr = subjects.reduce((s, x) => s + (x.credits || 0), 0)

  return (
    <div className={`card overflow-hidden ${isCurrent ? 'ring-2 ring-blue-400' : ''}`}>
      <button onClick={() => setOpen(!open)}
        className={`w-full flex justify-between items-center px-5 py-3.5 transition ${isCurrent ? 'bg-blue-50 hover:bg-blue-100' : 'bg-gray-50 hover:bg-gray-100'}`}>
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center ${isCurrent ? 'bg-blue-600' : 'bg-slate-500'}`}>
            {sem}
          </span>
          <div className="text-left">
            <span className="font-semibold text-gray-800">Semester {sem}</span>
            {isCurrent && <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Current</span>}
          </div>
          <span className="text-xs text-gray-400">{subjects.length} subjects · {totalCr} credits</span>
        </div>
        {open ? <ChevronUp size={15} className="text-gray-400"/> : <ChevronDown size={15} className="text-gray-400"/>}
      </button>

      {open && (
        <>
          {/* Group by type inside sem */}
          {['THEORY','LAB','ELECTIVE'].map(type => {
            const typeSubj = subjects.filter(s => s.subjectType === type)
            if (typeSubj.length === 0) return null
            const Icon = TYPE_ICON[type]
            return (
              <div key={type}>
                <div className={`px-4 py-2 flex items-center gap-2 border-y ${TYPE_BG[type]}`}>
                  <Icon size={13}/>
                  <span className="text-xs font-semibold">{type}</span>
                  <span className="text-xs opacity-60">({typeSubj.length})</span>
                </div>
                <div className="divide-y">
                  {typeSubj.map(s => (
                    <SubjectRow key={s.id} subject={s} />
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ── Subject Row ────────────────────────────────────────────────────────────
function SubjectRow({ subject: s }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition">
      <div>
        <p className="font-medium text-gray-800">{s.name}</p>
        <p className="text-xs text-gray-400 font-mono mt-0.5">{s.code}</p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-400 text-xs">{s.credits} cr</span>
        <span className={TYPE_COLOR[s.subjectType]}>{s.subjectType}</span>
        {s.teacherName && (
          <span className="text-xs text-gray-500 hidden sm:block">👤 {s.teacherName}</span>
        )}
      </div>
    </div>
  )
}

// ── Stat Pill ──────────────────────────────────────────────────────────────
function StatPill({ label, value, color }) {
  const cls = {
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    green:  'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    amber:  'bg-amber-50 border-amber-200 text-amber-700',
  }
  return (
    <div className={`rounded-xl border p-3 text-center ${cls[color]}`}>
      <p className="text-2xl font-bold">{value ?? 0}</p>
      <p className="text-xs opacity-70 mt-0.5">{label}</p>
    </div>
  )
}
