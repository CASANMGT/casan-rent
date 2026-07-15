"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

/** Deep links to a fleet unit redirect to its catalog model. */
export default function VehicleRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const vehicles = useAppStore((s) => s.vehicles);

  useEffect(() => {
    const v = vehicles.find((x) => x.id === id);
    if (v?.modelId) router.replace(`/models/${v.modelId}`);
  }, [id, vehicles, router]);

  return (
    <p className="p-6 text-sm" style={{ color: "var(--text2)" }}>
      Opening model…
    </p>
  );
}
