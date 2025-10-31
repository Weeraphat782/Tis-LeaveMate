import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🚀 SUPABASE CLIENT INITIALIZATION')
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseKey: !!supabaseAnonKey,
  supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING',
  supabaseKeyLength: supabaseAnonKey ? supabaseAnonKey.length : 0
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Missing Supabase environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  console.error('Current values:', {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl || 'undefined',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? '[SET]' : 'undefined'
  })
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true, // Enable session persistence but manage logout manually
      detectSessionInUrl: true
    }
  }
)

// Test connection immediately
if (typeof window !== 'undefined') {
  supabase.auth.getSession().then(({ data: { session }, error }) => {
    console.log('🔗 SUPABASE CONNECTION TEST:', {
      connected: !error,
      hasSession: !!session,
      userId: session?.user?.id,
      error: error?.message
    })
  }).catch(err => {
    console.error('❌ SUPABASE CONNECTION FAILED:', err)
  })
}

export default supabase
