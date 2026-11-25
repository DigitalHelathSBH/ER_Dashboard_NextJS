import { INSPECTION, MAX_TEXT, SHIFTS, SHIFT_COLUMNS, SPECIALTIES } from "@/lib/doctorSchedule";
import DoctorInput from "./edit/DoctorInput";
import styles from "./ScheduleBoard.module.css";

const staffColumns = SHIFT_COLUMNS.filter((column) => column.key.startsWith("staff"));
const otherColumns = SHIFT_COLUMNS.filter((column) => !column.key.startsWith("staff"));

export default function ScheduleBoard({ schedule, onChange, disabled = false }) {
  const editable = Boolean(onChange);

  function field(path, label) {
    const value = path.reduce((item, key) => item[key], schedule);
    return editable ? (
      <DoctorInput
        className={styles.input}
        aria-label={label}
        value={value}
        maxLength={MAX_TEXT}
        disabled={disabled}
        onChange={(text) => onChange(path, text)}
      />
    ) : value ? <span className={styles.value}>{value}</span>
      : <span className={styles.empty}>-</span>;
  }

  return (
    <div className={`${styles.board} ${editable ? styles.editable : ""}`}>
      <div className={styles.card}>
      <table className={styles.shifts}>
        <caption className={styles.srOnly}>ตารางแพทย์เวรเช้า บ่าย ดึก</caption>
        <thead>
          <tr>
            <th rowSpan={staffColumns.length ? 2 : 1} scope="col" className={styles.shiftLabel}>แพทย์</th>
            {otherColumns.map((column) => (
              <th key={column.key} rowSpan={staffColumns.length ? 2 : 1} scope="col">{column.label}</th>
            ))}
            {staffColumns.length > 0 && <th colSpan={staffColumns.length} scope="colgroup">STAFF</th>}
          </tr>
          {staffColumns.length > 0 && <tr>{staffColumns.map((column) => (
            <th key={column.key} scope="col">{column.label.replace(/^Staff\s*/i, "")}</th>
          ))}</tr>}
        </thead>
        <tbody>
          {SHIFTS.map((shift) => (
            <tr key={shift.key} style={{ "--c": shift.color }}>
              <th scope="row" className={styles.colorLabel}>{shift.label}</th>
              {[...otherColumns, ...staffColumns].map((column) => (
                <td key={column.key}>{field(["shifts", shift.key, column.key], `${shift.label} ${column.label}`)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div className={styles.lowerBoard}>
        <section aria-label="แพทย์เฉพาะทาง" className={`${styles.card} ${styles.specialties}`}>
          {SPECIALTIES.map((row) => (
            <div className={styles.row} key={row.key} style={{ "--c": row.color }}>
              <label className={styles.colorLabel} htmlFor={editable ? `specialty-${row.key}` : undefined}>
                {row.label}
              </label>
              <div className={styles.nameCell}>
                {editable ? (
                  <DoctorInput className={styles.input} id={`specialty-${row.key}`}
                    value={schedule.specialties[row.key]} maxLength={MAX_TEXT} disabled={disabled}
                    onChange={(text) => onChange(["specialties", row.key], text)} />
                ) : field(["specialties", row.key], row.label)}
              </div>
            </div>
          ))}
        </section>
        <aside className={styles.side}>
          <section className={`${styles.card} ${styles.inspection}`} aria-labelledby="inspection-title">
            <h2 id="inspection-title" className={styles.sectionTitle}>เวรตรวจการ</h2>
            {INSPECTION.map((row) => (
              <div className={styles.inspectionRow} key={row.key} style={{ "--c": row.color }}>
                <div className={styles.colorLabel}>{row.label}</div>
                <div className={styles.nameCell}>{field(["inspection", row.key], `เวรตรวจการ ${row.label}`)}</div>
              </div>
            ))}
          </section>
          {(editable || schedule.note) && (
            <section className={`${styles.card} ${styles.note}`}>
              <h2 className={styles.sectionTitle}><label htmlFor={editable ? "schedule-note" : undefined}>หมายเหตุ</label></h2>
              {editable ? <textarea id="schedule-note" className={styles.textarea} rows={5}
                value={schedule.note} maxLength={MAX_TEXT} disabled={disabled}
                onChange={(event) => onChange(["note"], event.target.value)} />
                : <p className={styles.noteText}>{schedule.note}</p>}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
