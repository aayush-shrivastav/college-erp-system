// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth }  from '../store/authStore'

const ROLE_HOME = {
  ADMIN:    '/admin/dashboard',
  TEACHER:  '/teacher/dashboard',
  STUDENT:  '/student/dashboard',
  ACCOUNTS: '/accounts/dashboard',
}

export default function ProtectedRoute({ children, role }) {
  const { isLoggedIn, user } = useAuth()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (role && user?.role !== role && user?.role !== 'ADMIN') return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />
  return children
}
