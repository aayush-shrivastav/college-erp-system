// src/pages/auth/LoginPage.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../store/authStore'
import { authApi } from '../../api/auth.api'
import toast from 'react-hot-toast'

const ROLE_HOME = {
  ADMIN:    '/admin/dashboard',
  TEACHER:  '/teacher/dashboard',
  STUDENT:  '/student/dashboard',
  ACCOUNTS: '/accounts/dashboard',
}

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res  = await authApi.login({ email: email.trim(), password })
      const data = res.data.data
      login({ email: email.trim(), role: data.role, userId: data.userId }, data.accessToken, data.refreshToken)
      toast.success('Login successful')
      navigate(ROLE_HOME[data.role] || '/')
    } catch (err) {
      const code = err.response?.data?.error?.code
      if (code === 'INVALID_CREDENTIALS') toast.error('Invalid email or password.')
      else toast.error('Login failed. Please check the server is running.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🎓</div>
          <h1 className="text-3xl font-bold text-white">College ERP</h1>
          <p className="text-slate-400 mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@college.edu" required autoFocus className="input"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required className="input pr-16"/>
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading || !email || !password}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold
                         hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors text-base">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <div className="text-center">
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                Forgot Password?
              </Link>
            </div>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-5 border-t">
            <p className="text-xs text-gray-400 text-center mb-3 font-medium uppercase tracking-wide">
              Quick Demo Login
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { role: 'Admin',    email: 'admin@college.edu',    pw: 'Admin@123' },
                { role: 'Teacher',  email: 'teacher@college.edu',  pw: 'Teacher@123' },
                { role: 'Student',  email: 'student@college.edu',  pw: 'Student@123' },
                { role: 'Accounts', email: 'accounts@college.edu', pw: 'Accounts@123' },
              ].map(({ role, email: e, pw }) => (
                <button key={role} type="button"
                  onClick={() => { setEmail(e); setPassword(pw) }}
                  className="text-xs text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition border border-gray-100 hover:border-gray-200">
                  <span className="font-semibold text-gray-700 block">{role}</span>
                  <span className="text-gray-400">{pw}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
