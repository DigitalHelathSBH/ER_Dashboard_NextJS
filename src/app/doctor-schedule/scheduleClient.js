import { isValidDate, normalizeSchedule, thaiDateParts } from "@/lib/doctorSchedule";

export function formatThaiDate(date) {
  const { day, month, year } = thaiDateParts(date);
  return `วันที่ ${day} เดือน ${month} พ.ศ. ${year}`;
}

export function formatThaiTime(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(new Date(value));
}

export async function requestSchedule(date, options = {}) {
  const response = await fetch(
    `/api/doctor-schedule${date ? `?date=${encodeURIComponent(date)}` : ""}`,
    { cache: "no-store", ...options }
  );
  if (!response.ok) {
    throw new Error(options.method === "PUT"
      ? "บันทึกตารางเวรแพทย์ไม่สำเร็จ กรุณาลองอีกครั้ง"
      : "ไม่สามารถโหลดตารางเวรแพทย์ได้ กรุณาลองอีกครั้ง");
  }
  const data = await response.json();
  if (!isValidDate(data.date) || (date && data.date !== date)) {
    throw new Error("ข้อมูลวันที่จากระบบไม่ถูกต้อง กรุณาลองอีกครั้ง");
  }
  return {
    date: data.date,
    schedule: data.schedule === null ? null : normalizeSchedule(data.schedule),
    updatedAt: data.updatedAt || null,
  };
}
