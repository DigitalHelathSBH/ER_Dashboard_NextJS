import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { isValidDate, normalizeSchedule, todayBangkok } from "@/lib/doctorSchedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ตารางอยู่ในฐานข้อมูล Saraburi (แยกจาก SSBDatabase ที่ DB_NAME ชี้อยู่)
const SCHEDULE_TABLE = "Saraburi.dbo.ER_DoctorSchedule";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function badRequest(message) {
  return NextResponse.json({ message }, { status: 400, headers: noStore });
}

// GET /api/doctor-schedule?date=YYYY-MM-DD (ไม่ส่ง date = วันนี้ตามเวลาไทย)
// คืน { date, schedule: object | null, updatedAt: string | null }
export async function GET(request) {
  const date = request.nextUrl.searchParams.get("date") || todayBangkok();
  if (!isValidDate(date)) return badRequest("รูปแบบวันที่ไม่ถูกต้อง");

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("date", date)
      .query(`
        SELECT ScheduleData, UpdatedAt
        FROM ${SCHEDULE_TABLE}
        WHERE ScheduleDate = CONVERT(date, @date, 23);
      `);

    const row = result.recordset[0];
    let schedule = null;
    if (row) {
      try {
        schedule = normalizeSchedule(JSON.parse(row.ScheduleData));
      } catch {
        schedule = normalizeSchedule(null);
      }
    }

    return NextResponse.json(
      { date, schedule, updatedAt: row ? row.UpdatedAt.toISOString() : null },
      { headers: noStore }
    );
  } catch (error) {
    console.error("Doctor schedule read error:", error);
    return NextResponse.json(
      { message: "ไม่สามารถอ่านตารางเวรแพทย์ได้" },
      { status: 500, headers: noStore }
    );
  }
}

// PUT /api/doctor-schedule  body: { date: "YYYY-MM-DD", schedule: {...} }
export async function PUT(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("ข้อมูลไม่ถูกต้อง");
  }

  const date = body?.date;
  if (!isValidDate(date)) return badRequest("รูปแบบวันที่ไม่ถูกต้อง");
  const schedule = normalizeSchedule(body?.schedule);

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("date", date)
      .input("data", JSON.stringify(schedule))
      .query(`
        MERGE ${SCHEDULE_TABLE} WITH (HOLDLOCK) AS target
        USING (SELECT CONVERT(date, @date, 23) AS ScheduleDate) AS source
          ON target.ScheduleDate = source.ScheduleDate
        WHEN MATCHED THEN
          UPDATE SET ScheduleData = @data, UpdatedAt = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (ScheduleDate, ScheduleData, UpdatedAt)
          VALUES (source.ScheduleDate, @data, SYSUTCDATETIME())
        OUTPUT inserted.UpdatedAt;
      `);

    return NextResponse.json(
      { date, schedule, updatedAt: result.recordset[0].UpdatedAt.toISOString() },
      { headers: noStore }
    );
  } catch (error) {
    console.error("Doctor schedule save error:", error);
    return NextResponse.json(
      { message: "บันทึกตารางเวรแพทย์ไม่สำเร็จ" },
      { status: 500, headers: noStore }
    );
  }
}
