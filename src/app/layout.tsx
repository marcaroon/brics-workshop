// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BRICS Workshop - Simulasi Pembangunan",
  description: "Sistem manajemen workshop simulasi pembangunan menggunakan BRICS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
