"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { MultiDatePicker } from "@/components/ui/multi-date-picker"
import { leaveRequestsApi } from "@/lib/database"

interface LeaveRequestFormProps {
  currentUser: {
    id: string
    email: string
    name: string
  }
  onSuccess: () => void
}

const LEAVE_TYPES = [
  { value: "personal", label: "Personal Leave", maxDays: 3 },
  { value: "vacation", label: "Vacation Leave", maxDays: 7 },
  { value: "sick", label: "Sick Leave", maxDays: 30 },
]

export function LeaveRequestForm({ currentUser, onSuccess }: LeaveRequestFormProps) {
  const { toast } = useToast()
  const [leaveType, setLeaveType] = useState("")
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [reason, setReason] = useState("")
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [halfDayPeriod, setHalfDayPeriod] = useState<'morning' | 'afternoon'>('morning')

  const calculateDays = () => {
    return selectedDates.length
  }

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🎯 handleSubmit called with event:', e.type)
    e.preventDefault()
    console.log('✅ Form submission started')

    const days = calculateDays()
    const selectedLeaveType = LEAVE_TYPES.find((lt) => lt.value === leaveType)
    console.log('📊 Form data:', { leaveType, selectedDates, reason, days, selectedLeaveType })

    if (!selectedLeaveType) {
      toast({
        title: "Error",
        description: "Please select a leave type",
        variant: "destructive",
      })
      return
    }

    if (selectedDates.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one leave date",
        variant: "destructive",
      })
      return
    }

    if (!reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for your leave request",
        variant: "destructive",
      })
      return
    }

    if (days > selectedLeaveType.maxDays) {
      toast({
        title: "Error",
        description: `${selectedLeaveType.label} cannot exceed ${selectedLeaveType.maxDays} days`,
        variant: "destructive",
      })
      return
    }

    console.log('Submitting leave request with data:', {
      user_id: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      leaveType: selectedLeaveType.label,
      selectedDates: selectedDates.map(date => date.toISOString()),
      days,
      reason,
      status: "pending",
    })

    console.log('📤 Starting leave request submission...')

    try {
    // Save to Supabase
    const result = await leaveRequestsApi.createLeaveRequest({
      user_id: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      leaveType: selectedLeaveType.label,
      selectedDates: selectedDates.map(date => date.toISOString()),
      days,
      reason,
      status: "pending",
      approvedAt: null,
      approvedBy: null,
      approvedByName: null,
      isHalfDay,
      halfDayPeriod: isHalfDay ? halfDayPeriod : undefined,
    })

      console.log('📥 createLeaveRequest result:', result)

    if (!result.success) {
        console.error('❌ Submit failed:', result.error)
      toast({
        title: "Error",
        description: result.error || "Failed to submit leave request",
        variant: "destructive",
      })
      return
    }

      console.log('✅ Submit successful, showing success toast')
    toast({
      title: "Success",
      description: "Leave request submitted successfully",
    })
    } catch (error) {
      console.error('💥 Unexpected error in handleSubmit:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
      return
    }

    // Reset form
    setLeaveType("")
    setSelectedDates([])
    setReason("")
    onSuccess()
  }

  const days = calculateDays()
  const selectedLeaveType = LEAVE_TYPES.find((lt) => lt.value === leaveType)

  return (
    <Card>
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="text-lg sm:text-xl">New Leave Request</CardTitle>
        <CardDescription className="text-sm">Submit a new leave request for approval</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="leaveType">Leave Type *</Label>
              <Select value={leaveType} onValueChange={setLeaveType} required>
                <SelectTrigger id="leaveType">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label} (Max {type.maxDays} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Leave Dates *</Label>
              <MultiDatePicker
                selectedDates={selectedDates}
                onDatesChange={setSelectedDates}
              />
            </div>
          </div>

          {days > 0 && (
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-xs sm:text-sm font-medium">
                Leave Duration: {days} day{days !== 1 ? "s" : ""}
                {selectedLeaveType && (
                  <span
                    className={
                      days > selectedLeaveType.maxDays ? "text-destructive ml-1 sm:ml-2" : "text-muted-foreground ml-1 sm:ml-2"
                    }
                  >
                    ({days > selectedLeaveType.maxDays ? "Exceeds" : "Within"} {selectedLeaveType.label} limit of{" "}
                    {selectedLeaveType.maxDays} days)
                  </span>
                )}
              </p>
              <div className="mt-2 text-xs text-muted-foreground break-words">
                Selected dates: {selectedDates
                  .sort((a, b) => a.getTime() - b.getTime())
                  .map(date => date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric"
                  }))
                  .join(", ")}
              </div>
            </div>
          )}

          {/* Half Day Options */}
          {days > 0 && (
            <div className="space-y-3 p-3 sm:p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="halfDay"
                  checked={isHalfDay}
                  onCheckedChange={(checked) => {
                    setIsHalfDay(checked as boolean)
                    if (!checked) {
                      setHalfDayPeriod('morning')
                    }
                  }}
                />
                <Label htmlFor="halfDay" className="text-sm font-medium">
                  Half-day leave
                </Label>
              </div>

              {isHalfDay && (
                <div className="ml-6 space-y-2">
                  <Label className="text-sm">Select period:</Label>
                  <RadioGroup
                    value={halfDayPeriod}
                    onValueChange={(value) => setHalfDayPeriod(value as 'morning' | 'afternoon')}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="morning" id="morning" />
                      <Label htmlFor="morning" className="text-sm">Morning</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="afternoon" id="afternoon" />
                      <Label htmlFor="afternoon" className="text-sm">Afternoon</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Leave *</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for your leave request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1 sm:flex-none sm:w-auto">
              Submit Leave Request
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
