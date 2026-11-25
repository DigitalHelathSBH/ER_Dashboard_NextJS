// โครงสร้างตารางเวรแพทย์ ER ใช้ร่วมกันทั้งหน้าแสดงผล หน้ากรอก และ API
// เพิ่ม/ลด/เปลี่ยนชื่อแถว และสีแถบ (color) ได้ที่นี่ที่เดียว ใช้โทนพาสเทลอ่อน (ตัวอักษรบนแถบเป็นสีเข้ม) (key ต้องไม่ซ้ำ และอย่าเปลี่ยน key เดิมเพราะข้อมูลเก่าผูกกับ key)

// คอลัมน์ของเวรเช้า/บ่าย/ดึก
export const SHIFT_COLUMNS = [
  { key: "intern", label: "Intern 1 / Pool" },
  { key: "resident", label: "Resident" },
  { key: "staffResus", label: "Staff Trauma - Resus" },
  { key: "staffNonResus", label: "Staff Non Trauma - Resus" },
];

export const SHIFTS = [
  { key: "morning", label: "เช้า", color: "#FEF3C7" },
  { key: "afternoon", label: "บ่าย", color: "#FED7AA" },
  { key: "night", label: "ดึก", color: "#DDD6FE" },
];

// แถวแพทย์เฉพาะทาง (ช่องข้อความเดียวต่อแถว)
export const SPECIALTIES = [
  { key: "SUR", label: "SUR", color: "#FECACA" },
  { key: "MED", label: "MED", color: "#BBF7D0" },
  { key: "PED", label: "PED", color: "#BAE6FD" },
  { key: "OBS", label: "OBS", color: "#FBCFE8" },
  { key: "EYE", label: "EYE", color: "#99F6E4" },
  { key: "ENT", label: "ENT", color: "#FDE68A" },
  { key: "CVT", label: "CVT", color: "#C7D2FE" },
  { key: "NEURO", label: "NEURO", color: "#D9F99D" },
  { key: "ORTHO", label: "ORTHO", color: "#F5D0FE" },
  { key: "PLASTIC", label: "PLASTIC", color: "#A5F3FC" },
  { key: "PED_SUR", label: "PED-SUR", color: "#FFD0C2" },
  { key: "URO", label: "URO", color: "#E9D5FF" },
  { key: "XRAY", label: "X-RAY", color: "#E2E8F0" },
  { key: "LAB", label: "ชันสูตร", color: "#A7F3D0" },
  { key: "INT_PLASTIC", label: "Int. PLASTIC", color: "#FECDD3" },
  { key: "INT_NEURO", label: "Int. NEURO", color: "#FEF08A" },
  { key: "INT_URO", label: "Int. URO", color: "#BFDBFE" },
];

// กล่องด้านขวาของกระดาน แต่ละกล่องมีหัวข้อและแถวชื่อ (row.label ว่าง = ไม่มีป้าย) (ข้อมูลเก็บที่ schedule.side[box.key][row.key])
export const SIDE_BOXES = [
  { key: "consultGenSx", title: "Consult GEN Sx", color: "#FED7AA", rows: [
    { key: "lineA", label: "สาย A" },
    { key: "lineB", label: "สาย B" },
  ] },
  { key: "consultStemi", title: "Consult STEMI", color: "#FECACA", rows: [
    { key: "inHours", label: "ในเวลา" },
    { key: "afterHours", label: "นอกเวลา" },
  ] },
  // label ว่าง = ช่องชื่อเต็มความกว้าง ไม่มีป้าย
  { key: "consultSft", title: "Consult SFT", color: "#C7D2FE", rows: [
    { key: "name", label: "" },
  ] },
  { key: "nurseInspection", title: "เวรตรวจการพยาบาล", color: "#FBCFE8", rows: [
    { key: "line1", label: "สาย 1" },
    { key: "line2", label: "สาย 2" },
  ] },
];

// ข้อมูลที่บันทึกก่อนเปลี่ยนผัง (2026-11-25): ย้ายค่าเดิมมาไว้ที่ key ใหม่ตอนอ่าน
const LEGACY_SPECIALTIES = { INT_PLASTIC: ["inspection", "PLASTIC"], INT_NEURO: ["inspection", "NEURO"], INT_URO: ["inspection", "URO"] };
const LEGACY_SIDE = { consultGenSx: { lineA: ["specialties", "LINE_A"], lineB: ["specialties", "LINE_B"] } };

export const MAX_TEXT = 500;

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export function emptySchedule() {
  const shifts = {};
  for (const shift of SHIFTS) {
    shifts[shift.key] = {};
    for (const column of SHIFT_COLUMNS) shifts[shift.key][column.key] = "";
  }
  const specialties = {};
  for (const row of SPECIALTIES) specialties[row.key] = "";
  const side = {};
  for (const box of SIDE_BOXES) {
    side[box.key] = {};
    for (const row of box.rows) side[box.key][row.key] = "";
  }
  return { shifts, specialties, side, note: "" };
}

function cleanText(value) {
  // ตัดช่องว่างและตัวคั่น , / ที่ค้างท้าย (ช่องค้นหาชื่อแพทย์เติม ", " ต่อท้ายให้)
  return typeof value === "string" ? value.trim().replace(/[\s,/]+$/, "").slice(0, MAX_TEXT) : "";
}

// รับ object อะไรก็ได้ คืนเฉพาะ key ที่รู้จัก ค่าเป็น string ตัดความยาว
export function normalizeSchedule(input) {
  const source = input && typeof input === "object" ? input : {};
  const result = emptySchedule();
  for (const shift of SHIFTS) {
    const row = source.shifts?.[shift.key] || {};
    for (const column of SHIFT_COLUMNS) {
      result.shifts[shift.key][column.key] = cleanText(row[column.key]);
    }
  }
  const legacy = (path) => path?.reduce((item, key) => item?.[key], source);
  for (const row of SPECIALTIES) {
    result.specialties[row.key] = cleanText(source.specialties?.[row.key] ?? legacy(LEGACY_SPECIALTIES[row.key]));
  }
  for (const box of SIDE_BOXES) {
    for (const row of box.rows) {
      result.side[box.key][row.key] = cleanText(source.side?.[box.key]?.[row.key] ?? legacy(LEGACY_SIDE[box.key]?.[row.key]));
    }
  }
  result.note = cleanText(source.note);
  return result;
}

// วันที่วันนี้ตามเวลาไทย รูปแบบ YYYY-MM-DD
export function todayBangkok() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// "2026-11-25" -> { day: 25, month: "พฤศจิกายน", year: 2569 }
export function thaiDateParts(value) {
  const [y, m, d] = value.split("-").map(Number);
  return { day: d, month: THAI_MONTHS[m - 1], year: y + 543 };
}

export function addDays(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
