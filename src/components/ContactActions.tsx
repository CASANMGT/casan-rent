"use client";

import { mailLink, waLink } from "@/lib/catalog";

export function ContactActions({
  phone,
  email,
  name,
  bookingCode,
}: {
  phone: string;
  email: string;
  name: string;
  bookingCode?: string;
}) {
  const pref = bookingCode
    ? `Hi ${name}, I have booking ${bookingCode}. `
    : `Hi ${name}, I have a question about Casan Rent. `;

  return (
    <div className="flex flex-wrap gap-2">
      <a
        className="rounded-xl px-3.5 py-2.5 text-xs font-bold text-white"
        style={{ background: "#25D366" }}
        href={waLink(phone, pref)}
        target="_blank"
        rel="noreferrer"
      >
        WhatsApp
      </a>
      <a
        className="rounded-xl px-3.5 py-2.5 text-xs font-bold"
        style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
        href={mailLink(
          email,
          bookingCode ? `Booking ${bookingCode}` : `Question for ${name}`,
          pref,
        )}
      >
        Email
      </a>
      <a
        className="rounded-xl px-3.5 py-2.5 text-xs font-bold"
        style={{ background: "var(--bg-deep)", color: "var(--text)" }}
        href={`tel:${phone}`}
      >
        Call
      </a>
    </div>
  );
}
