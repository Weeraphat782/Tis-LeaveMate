# TIS Leave Management - ระบบจัดการการลาของพนักงาน

ระบบจัดการการลาของพนักงานที่สร้างด้วย Next.js และ Supabase สำหรับองค์กร TIS

## 📋 สารบัญ

- [ภาพรวมระบบ](#ภาพรวมระบบ)
- [ฟีเจอร์หลัก](#ฟีเจอร์หลัก)
- [โครงสร้างฐานข้อมูล](#โครงสร้างฐานข้อมูล)
- [การติดตั้งและตั้งค่า](#การติดตั้งและตั้งค่า)
- [การใช้งานระบบ](#การใช้งานระบบ)
- [การพัฒนา](#การพัฒนา)
- [API Reference](#api-reference)
- [การแก้ไขปัญหา](#การแก้ไขปัญหา)

## 🎯 ภาพรวมระบบ

TIS Leave Management เป็นระบบจัดการการลาของพนักงานที่ออกแบบมาเพื่อให้การจัดการคำขอการลาง่ายและมีประสิทธิภาพ ระบบประกอบด้วย:

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **UI Components**: Radix UI + shadcn/ui
- **State Management**: React Context + Supabase Client

## ✨ ฟีเจอร์หลัก

### 👤 ผู้ใช้ทั่วไป
- **สร้างคำขอการลา**: เลือกวันที่ ประเภทการลา และเหตุผล
- **จัดการคำขอส่วนตัว**: แก้ไข/ลบคำขอที่ยังรอดำเนินการ
- **ดูสถิติการลา**: ติดตามการใช้การลาในแต่ละประเภท
- **ดูประวัติการลา**: ประวัติการลาทั้งหมดของตนเอง

### 👥 ผู้จัดการทีม
- **อนุมัติ/ปฏิเสธคำขอ**: จัดการคำขอการลาจากทีม
- **ดูคำขอทั้งทีม**: มุมมองรวมคำขอการลาทั้งทีม
- **กรองข้อมูล**: กรองตามบุคคล เดือน ปี
- **ติดตามสถานะ**: ติดตามสถานะการดำเนินงาน

### 🔒 ความปลอดภัย
- **Authentication**: Supabase Auth
- **Authorization**: Row Level Security (RLS)
- **Audit Trail**: บันทึกการดำเนินการทั้งหมด
- **Data Validation**: การตรวจสอบข้อมูลที่เข้มงวด

## 🗄️ โครงสร้างฐานข้อมูล

### ตารางหลัก

#### `leave_requests`
เก็บข้อมูลคำขอการลา
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key -> auth.users)
- leave_type: ENUM ('Personal Leave', 'Vacation Leave', 'Sick Leave')
- selected_dates: JSONB (วันที่ลาเป็น array)
- days: INTEGER (จำนวนวันลา)
- reason: TEXT (เหตุผล)
- status: ENUM ('pending', 'approved', 'rejected')
- submitted_at: TIMESTAMP
- approved_at: TIMESTAMP (nullable)
- approved_by: UUID (nullable)
- approved_by_name: TEXT (nullable)
```

#### `profiles`
ข้อมูลโปรไฟล์ผู้ใช้ (extends auth.users)
```sql
- id: UUID (Primary Key, Foreign Key -> auth.users)
- email: TEXT
- full_name: TEXT
- department: TEXT (nullable)
- position: TEXT (nullable)
- employee_id: TEXT (nullable)
```

#### `leave_balances`
ยอดการลาคงเหลือ
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key -> auth.users)
- leave_type: ENUM
- total_days: INTEGER
- used_days: INTEGER
- remaining_days: INTEGER (computed)
- year: INTEGER
```

#### `leave_audit_trail`
บันทึกการดำเนินการ
```sql
- id: UUID (Primary Key)
- leave_request_id: UUID (Foreign Key -> leave_requests)
- action: ENUM ('created', 'updated', 'approved', 'rejected')
- previous_status: TEXT (nullable)
- new_status: TEXT (nullable)
- performed_by: UUID (nullable)
- performed_by_name: TEXT (nullable)
- notes: TEXT (nullable)
```

### ประเภทการลาและสิทธิ์

| ประเภทการลา | สิทธิ์ต่อปี | หมายเหตุ |
|-------------|------------|----------|
| Personal Leave | 3 วัน | ลากิจส่วนตัว |
| Vacation Leave | 7 วัน | ลาพักร้อน |
| Sick Leave | 30 วัน | ลาป่วย |

## 🚀 การติดตั้งและตั้งค่า

### ข้อกำหนดเบื้องต้น

- Node.js 18+
- npm หรือ pnpm
- Supabase Account

### ขั้นตอนการติดตั้ง

#### 1. Clone โปรเจค

```bash
git clone <repository-url>
cd tis-leave-management
```

#### 2. ติดตั้ง Dependencies

```bash
npm install
# หรือ
pnpm install
```

#### 3. ตั้งค่า Supabase

##### สร้างโปรเจคใหม่ใน Supabase

1. เข้า [Supabase Dashboard](https://supabase.com/dashboard)
2. คลิก "New Project"
3. กรอกข้อมูลโปรเจค
4. รอให้โปรเจคพร้อมใช้งาน

##### ตั้งค่าฐานข้อมูล

1. เข้า **SQL Editor** ใน Supabase Dashboard
2. Copy เนื้อหาจากไฟล์ `tis-leave-management-schema.sql`
3. Paste และ Run script
4. ตรวจสอบว่า tables ถูกสร้างแล้ว

##### เปิดใช้งาน Authentication

1. เข้า **Authentication** > **Settings**
2. เปิดใช้งาน Email confirmation ถ้าต้องการ
3. ตั้งค่า Site URL และ Redirect URLs

##### เปิดใช้งาน Storage (ถ้าต้องการ)

1. เข้า **Storage** ใน Dashboard
2. สร้าง bucket สำหรับเก็บไฟล์ (ถ้าต้องการ)

#### 4. ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local` ใน root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: สำหรับการพัฒนา
NODE_ENV=development
```

**วิธีหา Environment Variables:**
1. เข้า Supabase Dashboard > Settings > API
2. Copy Project URL และ anon public key

#### 5. Run แอปพลิเคชัน

```bash
npm run dev
# หรือ
pnpm dev
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

### การตั้งค่าฐานข้อมูลเพิ่มเติม

#### เพิ่มข้อมูลทดสอบ

ถ้าต้องการเพิ่มข้อมูลทดสอบ:

1. สร้าง users ใน **Authentication > Users**
2. Copy SQL จาก `sample-data.sql`
3. แทนที่ UUID ใน SQL ด้วย UUID จริง
4. Run ใน SQL Editor

## 🎮 การใช้งานระบบ

### การสมัครสมาชิก

1. เข้าเว็บไซต์
2. คลิก "Sign Up"
3. กรอกอีเมลและรหัสผ่าน
4. ยืนยันอีเมล (ถ้าตั้งค่าไว้)

### การสร้างคำขอการลา

1. เข้าสู่ระบบ
2. คลิก "New Leave Request"
3. เลือกประเภทการลา
4. เลือกวันที่ลา (เลือกหลายวันได้)
5. กรอกเหตุผล
6. คลิก "Submit"

### การจัดการคำขอการลา

#### สำหรับพนักงาน
- ดูคำขอของตนเองในแท็บ "My Leave Records"
- แก้ไข/ลบคำขอที่ยัง "pending"

#### สำหรับผู้จัดการ
- ดูคำขอทั้งทีมในแท็บ "Team Leave Records"
- คลิก "Review" เพื่ออนุมัติ/ปฏิเสธ
- กรองข้อมูลตามบุคคลหรือเดือน

### การดูสถิติ

- หน้า Dashboard แสดงสถิติการลา
- รวมจำนวนวันลาในแต่ละประเภท
- แสดงคำขอที่รอดำเนินการ

## 💻 การพัฒนา

### โครงสร้างโฟลเดอร์

```
tis-leave-management/
├── app/                    # Next.js App Router
│   ├── dashboard/         # หน้า Dashboard
│   ├── layout.tsx         # Root Layout
│   └── page.tsx           # หน้าแรก
├── components/            # React Components
│   ├── ui/               # UI Components (shadcn/ui)
│   ├── leave-request-form.tsx
│   ├── leave-records-table.tsx
│   └── leave-stats.tsx
├── lib/                   # Utilities & Configurations
│   ├── supabase.ts       # Supabase Client
│   ├── database.ts       # Database API Functions
│   └── auth-context.tsx  # Authentication Context
├── hooks/                 # Custom Hooks
├── styles/               # Global Styles
└── public/               # Static Assets
```

### คำสั่งสำคัญ

```bash
# Development
npm run dev

# Build สำหรับ Production
npm run build

# Start Production Server
npm run start

# Lint Code
npm run lint
```

### การเพิ่มฟีเจอร์ใหม่

#### เพิ่มประเภทการลาใหม่

1. อัพเดท enum ใน SQL schema
2. อัพเดท `LEAVE_TYPES` ใน components
3. อัพเดท logic ใน API functions
4. ทดสอบการสร้างและจัดการคำขอ

#### เพิ่มฟิลด์ใหม่ในคำขอการลา

1. เพิ่มคอลัมน์ในฐานข้อมูล
2. อัพเดท TypeScript interfaces
3. แก้ไข forms และ display components
4. อัพเดท API functions

## 🔌 API Reference

### Leave Requests API

#### `createLeaveRequest(leaveRequest)`
สร้างคำขอการลาใหม่

#### `getUserLeaveRequests(userId)`
ดึงคำขอการลาของผู้ใช้

#### `getAllLeaveRequests()`
ดึงคำขอการลาทั้งหมด (สำหรับผู้จัดการ)

#### `updateLeaveRequest(id, updates)`
อัพเดทคำขอการลา

#### `deleteLeaveRequest(id)`
ลบคำขอการลา

#### `approveLeaveRequest(id, approved, approvedBy, approvedByName)`
อนุมัติ/ปฏิเสธคำขอการลา

### Leave Stats API

#### `getUserLeaveStats(userId)`
คำนวณสถิติการลาของผู้ใช้

### Authentication API

#### `signIn(email, password)`
เข้าสู่ระบบ

#### `signUp(email, password)`
สมัครสมาชิก

#### `signOut()`
ออกจากระบบ

## 🔧 การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

#### 1. ไม่สามารถเข้าสู่ระบบได้

**สาเหตุ:**
- Environment variables ไม่ถูกต้อง
- Supabase URL หรือ Key ผิด

**วิธีแก้:**
- ตรวจสอบไฟล์ `.env.local`
- ตรวจสอบ Supabase Dashboard > Settings > API

#### 2. ไม่สามารถสร้างคำขอการลาได้

**สาเหตุ:**
- RLS policies ไม่ถูกต้อง
- User ไม่มีสิทธิ์

**วิธีแก้:**
- ตรวจสอบ RLS policies ใน SQL
- ตรวจสอบว่า user ได้เข้าสู่ระบบแล้ว

#### 3. ข้อมูลไม่แสดงผล

**สาเหตุ:**
- Network error
- Database connection ผิด

**วิธีแก้:**
- ตรวจสอบ Console errors
- ตรวจสอบ Supabase Dashboard > Logs

#### 4. Trigger ไม่ทำงาน

**สาเหตุ:**
- Trigger ไม่ถูกสร้าง
- Function permissions ไม่ถูกต้อง

**วิธีแก้:**
- ตรวจสอบ triggers ใน database
- Re-run schema SQL

### Debug Mode

เปิด Developer Tools และดู Console สำหรับ error messages

### Logs

ดู logs ใน Supabase Dashboard > Logs สำหรับ database errors

## 📞 การสนับสนุน

สำหรับคำถามหรือปัญหา สามารถติดต่อ:

- **Email**: support@tis.com
- **Documentation**: [Internal Wiki]
- **Issues**: [GitHub Issues]

## 📝 License

This project is proprietary software for TIS organization.

---

**TIS Leave Management v1.0** - พัฒนาโดยทีม TIS Technology
