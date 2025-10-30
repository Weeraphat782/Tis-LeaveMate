# 🔄 TIS LeaveMate - Database Reset Instructions

## ⚠️ สำคัญ: การ Reset Database จะลบข้อมูลทั้งหมด!

### 📋 ขั้นตอนการ Reset Database

#### **Step 1: Backup ข้อมูล (ถ้าต้องการ)**
```sql
-- Export ข้อมูลสำคัญ (run ใน SQL Editor)
SELECT json_agg(row_to_json(t)) FROM (
  SELECT * FROM profiles
  UNION ALL
  SELECT * FROM leave_requests
  UNION ALL
  SELECT * FROM leave_balances
) t;
```

#### **Step 2: ลบ Tables และ Functions เก่า**
```sql
-- ลบทุกอย่าง
DROP TABLE IF EXISTS leave_audit_trail CASCADE;
DROP TABLE IF EXISTS leave_balances CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS log_leave_request_action() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS initialize_leave_balances() CASCADE;
```

#### **Step 3: สร้าง Database ใหม่**
1. Copy เนื้อหาทั้งหมดจาก `tis-leave-database-clean.sql`
2. Paste และ Run ใน Supabase SQL Editor
3. รอให้ execute เสร็จ

#### **Step 4: ตรวจสอบการติดตั้ง**
```sql
-- ตรวจสอบ tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- ตรวจสอบ RLS
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- ตรวจสอบ policies
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

### 🧪 ทดสอบระบบ

#### **Test 1: สร้าง User ใหม่**
1. Sign up user ใหม่ใน app
2. ตรวจสอบว่า profile และ leave balances ถูกสร้างอัตโนมัติ

#### **Test 2: Submit Leave Request**
1. Login และ submit leave request
2. ตรวจสอบ console logs และ database

#### **Test 3: ตรวจสอบข้อมูล**
```sql
-- ดูข้อมูล user ล่าสุด
SELECT
  p.email,
  p.full_name,
  lb.leave_type,
  lb.total_days,
  lb.used_days,
  lb.remaining_days
FROM profiles p
LEFT JOIN leave_balances lb ON p.id = lb.user_id
ORDER BY p.created_at DESC
LIMIT 5;

-- ดู leave requests ล่าสุด
SELECT
  lr.id,
  p.email,
  lr.leave_type,
  lr.days,
  lr.status,
  lr.submitted_at
FROM leave_requests lr
LEFT JOIN profiles p ON lr.user_id = p.id
ORDER BY lr.submitted_at DESC
LIMIT 5;
```

### 🎯 ผลลัพธ์ที่คาดหวัง

✅ **Tables**: profiles, leave_requests, leave_balances, leave_audit_trail
✅ **RLS**: ENABLED สำหรับทุกตาราง
✅ **Policies**: ถูกต้องสำหรับแต่ละ operation
✅ **Triggers**: ทำงานอัตโนมัติ
✅ **Functions**: ทำงานปกติ

### 🚨 ถ้ายังมีปัญหา

#### **ปัญหา 1: Tables ไม่ถูกสร้าง**
- ตรวจสอบ SQL syntax errors
- Run queries แยกส่วน

#### **ปัญหา 2: RLS ไม่ทำงาน**
- ตรวจสอบ policies ถูกสร้างแล้ว
- Test ด้วย user ที่มีสิทธิ์

#### **ปัญหา 3: Triggers ไม่ทำงาน**
- ตรวจสอบ function definitions
- Test ด้วยการสร้าง user ใหม่

### 📞 ต้องการความช่วยเหลือ?

ส่ง:
1. **Error messages** จาก SQL Editor
2. **Console logs** จาก application
3. **Database query results** หลังการ reset

---

**⚠️ คำเตือน**: การ reset database จะลบข้อมูลทั้งหมด ไม่สามารถกู้คืนได้!
