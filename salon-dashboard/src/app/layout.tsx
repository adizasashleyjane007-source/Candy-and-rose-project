import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AppointmentReminderProvider from "@/components/AppointmentReminderProvider";
import MessageAlertProvider from "@/components/MessageAlertProvider";
import AppointmentAlertProvider from "@/components/AppointmentAlertProvider";
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
      <body className="min-h-screen flex bg-pink-50 overflow-hidden">
        <SidebarProvider>
          <Sidebar />
          <main className="flex-1 flex flex-col h-screen overflow-hidden w-full">
            {children}
          </main>
          <AppointmentReminderProvider />
          <MessageAlertProvider />
          <AppointmentAlertProvider />
        </SidebarProvider>
      </body>
    </html>
  );
}

