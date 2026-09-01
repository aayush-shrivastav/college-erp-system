// src/pages/auth/ForgotPassword.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../api/auth.api'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [sent, setSent]         = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return toast.error('Email is required')
    setLoading(true)
    try {
      await authApi.forgotPassword({ email })
      setSent(true)
    } catch {
      toast.error('Something went wrong, please try again')
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
          <p className="text-slate-400 text-sm mt-1">Password Reset</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Email Sent!</h2>
              <p className="text-gray-500 text-sm mb-6">
                If <strong>{email}</strong> is a registered email, you will receive a password reset link. 
                Please check your inbox (and spam folder).
              </p>
              <Link to="/login" className="text-blue-600 text-sm font-medium hover:underline flex items-center justify-center gap-1">
                <ArrowLeft size={14}/> Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Forgot Password?</h2>
              <p className="text-gray-500 text-sm mb-6">Enter your registered email and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
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
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-center mt-5 text-sm text-gray-500">
                <Link to="/login" className="text-blue-600 font-medium hover:underline flex items-center justify-center gap-1">
                  <ArrowLeft size={14}/> Back to Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
