-- ตารางเวรแพทย์ ER (หน้า /doctor-schedule)
-- รันครั้งเดียวในฐานข้อมูล Saraburi (แอปอ้างถึงตารางเป็น Saraburi.dbo.ER_DoctorSchedule)
USE Saraburi;
GO
-- เป็นตารางใหม่ ไม่แตะตารางเดิมของ HIS หรือของ dashboard เดิม (DashboardRefresh, Dashboard)
-- user ที่แอปใช้ต้องมีสิทธิ์ SELECT, INSERT, UPDATE บนตารางนี้

IF OBJECT_ID(N'dbo.ER_DoctorSchedule', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ER_DoctorSchedule (
    ScheduleDate date          NOT NULL CONSTRAINT PK_ER_DoctorSchedule PRIMARY KEY,
    ScheduleData nvarchar(max) NOT NULL,  -- JSON ของตารางเวรทั้งวัน (โครงสร้างดู src/lib/doctorSchedule.js)
    UpdatedAt    datetime2(0)  NOT NULL CONSTRAINT DF_ER_DoctorSchedule_UpdatedAt DEFAULT (SYSUTCDATETIME())  -- เวลา UTC
  );
END;
GO

-- ถ้า user ของแอปไม่ใช่ db_owner ให้ให้สิทธิ์ (เปลี่ยน <app_user> เป็นชื่อ user ใน DB_USER)
-- GRANT SELECT, INSERT, UPDATE ON dbo.ER_DoctorSchedule TO [<app_user>];
