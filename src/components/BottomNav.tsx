"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bike,
  ClipboardList,
  LayoutDashboard,
  User,
  Wallet,
  History,
} from "lucide-react";
import { OP } from "@/lib/operator-ui";

const riderItems = [
  { href: "/home", label: "Home", icon: Bike },
  { href: "/history", label: "Trips", icon: History },
  { href: "/profile", label: "Profile", icon: User },
];

const operatorItems = [
  { href: "/operator", label: OP.nav.home.en, hint: OP.nav.home.id, icon: LayoutDashboard },
  {
    href: "/operator/bookings",
    label: OP.nav.bookings.en,
    hint: OP.nav.bookings.id,
    icon: ClipboardList,
  },
  { href: "/operator/fleet", label: OP.nav.fleet.en, hint: OP.nav.fleet.id, icon: Bike },
  { href: "/operator/earnings", label: OP.nav.money.en, hint: OP.nav.money.id, icon: Wallet },
  { href: "/operator/profile", label: OP.nav.more.en, hint: OP.nav.more.id, icon: User },
] as const;

type NavItem = {
  href: string;
  label: string;
  icon: typeof Bike;
  hint?: string;
};

export function BottomNav({ variant }: { variant: "rider" | "operator" }) {
  const pathname = usePathname();
  const items: NavItem[] = variant === "rider" ? riderItems : [...operatorItems];

  return (
    <nav
      aria-label={variant === "operator" ? "Operator navigation" : "Rider navigation"}
      className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-[430px] -translate-x-1/2 justify-around border-t px-0.5 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {items.map(({ href, label, icon: Icon, hint }) => {
        const active =
          pathname === href ||
          (href !== "/home" &&
            href !== "/operator" &&
            pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={hint ? `${label} · ${hint}` : label}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1"
            style={{ color: active ? "var(--primary)" : "var(--text2)" }}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 2} />
            <span className="text-[11px] font-bold leading-tight">{label}</span>
            {variant === "operator" && hint ? (
              <span
                className="text-[9px] font-medium leading-none opacity-80"
                style={{ color: active ? "var(--primary)" : "var(--text2)" }}
              >
                {hint}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
