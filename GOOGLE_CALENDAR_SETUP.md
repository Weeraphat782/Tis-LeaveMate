# Google Calendar API Setup สำหรับวันหยุดไทย-อินเดีย

## 📋 ภาพรวม
ระบบปฏิทินวันลาได้เพิ่มฟีเจอร์แสดงวันหยุดของไทยและอินเดีย โดยใช้ Google Calendar API จริง ไม่ใช่ mock data

## 🔧 ขั้นตอนการ Setup

### 1. สร้าง Google Cloud Project
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง Project ใหม่ หรือเลือก existing project
3. จดจำ Project ID

### 2. Enable Google Calendar API
1. ใน Google Cloud Console → APIs & Services → Library
2. ค้นหา "Google Calendar API"
3. Click Enable

### 3. สร้าง API Key
1. ไปที่ APIs & Services → Credentials
2. Click "Create Credentials" → API Key
3. **สำคัญ:** ตั้ง Restrictions

   #### Application Restrictions:
   - เลือก **"None"** (หรือ HTTP referrers สำหรับ production)

   #### API Restrictions:
   - เลือก **"Restrict key"**
   - เลือก **"Google Calendar API"**

   #### Data Access:
   - เลือก **"Application Data"** (ไม่ใช่ User Data)
   - เพราะเรา access public holiday calendars ไม่ใช่ user-specific data

### 4. เพิ่ม Environment Variable
ในไฟล์ `.env.local` (หรือ hosting platform):

```bash
NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY=your_api_key_here
```

### 5. Test API
เปิด browser console และรัน:
```javascript
const apiKey = 'your_api_key_here'
const calendarId = 'th.th%23holiday%40group.v.calendar.google.com'
const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${new Date().toISOString()}&maxResults=5`

fetch(url).then(r => r.json()).then(console.log)
```

## 📅 Calendar IDs ที่ใช้

### ประเทศไทย
- **Calendar ID:** `th.th#holiday@group.v.calendar.google.com`
- **ภาษา:** ไทย
- **ประเภท:** วันหยุดราชการไทย

### อินเดีย
- **Calendar ID:** `en.indian#holiday@group.v.calendar.google.com`
- **ภาษา:** อังกฤษ
- **ประเภท:** วันหยุดราชการอินเดีย

## 🎨 การแสดงผลในปฏิทิน

### สีของวันหยุด:
- 🔴 **สีแดง:** วันหยุดประเทศไทย
- 🟠 **สีส้ม:** วันหยุดอินเดีย

### Hover Tooltip แสดง:
- ชื่อวันหยุด
- ประเทศ (🇹🇭 Thailand / 🇮🇳 India)
- วันที่แบบเต็ม
- ประเภทวันหยุด

## 🔄 Caching & Performance

- **Cache Duration:** 24 ชั่วโมง
- **Fallback:** ถ้า API ล่ม จะใช้ mock data
- **Loading State:** แสดง spinner ขณะโหลด

## 🚨 Troubleshooting

### Error: "Google Calendar API key not found"
- ✅ ตรวจสอบ environment variable ชื่อถูกต้อง
- ✅ ตรวจสอบ API key ไม่มี typo

### Error: "API_KEY_INVALID"
- ❌ API key ผิด หรือถูก disable
- ❌ ไม่ได้ enable Google Calendar API

### Error: "CALENDAR_NOT_FOUND"
- ❌ Calendar ID ผิด
- ❌ Calendar เป็น private

### Error: "QUOTA_EXCEEDED"
- ❌ ใช้ API เกิน quota (ฟรี tier)
- ❌ ต้อง upgrade เป็น paid plan

## 💰 Cost & Quota

### Free Tier:
- **Read Requests:** 1,000,000 ต่อเดือน
- **Cost:** ฟรี
- **เพียงพอ:** สำหรับ app ขนาดเล็ก

### Paid Plan (ถ้าจำเป็น):
- $0.005 ต่อ 1,000 requests
- เพิ่ม quota ได้

## 🔐 Security Best Practices

1. **Restrict API Key:** ตั้ง restrictions ใน Google Cloud
2. **Environment Variables:** เก็บ API key ใน .env ไม่ commit
3. **Rate Limiting:** ระบบมี built-in caching
4. **Error Handling:** มี fallback ไป mock data

## 📊 Monitoring

ตรวจสอบ usage ใน Google Cloud Console:
- APIs & Services → Google Calendar API → Metrics

## 🎯 Testing

### ใน Development:
```bash
npm run dev
# เปิด calendar ใน leave request form
# ตรวจสอบ console logs สำหรับ API calls
```

### ใน Production:
- ตรวจสอบ network tab ใน browser dev tools
- ดู API calls ไปยัง googleapis.com

## 📝 Notes

- Google Calendar API เป็น public API ไม่ต้อง OAuth
- วันหยุดจะ update อัตโนมัติตาม Google
- Support timezone แต่ระบบใช้ UTC
- Fallback ไป mock data ถ้า API ล่ม

---

## 🚀 Quick Setup สำหรับ Testing

ถ้าอยาก test เร็วๆ:

1. สร้าง API key ตามขั้นตอนด้านบน
2. เพิ่มใน `.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY=your_key_here
   ```
3. Restart dev server
4. เปิด leave request form → จะเห็นวันหยุดจริงจาก Google Calendar!
