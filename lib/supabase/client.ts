import { createBrowserClient } from '@supabase/ssr'

// Singleton: all client-side components share one instance so the auth lock
// is never contested by multiple clients on the same page → prevents the
// "Lock was released because another request stole it" error.
let _client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  _client = createBrowserClient(url, key)
  return _client
}
