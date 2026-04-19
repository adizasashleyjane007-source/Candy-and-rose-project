import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider } from "@/components/SidebarContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Candy And Rose Salon",
  description: "Salon Management Dashboard",
};

import GlobalNotificationProvider from "@/components/GlobalNotificationProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex bg-pink-50 lg:overflow-hidden">
        <SidebarProvider>
          <Sidebar />
          <main className="flex-1 flex flex-col min-h-screen lg:h-screen lg:overflow-hidden w-full">
            {children}
          </main>
          <Suspense fallback={null}>
            <GlobalNotificationProvider />
          </Suspense>
        </SidebarProvider>
      </body>
    </html>
  );
}

