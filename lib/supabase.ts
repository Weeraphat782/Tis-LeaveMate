import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseKey: !!supabaseAnonKey,
  supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : null
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'x-client-info': 'tis-leavemate'
      }
    },
    db: {
      schema: 'public'
    },
    // Add timeout to prevent hanging requests
    rest: {
      timeout: 30000 // 30 seconds timeout
    },
    realtime: {
      timeout: 30000 // 30 seconds timeout for realtime
    }
  }
)

export default supabase
