'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F5F0] p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#0D6E6E] rounded-xl inline-flex items-center justify-center mb-4">
            <span className="text-white text-xl font-bold">H</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Hatch</h1>
          <p className="text-sm text-gray-500 mt-1">From opportunity to venture — step by step.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-lg p-3 text-sm mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#0D6E6E] focus:border-transparent text-sm text-gray-900 placeholder-gray-400 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#0D6E6E] focus:border-transparent text-sm text-gray-900 placeholder-gray-400 outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0D6E6E] text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-[#0a5555] transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-5">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#0D6E6E] font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
