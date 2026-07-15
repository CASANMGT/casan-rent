"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { PhoneShell } from "@/components/PhoneShell";
import { Toast } from "@/components/Toast";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const darkMode = useAppStore((s) => s.darkMode);
  const setHydrated = useAppStore((s) => s.setHydrated);

  useEffect(() => {
    setHydrated(true);
  }, [setHydrated]);

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <PhoneShell>
      <Toast />
      {children}
    </PhoneShell>
  );
}
