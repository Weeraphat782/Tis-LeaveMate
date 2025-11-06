"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { MultiDatePicker } from "@/components/ui/multi-date-picker"
import { leaveRequestsApi, type LeaveRequest } from "@/lib/database"

// Use LeaveRequest from database.ts

const LEAVE_TYPES = [
  { value: "personal", label: "Personal Leave", maxDays: 3 },
  { value: "vacation", label: "Vacation Leave", maxDays: 7 },
  { value: "sick", label: "Sick Leave", maxDays: 30 },
]

interface LeaveRecordsTableProps {
  currentUser: {
    id: string
    email: string
    name: string
  }
  viewMode: "personal" | "team"
  refreshKey?: number
}

export function LeaveRecordsTable({ currentUser, viewMode, refreshKey }: LeaveRecordsTableProps) {
  const { toast } = useToast()
  const [records, setRecords] = useState<LeaveRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<LeaveRequest | null>(null)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [approvalDate, setApprovalDate] = useState("")
  const [isApproving, setIsApproving] = useState(false)

  // Edit dialog states
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingRecord, setEditingRecord] = useState<LeaveRecord | null>(null)
  const [editLeaveType, setEditLeaveType] = useState("")
  const [editSelectedDates, setEditSelectedDates] = useState<Date[]>([])
  const [editReason, setEditReason] = useState("")

  // Filter states for team view
  const [accountFilter, setAccountFilter] = useState<string>("all")
  const [monthFilter, setMonthFilter] = useState<string>("all")

  // Track previous user ID to detect login/logout
  const [prevUserId, setPrevUserId] = useState<string | null>(null)

  // Permission state for approve/reject
  const [canApprove, setCanApprove] = useState<boolean>(false)

  const loadRecords = async () => {
    if (viewMode === "personal") {
      const userRecords = await leaveRequestsApi.getUserLeaveRequests(currentUser.id)
      setRecords(userRecords)
    } else {
      const allRecords = await leaveRequestsApi.getAllLeaveRequests()
      const filteredRecords = allRecords.filter(r => r.user_id !== currentUser.id)
      setRecords(filteredRecords)
    }
  }

  const checkApprovePermission = async () => {
    console.log('🔍 Checking approve permission for:', currentUser.email)
    const canApproveResult = await leaveRequestsApi.checkUserCanApprove(currentUser.email)
    console.log('✅ Approve permission result:', canApproveResult)
    setCanApprove(canApproveResult)
  }

  // Apply filters for team view
  const getFilteredRecords = () => {
    if (viewMode === "personal") return records

    let filtered = records

    // Filter by account
    if (accountFilter !== "all") {
      filtered = filtered.filter(record => record.user_id === accountFilter)
    }

    // Filter by month
    if (monthFilter !== "all") {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.submittedAt)
        const recordMonth = recordDate.getMonth() + 1 // getMonth() returns 0-11, we want 1-12
        return recordMonth.toString() === monthFilter
      })
    }

    return filtered
  }

  const filteredRecords = getFilteredRecords()

  // Get unique users for account filter
  const getUniqueUsers = () => {
    if (viewMode === "personal") return []
    const users = [...new Set(records.map(record => record.user_id))]
    return users.map(userId => {
      const record = records.find(r => r.user_id === userId)
      return {
        id: userId,
        name: record?.userName || 'Unknown',
        email: record?.userEmail || userId
      }
    })
  }

  // Clear all filters
  const clearFilters = () => {
    setAccountFilter("all")
    setMonthFilter("all")
  }

  useEffect(() => {
    console.log('🎯 LeaveRecordsTable: Loading records for user:', currentUser.id, 'viewMode:', viewMode, 'refreshKey:', refreshKey)
    loadRecords()
    checkApprovePermission()
  }, [currentUser.id, viewMode, refreshKey])

  // Debug: Log when records change
  useEffect(() => {
    console.log('📊 LeaveRecordsTable: Records updated, count:', records.length)
    records.forEach((record, index) => {
      console.log(`  Record ${index + 1}:`, {
        id: record.id,
        leaveType: record.leaveType,
        status: record.status,
        submittedAt: record.submittedAt
      })
    })
  }, [records])

  // Reload records when window regains focus (for multi-user updates)
  useEffect(() => {
    const handleFocus = () => {
      console.log('Window focused, reloading records for user:', currentUser.id)
      loadRecords()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [currentUser.id, viewMode, refreshKey])

  // Detect user change (login/logout) and force reload
  useEffect(() => {
    // If user ID changed, force reload data
    if (prevUserId !== null && prevUserId !== currentUser.id) {
      console.log('User changed from', prevUserId, 'to', currentUser.id, '- forcing data reload')
      setRecords([]) // Clear existing records
      loadRecords()
    }
    setPrevUserId(currentUser.id)
  }, [currentUser.id, prevUserId])

  // Force reload when component mounts (important for login/logout scenarios)
  useEffect(() => {
    console.log('Component mounted, loading records for user:', currentUser.id)
    loadRecords()
  }, [])

  const handleApprove = (record: LeaveRequest) => {
    // Prevent users from approving their own requests
    if (record.user_id === currentUser.id) {
      toast({
        title: "Error",
        description: "You cannot approve your own leave requests",
        variant: "destructive",
      })
      return
    }

    setSelectedRecord(record)
    // Set default approval date to today
    setApprovalDate(new Date().toISOString().split("T")[0])
    setShowApproveDialog(true)
  }

  const handleEdit = (record: LeaveRequest) => {
    if (record.user_id !== currentUser.id) {
      toast({
        title: "Error",
        description: "You can only edit your own leave requests",
        variant: "destructive",
      })
      return
    }

    if (record.status !== "pending") {
      toast({
        title: "Error",
        description: "You can only edit pending leave requests",
        variant: "destructive",
      })
      return
    }

    setEditingRecord(record)
    setEditLeaveType(record.leaveType.toLowerCase().replace(" leave", ""))
    setEditSelectedDates(record.selectedDates.map(date => new Date(date)))
    setEditReason(record.reason)
    setShowEditDialog(true)
  }

  const confirmApproval = async (approved: boolean) => {
    if (!selectedRecord) return

    if (!approvalDate) {
      toast({
        title: "Error",
        description: "Please enter an approval date",
        variant: "destructive",
      })
      return
    }

    setIsApproving(true)

    try {
      const result = await leaveRequestsApi.approveLeaveRequest(
        selectedRecord.id,
        approved,
        currentUser.email,
        currentUser.name
      )

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to update leave request",
          variant: "destructive",
        })
        return
      }

      // Reload records to show updated status
      await loadRecords()

      setShowApproveDialog(false)
      setSelectedRecord(null)
      setApprovalDate("")

      toast({
        title: "Success",
        description: `Leave request ${approved ? "approved" : "rejected"} by ${currentUser.name}`,
      })
    } catch (error) {
      console.error('Approval error:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleDelete = async (recordId: string) => {
    console.log('🗑️ UI: Starting delete for record ID:', recordId)

    const result = await leaveRequestsApi.deleteLeaveRequest(recordId)
    console.log('📥 UI: deleteLeaveRequest result:', result)

    if (!result.success) {
      console.error('❌ UI: Delete failed:', result.error)
      toast({
        title: "Error",
        description: result.error || "Failed to delete leave request",
        variant: "destructive",
      })
      return
    }

    console.log('✅ UI: Delete successful, reloading records...')
    loadRecords()

    toast({
      title: "Success",
      description: "Leave request deleted successfully",
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingRecord) return

    const days = editSelectedDates.length
    const selectedLeaveType = LEAVE_TYPES.find((lt) => lt.value === editLeaveType)

    if (!selectedLeaveType) {
      toast({
        title: "Error",
        description: "Please select a leave type",
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

    const result = await leaveRequestsApi.updateLeaveRequest(editingRecord.id, {
      leaveType: selectedLeaveType.label,
      selectedDates: editSelectedDates.map(date => date.toISOString()),
      days,
      reason: editReason,
    })

    if (!result.success) {
      toast({
        title: "Error",
        description: result.error || "Failed to update leave request",
        variant: "destructive",
      })
      return
    }

    loadRecords()
    setShowEditDialog(false)
    setEditingRecord(null)
    setEditLeaveType("")
    setEditSelectedDates([])
    setEditReason("")

    toast({
      title: "Success",
      description: "Leave request updated successfully",
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    }
    return <Badge variant={variants[status] || "default"}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{viewMode === "personal" ? "My Leave Records" : "Team Leave Records"}</CardTitle>
          <CardDescription>
            {viewMode === "personal"
              ? "View and manage your leave requests"
              : "View and approve team member leave requests"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {viewMode === "team" && (
            <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                <Label htmlFor="account-filter" className="text-sm font-medium">Filter by Account</Label>
                <Select value={accountFilter} onValueChange={setAccountFilter}>
                    <SelectTrigger id="account-filter" className="mt-1 h-9 sm:h-10">
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {getUniqueUsers().map(user => (
                      <SelectItem key={user.id} value={user.id}>
                          <div className="truncate">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-muted-foreground ml-1">({user.email})</span>
                          </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
                <div>
                <Label htmlFor="month-filter" className="text-sm font-medium">Filter by Month</Label>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger id="month-filter" className="mt-1 h-9 sm:h-10">
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    <SelectItem value="1">January</SelectItem>
                    <SelectItem value="2">February</SelectItem>
                    <SelectItem value="3">March</SelectItem>
                    <SelectItem value="4">April</SelectItem>
                    <SelectItem value="5">May</SelectItem>
                    <SelectItem value="6">June</SelectItem>
                    <SelectItem value="7">July</SelectItem>
                    <SelectItem value="8">August</SelectItem>
                    <SelectItem value="9">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(accountFilter !== "all" || monthFilter !== "all") && (
                  <div className="flex items-end sm:col-span-2 lg:col-span-1">
                    <Button variant="outline" size="sm" onClick={clearFilters} className="w-full sm:w-auto">
                    Clear Filters
                  </Button>
                </div>
              )}
              </div>
            </div>
          )}

          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {viewMode === "team" && (accountFilter !== "all" || monthFilter !== "all")
                  ? "No leave records match the selected filters"
                  : "No leave records found"}
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredRecords.map((record) => (
                <div key={record.id} className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 space-y-2 sm:space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <h3 className="font-semibold text-sm sm:text-base">{record.leaveType}</h3>
                        {getStatusBadge(record.status)}
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {record.isHalfDay ? "0.5" : record.days} day{record.isHalfDay ? "" : record.days !== 1 ? "s" : ""}
                        </span>
                        {record.isHalfDay && record.halfDayPeriod && (
                          <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-400 font-medium">
                            Half-day {record.halfDayPeriod === 'morning' ? 'Morning' : 'Afternoon'}
                          </Badge>
                        )}
                      </div>

                      {viewMode === "team" && (
                        <div className="text-xs sm:text-sm">
                          <span className="font-medium">{record.userName}</span>
                          <span className="text-muted-foreground ml-1">({record.userEmail})</span>
                        </div>
                      )}

                      <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                        <div className="flex flex-col sm:flex-row sm:gap-2">
                          <span className="text-muted-foreground font-medium sm:min-w-20">Leave Dates:</span>
                          <span className="font-medium break-words">
                            {record.selectedDates
                              .map(date => new Date(date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric"
                              }))
                              .join(", ")}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:gap-2">
                          <span className="text-muted-foreground font-medium sm:min-w-20">Reason:</span>
                          <span className="break-words">{record.reason}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:gap-2">
                          <span className="text-muted-foreground font-medium sm:min-w-20">Submitted:</span>
                          <span>{formatDate(record.submittedAt)}</span>
                        </div>
                        {record.approvedAt && (
                          <>
                            <div className="flex flex-col sm:flex-row sm:gap-2">
                              <span className="text-muted-foreground font-medium sm:min-w-20">
                                {record.status === "approved" ? "Approved" : "Rejected"} Date:
                              </span>
                              <span>{formatDate(record.approvedAt)}</span>
                            </div>
                            {record.approvedBy && (
                              <div className="flex flex-col sm:flex-row sm:gap-2">
                                <span className="text-muted-foreground font-medium sm:min-w-20">
                                  Approver:
                                </span>
                                <span className="font-medium break-words">
                                  {record.approvedByName || 'Unknown'}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col gap-2 sm:gap-2 justify-end sm:justify-start">
                      {viewMode === "personal" && record.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(record)}
                            className="flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-3"
                          >
                            <span className="hidden sm:inline">Edit</span>
                            <span className="sm:hidden">✏️</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(record.id)}
                            className="flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-3"
                          >
                            <span className="hidden sm:inline">Delete</span>
                            <span className="sm:hidden">🗑️</span>
                          </Button>
                        </>
                      )}
                      {viewMode === "team" && record.status === "pending" && canApprove && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApprove(record)}
                          className="w-full sm:w-auto text-xs sm:text-sm px-3 sm:px-4"
                        >
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Leave Request</DialogTitle>
            <DialogDescription>Approve or reject this leave request</DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <p className="text-sm">
                  {selectedRecord.userName} ({selectedRecord.userEmail})
                </p>
              </div>
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <p className="text-sm">{selectedRecord.leaveType}</p>
              </div>
              <div className="space-y-2">
                <Label>Leave Dates</Label>
                <p className="text-sm">
                  {selectedRecord.selectedDates
                    .map(date => new Date(date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric"
                    }))
                    .join(", ")}
                  ({selectedRecord.days} day{selectedRecord.days !== 1 ? "s" : ""})
                </p>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <p className="text-sm">{selectedRecord.reason}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="approvalDate">Approval Date *</Label>
                <Input
                  id="approvalDate"
                  type="date"
                  value={approvalDate}
                  onChange={(e) => setApprovalDate(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
              <div className="space-y-2">
                <Label>Approver</Label>
                <p className="text-sm text-muted-foreground">
                  This action will be recorded as approved/rejected by <strong>{currentUser.name}</strong> ({currentUser.email})
                </p>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowApproveDialog(false)}
                  disabled={isApproving}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => confirmApproval(false)}
                  disabled={isApproving}
                >
                  {isApproving ? "Rejecting..." : "Reject"}
                </Button>
                <Button
                  onClick={() => confirmApproval(true)}
                  disabled={isApproving}
                >
                  {isApproving ? "Approving..." : "Approve"}
                </Button>
              </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Leave Request Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Leave Request</DialogTitle>
            <DialogDescription>
              Update your leave request details. Only pending requests can be edited.
            </DialogDescription>
          </DialogHeader>
          {editingRecord && (
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="editLeaveType">Leave Type *</Label>
                  <Select value={editLeaveType} onValueChange={setEditLeaveType} required>
                    <SelectTrigger id="editLeaveType">
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
              </div>

              <div className="space-y-2">
                <Label>Select Leave Dates *</Label>
                <MultiDatePicker
                  selectedDates={editSelectedDates}
                  onDatesChange={setEditSelectedDates}
                />
              </div>

              {editSelectedDates.length > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    Leave Duration: {editSelectedDates.length} day{editSelectedDates.length !== 1 ? "s" : ""}
                    {LEAVE_TYPES.find((lt) => lt.value === editLeaveType) && (
                      <span
                        className={
                          editSelectedDates.length > LEAVE_TYPES.find((lt) => lt.value === editLeaveType)!.maxDays
                            ? "text-destructive ml-2"
                            : "text-muted-foreground ml-2"
                        }
                      >
                        ({editSelectedDates.length > LEAVE_TYPES.find((lt) => lt.value === editLeaveType)!.maxDays
                          ? "Exceeds"
                          : "Within"} {LEAVE_TYPES.find((lt) => lt.value === editLeaveType)?.label} limit of{" "}
                        {LEAVE_TYPES.find((lt) => lt.value === editLeaveType)?.maxDays} days)
                      </span>
                    )}
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Selected dates: {editSelectedDates
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
                <Label htmlFor="editReason">Reason for Leave *</Label>
                <Textarea
                  id="editReason"
                  placeholder="Please provide a reason for your leave request..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update Leave Request
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
