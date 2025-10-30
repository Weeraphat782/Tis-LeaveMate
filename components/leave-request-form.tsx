"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  const [isSubmitting, setIsSubmitting] = useState(false)

  const calculateDays = () => {
    return selectedDates.length
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('Submit button clicked')
    console.log('Current state:', { leaveType, selectedDates, reason, isSubmitting })

    if (isSubmitting) {
      console.log('Already submitting, ignoring...')
      return
    }

    const days = calculateDays()
    const selectedLeaveType = LEAVE_TYPES.find((lt) => lt.value === leaveType)

    console.log('Calculated values:', { days, selectedLeaveType })

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

    setIsSubmitting(true)

    try {
      console.log('Calling leaveRequestsApi.createLeaveRequest...')
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
      })

      console.log('API result:', result)

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to submit leave request",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      })

      console.log('Resetting form...')
      // Reset form
      setLeaveType("")
      setSelectedDates([])
      setReason("")

      console.log('Calling onSuccess callback...')
      onSuccess()
    } catch (error) {
      console.error('Unexpected error during submit:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const days = calculateDays()
  const selectedLeaveType = LEAVE_TYPES.find((lt) => lt.value === leaveType)

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Leave Request</CardTitle>
        <CardDescription>Submit a new leave request for approval</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
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
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">
                Leave Duration: {days} day{days !== 1 ? "s" : ""}
                {selectedLeaveType && (
                  <span
                    className={
                      days > selectedLeaveType.maxDays ? "text-destructive ml-2" : "text-muted-foreground ml-2"
                    }
                  >
                    ({days > selectedLeaveType.maxDays ? "Exceeds" : "Within"} {selectedLeaveType.label} limit of{" "}
                    {selectedLeaveType.maxDays} days)
                  </span>
                )}
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
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

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Leave *</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for your leave request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Leave Request"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
