import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase-server'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

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
  if (!process.env.GOOGLE_AI_API_KEY) {
    console.error('GOOGLE_AI_API_KEY not found')
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
    console.log('Calling Gemini API with model:', 'gemini-1.5-flash')
    console.log('Message to parse:', text)

    const result = await model.generateContent(prompt)
    const response = await result.response
    const responseText = response.text()

    console.log('Gemini raw response:', responseText)

    // Clean up the response (remove markdown code blocks if any)
    const cleanText = responseText.replace(/```json\n?|\n?```/g, '').trim()

    console.log('Cleaned response:', cleanText)

    const parsed = JSON.parse(cleanText)

    // Validate response structure
    if (!parsed.intent || typeof parsed.confidence !== 'number') {
      console.error('Invalid Gemini response structure:', parsed)
      return { intent: 'unknown', confidence: 0 }
    }

    return parsed
  } catch (error) {
    console.error('Error parsing message with Gemini:', error)

    // Fallback for common errors
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      console.error('Gemini model not found, trying alternative model...')

      try {
        // Try alternative model
        const altModel = genAI.getGenerativeModel({ model: 'gemini-pro' })
        const result = await altModel.generateContent(prompt)
        const response = await result.response
        const cleanText = response.text().replace(/```json\n?|\n?```/g, '').trim()
        return JSON.parse(cleanText)
      } catch (altError) {
        console.error('Alternative model also failed:', altError)
      }
    }

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

    // 1. Parse message with Gemini AI
    const parsedMessage = await parseMessageWithGemini(message.text)

    console.log('Parsed message:', parsedMessage)

    // 2. Check if it's a leave request with high confidence
    if (parsedMessage.intent !== 'leave_request' || parsedMessage.confidence < 0.7) {
      await sendTelegramReply(
        message.chat.id,
        '❓ ไม่เข้าใจข้อความของคุณ ลองพิมพ์ใหม่นะ\n\nตัวอย่าง:\n• "ขอลาวันนี้ 3 วัน เรื่องงานครอบครัว"\n• "ลาป่วยวันนี้"\n• "ขอลา 15-17 มกราคม ไปเที่ยว"'
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
