"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { LeaveRequestForm } from "@/components/leave-request-form"
import { LeaveRecordsTable } from "@/components/leave-records-table"
import { LeaveStats } from "@/components/leave-stats"
import { LeaveCalendar } from "@/components/leave-calendar"
import { SupabaseSetupWarning } from "@/components/supabase-setup-warning"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

export default function DashboardPage() {
  const router = useRouter()
  const { user, signOut, loading, isInitialized } = useAuth()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isPageRefreshed, setIsPageRefreshed] = useState(false)

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Detect page refresh vs navigation
  useEffect(() => {
    const navigationTimestamp = sessionStorage.getItem('dashboard_navigation_timestamp')
    const currentTime = Date.now()

    if (navigationTimestamp) {
      const timeDiff = currentTime - parseInt(navigationTimestamp)
      // If navigated more than 2 seconds ago, consider it a refresh
      if (timeDiff > 2000) {
        setIsPageRefreshed(true)
        console.log('🔄 Dashboard: Page refresh detected')
      } else {
        console.log('🧭 Dashboard: Normal navigation')
      }
    } else {
      console.log('📝 Dashboard: First load')
    }

    // Set new navigation timestamp
    sessionStorage.setItem('dashboard_navigation_timestamp', currentTime.toString())
  }, [])

  // Handle data loading
  useEffect(() => {
    if (user) {
      console.log('📊 Dashboard: User loaded:', user.id, 'isPageRefreshed:', isPageRefreshed)

      // Trigger data reload
      setRefreshKey(prev => prev + 1)
      localStorage.setItem('last_user_id', user.id)

      console.log('🔄 Dashboard: Triggered data reload for user:', user.id)
    }
  }, [user, isPageRefreshed])

  useEffect(() => {
    if (isInitialized && !user && !loading) {
      console.log('Dashboard: No user after initialization, redirecting to login')
      router.push("/")
    }
  }, [user, loading, isInitialized, router])

  // Additional check after logout
  useEffect(() => {
    const checkAuth = () => {
      if (isInitialized && !user && !loading) {
        console.log('Dashboard: Auth check failed after initialization, redirecting')
        router.replace("/")
      }
    }

    // Check immediately if initialized
    if (isInitialized) {
    checkAuth()
    }

    // Check again after a short delay to catch any race conditions
    const timeout = setTimeout(checkAuth, 100)
    return () => clearTimeout(timeout)
  }, [user, loading, isInitialized, router])

  const performLogout = useCallback(async () => {
    if (isLoggingOut) return

    try {
      console.log('Performing logout...')
      setIsLoggingOut(true)

      toast({
        title: "Logging out...",
        description: "Please wait while we sign you out.",
      })

      // Try to sign out, but if session is missing, just redirect
      try {
        console.log('Calling signOut...')
        const { error } = await signOut()
        console.log('signOut result:', { error })

        if (error) {
          console.error('Logout error:', error)

          // If session is missing, it means user is already logged out
          // This is actually normal behavior, just redirect
          if (error.message?.includes('Auth session missing') ||
              error.message?.includes('session_not_found') ||
              error.message?.includes('Invalid session')) {
            console.log('Session already invalid/missing - redirecting...')
          } else {
            // Real error - show to user
            toast({
              title: "Logout failed",
              description: error.message,
              variant: "destructive",
            })
            setIsLoggingOut(false)
            return
          }
        }

        console.log('Logout API call successful')
      } catch (err) {
        console.error('SignOut threw error:', err)
        // If signOut throws, session is probably invalid anyway
      }

      // Always redirect after attempting logout
      toast({
        title: "Logged out successfully",
        description: "See you next time!",
      })

      // Force redirect with delay to ensure state is updated
      setTimeout(() => {
        console.log('Dashboard: Force redirecting to login page')
        // Try router first, then fallback to window.location
        try {
          router.replace("/")
        } catch (err) {
          console.error('Router redirect failed:', err)
        }

        // Force page reload to clear all state
        setTimeout(() => {
          console.log('Dashboard: Force reloading page')
          window.location.reload()
        }, 200)
      }, 500)
    } catch (err) {
      console.error('Unexpected logout error:', err)
      setIsLoggingOut(false)
    }
  }, [signOut, isLoggingOut, toast])

  const handleLogout = useCallback(() => {
    console.log('Logout button clicked')
    performLogout()
  }, [performLogout])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show loading while auth is initializing or no user yet
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            {/* Logo and App Title */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                  className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground"
              >
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold truncate">TIS Leave Management</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Leave Management System</p>
              </div>
            </div>

            {/* User Info and Logout - Desktop */}
            <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
                <p className="text-sm font-medium truncate max-w-32">{user.user_metadata?.name || user.email?.split('@')[0]}</p>
                <p className="text-xs text-muted-foreground truncate max-w-40">{user.email}</p>
            </div>
            <Button
              variant="outline"
                size="sm"
              onMouseDown={handleLogout}
              disabled={isLoggingOut}
                className="text-sm px-3"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
            </div>

            {/* User Info and Logout - Mobile/Tablet */}
            <div className="flex md:hidden items-center justify-between">
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.user_metadata?.name || user.email?.split('@')[0]}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onMouseDown={handleLogout}
                disabled={isLoggingOut}
                className="text-xs px-2 ml-2 flex-shrink-0"
              >
                🚪
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <SupabaseSetupWarning />
        </div>

        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-balance">Leave Management</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Track and manage your leave requests</p>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              size="lg"
              className="w-full sm:w-auto"
            >
              {showForm ? "Cancel" : "New Leave Request"}
            </Button>
          </div>

          {showForm && (
            <div className="mb-8">
              <LeaveRequestForm currentUser={{
                id: user.id,
                email: user.email || '',
                name: user.user_metadata?.name || user.email?.split('@')[0] || ''
              }} onSuccess={() => {
                setShowForm(false)
                handleRefresh()
              }} />
            </div>
          )}

          <LeaveStats
            currentUser={{
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || user.email?.split('@')[0] || ''
            }}
            refreshKey={refreshKey}
          />
        </div>

        <Tabs defaultValue="my-leaves" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger
              value="my-leaves"
              className="text-xs sm:text-sm py-2 px-1 sm:px-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              My Leave Records
            </TabsTrigger>
            <TabsTrigger
              value="team-leaves"
              className="text-xs sm:text-sm py-2 px-1 sm:px-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Team Leave Records
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="text-xs sm:text-sm py-2 px-1 sm:px-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              📅 Calendar
            </TabsTrigger>
          </TabsList>
          <TabsContent value="my-leaves" className="mt-6">
            <LeaveRecordsTable
              currentUser={{
                id: user.id,
                email: user.email || '',
                name: user.user_metadata?.name || user.email?.split('@')[0] || ''
              }}
              viewMode="personal"
              refreshKey={refreshKey}
            />
          </TabsContent>
          <TabsContent value="team-leaves" className="mt-6">
            <LeaveRecordsTable
              currentUser={{
                id: user.id,
                email: user.email || '',
                name: user.user_metadata?.name || user.email?.split('@')[0] || ''
              }}
              viewMode="team"
              refreshKey={refreshKey}
            />
          </TabsContent>
          <TabsContent value="calendar" className="mt-6">
            <LeaveCalendar />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
