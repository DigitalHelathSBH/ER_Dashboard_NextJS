import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

// THAINAME ของ HNDOCTOR: ตัวแรกเป็นตัวอักษรนำหน้าสำหรับเรียง ตามด้วย "ชื่อ นามสกุล\คำนำหน้า"
function parseThaiName(raw) {
  const text = String(raw || "").slice(1).trim();
  const [name = "", prefix = ""] = text.split("\\");
  const fullName = name.trim().replace(/\s+/g, " ");
  return {
    prefix: prefix.trim(),
    fullName,
    firstName: fullName.split(" ")[0] || "",
  };
}

function likeEscape(value) {
  return value.replace(/[[\]%_]/g, (ch) => `[${ch}]`);
}

// GET /api/doctors?q=คำค้น  ค้นชื่อแพทย์ (ที่ยังไม่ปิดใช้งาน) จาก HNDOCTOR ของ HIS แบบอ่านอย่างเดียว
export async function GET(request) {
  const q = (request.nextUrl.searchParams.get("q") || "").trim().replace(/^พ\.\s*/, "");
  if (q.length < 1 || q.length > 50) {
    return NextResponse.json({ doctors: [] }, { headers: noStore });
  }

  try {
    const pool = await getPool();
    const escaped = likeEscape(q);
    const result = await pool
      .request()
      .input("contains", `%${escaped}%`)
      .input("starts", `${escaped}%`)
      .query(`
        SELECT TOP 20 DOCTOR, THAINAME
        FROM HNDOCTOR
        WHERE ISNULL(OFFDOCTOR, 0) = 0
          AND THAINAME IS NOT NULL
          AND (SUBSTRING(THAINAME, 2, 100) LIKE @contains OR DOCTOR LIKE @starts)
        ORDER BY
          -- HNDOCTOR มีบุคลากรอื่นปน ให้ นพ./พญ. ขึ้นก่อน
          CASE WHEN THAINAME LIKE N'%\\นพ.%' OR THAINAME LIKE N'%\\พญ.%' THEN 0 ELSE 1 END,
          CASE WHEN SUBSTRING(THAINAME, 2, 100) LIKE @starts THEN 0 ELSE 1 END,
          THAINAME;
      `);

    const doctors = result.recordset
      .map((row) => ({ code: String(row.DOCTOR || "").trim(), ...parseThaiName(row.THAINAME) }))
      .filter((doctor) => doctor.firstName);

    return NextResponse.json({ doctors }, { headers: noStore });
  } catch (error) {
    console.error("Doctor search error:", error);
    return NextResponse.json(
      { message: "ค้นหาชื่อแพทย์ไม่สำเร็จ" },
      { status: 500, headers: noStore }
    );
  }
}
