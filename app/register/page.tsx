'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } } })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: name,
        is_admin: false })
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-[var(--color-background)] overflow-hidden">
      {/* Decorative line-art circles (large, hidden on mobile) */}
      <svg
        viewBox="0 0 400 400"
        className="hidden md:block absolute -left-24 -bottom-24 w-[480px] opacity-30 pointer-events-none"
        aria-hidden="true"
      >
        <g fill="none" stroke="var(--color-sea-green)" strokeWidth="1">
          <circle cx="200" cy="200" r="180" />
          <circle cx="197" cy="203" r="180" />
          <circle cx="194" cy="206" r="180" />
          <circle cx="191" cy="209" r="180" />
        </g>
      </svg>
      {/* Stacked shapes (small, visible on mobile too) */}
      <div className="absolute top-6 right-6 pointer-events-none" aria-hidden="true">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-2xl bg-[var(--color-primary)] opacity-90 translate-x-2 translate-y-2" />
          <div className="absolute inset-0 rounded-2xl bg-[var(--color-aruba-blue)]" />
        </div>
      </div>

      <div className="relative w-full max-w-md z-10">
        <div className="bg-[var(--color-surface-card)] border border-[var(--color-border)] p-10 rounded-[var(--radius-card-lg)] md:rounded-[var(--radius-corner-one-lg)] overflow-hidden">
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/hatch_logo.svg"
              alt="Hatch"
              width={40}
              height={40}
              className="mb-3"
              style={{ height: 40, width: 'auto' }}
            />
            <h1 className="font-bold text-[28px] tracking-[-0.01em] text-[var(--color-foreground)] mb-1">
              Hatch
            </h1>
            <p className="text-[14px] text-[var(--color-foreground-muted)] italic">
              From idea to venture.
            </p>
          </div>

          {error && (
            <div className="rounded-[var(--radius-input)] p-3 text-sm mb-5 bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {[
              { key: 'name', label: 'Full name', type: 'text', placeholder: 'Your name', value: name, onChange: setName },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', value: email, onChange: setEmail },
              { key: 'password', label: 'Password', type: 'password', placeholder: 'Min. 6 characters', value: password, onChange: setPassword },
            ].map(({ key, label, type, placeholder, value, onChange }) => (
              <div key={key}>
                <label className="block mb-1.5 caption-upper text-[var(--color-foreground-muted)]">
                  {label}
                </label>
                <input
                  type={type}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  required
                  placeholder={placeholder}
                  className="w-full px-4 py-2.5 text-sm rounded-[var(--radius-input)] bg-[var(--color-surface-card)] border-[1.5px] border-[var(--color-border-strong)] text-[var(--color-foreground)] placeholder:text-[var(--color-foreground-faint)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)]"
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 px-5 text-sm font-medium rounded-full mt-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] transition-colors disabled:opacity-60 hover:bg-[var(--color-primary-hover)] active:scale-[0.98]"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center mt-6 text-[13px] text-[var(--color-foreground-muted)]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
