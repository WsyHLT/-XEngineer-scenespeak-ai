import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI English Speaking Coach",
  description: "Practice English speaking in real-world scenarios with AI feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
