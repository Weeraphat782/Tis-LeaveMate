import { supabase } from './supabase'

export interface LeaveRequest {
  id: string
  user_id: string
  userName: string
  userEmail: string
  leaveType: string
  selectedDates: string[]
  days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  approvedAt?: string | null
  approvedBy?: string | null
  approvedByName?: string | null
}

export interface LeaveStats {
  personalUsed: number
  vacationUsed: number
  sickUsed: number
  pending: number
}

// Leave Requests CRUD Operations
export const leaveRequestsApi = {
  // Get all leave requests for a user
  async getUserLeaveRequests(userId: string): Promise<LeaveRequest[]> {
    try {
      // First get the leave requests
      const { data: leaveRequests, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false })

      if (leaveError) {
        console.error('Error fetching leave requests:', leaveError)
        return []
      }

      if (!leaveRequests || leaveRequests.length === 0) {
        console.log('No leave requests found for user')
        return []
      }

      // Get user profile information
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single()

      const userName = profile?.full_name || profile?.email?.split('@')[0] || 'Unknown'
      const userEmail = profile?.email || ''

      console.log('Fetched user leave requests:', leaveRequests.length, 'records')
      return leaveRequests.map(item => ({
        id: item.id,
        user_id: item.user_id,
        userName,
        userEmail,
        leaveType: item.leave_type,
        selectedDates: item.selected_dates || [],
        days: item.days,
        reason: item.reason,
        status: item.status,
        submittedAt: item.submitted_at,
        approvedAt: item.approved_at,
        approvedBy: item.approved_by,
        approvedByName: item.approved_by_name,
      }))
    } catch (err) {
      console.error('Unexpected error fetching user leave requests:', err)
      return []
    }
  },

  // Get all leave requests (for team view)
  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    try {
      // First get all leave requests
      const { data: leaveRequests, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .order('submitted_at', { ascending: false })

      if (leaveError) {
        console.error('Error fetching all leave requests:', leaveError)
        return []
      }

      if (!leaveRequests || leaveRequests.length === 0) {
        return []
      }

      // Get all unique user IDs
      const userIds = [...new Set(leaveRequests.map(req => req.user_id))]

      // Get profiles for all users
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)

      if (profileError) {
        console.error('Error fetching profiles:', profileError)
      }

      // Create a map of user profiles
      const profileMap = new Map()
      profiles?.forEach(profile => {
        profileMap.set(profile.id, profile)
      })

      return leaveRequests.map(item => {
        const profile = profileMap.get(item.user_id)
        const userName = profile?.full_name || profile?.email?.split('@')[0] || `User ${item.user_id.slice(0, 8)}`
        const userEmail = profile?.email || item.user_id

        return {
          id: item.id,
          user_id: item.user_id,
          userName,
          userEmail,
          leaveType: item.leave_type,
          selectedDates: item.selected_dates || [],
          days: item.days,
          reason: item.reason,
          status: item.status,
          submittedAt: item.submitted_at,
          approvedAt: item.approved_at,
          approvedBy: item.approved_by,
          approvedByName: item.approved_by_name,
        }
      })
    } catch (err) {
      console.error('Unexpected error fetching all leave requests:', err)
      return []
    }
  },

  // Create a new leave request
  async createLeaveRequest(leaveRequest: Omit<LeaveRequest, 'id' | 'submittedAt'>): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if using placeholder values (production configuration issue)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      console.log('🔧 Production debug - Environment variables:')
      console.log('- URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'undefined')
      console.log('- KEY exists:', !!supabaseKey)
      console.log('- KEY length:', supabaseKey?.length || 0)
      console.log('- NODE_ENV:', process.env.NODE_ENV)

      if (!supabaseUrl || supabaseUrl.includes('placeholder') || !supabaseKey || supabaseKey.includes('placeholder')) {
        console.error('❌ Using placeholder Supabase credentials!')
        console.error('Please check your environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
        return { success: false, error: 'Application not properly configured. Please check environment variables.' }
      }

      console.log('📝 createLeaveRequest called with:', {
        user_id: leaveRequest.user_id,
        leave_type: leaveRequest.leaveType,
        selected_dates: leaveRequest.selectedDates.length + ' dates',
        days: leaveRequest.days,
        reason: leaveRequest.reason.substring(0, 50) + (leaveRequest.reason.length > 50 ? '...' : ''),
        status: leaveRequest.status,
      })

      const { error } = await supabase
        .from('leave_requests')
        .insert({
          user_id: leaveRequest.user_id,
          leave_type: leaveRequest.leaveType,
          selected_dates: leaveRequest.selectedDates,
          days: leaveRequest.days,
          reason: leaveRequest.reason,
          status: leaveRequest.status,
        })

      if (error) {
        console.error('❌ Database insert error:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ Leave request created successfully')
      return { success: true }
    } catch (err) {
      console.error('Unexpected error creating leave request:', err)
      return { success: false, error: 'Unexpected error occurred' }
    }
  },

  // Update a leave request
  async updateLeaveRequest(id: string, updates: Partial<Omit<LeaveRequest, 'id' | 'user_id' | 'submittedAt'>>): Promise<{ success: boolean; error?: string }> {
    const updateData: any = {}

    if (updates.leaveType) updateData.leave_type = updates.leaveType
    if (updates.selectedDates) updateData.selected_dates = updates.selectedDates
    if (updates.days) updateData.days = updates.days
    if (updates.reason) updateData.reason = updates.reason
    if (updates.status) updateData.status = updates.status
    if (updates.approvedAt) updateData.approved_at = updates.approvedAt
    if (updates.approvedBy) updateData.approved_by = updates.approvedBy
    if (updates.approvedByName) updateData.approved_by_name = updates.approvedByName

    const { error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Error updating leave request:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  },

  // Delete a leave request
  async deleteLeaveRequest(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting leave request:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  },

  // Approve or reject a leave request
  async approveLeaveRequest(id: string, approved: boolean, approvedBy: string, approvedByName: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: approved ? 'approved' : 'rejected',
        approved_at: new Date().toISOString(),
        approved_by: approvedBy,
        approved_by_name: approvedByName,
      })
      .eq('id', id)

    if (error) {
      console.error('Error approving leave request:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  },
}

// Leave Statistics
export const leaveStatsApi = {
  async getUserLeaveStats(userId: string): Promise<LeaveStats> {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('leave_type, days, status')
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching leave stats:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return { personalUsed: 0, vacationUsed: 0, sickUsed: 0, pending: 0 }
      }

      const stats = { personalUsed: 0, vacationUsed: 0, sickUsed: 0, pending: 0 }

      data?.forEach(request => {
        if (request.status === 'approved' || request.status === 'pending') {
          switch (request.leave_type) {
            case 'Personal Leave':
              stats.personalUsed += request.days
              break
            case 'Vacation Leave':
              stats.vacationUsed += request.days
              break
            case 'Sick Leave':
              stats.sickUsed += request.days
              break
          }
        }
        if (request.status === 'pending') {
          stats.pending += 1
        }
      })

      console.log('Calculated leave stats:', stats)
      return stats
    } catch (err) {
      console.error('Unexpected error fetching leave stats:', err)
      return { personalUsed: 0, vacationUsed: 0, sickUsed: 0, pending: 0 }
    }
  },
}
