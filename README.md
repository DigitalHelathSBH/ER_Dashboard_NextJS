# ER Dashboard Next.js

โปรเจกต์นี้แปลงหน้าจอ `index.php` เดิมเป็น Next.js โดยยังใช้ Query และเงื่อนไขสถานะเดิม

## การทำงาน

- แสดงข้อมูลครั้งละ 8 ลำดับ
- ใช้ `DashboardRefresh.Check_Refresh` กำหนดลำดับชุดข้อมูลเหมือนระบบเดิม
- ดึงข้อมูลใหม่ทุก 20 วินาทีโดยไม่ reload หน้าเว็บ
- เมื่อสลับไปแท็บอื่น ระบบจะหยุดดึงข้อมูลชั่วคราว
- เมื่อกลับมาที่หน้าจอ Dashboard ระบบจะดึงข้อมูลล่าสุดทันที
- การเชื่อมต่อฐานข้อมูลทำเฉพาะฝั่ง Server ผู้ใช้จะไม่เห็นรหัสผ่านฐานข้อมูล

## เริ่มใช้งาน

1. ติดตั้ง Node.js รุ่น LTS
2. เปิด Command Prompt ในโฟลเดอร์นี้
3. ติดตั้ง package

```bash
npm install
```

4. คัดลอก `.env.example` เป็น `.env.local` แล้วระบุข้อมูล SQL Server
5. เริ่มระบบสำหรับทดสอบ

```bash
npm run dev
```

6. เปิด `http://localhost:3000`

## ใช้งานจริง

```bash
npm run build
npm start
```

ค่าเริ่มต้นจะอัปเดตทุก 20 วินาที หากต้องการเปลี่ยนให้แก้
`NEXT_PUBLIC_REFRESH_INTERVAL` ใน `.env.local` โดยมีหน่วยเป็นมิลลิวินาที

## ตารางแพทย์เวร ER

- จอแสดงผล: `/doctor-schedule` (รองรับทีวีแนวนอน 1920x1080 และแนวตั้ง 1080x1920)
- หน้ากรอกรายวัน: `/doctor-schedule/edit` (ค้นชื่อแพทย์จาก `HNDOCTOR` ของ HIS)
- เก็บข้อมูลที่ตาราง `Saraburi.dbo.ER_DoctorSchedule` สร้างครั้งแรกด้วย `sql/er_doctor_schedule.sql`
- เพิ่ม/ลด/เปลี่ยนชื่อแถวหรือสีแถบ แก้ที่ `src/lib/doctorSchedule.js`
