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
      options: { data: { full_name: name } },
    })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: name,
        is_admin: false,
      })
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-cream)' }}
    >
      <div className="w-full max-w-md">
        {/* Card */}
        <div
          className="rounded-2xl p-10"
          style={{
            backgroundColor: '#FFFFFF',
            border: '0.5px solid var(--color-border)',
          }}
        >
          {/* Logo + wordmark */}
          <div className="flex flex-col items-center mb-6">
            <Image
              src="/hatch_logo.svg"
              alt="Hatch"
              width={40}
              height={40}
              style={{ height: 40, width: 'auto', marginBottom: 12 }}
            />
            <h1
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontWeight: 400,
                fontSize: 26,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink)',
                marginBottom: 4,
              }}
            >
              Hatch
            </h1>
            <p
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 16,
                color: 'var(--color-text-muted)',
              }}
            >
              From idea to venture.
            </p>
          </div>

          {error && (
            <div
              className="rounded-lg p-3 text-sm mb-5"
              style={{
                backgroundColor: '#FEF2F2',
                border: '0.5px solid #FECACA',
                color: '#DC2626',
              }}
            >
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
                <label
                  className="block mb-1.5"
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {label}
                </label>
                <input
                  type={type}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  required
                  placeholder={placeholder}
                  className="w-full px-3.5 py-2.5 text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '0.5px solid var(--color-border)',
                    borderRadius: 8,
                    color: 'var(--color-ink)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-amber)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-medium transition-colors disabled:opacity-60 mt-2"
              style={{
                backgroundColor: 'var(--color-amber)',
                color: '#FFFFFF',
                borderRadius: 8,
                border: 'none',
              }}
              onMouseEnter={(e) => !loading && ((e.target as HTMLElement).style.backgroundColor = '#A8612A')}
              onMouseLeave={(e) => !loading && ((e.target as HTMLElement).style.backgroundColor = 'var(--color-amber)')}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p
            className="text-center mt-5"
            style={{ fontSize: 13, color: 'var(--color-text-muted)' }}
          >
            Already have an account?{' '}
            <Link
              href="/login"
              style={{ color: 'var(--color-amber)', fontWeight: 500 }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
