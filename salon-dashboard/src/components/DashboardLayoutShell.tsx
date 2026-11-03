"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/SidebarContext";

// Lazy-load dashboard-only shell components so auth pages do not bundle them
const Sidebar = dynamic(() => import("@/components/Sidebar"), {
  ssr: false,
  loading: () => null,
});

const GlobalNotificationProvider = dynamic(
  () => import("@/components/GlobalNotificationProvider"),
  {
    ssr: false,
    loading: () => null,
  }
);

const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/auth",
  "/forgot-password",
  "/reset-password",
  "/update-password",
];

export default function DashboardLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.some((route) => pathname?.startsWith(route));

  if (isAuthPage) {
    return (
      <main className="flex-1 flex flex-col min-h-screen w-full overflow-x-hidden">
        {children}
      </main>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen lg:h-screen lg:overflow-hidden w-full">
        {children}
      </main>
      <Suspense fallback={null}>
        <GlobalNotificationProvider />
      </Suspense>
    </SidebarProvider>
  );
}
