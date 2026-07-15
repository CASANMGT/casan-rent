"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const setToast = useAppStore((s) => s.setToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  return <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>;
}
