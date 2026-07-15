"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bike, LayoutDashboard, History, User, Wallet } from "lucide-react";

const riderItems = [
  { href: "/home", label: "Home", icon: Bike },
  { href: "/history", label: "Trips", icon: History },
  { href: "/profile", label: "Profile", icon: User },
];

const operatorItems = [
  { href: "/operator", label: "Home", icon: LayoutDashboard },
  { href: "/operator/bookings", label: "Bookings", icon: History },
  { href: "/operator/fleet", label: "Fleet", icon: Bike },
  { href: "/operator/earnings", label: "Earn", icon: Wallet },
  { href: "/operator/profile", label: "More", icon: User },
];

export function BottomNav({ variant }: { variant: "rider" | "operator" }) {
  const pathname = usePathname();
  const items = variant === "rider" ? riderItems : operatorItems;

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-[430px] -translate-x-1/2 justify-around border-t px-1 py-2"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href !== "/home" &&
            href !== "/operator" &&
            pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-semibold"
            style={{ color: active ? "var(--primary)" : "var(--text2)" }}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
