"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, emptySchedule, isValidDate, normalizeSchedule, todayBangkok } from "@/lib/doctorSchedule";
import ScheduleBoard from "../ScheduleBoard";
import { formatThaiDate, formatThaiTime, requestSchedule } from "../scheduleClient";
import styles from "./edit.module.css";

function replaceField(source, path, value) {
  const [key, ...rest] = path;
  return { ...source, [key]: rest.length ? replaceField(source[key], rest, value) : value };
}

export default function ScheduleEditor() {
  const [date, setDate] = useState("");
  const [schedule, setSchedule] = useState(emptySchedule);
  const [baseline, setBaseline] = useState(() => JSON.stringify(emptySchedule()));
  const [loadState, setLoadState] = useState("loading");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const requestRef = useRef(null);
  const actionRef = useRef("");
  const dirty = JSON.stringify(schedule) !== baseline;
  const disabled = loadState !== "ready" || Boolean(busy);

  useEffect(() => { setDate(todayBangkok()); }, []);

  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setLoadState("loading");
    setError("");
    setMessage("");
    async function load() {
      try {
        const data = await requestSchedule(date, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const next = data.schedule || emptySchedule();
        setSchedule(next);
        setBaseline(JSON.stringify(next));
        setLoadState("ready");
        setMessage(data.schedule
          ? `โหลดตารางเวรแล้ว · บันทึกล่าสุด ${formatThaiTime(data.updatedAt)} (เวลาไทย)`
          : "ยังไม่มีตารางเวรของวันที่เลือก เริ่มกรอกได้เลย");
      } catch {
        if (!controller.signal.aborted) {
          setLoadState("error");
          setError("โหลดตารางเวรไม่สำเร็จ กรุณาลองใหม่ก่อนกรอกหรือบันทึก");
        }
      }
    }
    load();
    return () => controller.abort();
  }, [date, reloadKey]);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    function beforeUnload(event) {
      if (dirty || actionRef.current === "save") {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  function changeDate(nextDate) {
    if (actionRef.current || !isValidDate(nextDate) || nextDate === date) return;
    if (dirty && !window.confirm("มีการแก้ไขที่ยังไม่บันทึก ต้องการเปลี่ยนวันที่และทิ้งการแก้ไขหรือไม่?")) return;
    requestRef.current?.abort();
    const next = emptySchedule();
    setSchedule(next);
    setBaseline(JSON.stringify(next));
    setLoadState("loading");
    setMessage("");
    setError("");
    setDate(nextDate);
  }

  function changeField(path, value) {
    setSchedule((current) => replaceField(current, path, value));
    setMessage("");
    setError("");
  }

  const saveSchedule = useCallback(async () => {
    if (loadState !== "ready" || actionRef.current || !isValidDate(date)) return;
    actionRef.current = "save";
    setBusy("save");
    setMessage("กำลังบันทึก...");
    setError("");
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const data = await requestSchedule(null, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, schedule: normalizeSchedule(schedule) }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (data.date !== date || !data.schedule) throw new Error("Invalid save response");
      setSchedule(data.schedule);
      setBaseline(JSON.stringify(data.schedule));
      setMessage(`บันทึกแล้ว ${formatThaiTime(data.updatedAt)} (เวลาไทย)`);
    } catch {
      if (!controller.signal.aborted) {
        setMessage("");
        setError("บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองบันทึกอีกครั้ง");
      }
    } finally {
      actionRef.current = "";
      if (!controller.signal.aborted) setBusy("");
    }
  }, [date, schedule, loadState]);

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveSchedule();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveSchedule]);

  async function copyPreviousDay() {
    if (disabled || actionRef.current) return;
    const hasContent = JSON.stringify(normalizeSchedule(schedule)) !== JSON.stringify(emptySchedule());
    if (hasContent && !window.confirm("ฟอร์มมีข้อมูลอยู่ ต้องการแทนที่ด้วยตารางเวรวันก่อนหรือไม่?")) return;
    actionRef.current = "copy";
    setBusy("copy");
    setError("");
    setMessage("กำลังโหลดตารางเวรวันก่อน...");
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const data = await requestSchedule(addDays(date, -1), { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!data.schedule) {
        setMessage("วันก่อนยังไม่มีตารางเวร ข้อมูลในฟอร์มยังคงเดิม");
        return;
      }
      setSchedule(data.schedule);
      setMessage("คัดลอกจากวันก่อนแล้ว กรุณาตรวจสอบและกดบันทึก");
    } catch {
      if (!controller.signal.aborted) {
        setMessage("");
        setError("คัดลอกจากวันก่อนไม่สำเร็จ ข้อมูลในฟอร์มยังคงเดิม");
      }
    } finally {
      actionRef.current = "";
      if (!controller.signal.aborted) setBusy("");
    }
  }

  function clearSchedule() {
    if (disabled || actionRef.current || !window.confirm("ต้องการล้างข้อมูลทั้งหมดในฟอร์มหรือไม่? ต้องกดบันทึกเพื่อยืนยันการล้าง")) return;
    setSchedule(emptySchedule());
    setError("");
    setMessage("ล้างข้อมูลในฟอร์มแล้ว กรุณากดบันทึกหากต้องการเก็บการเปลี่ยนแปลง");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>กรอกตารางแพทย์เวร ER</h1>
          <p className={styles.subtitle}>เลือกวันที่ กรอกชื่อแพทย์ แล้วกดบันทึก</p>
        </div>
        {/* A full navigation also triggers the native unsaved-change warning. */}
        <a className={styles.link} href="/doctor-schedule">ดูจอแสดงผล</a>
      </header>
      <form onSubmit={(event) => { event.preventDefault(); saveSchedule(); }}>
        <div className={styles.toolbar}>
          <div className={styles.dateControls}>
            <button type="button" disabled={!date || Boolean(busy)} onClick={() => changeDate(addDays(date, -1))}>วันก่อน</button>
            <label className={styles.dateLabel}>วันที่
              <input className={styles.dateInput} type="date" value={date} required disabled={Boolean(busy)}
                onChange={(event) => changeDate(event.target.value)} />
            </label>
            <button type="button" disabled={!date || Boolean(busy)} onClick={() => changeDate(addDays(date, 1))}>วันถัดไป</button>
          </div>
          <div className={styles.actions}>
            <button type="button" disabled={disabled} onClick={copyPreviousDay}>คัดลอกจากวันก่อน</button>
            <button className={styles.clearButton} type="button" disabled={disabled} onClick={clearSchedule}>ล้างทั้งหมด</button>
          </div>
        </div>
        <div className={styles.formHeading}>
          <p className={styles.selectedDate}>{date ? formatThaiDate(date) : "กำลังเลือกวันที่..."}</p>
          <span className={dirty ? styles.dirty : styles.hint}>{dirty ? "มีการแก้ไขที่ยังไม่บันทึก" : "บันทึกด้วย Ctrl+S ได้"}</span>
        </div>
        <div className={styles.statusArea} aria-live="polite" aria-atomic="true">
          {loadState === "loading" && <p className={styles.status}>กำลังโหลดตารางเวร...</p>}
          {message && <p className={styles.status}>{message}</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          {loadState === "error" && <button type="button" onClick={() => setReloadKey((key) => key + 1)}>ลองโหลดอีกครั้ง</button>}
        </div>
        {loadState === "ready" && <ScheduleBoard schedule={schedule} onChange={changeField} disabled={disabled} />}
        <div className={styles.saveBar}>
          <span>{busy === "save" ? "กำลังบันทึก..." : dirty ? "อย่าลืมบันทึกก่อนออกจากหน้านี้" : "ตรวจสอบตารางเวรให้ครบก่อนบันทึก"}</span>
          <button className={styles.saveButton} type="submit" disabled={disabled}>{busy === "save" ? "กำลังบันทึก..." : "บันทึก"}</button>
        </div>
      </form>
    </main>
  );
}
