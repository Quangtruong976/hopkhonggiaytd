import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phòng họp không giấy",
  description: "Hệ thống Phòng họp không giấy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="bg-slate-100 text-slate-900">
        {children}
      </body>
    </html>
  );
}