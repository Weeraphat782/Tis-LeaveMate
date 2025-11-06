"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { leaveRequestsApi } from "@/lib/database"

interface LeaveRequest {
  id: string
  user_id: string
  userName: string
  userEmail: string
  leaveType: string
  selectedDates: string[]
  days: number
  reason: string
  status: string
  submittedAt: string
  approvedAt?: string
  approvedBy?: string
  approvedByName?: string
  isHalfDay: boolean
  halfDayPeriod?: 'morning' | 'afternoon'
}

// Convert leave requests to FullCalendar events
function convertToCalendarEvents(leaveRequests: LeaveRequest[]) {
  const events: any[] = []

  // Convert leave requests to events
  leaveRequests.forEach(request => {
    request.selectedDates.forEach(dateStr => {
      // Build title with half-day info if applicable
      let title = `${request.userName} - ${request.leaveType}`
      if (request.isHalfDay && request.halfDayPeriod) {
        const periodText = request.halfDayPeriod === 'morning' ? 'Half-day Morning' : 'Half-day Afternoon'
        title = `${request.userName} - ${request.leaveType} (${periodText})`
      }

      events.push({
        id: `leave-${request.id}-${dateStr}`,
        title: title,
        start: dateStr,
        end: dateStr, // All-day event
        allDay: true,
        backgroundColor: request.isHalfDay ? '#fbbf24' : '#3b82f6', // Yellow for half-day, Blue for full-day
        borderColor: request.isHalfDay ? '#d97706' : '#2563eb',
        textColor: '#ffffff',
        extendedProps: {
          type: 'leave',
          userName: request.userName,
          userEmail: request.userEmail,
          leaveType: request.leaveType,
          reason: request.reason,
          days: request.days,
          submittedAt: request.submittedAt,
          isHalfDay: request.isHalfDay,
          halfDayPeriod: request.halfDayPeriod
        }
      })
    })
  })

  return events
}

export function LeaveCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<any[]>([])

  // Load leave requests (only once on mount)
  useEffect(() => {
    const loadLeaveRequests = async () => {
      try {
        const requests = await leaveRequestsApi.getAllLeaveRequests()
        const approvedLeaves = requests.filter(req => req.status === 'approved')
        setLeaveRequests(approvedLeaves)
      } catch (err) {
        console.error('Error loading leave requests:', err)
        setError('Failed to load leave requests')
      }
    }

    loadLeaveRequests()
  }, [])

  // Update calendar events when leave requests change
  useEffect(() => {
    const events = convertToCalendarEvents(leaveRequests)
    setCalendarEvents(events)
    setLoading(false) // Set loading to false when events are updated
  }, [leaveRequests])

  // Handle event click to show details
  const handleEventClick = useCallback((info: any) => {
    const event = info.event
    const props = event.extendedProps

    if (props.type === 'leave') {
      alert(`Leave Details:
• Employee: ${props.userName}
• Email: ${props.userEmail}
• Type: ${props.leaveType}
• Reason: ${props.reason || 'Not specified'}
• Submitted: ${new Date(props.submittedAt).toLocaleDateString()}
• Days: ${props.days}`)
    } else if (props.type === 'holiday') {
      alert(`Holiday Details:
• ${props.holidayName}
• Country: ${props.countryName} ${getCountryFlag(props.country)}
• Type: ${props.holidayType}
• Description: ${props.description || 'No description'}`)
    }
  }, [])

  // Handle month change (only when month actually changes)
  const handleDatesSet = useCallback((arg: any) => {
    const newMonth = new Date(arg.view.currentStart)
    const currentMonthStr = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`
    const newMonthStr = `${newMonth.getFullYear()}-${newMonth.getMonth()}`

    if (currentMonthStr !== newMonthStr) {
      setCurrentMonth(newMonth)
    }
  }, [currentMonth])

  // Memoize calendar events to prevent unnecessary re-renders
  const memoizedEvents = useMemo(() => calendarEvents, [calendarEvents])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Leave Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading calendar...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Leave Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-destructive mb-2">⚠️</div>
              <p className="text-destructive">{error}</p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📅 Team Leave Calendar
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Click on events to see detailed information
        </div>
      </CardHeader>
      <CardContent>
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={memoizedEvents}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            height="auto"
            aspectRatio={1.35}
            dayMaxEvents={3}
            moreLinkClick="popover"
            eventDisplay="block"
            displayEventTime={false}
            eventMouseEnter={(info) => {
              // Optional: Add hover effects
              info.el.style.transform = 'scale(1.02)'
              info.el.style.zIndex = '10'
            }}
            eventMouseLeave={(info) => {
              info.el.style.transform = 'scale(1)'
              info.el.style.zIndex = 'auto'
            }}
          />
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Employee Leave</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span>Thailand Holiday</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-600 rounded"></div>
            <span>India Holiday</span>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">
            Click on events to see details. Showing approved leaves for {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            {leaveRequests.length > 0 && (
              <span className="ml-2 text-primary">
                • {leaveRequests.length} approved leave{leaveRequests.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
