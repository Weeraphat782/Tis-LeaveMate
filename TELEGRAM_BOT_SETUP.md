# Telegram Bot Setup Guide

## 1. สร้าง Telegram Bot

### 1.1 ติดต่อ BotFather
- ไปหา `@BotFather` ใน Telegram
- พิมพ์ `/newbot`
- ตั้งชื่อ Bot (เช่น: `TIS Leave Bot`)
- ตั้ง username (เช่น: `tis_leave_bot`) - ต้องลงท้ายด้วย `_bot`

### 1.2 ได้ Token
- BotFather จะให้ **Bot Token** เช่น: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`
- **เก็บ Token ไว้ให้ปลอดภัย**

## 2. ตั้งค่า Environment Variables

### 2.1 ใน Vercel Dashboard
- ไป **Project Settings** → **Environment Variables**
- เพิ่มตัวแปร:
  ```
  TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
  ```

### 2.2 ใน .env.local (สำหรับ development)
```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
GOOGLE_AI_API_KEY=your-gemini-api-key
```

## 3. ตั้งค่า Webhook

### 3.1 คำนวณ Webhook URL
```
https://your-vercel-domain.vercel.app/api/telegram/webhook
```

### 3.2 Set Webhook ผ่าน API
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-vercel-domain.vercel.app/api/telegram/webhook"}'
```

### 3.3 หรือใช้ใน Browser
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-vercel-domain.vercel.app/api/telegram/webhook
```

## 4. ทดสอบ Bot

### 4.1 เช็ค Webhook Status
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

### 4.2 Test ใน Telegram
- พิมพ์ `/start` กับ bot
- พิมพ์ข้อความทดสอบ

## 5. Setup User Mapping

### 5.1 Connect User กับระบบ
ใน Telegram พิมพ์:
```
/connect your-email@example.com
```

### 5.2 Manual Setup (ถ้าต้องการ)
```bash
curl -X POST "https://your-vercel-domain.vercel.app/api/telegram/setup-user" \
  -H "Content-Type: application/json" \
  -d '{
    "telegram_user_id": 123456789,
    "user_email": "user@example.com"
  }'
```

## 6. ทดสอบ Leave Request

### 6.1 พิมพ์ใน Telegram
```
Take 3 days leave today for family matters
ขอลาวันนี้ 3 วัน เรื่องงานครอบครัว
```

### 6.2 Bot จะตอบกลับ
```
✅ Leave request submitted successfully!

👤 John Doe
📅 From: 2025-11-04
📅 To: 2025-11-06
📊 Days: 3 day(s)
💬 Reason: family matters
🏷️ Type: Personal Leave

Status: ⏳ Pending approval
```

## 7. Troubleshooting

### 7.1 Webhook ไม่ทำงาน
- เช็ค Vercel deployment logs
- เช็ค webhook URL ถูกต้อง
- เช็ค bot token ถูกต้อง

### 7.2 Bot ไม่ตอบ
- เช็ค user mapping ถูกต้อง
- เช็ค Gemini API key
- เช็ค database connection

### 7.3 Error Logs
- ดู Vercel function logs
- ดู Telegram webhook logs

## 8. Security Notes

- ⚠️ **เก็บ Bot Token ให้ปลอดภัย**
- ⚠️ **อย่า commit token ขึ้น Git**
- ⚠️ **ใช้ HTTPS เสมอ**
- ⚠️ **Validate user permissions**

## 9. Features

### ✅ ภาษาที่รองรับ
- English
- Thai (ไทย)

### ✅ Leave Types
- Personal Leave
- Vacation Leave
- Sick Leave

### ✅ Commands
- `/connect email` - Connect account
- Natural language - Request leave

### ✅ Integration
- Google Gemini AI (NLP)
- Supabase Database
- Vercel Deployment
