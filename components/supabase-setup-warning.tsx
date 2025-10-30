"use client"

import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export function SupabaseSetupWarning() {
  const [showWarning, setShowWarning] = useState(false)
  const [isProductionError, setIsProductionError] = useState(false)

  useEffect(() => {
    // Check if Supabase environment variables are set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const hasValidUrl = supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co' && !supabaseUrl.includes('placeholder')
    const hasValidKey = supabaseKey && supabaseKey !== 'placeholder-key' && !supabaseKey.includes('placeholder')

    if (!hasValidUrl || !hasValidKey) {
      setShowWarning(true)
      // If we're in production (deployed) and still using placeholders, show error
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        setIsProductionError(true)
      }
    }
  }, [])

  if (!showWarning) return null

  return (
    <Alert className={isProductionError ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}>
      {isProductionError ? (
        <svg className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ) : (
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
      )}
      <AlertTitle className={isProductionError ? "text-red-800" : "text-yellow-800"}>
        {isProductionError ? "🚨 Production Configuration Error" : "Supabase Setup Required"}
      </AlertTitle>
      <AlertDescription className={isProductionError ? "text-red-700" : "text-yellow-700"}>
        {isProductionError ? (
          <div className="mt-2 space-y-2">
            <p className="font-medium">The application is deployed but using placeholder Supabase credentials!</p>
            <div className="p-3 bg-red-100 rounded border">
              <p className="text-sm font-medium text-red-800">Current environment variables:</p>
              <p className="text-xs font-mono text-red-700 mt-1">
                NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || 'undefined'}<br/>
                NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '[SET]' : 'undefined'}
              </p>
            </div>
            <p>Please update your deployment platform's environment variables with the correct Supabase credentials.</p>
          </div>
        ) : (
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
        )}
      </AlertDescription>
    </Alert>
  )
}
