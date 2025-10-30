import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🚀 Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseKey: !!supabaseAnonKey,
  supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : '***MISSING***',
  supabaseKeyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
  isProduction: process.env.NODE_ENV === 'production',
  vercelEnv: process.env.VERCEL_ENV || 'unknown'
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
} else {
  console.log('✅ Supabase configured successfully')
  console.log('🔗 Testing database connection...')

  // Test basic connection
  supabase.from('profiles').select('count', { count: 'exact', head: true })
    .then(result => {
      console.log('🗄️ Database connection test:', result.error ? 'FAILED' : 'SUCCESS')
      if (result.error) {
        console.error('Database error:', result.error)
      }
    })
    .catch(err => {
      console.error('Database connection error:', err)
    })
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)

export default supabase
