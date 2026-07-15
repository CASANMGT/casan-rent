"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
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
      {notifications.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Bell
            size={40}
            className="mx-auto"
            style={{ color: "var(--text2)", opacity: 0.5 }}
          />
          <p className="mt-3 text-sm font-semibold">No notifications yet</p>
          <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
            Booking updates and reminders will show up here.
          </p>
          <Link
            href="/home"
            className="mt-4 inline-block text-sm font-bold"
            style={{ color: "var(--primary)" }}
          >
            Browse bikes →
          </Link>
        </div>
      ) : (
        notifications.map((n) => (
          <div key={n.id} className="card">
            <div className="font-bold">{n.title}</div>
            <div className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
              {n.body}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
