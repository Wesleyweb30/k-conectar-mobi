import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import IdleSessionGuard from "@/components/auth/idle-session-guard";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kallas Conectar Mobi",
  description: "Plataforma de gestão mobilidade urbana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-br"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <IdleSessionGuard />
        {children}
      </body>
    </html>
  );
}
