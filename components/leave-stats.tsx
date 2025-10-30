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

  useEffect(() => {
    const loadStats = async () => {
      const stats = await leaveStatsApi.getUserLeaveStats(currentUser.id)
      setStats(stats)
    }

    loadStats()
  }, [currentUser.id, refreshKey])

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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${stat.color}`}>{stat.used}</span>
              {stat.total !== null && (
                <span className="text-muted-foreground">
                  / {stat.total} days
                  {stat.used > stat.total && (
                    <span className="text-destructive ml-1">
                      ({stat.used - stat.total} over quota)
                    </span>
                  )}
                </span>
              )}
            </div>
            {stat.total !== null && (
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${stat.color.replace("text-", "bg-")} transition-all`}
                  style={{ width: `${Math.min((stat.used / stat.total) * 100, 100)}%` }}
                />
              </div>
            )}
            {stat.total !== null && stat.used > stat.total && (
              <div className="mt-1 text-xs text-destructive">
                ⚠️ Over leave quota
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
