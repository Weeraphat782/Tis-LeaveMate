"use client"

import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export function SupabaseSetupWarning() {
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    // Check if Supabase environment variables are set
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
                          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'
    const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
                          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder-key'

    if (!hasSupabaseUrl || !hasSupabaseKey) {
      setShowWarning(true)
    }
  }, [])

  if (!showWarning) return null

  return (
    <Alert className="border-yellow-200 bg-yellow-50">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">Supabase Setup Required</AlertTitle>
      <AlertDescription className="text-yellow-700">
        <div className="mt-2 space-y-2">
          <p>To use the full features of this application, you need to set up Supabase:</p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>Create a Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-800">supabase.com</a></li>
            <li>Get your project URL and anon key from the project dashboard</li>
            <li>Create a <code className="bg-yellow-100 px-1 rounded">.env.local</code> file with:</li>
          </ol>
          <pre className="bg-yellow-100 p-2 rounded mt-2 text-sm">
{`NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key`}
          </pre>
          <li>Run the SQL schema from <code className="bg-yellow-100 px-1 rounded">supabase-schema.sql</code> in your Supabase SQL Editor</li>
        </div>
      </AlertDescription>
    </Alert>
  )
}
