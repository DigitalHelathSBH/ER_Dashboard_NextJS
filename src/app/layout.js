import "./globals.css";

export const metadata = {
  title: "ER Patient Dashboard",
  description: "หน้าจอแสดงสถานะผู้ป่วยห้องฉุกเฉิน",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
