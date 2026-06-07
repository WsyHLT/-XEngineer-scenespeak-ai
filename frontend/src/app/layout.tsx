import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { ToastBridge, ToastProvider } from "@/components/ui/ToastProvider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

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
    <html lang="zh-CN" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
        <ToastProvider>
          <ToastBridge />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
