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
  intent: 'leave_request' | 'unknown'
  start_date?: string
  end_date?: string
  reason?: string
  leave_type?: string
  confidence: number
}

async function parseMessageWithGemini(text: string): Promise<ParsedMessage> {
  // Check if API key exists
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not found')
    return { intent: 'unknown', confidence: 0 }
  }

  const prompt = `
  คุณเป็น AI ที่ช่วย parse ข้อความภาษาไทย/อังกฤษเกี่ยวกับการขอลา

  งานของคุณคือวิเคราะห์ข้อความและแยกส่วนต่างๆ ออกมา

  ข้อความ: "${text}"

  ให้ตอบเป็น JSON format เท่านั้น:
  {
    "intent": "leave_request" | "unknown",
    "start_date": "YYYY-MM-DD" (ถ้ามี),
    "end_date": "YYYY-MM-DD" (ถ้ามี),
    "reason": "เหตุผลการลา" (ถ้ามี),
    "leave_type": "Personal" | "Sick" | "Vacation" | "อื่นๆ",
    "confidence": 0.0-1.0 (ความมั่นใจในการวิเคราะห์)
  }

  ตัวอย่าง:
  - "ขอลาวันนี้ 3 วัน เรื่องงานครอบครัว" → {"intent": "leave_request", "start_date": "2025-01-15", "end_date": "2025-01-17", "reason": "work family", "leave_type": "Personal", "confidence": 0.9}
  - "ลาป่วยวันนี้" → {"intent": "leave_request", "start_date": "2025-01-15", "end_date": "2025-01-15", "reason": "sick", "leave_type": "Sick", "confidence": 0.95}
  - "หยุดวันนี้" → {"intent": "unknown", "confidence": 0.3}

  ห้ามมี text อื่นนอกเหนือจาก JSON
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

  const { data, error } = await supabase
    .from('telegram_users')
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        full_name
      )
    `)
    .eq('telegram_user_id', telegramId)
    .single()

  if (error || !data) {
    console.log('User not found for telegram ID:', telegramId)
    return null
  }

  return {
    telegramUser: data,
    profile: data.profiles
  }
}

async function createLeaveRequest(userId: string, parsedMessage: ParsedMessage, telegramMessage: TelegramMessage) {
  const supabase = createClient()

  // Calculate days
  const startDate = new Date(parsedMessage.start_date!)
  const endDate = new Date(parsedMessage.end_date!)
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  const leaveRequest = {
    user_id: userId,
    leave_type: parsedMessage.leave_type || 'Personal',
    selected_dates: generateDateRange(startDate, endDate),
    days: days,
    reason: parsedMessage.reason || 'Submitted via Telegram',
    status: 'pending'
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
      '❓ กรุณาระบุอีเมลของคุณ\n\nตัวอย่าง:\n• "/connect your-email@example.com"\n• "connect myemail@company.com"'
    )
    return
  }

  console.log('Attempting to connect email:', email, 'for Telegram ID:', message.from.id)

  try {
    const supabase = createClient()

    // Validate user by checking if they have submitted leave requests before
    // This ensures they are real users of the system
    const { data: existingLeaveRequests, error: leaveError } = await supabase
      .from('leave_requests')
      .select('user_id')
      .eq('user_email', email)
      .limit(1)

    if (leaveError) {
      console.error('Error checking leave requests:', leaveError)
      await sendTelegramReply(
        message.chat.id,
        '❌ เกิดข้อผิดพลาดในการตรวจสอบข้อมูล กรุณาลองใหม่'
      )
      return
    }

    if (!existingLeaveRequests || existingLeaveRequests.length === 0) {
      console.log('No leave requests found for email:', email)
      await sendTelegramReply(
        message.chat.id,
        `❌ ไม่พบข้อมูลการลาในระบบสำหรับอีเมล: ${email}\n\nกรุณาตรวจสอบ:\n• อีเมลต้องตรงกับที่ใช้ส่งคำขอลาในระบบ\n• หรือส่งคำขอลาผ่านเว็บก่อน`
      )
      return
    }

    // Use the user_id from existing leave request
    const userId = existingLeaveRequests[0].user_id
    console.log('Found existing user ID:', userId, 'for email:', email)

    await sendTelegramReply(
      message.chat.id,
      `✅ เชื่อมต่อบัญชีสำเร็จ!\n\n👤 อีเมล: ${email}\n🔗 Telegram ID: ${message.from.id}\n\nพบข้อมูลการลา ${existingLeaveRequests.length} รายการในระบบ\n\nตอนนี้คุณสามารถ:\n• ขอลาได้ด้วยภาษาธรรมชาติ\n• ตรวจสอบสถานะการลา\n\nลองพิมพ์: "ขอลาวันนี้ 3 วัน เรื่องงานครอบครัว"`
    )

      // For demo purposes, accept any email and use a dummy user ID
      // In production, you should validate against actual users
      console.log('Demo mode: accepting email for testing purposes')
      // Create a consistent UUID-like string for demo (valid UUID format)
      const crypto = await import('crypto')
      const hash = crypto.createHash('md5').update(email).digest('hex')
      userId = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`

      await sendTelegramReply(
        message.chat.id,
        `⚠️ Demo Mode: เชื่อมต่ออีเมล ${email} สำเร็จ\n\n(ในระบบจริงจะตรวจสอบอีเมลก่อน)\n\nตอนนี้คุณสามารถทดสอบขอลาได้เลย!`
      )
    } else {
      userId = profileData.user_id || profileData.id
      console.log('Found user ID:', userId, 'for email:', email)
    }

    // Check if already connected
    const { data: existingMapping } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_user_id', message.from.id)
      .single()

    if (existingMapping) {
      await sendTelegramReply(
        message.chat.id,
        `✅ บัญชีนี้เชื่อมต่อกับอีเมล: ${existingMapping.email} แล้ว\n\nต้องการเปลี่ยนอีเมลหรือไม่?`
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
        '❌ เกิดข้อผิดพลาดในการเชื่อมต่อบัญชี กรุณาลองใหม่'
      )
      return
    }

    // Success!
    await sendTelegramReply(
      message.chat.id,
      `✅ เชื่อมต่อบัญชีสำเร็จ!\n\n👤 อีเมล: ${email}\n🔗 Telegram ID: ${message.from.id}\n\nตอนนี้คุณสามารถ:\n• ขอลาได้ด้วยภาษาธรรมชาติ\n• ตรวจสอบสถานะการลา\n\nลองพิมพ์: "ขอลาวันนี้ 3 วัน เรื่องงานครอบครัว"`
    )

    console.log('Successfully connected Telegram user:', message.from.id, 'to email:', email)

  } catch (error) {
    console.error('Error in handleConnectCommand:', error)
    await sendTelegramReply(
      message.chat.id,
      '❌ เกิดข้อผิดพลาด กรุณาลองใหม่'
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
    if (parsedMessage.intent !== 'leave_request' || parsedMessage.confidence < 0.7) {
      await sendTelegramReply(
        message.chat.id,
        '❓ ไม่เข้าใจข้อความของคุณ ลองพิมพ์ใหม่นะ\n\nตัวอย่าง:\n• "ขอลาวันนี้ 3 วัน เรื่องงานครอบครัว"\n• "ลาป่วยวันนี้"\n• "ขอลา 15-17 มกราคม ไปเที่ยว"\n\nหรือพิมพ์:\n• "/connect your-email@example.com" เพื่อเชื่อมต่อบัญชี'
      )
      return NextResponse.json({ ok: true })
    }

    // 3. Find user mapping
    const userMapping = await findUserByTelegramId(message.from.id)

    if (!userMapping) {
      await sendTelegramReply(
        message.chat.id,
        '❌ คุณยังไม่ได้เชื่อมต่อบัญชีกับระบบ\n\nกรุณาติดต่อ admin เพื่อ setup การเชื่อมต่อ Telegram กับบัญชีของคุณ'
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
    const replyText = `✅ ส่งคำขอลาเรียบร้อยแล้ว!

👤 ${userMapping.profile.full_name || userMapping.profile.email}
📅 จาก: ${parsedMessage.start_date}
📅 ถึง: ${parsedMessage.end_date}
📊 วัน: ${leaveRequest.days} วัน
💬 เหตุผล: ${parsedMessage.reason}
🏷️ ประเภท: ${parsedMessage.leave_type}

สถานะ: ⏳ รอการอนุมัติ`

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
