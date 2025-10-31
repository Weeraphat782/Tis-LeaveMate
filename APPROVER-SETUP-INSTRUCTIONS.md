# TIS Leave Management - Approver Permission Setup

## ภาพรวม
ระบบอนุญาตให้เฉพาะ email ที่กำหนดเท่านั้นที่สามารถ Approve/Reject leave requests ได้ โดยใช้ `approver_emails` table

## ขั้นตอนการติดตั้ง

### 1. Run SQL Script
รันไฟล์ `approver-emails-setup.sql` ใน Supabase SQL Editor:

```sql
-- คัดลอกเนื้อหาจาก approver-emails-setup.sql และรันใน Supabase
```

### 2. เพิ่ม Approver Emails
แก้ไขใน `approver-emails-setup.sql` หรือเพิ่มด้วย SQL โดยตรง:

```sql
-- เพิ่ม approver emails (เปลี่ยนเป็น email จริงของคุณ)
INSERT INTO approver_emails (email, can_approve, created_by, notes) VALUES
  ('hr@company.com', true, 'admin', 'HR Manager'),
  ('manager@company.com', true, 'admin', 'Department Manager'),
  ('supervisor@company.com', true, 'admin', 'Team Supervisor')
ON CONFLICT (email) DO NOTHING;
```

### 3. ตรวจสอบ Setup
รัน query นี้เพื่อตรวจสอบ:

```sql
-- ตรวจสอบ approver emails
SELECT email, can_approve, notes FROM approver_emails WHERE can_approve = true;

-- ตรวจสอบ RLS policies
SELECT policyname, permissive, roles FROM pg_policies WHERE tablename = 'leave_requests';
```

## วิธีการทำงาน

### Frontend Logic
- `checkUserCanApprove(email)`: เช็คว่า email นี้มีสิทธิ์ approve หรือไม่
- แสดง "Review" button เฉพาะ approvers เท่านั้น
- `approveLeaveRequest()`: เช็ค permission ก่อนอนุญาตให้ approve

### Database Security
- RLS Policy: `Authorized approvers can update leave requests`
- เช็คจาก `approver_emails` table ว่ามีสิทธิ์หรือไม่
- อนุญาตเฉพาะ UPDATE operations สำหรับ approvers

## การจัดการ Approvers

### เพิ่ม Approver ใหม่
```sql
INSERT INTO approver_emails (email, can_approve, created_by, notes)
VALUES ('newapprover@company.com', true, 'admin', 'New Approver');
```

### ลบสิทธิ์ Approver
```sql
UPDATE approver_emails
SET can_approve = false
WHERE email = 'oldapprover@company.com';
```

### ลบ Approver ออกจากระบบ
```sql
DELETE FROM approver_emails WHERE email = 'oldapprover@company.com';
```

## Testing

### Test Case 1: Non-Approver
1. Login ด้วย email ที่ไม่ได้อยู่ใน `approver_emails`
2. เข้า Team View
3. ไม่เห็น "Review" button ใน leave requests ที่ pending

### Test Case 2: Approver
1. Login ด้วย email ที่อยู่ใน `approver_emails`
2. เข้า Team View
3. เห็น "Review" button และสามารถ approve/reject ได้

### Test Case 3: Database Security
1. พยายาม approve โดยตรงผ่าน SQL โดย user ที่ไม่ใช่ approver
2. ควรถูก block โดย RLS policy

## Troubleshooting

### Error: "You do not have permission to approve or reject leave requests"
- ตรวจสอบว่า email ของ user อยู่ใน `approver_emails` table
- ตรวจสอบว่า `can_approve = true`

### Error: Column does not exist in pg_policies
- ใช้ column names ที่ถูกต้อง: `qual`, `with_check` แทน `using_condition`, `check_condition`

### Review Button ไม่แสดง
- ตรวจสอบว่า `canApprove` state เป็น true
- ตรวจสอบ console log สำหรับ permission check
- ตรวจสอบว่า user อยู่ใน team view และ request status เป็น pending

## Security Notes

- ✅ RLS policies ป้องกันการ approve โดยตรงจาก database
- ✅ Frontend เช็ค permission ก่อนแสดง UI
- ✅ Audit trail บันทึก approved_by และ approved_by_name
- ✅ ไม่อนุญาตให้ approve request ของตัวเอง

## Files ที่เกี่ยวข้อง

- `approver-emails-setup.sql`: SQL script สำหรับ setup
- `lib/database.ts`: `checkUserCanApprove()`, `approveLeaveRequest()`
- `components/leave-records-table.tsx`: UI logic สำหรับแสดง approve button
- `APPROVER-SETUP-INSTRUCTIONS.md`: เอกสารนี้
