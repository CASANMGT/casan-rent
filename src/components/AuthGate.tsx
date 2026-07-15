"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

export function AuthGate({
  role,
  children,
}: {
  role: "rider" | "operator";
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const hydrated = useAppStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (user.role !== role) router.replace("/login");
  }, [hydrated, user.role, role, router]);

  if (!hydrated || user.role !== role) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm" style={{ color: "var(--text2)" }}>
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}
