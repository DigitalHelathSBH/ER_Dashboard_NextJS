# AGENTS.md — ER_Dashboard (สำหรับ Codex)

คุณคือผู้เขียนโค้ดที่รับงานจากหัวหน้า (Claude) งานทุกชิ้นจะถูกตรวจก่อนถึงผู้ใช้
ทำเฉพาะที่ spec สั่ง ถ้า spec ไม่ชัดหรือขัดกับกฎด้านล่าง ให้หยุดแล้วรายงาน อย่าเดาเอง

## ภาพรวม
- จอแสดงผลของห้องฉุกเฉิน (ER) โรงพยาบาล เปิดบนทีวีในวง LAN
- Stack: Next.js 15 App Router, React 19, JavaScript (ไม่ใช่ TypeScript), `mssql` ต่อ SQL Server, CSS ธรรมดา (ไม่มี Tailwind)
- alias `@/*` = `src/*` (ดู `jsconfig.json`)

## แผนที่โค้ด (อ่านส่วนนี้ก่อน แล้วเปิดเฉพาะไฟล์ที่เกี่ยวกับงาน)

| route | หน้าที่ | ไฟล์ |
|---|---|---|
| `/` | dashboard สถานะผู้ป่วย (งานเดิม **ห้ามแก้**) | `src/app/page.js`, `src/components/DashboardClient.js`, `src/app/globals.css` |
| `/api/dashboard` | ข้อมูลผู้ป่วยจาก HIS (งานเดิม **ห้ามแก้**) | `src/app/api/dashboard/route.js` |
| `/doctor-schedule` | จอแสดงตารางแพทย์เวร ER ของวันนี้ อัปเดตทุก 60 วินาที/เมื่อกลับเข้าแท็บ/ข้ามเที่ยงคืนไทย | `src/app/doctor-schedule/page.js`, `ScheduleDisplay.js`, `display.module.css` |
| `/doctor-schedule/edit` | หน้ากรอกตารางแพทย์เวรรายวัน คัดลอกวันก่อน บันทึก และเตือนข้อมูลยังไม่บันทึก | `src/app/doctor-schedule/edit/page.js`, `ScheduleEditor.js`, `edit.module.css` |
| `/api/doctor-schedule` | GET `?date=YYYY-MM-DD` / PUT `{date, schedule}` ตาราง `Saraburi.dbo.ER_DoctorSchedule` (คนละฐานกับ DB_NAME) | `src/app/api/doctor-schedule/route.js` |
| `/api/doctors` | GET `?q=` ค้นชื่อแพทย์ (TOP 20, OFFDOCTOR=0) จาก `HNDOCTOR` ของ HIS อ่านอย่างเดียว | `src/app/api/doctors/route.js` |

**ใช้ซ้ำได้ (อย่าเขียนใหม่)**
- `src/app/doctor-schedule/ScheduleBoard.js`, `ScheduleBoard.module.css`: ผังตารางร่วมของหน้าแสดงผลและหน้ากรอก (ชื่อไฟล์ในแถว route อยู่ใต้โฟลเดอร์ของ route นั้น)
- `src/app/doctor-schedule/scheduleClient.js`: เรียก API ฝั่ง client และจัดรูปแบบวันที่/เวลาไทยสำหรับสองหน้า
- `src/lib/doctorSchedule.js`: รายการแถว/คอลัมน์ `SHIFTS SHIFT_COLUMNS SPECIALTIES SIDE_BOXES` (กล่องขวา: Consult GEN Sx, Consult STEMI, เวรตรวจการพยาบาล), `emptySchedule()`, `normalizeSchedule()`,
  `todayBangkok()`, `isValidDate()`, `thaiDateParts(date)` (วัน/เดือนไทย/ปี พ.ศ.), `addDays(date, n)`, `MAX_TEXT`
- `src/app/doctor-schedule/edit/DoctorInput.js`: ช่องกรอกชื่อแพทย์พร้อมรายการค้นหาจาก `/api/doctors` (ใส่หลายชื่อคั่น , หรือ /)
- `src/lib/db.js`: `getPool()`, `sql` (ใช้ฝั่ง server เท่านั้น)

## ห้ามเด็ดขาด
- **ห้ามเชื่อมต่อฐานข้อมูล** ห้ามรัน `npm run dev`, `npm start` หรือโค้ดใดที่เรียก `src/lib/db.js` การทดสอบกับฐานข้อมูลหัวหน้าทำเอง
- **ห้ามอ่านหรือแก้ `.env.local` / `.env`** (มีรหัสผ่านฐานข้อมูล)
- **ห้ามแตะข้อมูลผู้ป่วยจริง** (HN, VN, เลขบัตร, ชื่อ) ตัวอย่างให้ใช้ค่าปลอม
- **ห้ามแก้ไฟล์ของงานเดิม** ได้แก่ `src/app/page.js`, `src/app/layout.js`, `src/app/globals.css`, `src/components/DashboardClient.js`,
  `src/app/api/dashboard/`, `src/lib/db.js` งานใหม่ต้องไม่ทำให้หน้า `/` เปลี่ยนแม้แต่นิดเดียว
  (CSS ของหน้าใหม่ใช้ CSS Modules `*.module.css` เท่านั้น ห้ามใช้ selector ระดับ global)
- ห้าม `git commit`, `git push`, เปลี่ยน branch, หรือ `npm install` แพ็กเกจใหม่ (ถ้าจำเป็นให้เสนอในรายงาน)

## วิธีรับงาน
- spec งานหน้าจอ/ฟีเจอร์ใหม่จะบอกแค่เป้าหมาย กรอบ และเกณฑ์ว่าเสร็จ ออกแบบรายละเอียดเองได้ (ชื่อไฟล์, การแบ่ง component, ข้อความ UI)
  โดยใช้ของในแผนที่โค้ดก่อนเขียนใหม่ อธิบายการตัดสินใจสั้นๆ ในรายงาน
- เมื่อเพิ่มหน้า/route/ฟังก์ชันที่ใช้ซ้ำได้ ให้อัปเดตแผนที่โค้ดในไฟล์นี้

## กฎการเขียนโค้ด
- SQL ใช้ parameter (`.input(...)`) เสมอ ห้ามต่อ string เข้า SQL
- log / error / ข้อความตอบกลับ ห้ามมีข้อมูลผู้ป่วย
- ข้อความบน UI เป็นภาษาไทย ชื่อตัวแปร/ฟังก์ชันเป็นภาษาอังกฤษ ทำตามสไตล์โค้ดรอบข้าง แก้ให้น้อยที่สุดที่ทำงานได้

## ตรวจงานก่อนส่ง
- รัน `npm run build` ให้ผ่าน (build ไม่ต่อฐานข้อมูล) ถ้าล้ม `spawn UNKNOWN` ให้ลองใหม่หนึ่งครั้งแล้วรายงาน
- shell เป็น PowerShell บน Windows ไฟล์ทุกไฟล์บันทึกเป็น UTF-8 (ไม่มี BOM)

## รูปแบบรายงานเมื่อจบงาน
1. ไฟล์ที่แก้/สร้าง พร้อมสรุปสั้นๆ
2. ผล `npm run build`
3. สิ่งที่หัวหน้าต้องทดสอบกับฐานข้อมูลเอง (ระบุเป็นขั้นตอน)
