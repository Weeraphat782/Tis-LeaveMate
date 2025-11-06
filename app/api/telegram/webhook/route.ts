import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Gemini API configuration
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY!
const GEMINI_MODEL = 'gemini-2.0-flash'

interface TelegramMessage {
  message_id: number
  from: {
    id: number
    is_bot: boolean
    first_name: string
    last_name?: string
    username?: string
  }
  chat: {
    id: number
    type: string
  }
  date: number
  text: string
}

interface ParsedMessage {
  intent: 'leave_request' | 'incomplete_request' | 'unknown'
  start_date?: string
  end_date?: string
  reason?: string
  leave_type?: string
  confidence: number
  is_half_day?: boolean
  half_day_period?: 'morning' | 'afternoon'
}

async function parseMessageWithGemini(text: string): Promise<ParsedMessage> {
  // Check if API key exists
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not found')
    return { intent: 'unknown', confidence: 0 }
  }

  const prompt = `
  You are an AI assistant that parses Thai/English messages about leave requests.

  IMPORTANT RULES:
  - Dates MUST be specific calendar dates (e.g., '15 November 2025', '15/11/2025', 'November 15, 2025')
  - DO NOT accept relative dates: 'today', 'tomorrow', 'day after tomorrow', 'next week', 'next month', 'วันนี้', 'พรุ่งนี้', 'มะรืนนี้', 'สัปดาห์หน้า', 'เดือนหน้า'
  - Support half-day leaves: "half day morning", "half day afternoon", "ครึ่งวันเช้า", "ครึ่งวันบ่าย", "morning", "afternoon", "เช้า", "บ่าย"
  - If no specific dates are mentioned, set intent to "incomplete_request" and dates to null
  - If half-day is mentioned but no period specified, set intent to "incomplete_request"

  Message to analyze: "${text}"

  Respond with JSON format only:
  {
    "intent": "leave_request" | "incomplete_request" | "unknown",
    "start_date": "YYYY-MM-DD" (if specific date mentioned),
    "end_date": "YYYY-MM-DD" (if specific date mentioned),
    "reason": "reason for leave" (if mentioned),
    "leave_type": "Personal" | "Sick" | "Vacation" | "Other",
    "is_half_day": true|false,
    "half_day_period": "morning"|"afternoon" (required if is_half_day=true),
    "confidence": 0.0-1.0 (confidence in analysis)
  }

  Valid examples:
  - "I want to take leave from 15 November to 17 November for family work" → {"intent": "leave_request", "start_date": "2025-11-15", "end_date": "2025-11-17", "reason": "family work", "leave_type": "Personal", "is_half_day": false, "confidence": 0.9}
  - "Sick leave on 20/11/2025" → {"intent": "leave_request", "start_date": "2025-11-20", "end_date": "2025-11-20", "reason": "sick", "leave_type": "Sick", "is_half_day": false, "confidence": 0.95}
  - "Half day morning leave on 15 Nov 2025 for medical checkup" → {"intent": "leave_request", "start_date": "2025-11-15", "end_date": "2025-11-15", "reason": "medical checkup", "leave_type": "Personal", "is_half_day": true, "half_day_period": "morning", "confidence": 0.9}
  - "ครึ่งวันบ่ายวันที่ 16/11/2025 ธุระส่วนตัว" → {"intent": "leave_request", "start_date": "2025-11-16", "end_date": "2025-11-16", "reason": "ธุระส่วนตัว", "leave_type": "Personal", "is_half_day": true, "half_day_period": "afternoon", "confidence": 0.9}

  Invalid examples:
  - "Take 3 days leave today for family matters" → {"intent": "incomplete_request", "start_date": null, "end_date": null, "reason": "family matters", "leave_type": "Personal", "is_half_day": false, "confidence": 0.8}
  - "Half day leave tomorrow" → {"intent": "incomplete_request", "start_date": null, "end_date": null, "reason": null, "leave_type": "Personal", "is_half_day": true, "half_day_period": null, "confidence": 0.7}

  Return JSON only, no other text.
  `

  try {
    console.log('Calling Gemini API with model:', GEMINI_MODEL)
    console.log('Message to parse:', text)

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', response.status, errorText)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('Gemini API response:', JSON.stringify(data, null, 2))

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!responseText) {
      console.error('No response text from Gemini:', data)
      return { intent: 'unknown', confidence: 0 }
    }

    console.log('Gemini response text:', responseText)

    // Clean up the response (remove markdown code blocks if any)
    const cleanText = responseText.replace(/```json\n?|\n?```/g, '').trim()

    console.log('Cleaned response:', cleanText)

    const parsed = JSON.parse(cleanText)

    // Validate response structure
    if (!parsed.intent || typeof parsed.confidence !== 'number') {
      console.error('Invalid Gemini response structure:', parsed)
      return { intent: 'unknown', confidence: 0 }
    }

    console.log('Successfully parsed message:', parsed)
    return parsed

  } catch (error) {
    console.error('Error parsing message with Gemini:', error)
    return { intent: 'unknown', confidence: 0 }
  }
}

async function findUserByTelegramId(telegramId: number) {
  const supabase = createClient()

  console.log('Looking for user with telegram ID:', telegramId, 'Type:', typeof telegramId)

  const { data, error } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('telegram_user_id', telegramId)
    .single()

  if (error) {
    console.error('Database error finding user:', error)
    console.log('Error details:', {
      code: error.code,
      message: error.message,
      telegramId: telegramId,
      telegramIdType: typeof telegramId
    })
  }

  if (!data) {
    console.log('No user mapping found for telegram ID:', telegramId)

    // Try to list all telegram_users for debugging
    const { data: allUsers, error: listError } = await supabase
      .from('telegram_users')
      .select('telegram_user_id, email, user_id')
      .limit(10)

    if (!listError && allUsers) {
      console.log('Existing telegram users:', allUsers.map(u => ({
        id: u.telegram_user_id,
        idType: typeof u.telegram_user_id,
        email: u.email,
        userId: u.user_id
      })))
    }

    return null
  }

  console.log('Found user mapping:', {
    telegramUserId: data.telegram_user_id,
    email: data.email,
    userId: data.user_id
  })

  // Fetch profile data separately
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', data.user_id)
    .single()

  if (profileError) {
    console.log('Profile fetch error (non-critical):', profileError)
  }

  return {
    telegramUser: data,
    profile: profile || null
  }
}

// Map Gemini leave types to database values
function mapLeaveType(geminiType: string): string {
  const typeMap: { [key: string]: string } = {
    'Personal': 'Personal Leave',
    'Sick': 'Sick Leave',
    'Vacation': 'Vacation Leave',
    'personal': 'Personal Leave',
    'sick': 'Sick Leave',
    'vacation': 'Vacation Leave'
  }

  return typeMap[geminiType] || 'Personal Leave' // Default fallback
}

async function createLeaveRequest(userId: string, parsedMessage: ParsedMessage, telegramMessage: TelegramMessage) {
  const supabase = createClient()

  // Calculate days
  const startDate = new Date(parsedMessage.start_date!)
  const endDate = new Date(parsedMessage.end_date!)
  const fullDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // Map leave type to database format
  const mappedLeaveType = mapLeaveType(parsedMessage.leave_type || 'Personal')

  console.log('Creating leave request:', {
    userId,
    originalLeaveType: parsedMessage.leave_type,
    mappedLeaveType,
    startDate: parsedMessage.start_date,
    endDate: parsedMessage.end_date,
    fullDays,
    isHalfDay: parsedMessage.is_half_day,
    halfDayPeriod: parsedMessage.half_day_period
  })

  const leaveRequest = {
    user_id: userId,
    leave_type: mappedLeaveType,
    selected_dates: generateDateRange(startDate, endDate),
    days: fullDays, // Always store full days as integer
    reason: parsedMessage.reason || 'Submitted via Telegram',
    status: 'pending',
    is_half_day: parsedMessage.is_half_day || false,
    half_day_period: parsedMessage.is_half_day ? parsedMessage.half_day_period : null
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .insert([leaveRequest])
    .select()
    .single()

  if (error) {
    console.error('Error creating leave request:', error)
    throw error
  }

  return data
}

function generateDateRange(start: Date, end: Date): string[] {
  const dates: string[] = []
  const current = new Date(start)

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  return dates
}

async function handleConnectCommand(message: TelegramMessage) {
  const text = message.text.toLowerCase()

  // Extract email from message
  let email = ''

  // Try different patterns
  const emailMatch = message.text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  if (emailMatch) {
    email = emailMatch[1]
  } else {
    // If no email found, ask for it
    await sendTelegramReply(
      message.chat.id,
      '❓ Please specify your email address\n\nExamples:\n• "/connect your-email@example.com"\n• "connect myemail@company.com"'
    )
    return
  }

  console.log('Attempting to connect email:', email, 'for Telegram ID:', message.from.id)

  try {
    const supabase = createClient()

    // Validate user by checking if they exist in profiles table
    // This ensures they are real users of the system
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email)
      .single()

    if (profileError || !profile) {
      console.log('Profile not found for email:', email, 'Error:', profileError)
      await sendTelegramReply(
        message.chat.id,
        `❌ User not found in system for email: ${email}\n\nPlease check:\n• Email must match your registration email\n• Or contact admin to add your account`
      )
      return
    }

    // Use the profile id (which is the user_id from auth.users)
    const userId = profile.id
    console.log('Found profile for email:', email, 'User ID:', userId)

    // Check if user has submitted any leave requests (optional validation)
    const { count: leaveRequestCount, error: leaveError } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    await sendTelegramReply(
      message.chat.id,
      `✅ Account connected successfully!\n\n👤 ${profile.full_name || email}\n📧 ${email}\n🔗 Telegram ID: ${message.from.id}\n\nFound ${leaveRequestCount || 0} leave requests in system\n\nYou can now:\n• Request leave in natural language\n• Check leave status\n\nTry typing: "Half day morning leave on 15 Nov 2025 for medical checkup"`
    )

    // Check if already connected
    const { data: existingMapping } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_user_id', message.from.id)
      .single()

    if (existingMapping) {
      await sendTelegramReply(
        message.chat.id,
        `✅ This account is already connected to email: ${existingMapping.email}\n\nDo you want to change the email?`
      )
      return
    }

    // Create new mapping
    const { error: insertError } = await supabase
      .from('telegram_users')
      .insert({
        telegram_user_id: message.from.id,
        user_id: userId,
        email: email,
        telegram_username: message.from.username || null,
        telegram_first_name: message.from.first_name || null,
        telegram_last_name: message.from.last_name || null,
        chat_id: message.chat.id
      })

    if (insertError) {
      console.error('Error creating telegram user mapping:', insertError)
      await sendTelegramReply(
        message.chat.id,
        '❌ Error connecting account, please try again'
      )
      return
    }

    // Success!
    await sendTelegramReply(
      message.chat.id,
      `✅ Account connected successfully!\n\n👤 Email: ${email}\n🔗 Telegram ID: ${message.from.id}\n\nYou can now:\n• Request leave in natural language\n• Check leave status\n\nTry typing: "Half day morning leave on 15 Nov 2025 for medical checkup"`
    )

    console.log('Successfully connected Telegram user:', message.from.id, 'to email:', email)

  } catch (error) {
    console.error('Error in handleConnectCommand:', error)
    await sendTelegramReply(
      message.chat.id,
      '❌ An error occurred, please try again'
    )
  }
}

async function sendTelegramReply(chatId: number, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN!
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    }),
  })

  if (!response.ok) {
    console.error('Error sending Telegram reply:', await response.text())
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message }: { message: TelegramMessage } = body

    if (!message || !message.text) {
      return NextResponse.json({ ok: true })
    }

    console.log('Received Telegram message:', message.text)

    // 1. Check for connect command first
    const lowerText = message.text.toLowerCase()
    if (lowerText.startsWith('/connect ') || lowerText.includes('connect')) {
      await handleConnectCommand(message)
      return NextResponse.json({ ok: true })
    }

    // 2. Parse message with Gemini AI
    const parsedMessage = await parseMessageWithGemini(message.text)

    console.log('Parsed message:', parsedMessage)

    // 3. Check if it's a leave request with high confidence
    if (parsedMessage.intent === 'incomplete_request') {
      await sendTelegramReply(
        message.chat.id,
        '❌ Please specify specific dates for your leave request.\n\nExamples:\n• "Take leave from 15 November to 17 November for family matters"\n• "Sick leave on 20/11/2025"\n• "Half day morning leave on 15 Nov 2025 for medical checkup"\n• "Vacation from November 15-17, 2025"\n\nDo not use relative dates like "today", "tomorrow", or "next week".\nFor half-day requests, specify "morning" or "afternoon".'
      )
      return NextResponse.json({ ok: true })
    }

    if (parsedMessage.intent !== 'leave_request' || parsedMessage.confidence < 0.7) {
      await sendTelegramReply(
        message.chat.id,
        '❓ I don\'t understand your message, please try again\n\nExamples:\n• "Take leave from 15 November to 17 November for family matters"\n• "Sick leave on 20/11/2025"\n• "Half day morning leave on 15 Nov 2025 for medical checkup"\n• "Vacation from November 15-17, 2025"\n\nOr type:\n• "/connect your-email@example.com" to connect your account'
      )
      return NextResponse.json({ ok: true })
    }

    // 3. Find user mapping
    const userMapping = await findUserByTelegramId(message.from.id)

    if (!userMapping) {
      await sendTelegramReply(
        message.chat.id,
        '❌ Your account is not connected to the system\n\nPlease contact admin to setup your Telegram account connection'
      )
      return NextResponse.json({ ok: true })
    }

    // 4. Create leave request
    const leaveRequest = await createLeaveRequest(
      userMapping.profile.id,
      parsedMessage,
      message
    )

    // 5. Send success reply
    const displayDays = parsedMessage.is_half_day ? 0.5 : leaveRequest.days
    const replyText = `✅ Leave request submitted successfully!

👤 ${userMapping.profile.full_name || userMapping.profile.email}
📅 From: ${parsedMessage.start_date}
📅 To: ${parsedMessage.end_date}
📊 Days: ${displayDays} day${displayDays === 1 || displayDays === 0.5 ? '' : '(s)'}
💬 Reason: ${parsedMessage.reason || 'Not specified'}
🏷️ Type: ${parsedMessage.leave_type}
${parsedMessage.is_half_day ? `⏰ Period: ${parsedMessage.half_day_period === 'morning' ? 'Morning' : 'Afternoon'}` : ''}

Status: ⏳ Pending approval`

    await sendTelegramReply(message.chat.id, replyText)

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Error processing Telegram webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Telegram webhook endpoint',
    status: 'active'
  })
}
