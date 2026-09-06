import type { Metadata } from "next";
import "./globals.css";
import PWARegister from "./PWARegister";

export const metadata: Metadata = {
  title: "Phòng họp không giấy Tỉnh đoàn",
  description: "Hệ thống Phòng họp không giấy",

  icons: {
    icon: "/icon.png?v=2",
    apple: "/apple-icon.png?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="bg-slate-100 text-slate-900">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}