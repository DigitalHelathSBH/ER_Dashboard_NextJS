"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./DoctorInput.module.css";
import { BASE_PATH } from "../scheduleClient";

// ช่องกรอกชื่อแพทย์ที่ค้นจาก HIS ได้ ช่องเดียวใส่ได้หลายชื่อ คั่นด้วย , หรือ /
// ค้นจากคำหลังตัวคั่นตัวสุดท้าย เลือกแล้วแทนคำนั้นด้วย "พ.ชื่อ"
const SEPARATOR = /[,/]/;

function lastToken(value) {
  const parts = value.split(SEPARATOR);
  return parts[parts.length - 1].trim();
}

function replaceLastToken(value, replacement) {
  const match = value.match(/^(.*[,/])\s*[^,/]*$/s);
  const head = match ? `${match[1]} ` : "";
  return `${head}${replacement}, `;
}

export default function DoctorInput({ value, onChange, className, ...inputProps }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const listId = useId();

  useEffect(() => {
    const term = query.replace(/^พ\.\s*/, "");
    if (term.length < 2) {
      setResults([]);
      setStatus("");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("กำลังค้นหา...");
      try {
        const response = await fetch(`${BASE_PATH}/api/doctors?q=${encodeURIComponent(term)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setResults(data.doctors || []);
        setActive(0);
        setStatus(data.doctors?.length ? "" : "ไม่พบชื่อใน HIS (พิมพ์เองได้)");
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setStatus("ค้นหาไม่สำเร็จ (พิมพ์เองได้)");
        }
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  function handleChange(event) {
    onChange(event.target.value);
    setQuery(lastToken(event.target.value));
    setOpen(true);
  }

  function choose(doctor) {
    onChange(replaceLastToken(value, `พ.${doctor.firstName}`));
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (!open || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && (results.length > 0 || status);

  return (
    <div className={styles.wrap}>
      <input
        {...inputProps}
        ref={inputRef}
        className={className}
        type="text"
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={Boolean(showList)}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />
      {showList && (
        <ul className={styles.list} id={listId} role="listbox">
          {results.map((doctor, index) => (
            <li
              key={doctor.code || `${doctor.fullName}-${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? styles.active : undefined}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(doctor);
              }}
              onMouseEnter={() => setActive(index)}
            >
              <span className={styles.name}>{doctor.prefix} {doctor.fullName}</span>
              <span className={styles.code}>{doctor.code}</span>
            </li>
          ))}
          {results.length === 0 && status && <li className={styles.status}>{status}</li>}
        </ul>
      )}
    </div>
  );
}
