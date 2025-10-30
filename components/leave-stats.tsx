"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { leaveStatsApi } from "@/lib/database"

interface LeaveStatsProps {
  currentUser: {
    id: string
    email: string
    name: string
  }
  refreshKey?: number
}


export function LeaveStats({ currentUser, refreshKey }: LeaveStatsProps) {
  const [stats, setStats] = useState({
    personalUsed: 0,
    vacationUsed: 0,
    sickUsed: 0,
    pending: 0,
  })

  // Track previous user ID to detect login/logout
  const [prevUserId, setPrevUserId] = useState<string | null>(null)

  useEffect(() => {
    console.log('📈 LeaveStats: Loading stats for user:', currentUser.id, 'refreshKey:', refreshKey)
    const loadStats = async () => {
      const stats = await leaveStatsApi.getUserLeaveStats(currentUser.id)
      console.log('📊 LeaveStats: Loaded stats:', stats)
      setStats(stats)
    }

    loadStats()
  }, [currentUser.id, refreshKey])

  // Debug: Log when stats change
  useEffect(() => {
    console.log('📈 LeaveStats: Stats updated:', stats)
  }, [stats])

  // Detect user change (login/logout) and force reload
  useEffect(() => {
    // If user ID changed, force reload data
    if (prevUserId !== null && prevUserId !== currentUser.id) {
      console.log('User changed in LeaveStats from', prevUserId, 'to', currentUser.id, '- forcing data reload')
      setStats({ personalUsed: 0, vacationUsed: 0, sickUsed: 0, pending: 0 }) // Reset stats
      const loadStats = async () => {
        const stats = await leaveStatsApi.getUserLeaveStats(currentUser.id)
        setStats(stats)
      }
      loadStats()
    }
    setPrevUserId(currentUser.id)
  }, [currentUser.id, prevUserId])

  // Force reload when component mounts (for login/logout scenarios)
  useEffect(() => {
    console.log('LeaveStats component mounted, loading stats for user:', currentUser.id)
    const loadStats = async () => {
      const stats = await leaveStatsApi.getUserLeaveStats(currentUser.id)
      setStats(stats)
    }

    loadStats()
  }, [])

  const statCards = [
    {
      title: "Personal Leave",
      used: stats.personalUsed,
      total: 3,
      color: "text-chart-1",
    },
    {
      title: "Vacation Leave",
      used: stats.vacationUsed,
      total: 7,
      color: "text-chart-2",
    },
    {
      title: "Sick Leave",
      used: stats.sickUsed,
      total: 30,
      color: "text-chart-3",
    },
    {
      title: "Pending Requests",
      used: stats.pending,
      total: null,
      color: "text-chart-4",
    },
  ]

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
      {statCards.map((stat) => (
        <Card key={stat.title} className="p-3 sm:p-4">
          <CardHeader className="pb-2 p-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className={`text-2xl sm:text-3xl font-bold ${stat.color}`}>{stat.used}</span>
              {stat.total !== null && (
                <span className="text-xs sm:text-sm text-muted-foreground">
                  / {stat.total}
                  {stat.used > stat.total && (
                    <span className="text-destructive ml-1 block sm:inline">
                      (+{stat.used - stat.total})
                    </span>
                  )}
                </span>
              )}
            </div>
            {stat.total !== null && (
              <div className="mt-2 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${stat.color.replace("text-", "bg-")} transition-all`}
                  style={{ width: `${Math.min((stat.used / stat.total) * 100, 100)}%` }}
                />
              </div>
            )}
            {stat.total !== null && stat.used > stat.total && (
              <div className="mt-1 text-xs text-destructive">
                ⚠️ Over quota
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
