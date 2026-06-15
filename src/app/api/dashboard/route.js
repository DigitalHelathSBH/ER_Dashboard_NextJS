import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PATIENT_QUERY = `
SELECT *
FROM (
  SELECT
    ROW_NUMBER() OVER (ORDER BY thedata.HN) AS RowID,
    thedata.*,
    SUBSTRING(
      REPLACE(SUBSTRING(FirstName, 2, LEN(FirstName)), '\\', '/'),
      CHARINDEX('/', REPLACE(SUBSTRING(FirstName, 2, LEN(FirstName)), '\\', '/')) + 1,
      LEN(REPLACE(SUBSTRING(FirstName, 2, LEN(FirstName)), '\\', '/'))
        - CHARINDEX('/', REPLACE(SUBSTRING(FirstName, 2, LEN(FirstName)), '\\', '/'))
    )
    + SUBSTRING(
      REPLACE(SUBSTRING(FirstName, 2, LEN(FirstName)), '\\', '/'),
      0,
      CHARINDEX('/', REPLACE(SUBSTRING(FirstName, 2, LEN(FirstName)), '\\', '/'))
    )
    + ' '
    + LEFT(SUBSTRING(LastName, 2, LEN(LastName)), 4)
    + 'xxxx' AS fullname
  FROM (
    SELECT
      mst.HN,
      (
        SELECT TOP 1 VNPRES.VN
        FROM VNMST
        JOIN VNPRES
          ON VNMST.VN = VNPRES.VN
          AND VNMST.VISITDATE = VNPRES.VISITDATE
          AND (VNPRES.CLINIC LIKE '04%' OR VNPRES.CLINIC LIKE '19%')
          AND VNPRES.DIAGACKDATETIME IS NOT NULL
        WHERE VNMST.VISITDATE = CONVERT(date, GETDATE())
          AND HN = mst.HN
        ORDER BY SUFFIX DESC
      ) AS VN,
      (
        SELECT TOP 1 VNPRES.SUFFIX
        FROM VNMST
        JOIN VNPRES
          ON VNMST.VN = VNPRES.VN
          AND VNMST.VISITDATE = VNPRES.VISITDATE
          AND (VNPRES.CLINIC LIKE '04%' OR VNPRES.CLINIC LIKE '19%')
          AND VNPRES.DIAGACKDATETIME IS NOT NULL
        WHERE VNMST.VISITDATE = CONVERT(date, GETDATE())
          AND HN = mst.HN
        ORDER BY SUFFIX DESC
      ) AS SUFFIX,
      (
        SELECT TOP 1 LEFT(VNPRES.CLINIC, 2)
        FROM VNMST
        JOIN VNPRES
          ON VNMST.VN = VNPRES.VN
          AND VNMST.VISITDATE = VNPRES.VISITDATE
          AND (VNPRES.CLINIC LIKE '04%' OR VNPRES.CLINIC LIKE '19%')
          AND VNPRES.DIAGACKDATETIME IS NOT NULL
        WHERE VNMST.VISITDATE = CONVERT(date, GETDATE())
          AND HN = mst.HN
        ORDER BY SUFFIX DESC
      ) AS clinic,
      (
        SELECT TOP 1 VNPRES.CLOSEVISITTYPE
        FROM VNMST
        JOIN VNPRES
          ON VNMST.VN = VNPRES.VN
          AND VNMST.VISITDATE = VNPRES.VISITDATE
          AND (VNPRES.CLINIC LIKE '04%' OR VNPRES.CLINIC LIKE '19%')
          AND VNPRES.DIAGACKDATETIME IS NOT NULL
        WHERE VNMST.VISITDATE = CONVERT(date, GETDATE())
          AND HN = mst.HN
        ORDER BY SUFFIX DESC
      ) AS CLOSEVISITTYPE,
      (
        SELECT TOP 1 VNPRES.DIAGOUTDATETIME
        FROM VNMST
        JOIN VNPRES
          ON VNMST.VN = VNPRES.VN
          AND VNMST.VISITDATE = VNPRES.VISITDATE
          AND (VNPRES.CLINIC LIKE '04%' OR VNPRES.CLINIC LIKE '19%')
          AND VNPRES.DIAGACKDATETIME IS NOT NULL
        WHERE VNMST.VISITDATE = CONVERT(date, GETDATE())
          AND HN = mst.HN
        ORDER BY SUFFIX DESC
      ) AS DIAGOUTDATETIME
    FROM VNMST mst
    JOIN VNPRES
      ON mst.VN = VNPRES.VN
      AND mst.VISITDATE = VNPRES.VISITDATE
      AND (VNPRES.CLINIC LIKE '04%' OR VNPRES.CLINIC LIKE '19%')
      AND VNPRES.DIAGACKDATETIME IS NOT NULL
    WHERE mst.VISITDATE = CONVERT(date, GETDATE())
    GROUP BY mst.HN
  ) AS thedata
  LEFT JOIN PATIENT_NAME
    ON thedata.HN = PATIENT_NAME.HN
    AND PATIENT_NAME.SUFFIX = '0'
  WHERE
    (CLOSEVISITTYPE IN ('143', '148') OR CLOSEVISITTYPE IS NULL)
    OR (
      (CLOSEVISITTYPE IN ('13', '2', '154', '180') OR CLOSEVISITTYPE LIKE '0%')
      AND DATEDIFF(HOUR, DIAGOUTDATETIME, GETDATE()) < 2
    )
) AS data
WHERE data.RowID BETWEEN @start AND @end;
`;

const COUNT_QUERY = `
SELECT COUNT(HN) AS num
FROM (
  SELECT
    mst.HN,
    (
      SELECT TOP 1 VNPRES.CLOSEVISITTYPE
      FROM VNMST
      JOIN VNPRES
        ON VNMST.VN = VNPRES.VN
        AND VNMST.VISITDATE = VNPRES.VISITDATE
        AND (VNPRES.CLINIC LIKE '04%' OR VNPRES.CLINIC LIKE '19%')
        AND VNPRES.DIAGACKDATETIME IS NOT NULL
      WHERE VNMST.VISITDATE = CONVERT(date, GETDATE())
        AND HN = mst.HN
      ORDER BY SUFFIX DESC
    ) AS CLOSEVISITTYPE,
    (
      SELECT TOP 1 VNPRES.DIAGOUTDATETIME
      FROM VNMST
      JOIN VNPRES
        ON VNMST.VN = VNPRES.VN
        AND VNMST.VISITDATE = VNPRES.VISITDATE
        AND (VNPRES.CLINIC LIKE '04%' OR VNPRES.CLINIC LIKE '19%')
        AND VNPRES.DIAGACKDATETIME IS NOT NULL
      WHERE VNMST.VISITDATE = CONVERT(date, GETDATE())
        AND HN = mst.HN
      ORDER BY SUFFIX DESC
    ) AS DIAGOUTDATETIME
  FROM VNMST mst
  JOIN VNPRES
    ON mst.VN = VNPRES.VN
    AND mst.VISITDATE = VNPRES.VISITDATE
    AND (VNPRES.CLINIC LIKE '04%' OR VNPRES.CLINIC LIKE '19%')
    AND VNPRES.DIAGACKDATETIME IS NOT NULL
  WHERE mst.VISITDATE = CONVERT(date, GETDATE())
  GROUP BY mst.HN
) AS thedata
WHERE
  (CLOSEVISITTYPE IN ('143', '148') OR CLOSEVISITTYPE IS NULL)
  OR (
    CLOSEVISITTYPE = '13'
    AND DATEDIFF(MINUTE, DIAGOUTDATETIME, GETDATE()) < 6
  );
`;

function getStatusColor(status) {
  return ["5", "6", "7", "8"].includes(String(status))
    ? String(status)
    : "default";
}

async function getPage(pool) {
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    const positionResult = await new sql.Request(transaction).query(`
      SELECT TOP 1 Check_Refresh
      FROM DashboardRefresh WITH (UPDLOCK, HOLDLOCK);
    `);

    const currentPosition = Number(
      positionResult.recordset[0]?.Check_Refresh || 1
    );
    const start = currentPosition > 0 ? currentPosition : 1;
    const end = start + 7;

    const patientResult = await new sql.Request(transaction)
      .input("start", sql.Int, start)
      .input("end", sql.Int, end)
      .query(PATIENT_QUERY);

    const countResult = await new sql.Request(transaction).query(COUNT_QUERY);
    const total = Number(countResult.recordset[0]?.num || 0);
    const nextPosition = end < total ? end + 1 : 1;

    await new sql.Request(transaction)
      .input("nextPosition", sql.Int, nextPosition)
      .query(`
        UPDATE DashboardRefresh
        SET Check_Refresh = @nextPosition;
      `);

    await transaction.commit();
    return patientResult.recordset;
  } catch (error) {
    await transaction.rollback().catch(() => {});
    throw error;
  }
}

async function buildPatient(pool, patient) {
  const hn = String(patient.HN ?? "");
  const vn = String(patient.VN ?? "");
  const close = patient.CLOSEVISITTYPE;
  const clinic = patient.clinic;

  const [xrayResult, labResult, admissionResult, dashboardResult] =
    await Promise.all([
      pool
        .request()
        .input("hn", sql.VarChar, hn)
        .query(`
          SELECT TOP 1 DATEDIFF(MINUTE, ENTRYDATETIME, GETDATE()) AS minn
          FROM XRAYREQ
          WHERE HN = @hn
            AND CONVERT(date, ENTRYDATETIME) = CONVERT(date, GETDATE())
            AND CXLBYUSERCODE IS NULL
          ORDER BY ENTRYDATETIME DESC;
        `),
      pool
        .request()
        .input("hn", sql.VarChar, hn)
        .query(`
          SELECT TOP 1
            DATEDIFF(MINUTE, ECPIH, GETDATE()) AS slab,
            DATEDIFF(MINUTE, EDMUD, GETDATE()) AS elab
          FROM EDMPF
          WHERE EDMIN = @hn
            AND CONVERT(date, ECPIH) = CONVERT(date, GETDATE())
          ORDER BY ECPIH DESC;
        `),
      pool
        .request()
        .input("hn", sql.VarChar, hn)
        .query(`
          SELECT TOP 1 WardName
          FROM ADMMASTER
          LEFT JOIN WardCode ON ADMMASTER.ADMWARD = WardCode.CODE
          WHERE HN = @hn
            AND CONVERT(date, ADMDATETIME) = CONVERT(date, GETDATE());
        `),
      pool
        .request()
        .input("vn", sql.VarChar, vn)
        .query(`
          SELECT TOP 1 status, Invisible
          FROM Dashboard
          WHERE vn = @vn
            AND CONVERT(date, visitdate) = CONVERT(date, GETDATE());
        `),
    ]);

  const xrayMinutes = Number(xrayResult.recordset[0]?.minn || 0);
  const labStartMinutes = Number(labResult.recordset[0]?.slab || 0);
  const labEndMinutes = labResult.recordset[0]?.elab;

  let wait = "";
  if (xrayMinutes > labStartMinutes) {
    wait = " / รอแพทย์อ่านผล X-ray";
  } else if (xrayMinutes < labStartMinutes) {
    wait =
      labEndMinutes != null
        ? " / รอแพทย์อ่านผลทางห้องปฏิบัติการ"
        : " / รอผลตรวจทางห้องปฏิบัติการ";
  }

  const wardName = admissionResult.recordset[0]?.WardName;
  let serviceStatus = "";

  if (wardName) {
    serviceStatus = `รอนอน รพ. หอผู้ป่วย ${wardName}`;
  } else if (close != null) {
    if (String(close) === "143") {
      serviceStatus = `ห้องสังเกตอาการ${wait}`;
    } else if (String(close) === "13") {
      serviceStatus = "รอกลับบ้าน";
    } else if (String(close) === "148") {
      serviceStatus = `ER${wait}`;
    } else {
      const closeResult = await pool
        .request()
        .input("close", sql.VarChar, String(close))
        .query(`
          SELECT TOP 1 RIGHT(THAINAME, LEN(THAINAME) - 1) AS ThaiName
          FROM SYSCONFIG
          WHERE CTRLCODE = '20043'
            AND CODE = @close;
        `);
      serviceStatus = closeResult.recordset[0]?.ThaiName || "";
    }
  } else if (String(clinic) === "19") {
    serviceStatus = `ห้องสังเกตอาการ${wait}`;
  } else if (String(clinic) === "04") {
    serviceStatus = "ER / อยู่ระหว่างรับการรักษา";
  }

  const dashboard = dashboardResult.recordset[0] || {};

  return {
    hn,
    vn,
    fullname: patient.fullname,
    serviceStatus,
    statusColor: getStatusColor(dashboard.status),
    invisible: String(dashboard.Invisible ?? "") === "1",
  };
}

export async function GET() {
  try {
    const pool = await getPool();
    const page = await getPage(pool);
    const patients = await Promise.all(
      page.map((patient) => buildPatient(pool, patient))
    );

    return NextResponse.json(
      {
        patients: patients.filter((patient) => !patient.invisible),
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("ER dashboard error:", error);
    return NextResponse.json(
      { message: "ไม่สามารถอ่านข้อมูล Dashboard ได้" },
      { status: 500 }
    );
  }
}
