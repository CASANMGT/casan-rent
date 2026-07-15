"use client";

import { Header } from "@/components/Header";
import { useAppStore } from "@/lib/store";
import { useEffect } from "react";

export default function NotificationsPage() {
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationsRead = useAppStore((s) => s.markNotificationsRead);

  useEffect(() => {
    markNotificationsRead();
  }, [markNotificationsRead]);

  return (
    <div>
      <Header title="Notifications" backHref="/home" />
      {notifications.map((n) => (
        <div key={n.id} className="card">
          <div className="font-bold">{n.title}</div>
          <div className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
            {n.body}
          </div>
        </div>
      ))}
    </div>
  );
}
