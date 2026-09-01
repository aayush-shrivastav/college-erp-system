// src/pages/student/Register.jsx
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { studentApi } from '../../api/all.api'
import { PageTitle, Spinner } from '../../components/Shared'
import toast from 'react-hot-toast'
import { CheckCircle, BookOpen, FlaskConical, Lightbulb } from 'lucide-react'

const ERR = {
  INVALID_PIN:            'Invalid PIN. Please check your PIN and try again.',
  PIN_ALREADY_USED:       'This PIN has already been used. You may have already registered.',
  REGISTRATION_CLOSED:    'Registration window is closed.',
  ALREADY_REGISTERED:     'You have already submitted a registration.',
  COMPLETE_PROFILE_FIRST: 'Complete Your Profile First',
}

const TYPE_ICON = { THEORY: BookOpen, LAB: FlaskConical, ELECTIVE: Lightbulb }
const TYPE_CLR  = { THEORY: 'text-blue-600 bg-blue-50', LAB: 'text-green-600 bg-green-50', ELECTIVE: 'text-purple-600 bg-purple-50' }
const TYPE_BADGE= { THEORY: 'badge-blue', LAB: 'badge-green', ELECTIVE: 'badge-purple' }

export default function StudentRegister() {
  const [step,     setStep]     = useState(1)
  const [pin,      setPin]      = useState('')
  const [selected, setSelected] = useState([])
  const [done,     setDone]     = useState(false)
  const [filter,   setFilter]   = useState('ALL')  // ALL / THEORY / LAB / ELECTIVE

  const { data: statusData } = useQuery({
    queryKey: ['reg-status'],
    queryFn: () => studentApi.getRegistrationStatus().then(r => r.data)
  })

  const { data: profileData } = useQuery({
    queryKey: ['student-profile'],
    queryFn: () => studentApi.getProfile().then(r => r.data)
  })

  const { data: subjData, isLoading } = useQuery({
    queryKey: ['avail-subjects'],
    queryFn: () => studentApi.getAvailableSubjects().then(r => r.data)
  })

  const regMut = useMutation({
    mutationFn: () => studentApi.registerSemester({ pin, selectedSubjectIds: selected }),
    onSuccess: () => setDone(true),
    onError: (e) => toast.error(ERR[e.response?.data?.code] || e.response?.data?.message || 'Something went wrong. Please try again.')
  })

  const profile   = profileData?.data
  const subjects  = subjData?.data || []
  const existing  = statusData?.data
  const nextSem   = (profile?.currentSem || 0) + 1
  const filtered  = filter === 'ALL' ? subjects : subjects.filter(s => s.type === filter)

  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  // Already registered
  if (existing?.status === 'PENDING') return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
        <span className="text-3xl">⏳</span>
      </div>
      <h2 className="text-xl font-bold text-gray-800">Registration Pending!</h2>
      <p className="text-gray-500">Your registration has been submitted to your mentor.<br/>You will be notified when it is approved.</p>
      <div className="bg-gray-50 border rounded-xl p-4 text-sm text-gray-600 max-w-sm">
        <p><span className="font-medium">Semester:</span> {existing.activeSem?.semester}</p>
        <p><span className="font-medium">Submitted:</span> {new Date(existing.registeredAt).toLocaleDateString('en-IN')}</p>
      </div>
    </div>
  )

  if (existing?.status === 'APPROVED') return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <CheckCircle size={64} className="text-green-500"/>
      <h2 className="text-xl font-bold text-gray-800">Registration Approved!</h2>
      <p className="text-gray-500">Semester {existing.activeSem?.semester} subjects are enrolled.</p>
    </div>
  )

  if (done) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <CheckCircle size={64} className="text-green-500"/>
      <h2 className="text-2xl font-bold text-gray-800">Registration Submitted Successfully!</h2>
      <p className="text-gray-500">Your mentor will review and approve your registration.</p>
    </div>
  )

  if (!profile?.profileLocked) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-3xl">🔒</div>
      <h2 className="text-xl font-bold text-gray-800">Profile Not Completed</h2>
      <p className="text-gray-500">You must complete and lock your profile before registering.</p>
      <a href="/student/profile" className="btn-primary px-6">Complete Profile →</a>
    </div>
  )

  return (
    <div>
      <PageTitle title="Semester Registration">
        <div className="text-right">
          <p className="text-sm text-gray-500">Current: Sem {profile?.currentSem}</p>
          <p className="text-xs text-blue-600 font-medium">Registering for: Sem {nextSem}</p>
        </div>
      </PageTitle>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        {['Enter PIN', 'Select Subjects', 'Review & Submit'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
              step > i+1 ? 'bg-green-500 text-white' : step === i+1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>{step > i+1 ? '✓' : i+1}</span>
            <span className={step === i+1 ? 'text-blue-600 font-medium' : 'text-gray-400 text-xs'}>{s}</span>
            {i < 2 && <span className="text-gray-200 text-lg">→</span>}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Enter PIN ─────────────────────────────────── */}
      {step === 1 && (
        <div className="card p-6 max-w-sm">
          <p className="text-sm text-gray-600 mb-1">Enter your personal registration PIN</p>
          <p className="text-xs text-gray-400 mb-4">Your mentor sends you a unique 6-digit PIN. Check your notifications or ask your mentor.</p>
          <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,''))} maxLength={6}
            placeholder="e.g. 873421"
            className="input text-center font-mono text-3xl tracking-[0.5em] mb-4 py-4"
            inputMode="numeric"
          />
          <button onClick={() => setStep(2)} disabled={pin.length < 6} className="w-full btn-primary py-3 text-base">
            Continue →
          </button>
        </div>
      )}

      {/* ── STEP 2: Select Subjects ────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <p className="font-medium text-gray-800">Semester {nextSem} — Available Subjects</p>
                <p className="text-xs text-gray-400 mt-0.5">{subjects.length} subjects available · {selected.length} selected</p>
              </div>
              {/* Type filter */}
              <div className="flex gap-1.5">
                {['ALL','THEORY','LAB','ELECTIVE'].map(t => (
                  <button key={t} onClick={() => setFilter(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                      filter === t ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}>{t === 'ALL' ? 'All' : t}</button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? <Spinner /> : subjects.length === 0 ? (
            <div className="card p-8 text-center">
              <BookOpen size={40} className="mx-auto text-gray-300 mb-3"/>
              <p className="text-gray-500">No subjects available</p>
              <p className="text-xs text-gray-400 mt-1">Ask the admin to assign a syllabus for your batch</p>
            </div>
          ) : (
            <>
              {/* Group by type */}
              {['THEORY','LAB','ELECTIVE'].map(type => {
                const typeSubjects = filtered.filter(s => s.type === type)
                if (typeSubjects.length === 0) return null
                const Icon = TYPE_ICON[type]
                return (
                  <div key={type} className="card overflow-hidden">
                    <div className={`px-4 py-2.5 flex items-center gap-2 border-b ${TYPE_CLR[type]}`}>
                      <Icon size={15}/>
                      <span className="font-semibold text-sm">{type}</span>
                      <span className="text-xs opacity-70">({typeSubjects.length})</span>
                    </div>
                    <div className="divide-y">
                      {typeSubjects.map(s => {
                        const isSelected = selected.includes(s.id)
                        return (
                          <label key={s.id} className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition hover:bg-gray-50 ${isSelected ? 'bg-blue-50/50' : ''}`}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggle(s.id)} className="accent-blue-600 w-4 h-4"/>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 text-sm">{s.name}</p>
                              <p className="text-xs text-gray-400 font-mono mt-0.5">{s.code} · {s.credits} credits</p>
                            </div>
                            {isSelected && <span className="text-green-500 shrink-0"><CheckCircle size={16}/></span>}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="flex-1 btn-outline">← Back</button>
                <button onClick={() => setStep(3)} disabled={selected.length === 0} className="flex-1 btn-primary">
                  Review ({selected.length} selected) →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── STEP 3: Review & Submit ────────────────────────────── */}
      {step === 3 && (
        <div className="card p-6 max-w-lg">
          <h2 className="font-semibold text-gray-800 mb-4">Review & Confirm</h2>
          <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Registration for</span>
              <span className="font-medium">Semester {nextSem}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subjects selected</span>
              <span className="font-medium">{selected.length}</span>
            </div>
          </div>
          <div className="space-y-2 mb-5 max-h-60 overflow-y-auto">
            {subjects.filter(s => selected.includes(s.id)).map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                <CheckCircle size={15} className="text-green-500 shrink-0"/>
                <div>
                  <p className="font-medium text-sm text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.code} · <span className={TYPE_BADGE[s.type]}>{s.type}</span></p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 btn-outline">← Back</button>
            <button onClick={() => regMut.mutate()} disabled={regMut.isPending}
              className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50">
              {regMut.isPending ? 'Submitting...' : '✓ Submit Registration'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
