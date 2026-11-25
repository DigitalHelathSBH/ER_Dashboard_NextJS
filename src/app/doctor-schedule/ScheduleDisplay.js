"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, todayBangkok } from "@/lib/doctorSchedule";
import ScheduleBoard from "./ScheduleBoard";
import { formatThaiDate, formatThaiTime, requestSchedule } from "./scheduleClient";
import styles from "./display.module.css";

export default function ScheduleDisplay() {
  const [date, setDate] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clock, setClock] = useState("");
  const requestRef = useRef(null);

  useEffect(() => {
    const format = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false });
    const tick = () => setClock(format.format(new Date()));
    tick();
    const timer = window.setInterval(tick, 10000);
    return () => window.clearInterval(timer);
  }, []);

  const loadSchedule = useCallback(async () => {
    setDate(todayBangkok());
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const result = await requestSchedule(null, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setData(result);
      setDate(result.date);
      setError("");
    } catch (err) {
      if (!controller.signal.aborted) setError("ไม่สามารถโหลดตารางเวรแพทย์ได้ ระบบจะลองใหม่อัตโนมัติ");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
    const refreshTimer = window.setInterval(loadSchedule, 60000);
    let midnightTimer;
    function scheduleMidnight() {
      const nextMidnight = new Date(`${addDays(todayBangkok(), 1)}T00:00:00+07:00`).getTime();
      midnightTimer = window.setTimeout(() => {
        loadSchedule();
        scheduleMidnight();
      }, Math.max(1000, nextMidnight - Date.now()));
    }
    scheduleMidnight();
    function onVisible() {
      if (document.visibilityState === "visible") loadSchedule();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      requestRef.current?.abort();
      window.clearInterval(refreshTimer);
      window.clearTimeout(midnightTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadSchedule]);

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.badge}>ER</span>
          <h1 className={styles.title}>ตารางแพทย์เวร</h1>
        </div>
        <div className={styles.meta}>
          <p className={styles.date}>{date ? formatThaiDate(date) : "กำลังโหลดวันที่..."}</p>
          {clock && <p className={styles.clock}>{clock} น.</p>}
        </div>
      </header>
      {error && <div className={styles.error} role="alert">{error}</div>}
      {data && data.date !== date && <p className={styles.stale}>ข้อมูลล่าสุดที่แสดง: {formatThaiDate(data.date)}</p>}
      {loading ? <div className={styles.message} role="status">กำลังโหลดตารางเวร...</div>
        : data?.schedule ? <ScheduleBoard schedule={data.schedule} />
          : data && data.date === date ? <div className={styles.message}>
            <p>ยังไม่ได้กรอกตารางเวรของวันนี้</p>
            <a href="/doctor-schedule/edit">ไปหน้ากรอกตารางเวร</a>
          </div> : <div className={styles.message}>ยังไม่มีข้อมูลที่แสดงได้</div>}
      <footer className={styles.footer}>
        <span>บันทึกล่าสุด: {formatThaiTime(data?.updatedAt)} (เวลาไทย)</span>
        <a href="/doctor-schedule/edit">แก้ไข</a>
      </footer>
    </main>
  );
}
