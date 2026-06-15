"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const REFRESH_INTERVAL = Number(
  process.env.NEXT_PUBLIC_REFRESH_INTERVAL || 20000
);

export default function DashboardClient() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(
    Math.ceil(REFRESH_INTERVAL / 1000)
  );
  const requestRef = useRef(null);

  const loadDashboard = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const response = await fetch("/api/dashboard", {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("ไม่สามารถโหลดข้อมูลจากระบบได้");
      }

      const data = await response.json();
      setPatients(data.patients ?? []);
      setLastUpdated(new Date());
      setError("");
      setSecondsLeft(Math.ceil(REFRESH_INTERVAL / 1000));
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDashboard();

    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadDashboard();
      }
    }, REFRESH_INTERVAL);

    const countdownTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setSecondsLeft((value) =>
          value <= 1 ? Math.ceil(REFRESH_INTERVAL / 1000) : value - 1
        );
      }
    }, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadDashboard();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      requestRef.current?.abort();
      window.clearInterval(refreshTimer);
      window.clearInterval(countdownTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadDashboard]);

  return (
    <main className="dashboard">

      <section className="patientTable" aria-busy={loading}>
        <div className="tableHeader">
          <div>รายชื่อผู้ป่วย</div>
          <div>สถานะการให้บริการ</div>
        </div>

        {loading ? (
          <div className="messageRow">กำลังโหลดข้อมูล...</div>
        ) : error ? (
          <div className="messageRow errorMessage">{error}</div>
        ) : patients.length === 0 ? (
          <div className="messageRow">ยังไม่มีผู้ป่วยที่ต้องแสดงในขณะนี้</div>
        ) : (
          patients.map((patient) => (
            <div
              className={`patientRow status-${patient.statusColor}`}
              key={`${patient.hn}-${patient.vn}`}
            >
              <div className="patientName">{patient.fullname || "-"}</div>
              <div className="patientStatus">{patient.serviceStatus || "-"}</div>
            </div>
          ))
        )}
      </section>

    </main>
  );
}
