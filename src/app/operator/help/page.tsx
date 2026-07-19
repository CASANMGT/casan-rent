"use client";

import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";

const FAQS: { q: string; a: string; en?: string }[] = [
  {
    q: "1. Terima permintaan baru",
    a: "Buka Pesanan → tab Baru. Cek janji temu, stok sepeda, dan lokasi. Tekan Terima (atau Terima semua). Tolak jika unit tidak siap.",
    en: "Orders → New. Check appointment & stock, then Accept.",
  },
  {
    q: "2. Serahkan kunci fisik",
    a: "Untuk sewa kunci toko / both: setelah bayar lunas, tekan Serahkan kunci. Timer mulai. Catat jam kembali di kartu pesanan.",
    en: "After paid: hand physical key — timer starts.",
  },
  {
    q: "3. Kunci digital (app)",
    a: "Mode Otomatis: kunci dikirim saat Terima. Mode Manual: tekan Kirim kunci digital di Pesanan setelah confirmed. Pelanggan baru bisa Unlock setelah kunci terbit.",
    en: "Auto on Accept, or Manual → Send digital key.",
  },
  {
    q: "4. Fleet & stok",
    a: "Menu Sepeda & tempat: lihat unit tersedia, reserved, maintenance. Pindah lokasi jika perlu. Pastikan stok cukup sebelum Terima banyak pesanan.",
    en: "Fleet: availability, reserved, maintenance.",
  },
  {
    q: "5. Saat pelanggan kembali",
    a: "Tab Dipinjam → ambil kunci (Kunci kembali · tutup sewa) atau Hanya kunci kembali jika sepeda belum. Untuk digital-only: Tutup sewa setelah unit di hub (geofence ~200 m).",
    en: "Collect key / close rental when they return.",
  },
];

export default function OperatorHelpPage() {
  return (
    <AuthGate role="operator">
      <HelpInner />
    </AuthGate>
  );
}

function HelpInner() {
  return (
    <div className="content-pad">
      <Header title="Bantuan shift" backHref="/operator/profile" />

      <div className="op-card">
        <div className="font-display text-lg font-semibold">
          Alur shift singkat
        </div>
        <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
          Terima → kunci (fisik / digital) → fleet → return
        </p>
      </div>

      {FAQS.map((item) => (
        <div key={item.q} className="op-card">
          <div className="text-sm font-bold">{item.q}</div>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            {item.a}
          </p>
          {item.en ? (
            <p className="mt-2 text-xs" style={{ color: "var(--text2)" }}>
              {item.en}
            </p>
          ) : null}
        </div>
      ))}

      <p
        className="mx-4 mb-6 mt-2 text-center text-xs"
        style={{ color: "var(--text2)" }}
      >
        Masih bingung? Tanya owner / admin toko di shift briefing.
      </p>

      <BottomNav variant="operator" />
    </div>
  );
}
