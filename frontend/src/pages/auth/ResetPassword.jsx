// src/pages/auth/ResetPassword.jsx
import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { authApi } from '../../api/auth.api'
import toast from 'react-hot-toast'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [searchParams]          = useSearchParams()
  const token                   = searchParams.get('token') || ''
  const navigate                = useNavigate()

  const [form, setForm]         = useState({ newPassword: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.newPassword.length < 8) return toast.error('Password must be at least 8 characters')
    if (form.newPassword !== form.confirm) return toast.error('Passwords do not match')
    if (!token) return toast.error('Invalid reset link')

    setLoading(true)
    try {
      await authApi.resetPassword({ token, newPassword: form.newPassword })
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      const code = err.response?.data?.error?.code
      if (code === 'TOKEN_EXPIRED') toast.error('Link has expired. Please try "Forgot Password" again.')
      else if (code === 'INVALID_TOKEN') toast.error('Invalid reset link. please try again.')
      else toast.error('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🎓</span>
          <h1 className="text-white text-2xl font-bold mt-3">College ERP</h1>
          <p className="text-slate-400 text-sm mt-1">Set New Password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {!token ? (
            <div className="text-center py-4">
              <p className="text-red-500 font-medium mb-4">Invalid or missing reset link.</p>
              <Link to="/forgot-password" className="text-blue-600 text-sm hover:underline">Try again</Link>
            </div>
          ) : done ? (
            <div className="text-center py-4">
              <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Password Reset Successful!</h2>
              <p className="text-gray-500 text-sm mb-2">Redirecting you to login in 3 seconds...</p>
              <Link to="/login" className="text-blue-600 text-sm font-medium hover:underline">Go to Login</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Set New Password</h2>
              <p className="text-gray-500 text-sm mb-6">Choose a strong password of at least 8 characters.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.newPassword}
                      onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
                      placeholder="Enter new password"
                      className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required minLength={8}
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                      {showPass ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.confirm}
                      onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                      placeholder="Repeat new password"
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
