// Triggering rebuild
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './store/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout, { TeacherLayout, StudentLayout, AccountsLayout } from './components/Layout/Layouts'

// Auth
import LoginPage          from './pages/auth/LoginPage'
import ForgotPasswordPage from './pages/auth/ForgotPassword'
import ResetPasswordPage  from './pages/auth/ResetPassword'

// Admin
import AdminDashboard   from './pages/admin/Dashboard'
import AdminStudents    from './pages/admin/Students'
import AdminTeachers    from './pages/admin/Teachers'
import AdminSyllabus    from './pages/admin/Syllabus'
import AdminPromotion   from './pages/admin/Promotion'
import AdminAttendance  from './pages/admin/AttendanceReport'
import AdminExamResults from './pages/admin/ExamResults'
import AdminTimetable   from './pages/admin/Timetable'
import AdminStructure  from './pages/admin/Structure'
import AdminFeeReports from './pages/admin/FeeReports'
import AdminScholarships from './pages/admin/Scholarships'
import AdminCoordinators from './pages/admin/Coordinators'

// Teacher
import TeacherDashboard     from './pages/teacher/Dashboard'
import TeacherAttendance    from './pages/teacher/Attendance'
import TeacherMarks         from './pages/teacher/Marks'
import TeacherMentees       from './pages/teacher/Mentees'
import TeacherRegistrations from './pages/teacher/Registrations'
import TeacherTimetable     from './pages/teacher/Timetable'
import TeacherProfile       from './pages/teacher/Profile'
import TeacherSubjectAnalysis from './pages/teacher/SubjectAnalysis'
import TeacherMyClasses     from './pages/teacher/MyClasses'
import CoordinatedSubjects  from './pages/teacher/CoordinatedSubjects'
import CoordinatedTeam      from './pages/teacher/CoordinatedTeam'

// Student
import StudentDashboard  from './pages/student/Dashboard'
import StudentProfile    from './pages/student/Profile'
import StudentRegister   from './pages/student/Register'
import StudentAttendance from './pages/student/Attendance'
import StudentMarks      from './pages/student/Marks'
import StudentFee        from './pages/student/Fee'
import StudentSubjects   from './pages/student/Subjects'
import StudentTimetable  from './pages/student/Timetable'
import StudentScholarships from './pages/student/ScholarshipTab'

// Accounts
import AccountsDashboard from './pages/accounts/Dashboard'
import AccountsPayments  from './pages/accounts/Payments'
import AccountsFines     from './pages/accounts/Fines'
import AccountsFeeSetup  from './pages/accounts/FeeSetup'
import AccountsReports   from './pages/accounts/Reports'
import StudentLedger      from './pages/accounts/StudentLedger'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }}/>
        <Routes>
          <Route path="/login"            element={<LoginPage/>}/>
          <Route path="/forgot-password"  element={<ForgotPasswordPage/>}/>
          <Route path="/reset-password"   element={<ResetPasswordPage/>}/>
          <Route path="/" element={<Navigate to="/login" replace/>}/>

          {/* ADMIN */}
          <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminLayout/></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace/>}/>
            <Route path="dashboard"    element={<AdminDashboard/>}/>
            <Route path="students"     element={<AdminStudents/>}/>
            <Route path="teachers"     element={<AdminTeachers/>}/>
            <Route path="syllabus"     element={<AdminSyllabus/>}/>
            <Route path="promotion"    element={<AdminPromotion/>}/>
            <Route path="timetable"    element={<AdminTimetable/>}/>
            <Route path="structure"   element={<AdminStructure/>}/>
            <Route path="attendance"   element={<AdminAttendance/>}/>
            <Route path="exam-results" element={<AdminExamResults/>}/>
            <Route path="fee-reports"  element={<AdminFeeReports/>}/>
            <Route path="scholarships" element={<AdminScholarships/>}/>
            <Route path="coordinators" element={<AdminCoordinators/>}/>
          </Route>

          {/* TEACHER */}
          <Route path="/teacher" element={<ProtectedRoute role="TEACHER"><TeacherLayout/></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace/>}/>
            <Route path="dashboard"     element={<TeacherDashboard/>}/>
            <Route path="profile"       element={<TeacherProfile/>}/>
            <Route path="mentees"       element={<TeacherMentees/>}/>
            <Route path="attendance"    element={<TeacherAttendance/>}/>
            <Route path="marks"         element={<TeacherMarks/>}/>
            <Route path="registrations" element={<TeacherRegistrations/>}/>
            <Route path="timetable"     element={<TeacherTimetable/>}/>
            <Route path="classes"       element={<TeacherMyClasses/>}/>
            <Route path="classes/:assignmentId" element={<TeacherSubjectAnalysis/>}/>
            <Route path="coordinated" element={<CoordinatedSubjects/>}/>
            <Route path="coordinated/:subjectId" element={<CoordinatedTeam/>}/>
          </Route>

          {/* STUDENT */}
          <Route path="/student" element={<ProtectedRoute role="STUDENT"><StudentLayout/></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace/>}/>
            <Route path="dashboard"  element={<StudentDashboard/>}/>
            <Route path="profile"    element={<StudentProfile/>}/>
            <Route path="register"   element={<StudentRegister/>}/>
            <Route path="attendance" element={<StudentAttendance/>}/>
            <Route path="marks"      element={<StudentMarks/>}/>
            <Route path="fee"        element={<StudentFee/>}/>
            <Route path="subjects"   element={<StudentSubjects/>}/>
            <Route path="timetable"  element={<StudentTimetable/>}/>
            <Route path="scholarships" element={<StudentScholarships/>}/>
          </Route>

          {/* ACCOUNTS */}
          <Route path="/accounts" element={<ProtectedRoute role="ACCOUNTS"><AccountsLayout/></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace/>}/>
            <Route path="dashboard" element={<AccountsDashboard/>}/>
            <Route path="payments"  element={<AccountsPayments/>}/>
            <Route path="fines"     element={<AccountsFines/>}/>
            <Route path="ledger"    element={<StudentLedger/>}/>
            <Route path="fees"      element={<AccountsFeeSetup/>}/>
            <Route path="reports"   element={<AccountsReports/>}/>
          </Route>

          <Route path="*" element={
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <p className="text-6xl font-bold text-gray-200">404</p>
                <p className="text-gray-500 mt-2">Page not found</p>
                <a href="/login" className="text-blue-600 text-sm mt-4 block">Go to Login</a>
              </div>
            </div>
          }/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
