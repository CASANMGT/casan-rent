"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";

export default function NotificationsPage() {
  return (
    <AuthGate role="rider">
      <NotificationsInner />
    </AuthGate>
  );
}

function NotificationsInner() {
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markNotificationsRead = useAppStore((s) => s.markNotificationsRead);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="content-pad">
      <Header title="Notifications" backHref="/home" />
      {notifications.length > 0 && unread > 0 ? (
        <div className="mx-4 mb-2 flex justify-end">
          <button
            type="button"
            className="text-xs font-bold"
            style={{ color: "var(--primary)" }}
            onClick={() => markNotificationsRead()}
          >
            Mark all read
          </button>
        </div>
      ) : null}
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
            Find a hub →
          </Link>
        </div>
      ) : (
        notifications.map((n) => {
          const href = n.href ?? (n.bookingId ? `/book/${n.bookingId}/confirmed` : null);
          const inner = (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold">{n.title}</div>
                {!n.read ? (
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: "var(--primary)" }}
                    aria-label="Unread"
                  />
                ) : null}
              </div>
              <div className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
                {n.body}
              </div>
              {href ? (
                <div
                  className="mt-2 text-xs font-bold"
                  style={{ color: "var(--primary)" }}
                >
                  Open →
                </div>
              ) : null}
            </>
          );
          if (href) {
            return (
              <Link
                key={n.id}
                href={href}
                className="card block"
                style={{
                  opacity: n.read ? 0.85 : 1,
                  borderColor: n.read ? undefined : "var(--primary)",
                }}
                onClick={() => markNotificationRead(n.id)}
              >
                {inner}
              </Link>
            );
          }
          return (
            <button
              key={n.id}
              type="button"
              className="card w-full text-left"
              style={{ opacity: n.read ? 0.85 : 1 }}
              onClick={() => markNotificationRead(n.id)}
            >
              {inner}
            </button>
          );
        })
      )}
    </div>
  );
}
