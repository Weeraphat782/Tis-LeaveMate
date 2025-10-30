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
      // Check authentication first
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      console.log('🔍 Fetching leave requests for user:', userId, 'Auth session:', !!session, 'User ID:', session?.user?.id)

      if (!session || !session.user) {
        console.error('❌ No authenticated session for fetching leave requests')
        return []
      }

      // First get the leave requests
      console.log('📥 Querying leave_requests table...')
      const { data: leaveRequests, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false })

      console.log('📊 Leave requests query result:', {
        count: leaveRequests?.length || 0,
        error: leaveError,
        hasData: !!leaveRequests
      })

      if (leaveError) {
        console.error('❌ Error fetching leave requests:', leaveError)
        console.error('Error details:', {
          message: leaveError.message,
          details: leaveError.details,
          hint: leaveError.hint,
          code: leaveError.code
        })
        return []
      }

      if (!leaveRequests || leaveRequests.length === 0) {
        console.log('ℹ️ No leave requests found for user:', userId)
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
    console.log('🚀 STARTING createLeaveRequest function with data:', leaveRequest)

    try {
      // Check if using placeholder values (production configuration issue)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      console.log('🔧 Environment check:', {
        supabaseUrl: supabaseUrl ? '[SET]' : 'MISSING',
        supabaseKey: supabaseKey ? '[SET]' : 'MISSING'
      })

      if (!supabaseUrl || supabaseUrl.includes('placeholder') || !supabaseKey || supabaseKey.includes('placeholder')) {
        console.error('❌ Using placeholder Supabase credentials!')
        console.error('Please check your environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
        return { success: false, error: 'Application not properly configured. Please check environment variables.' }
      }

      // Check authentication state
      console.log('🔍 Checking authentication session...')
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      console.log('🔐 Auth check result:', {
        sessionExists: !!session,
        userId: session?.user?.id,
        authError: authError
      })

      if (!session || !session.user) {
        console.error('❌ No authenticated user session found!')
        return { success: false, error: 'User not authenticated. Please log in again.' }
      }

      // Verify user_id matches authenticated user
      console.log('🔍 Verifying user ID match...', {
        requestUserId: leaveRequest.user_id,
        authUserId: session.user.id,
        matches: leaveRequest.user_id === session.user.id
      })

      if (leaveRequest.user_id !== session.user.id) {
        console.error('❌ User ID mismatch!', {
          requestUserId: leaveRequest.user_id,
          authUserId: session.user.id
        })
        return { success: false, error: 'Authentication mismatch. Please refresh the page and try again.' }
      }

      console.log('✅ Auth verified, preparing insert data...')

      const insertData = {
        user_id: leaveRequest.user_id,
        leave_type: leaveRequest.leaveType,
        selected_dates: leaveRequest.selectedDates,
        days: leaveRequest.days,
        reason: leaveRequest.reason,
        status: leaveRequest.status,
      }

      console.log('📝 Inserting data:', insertData)

      const { data, error } = await supabase
        .from('leave_requests')
        .insert(insertData)
        .select()

      console.log('📊 Raw Supabase response:', { data, error })

      if (error) {
        console.error('❌ Database insert error:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return { success: false, error: `Database error: ${error.message}` }
      }

      if (!data || data.length === 0) {
        console.error('❌ Insert succeeded but no data returned')
        return { success: false, error: 'Insert succeeded but no data returned' }
      }

      console.log('✅ Leave request created successfully:', data)
      return { success: true }
    } catch (err) {
      console.error('💥 Unexpected error in createLeaveRequest:', err)
      console.error('Error type:', typeof err)
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack available')
      console.error('Error message:', err instanceof Error ? err.message : err)
      return { success: false, error: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}` }
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
    console.log('🗑️ Starting deleteLeaveRequest for ID:', id)

    try {
      // Check authentication first
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      console.log('🔐 Delete auth check:', {
        sessionExists: !!session,
        userId: session?.user?.id,
        authError: authError
      })

      if (!session || !session.user) {
        console.error('❌ No authenticated session for delete')
        return { success: false, error: 'User not authenticated. Please log in again.' }
      }

      // First check if the leave request exists and belongs to the user
      const { data: existingRequest, error: fetchError } = await supabase
        .from('leave_requests')
        .select('user_id, status')
        .eq('id', id)
        .single()

      console.log('📋 Existing request check:', { existingRequest, fetchError })

      if (fetchError) {
        console.error('❌ Error fetching leave request for delete:', fetchError)
        return { success: false, error: 'Leave request not found or access denied.' }
      }

      if (!existingRequest) {
        console.error('❌ Leave request not found')
        return { success: false, error: 'Leave request not found.' }
      }

      // Check ownership and status
      if (existingRequest.user_id !== session.user.id) {
        console.error('❌ User does not own this leave request', {
          requestUserId: existingRequest.user_id,
          authUserId: session.user.id
        })
        return { success: false, error: 'You can only delete your own leave requests.' }
      }

      if (existingRequest.status !== 'pending') {
        console.error('❌ Cannot delete non-pending request, status:', existingRequest.status)
        return { success: false, error: 'You can only delete pending leave requests.' }
      }

      console.log('✅ Delete permission verified, proceeding with delete...')

      // Perform the delete
      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', id)

      console.log('📊 Delete result:', { error })

      if (error) {
        console.error('❌ Database delete error:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return { success: false, error: `Database error: ${error.message}` }
      }

      console.log('✅ Leave request deleted successfully')
      return { success: true }
    } catch (err) {
      console.error('💥 Unexpected error in deleteLeaveRequest:', err)
      console.error('Error type:', typeof err)
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack available')
      return { success: false, error: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}` }
    }
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
