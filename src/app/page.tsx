"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

export default function HomePage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const hydrated = useAppStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (user.role === "rider") router.replace("/home");
    else if (user.role === "operator") router.replace("/operator");
    else router.replace("/login");
  }, [hydrated, user.role, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center text-sm" style={{ color: "var(--text2)" }}>
      Loading Casan Rent…
    </div>
  );
}
