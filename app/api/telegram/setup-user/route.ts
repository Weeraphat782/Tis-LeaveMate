import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { telegram_user_id, user_email, telegram_username, telegram_first_name, telegram_last_name } = await request.json()

    if (!telegram_user_id || !user_email) {
      return NextResponse.json(
        { error: 'Missing required fields: telegram_user_id and user_email' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Call the database function to setup user mapping
    const { data, error } = await supabase.rpc('setup_telegram_user', {
      p_telegram_user_id: telegram_user_id,
      p_user_email: user_email,
      p_telegram_username: telegram_username || null,
      p_telegram_first_name: telegram_first_name || null,
      p_telegram_last_name: telegram_last_name || null
    })

    if (error) {
      console.error('Error setting up telegram user:', error)
      return NextResponse.json(
        { error: 'Failed to setup telegram user mapping' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      mapping_id: data,
      message: 'Telegram user mapping created/updated successfully'
    })

  } catch (error) {
    console.error('Error in setup-user API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Telegram user setup endpoint',
    usage: 'POST with { telegram_user_id, user_email, telegram_username?, telegram_first_name?, telegram_last_name? }'
  })
}
