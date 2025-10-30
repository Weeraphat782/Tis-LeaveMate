# 📋 TIS LeaveMate - คู่มือการติดตั้ง

คู่มือการติดตั้งระบบจัดการการลาของพนักงานอย่างละเอียด

## 🎯 ภาพรวมการติดตั้ง

เอกสารนี้จะแนะนำการติดตั้ง TIS LeaveMate ตั้งแต่เริ่มต้นจนพร้อมใช้งาน

### ⏱️ เวลาที่ใช้
- **การติดตั้งฐานข้อมูล**: 15-30 นาที
- **การตั้งค่าแอปพลิเคชัน**: 10-15 นาที
- **การทดสอบระบบ**: 15-30 นาที

### 📋 ข้อกำหนดเบื้องต้น

#### Software Requirements
- **Node.js**: v18.0.0 หรือใหม่กว่า
- **Package Manager**: npm หรือ pnpm
- **Git**: สำหรับ clone โปรเจค
- **Web Browser**: Chrome, Firefox, Safari, Edge

#### Hardware Requirements
- **RAM**: 4GB ขั้นต่ำ (แนะนำ 8GB)
- **Storage**: 500MB สำหรับโค้ด + database
- **Internet**: การเชื่อมต่อที่เสถียร

#### Accounts Required
- **Supabase Account**: สำหรับฐานข้อมูลและ authentication
- **GitHub/GitLab Account**: สำหรับโค้ด (ถ้ามี)

## 🚀 ขั้นตอนการติดตั้ง

### ขั้นตอนที่ 1: เตรียม Supabase

#### 1.1 สร้าง Supabase Account

1. เข้าเว็บไซต์ [supabase.com](https://supabase.com)
2. คลิก **"Start your project"**
3. เลือก **"Sign up"** และกรอกข้อมูล
4. ยืนยันอีเมล

#### 1.2 สร้างโปรเจคใหม่

1. คลิก **"New Project"** ใน Dashboard
2. กรอกข้อมูลโปรเจค:
   ```
   Name: TIS LeaveMate
   Database Password: [สร้างรหัสผ่านที่แข็งแรง]
   Region: [เลือก region ที่ใกล้ที่สุด เช่น Singapore]
   ```
3. คลิก **"Create new project"**
4. รอประมาณ 2-3 นาทีให้โปรเจคพร้อมใช้งาน

#### 1.3 จดจำข้อมูลสำคัญ

หลังจากโปรเจคสร้างแล้ว จดจำข้อมูลเหล่านี้:
- **Project URL**: `https://[project-id].supabase.co`
- **API Keys**: จะใช้ในขั้นตอนต่อไป

### ขั้นตอนที่ 2: ตั้งค่าฐานข้อมูล

#### 2.1 เข้า SQL Editor

1. ใน Supabase Dashboard คลิก **"SQL Editor"** ทางด้านซ้าย
2. คลิก **"New query"**

#### 2.2 Run Database Schema

1. Copy เนื้อหาทั้งหมดจากไฟล์ `tis-leave-management-schema.sql`
2. Paste ใน SQL Editor
3. คลิก **"Run"**
4. รอให้ execute เสร็จ (อาจใช้เวลาสักครู่)

#### 2.3 ตรวจสอบการติดตั้ง

Run queries ต่อไปนี้เพื่อตรวจสอบ:

```sql
-- ตรวจสอบ Tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('leave_requests', 'profiles', 'leave_balances', 'leave_audit_trail');

-- ตรวจสอบ RLS
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('leave_requests', 'profiles', 'leave_balances', 'leave_audit_trail');

-- ตรวจสอบ Functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
```

**ผลลัพธ์ที่ควรได้:**
- 4 tables: leave_requests, profiles, leave_balances, leave_audit_trail
- RLS: ENABLED สำหรับทุกตาราง
- Functions: 4 functions (update_updated_at_column, log_leave_request_action, handle_new_user, initialize_leave_balances)

### ขั้นตอนที่ 3: ตั้งค่า Authentication

#### 3.1 ตั้งค่า Site URL

1. เข้า **Authentication > Settings**
2. ในส่วน **"Site URL"** ใส่:
   - สำหรับพัฒนา: `http://localhost:3000`
   - สำหรับโปรดักชั่น: URL จริงของเว็บไซต์

#### 3.2 ตั้งค่า Redirect URLs

ใน **"Redirect URLs"** เพิ่ม:
```
http://localhost:3000/auth/callback
https://yourdomain.com/auth/callback
```

#### 3.3 ตั้งค่า Email Templates (Optional)

1. เข้า **Authentication > Email Templates**
2. ปรับแต่งอีเมลสำหรับการยืนยันตัวตน

### ขั้นตอนที่ 4: ติดตั้งแอปพลิเคชัน

#### 4.1 Clone โปรเจค

```bash
# Clone จาก repository
git clone <repository-url>
cd tis-leave-management

# หรือ Download ZIP และแตกไฟล์
unzip tis-leave-management.zip
cd tis-leave-management
```

#### 4.2 ติดตั้ง Dependencies

```bash
# ใช้ npm
npm install

# หรือใช้ pnpm (เร็วกว่า)
pnpm install
```

#### 4.3 ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local` ใน root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: สำหรับการพัฒนา
NODE_ENV=development
NEXT_PUBLIC_APP_NAME="TIS LeaveMate"
```

**วิธีหา Environment Variables:**

1. เข้า Supabase Dashboard > **Settings** > **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 4.4 ตรวจสอบการตั้งค่า

```bash
# ตรวจสอบ Node.js version
node --version
# ควรได้ v18.0.0 ขึ้นไป

# ตรวจสอบ npm
npm --version

# ตรวจสอบไฟล์ environment
ls -la .env.local
```

### ขั้นตอนที่ 5: Run แอปพลิเคชัน

#### 5.1 Start Development Server

```bash
npm run dev
# หรือ
pnpm dev
```

#### 5.2 ตรวจสอบการทำงาน

1. เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`
2. ควรเห็นหน้าแรกของแอปพลิเคชัน
3. ไม่ควรมี error ใน Console

### ขั้นตอนที่ 6: ทดสอบระบบ

#### 6.1 สร้าง User ทดสอบ

1. เข้า Supabase Dashboard > **Authentication** > **Users**
2. คลิก **"Add user"**
3. กรอกข้อมูล:
   ```
   Email: test@tis.com
   Password: testpassword123
   Auto confirm user: ✅ (ติ๊ก)
   ```
4. คลิก **"Add user"**

#### 6.2 ทดสอบ Authentication

1. กลับไปที่เว็บแอป (`http://localhost:3000`)
2. คลิก **"Sign In"**
3. เข้าสู่ระบบด้วย:
   - Email: `test@tis.com`
   - Password: `testpassword123`

#### 6.3 ทดสอบการสร้าง Leave Request

1. คลิก **"New Leave Request"**
2. เลือกประเภทการลา เช่น "Personal Leave"
3. เลือกวันที่ลา
4. กรอกเหตุผล
5. คลิก **"Submit"**

#### 6.4 ตรวจสอบ Database

กลับไปที่ Supabase Dashboard และตรวจสอบ:

```sql
-- ตรวจสอบ profiles
SELECT * FROM profiles;

-- ตรวจสอบ leave_balances
SELECT * FROM leave_balances;

-- ตรวจสอบ leave_requests
SELECT * FROM leave_requests;

-- ตรวจสอบ audit_trail
SELECT * FROM leave_audit_trail;
```

## 🔧 การแก้ไขปัญหา

### ปัญหา: ไม่สามารถติดตั้ง dependencies

```bash
# ลองล้าง cache และติดตั้งใหม่
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### ปัญหา: Environment variables ไม่ทำงาน

```bash
# ตรวจสอบไฟล์ .env.local
cat .env.local

# ตรวจสอบ syntax (ไม่มี space หลัง =)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
```

### ปัญหา: Database connection ไม่ได้

```
Error: connection to server failed
```

**วิธีแก้:**
1. ตรวจสอบ Project URL และ API Key
2. ตรวจสอบว่าโปรเจค Supabase ยัง active อยู่
3. ตรวจสอบ Firewall/Internet connection

### ปัญหา: Authentication ไม่ทำงาน

```
AuthApiError: Invalid API key
```

**วิธีแก้:**
1. ตรวจสอบว่าใช้ anon key ไม่ใช่ service key
2. ตรวจสอบว่า API key ไม่มี space หรือ newline
3. Restart development server

### ปัญหา: RLS policies ไม่ทำงาน

```sql
-- ตรวจสอบ policies
SELECT * FROM pg_policies WHERE tablename = 'leave_requests';

-- ถ้าไม่มี policies ให้ run schema ใหม่
-- จากไฟล์ tis-leave-management-schema.sql
```

## 📊 การตั้งค่าขั้นสูง

### เพิ่มข้อมูลทดสอบ

ถ้าต้องการเพิ่มข้อมูลทดสอบ:

1. สร้าง users เพิ่มเติมใน Authentication
2. Copy SQL จาก `sample-data.sql`
3. แทนที่ UUID ใน SQL
4. Run ใน SQL Editor

### ตั้งค่า Email Confirmation

1. เข้า **Authentication > Settings**
2. เปิด **"Enable email confirmations"**
3. ตั้งค่า **SMTP** ถ้าต้องการส่งอีเมลจริง

### ตั้งค่า Custom Domain

1. เข้า **Settings > Custom Domains**
2. เพิ่ม domain ของคุณ
3. อัพเดท DNS records ตามที่ Supabase บอก

## 🚀 การ Deploy ขึ้น Production

### ใช้ Vercel (แนะนำ)

1. Push โค้ดขึ้น GitHub
2. เข้า [vercel.com](https://vercel.com)
3. Import โปรเจคจาก GitHub
4. เพิ่ม Environment Variables เดียวกับที่ตั้งใน `.env.local`
5. Deploy

### ใช้ Netlify

1. Build โปรเจค: `npm run build`
2. Upload โฟลเดอร์ `out` ขึ้น Netlify
3. ตั้งค่า Environment Variables ใน Netlify

### ใช้ Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📞 การสนับสนุน

หากพบปัญหาในการติดตั้ง สามารถ:

1. **ตรวจสอบ Logs**: ใน Supabase Dashboard > Logs
2. **Debug Mode**: เปิด Developer Tools ในเบราว์เซอร์
3. **Console Errors**: ตรวจสอบ Console ใน Developer Tools
4. **Network Tab**: ตรวจสอบ API calls ใน Network tab

### แหล่งข้อมูลเพิ่มเติม

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

## ✅ Checklist การติดตั้ง

- [ ] สร้าง Supabase Account
- [ ] สร้างโปรเจคใหม่ใน Supabase
- [ ] Run Database Schema
- [ ] ตรวจสอบ Tables และ Functions
- [ ] ตั้งค่า Authentication
- [ ] Clone โปรเจค
- [ ] ติดตั้ง Dependencies
- [ ] ตั้งค่า Environment Variables
- [ ] Start Development Server
- [ ] ทดสอบระบบ
- [ ] Deploy ขึ้น Production (ถ้าต้องการ)

**🎉 ติดตั้งสำเร็จ!** ระบบ TIS LeaveMate พร้อมใช้งานแล้ว
