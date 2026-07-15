"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const loginRider = useAppStore((s) => s.loginRider);
  const loginOperator = useAppStore((s) => s.loginOperator);
  const setToast = useAppStore((s) => s.setToast);

  const [role, setRole] = useState<"rider" | "operator">("rider");
  const [phone, setPhone] = useState("+62 812-9876-5432");
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("548271");
  const [username, setUsername] = useState("balisunset.admin");
  const [password, setPassword] = useState("casan2026");

  function continueGuest() {
    loginRider("Guest Rider", undefined, true);
    setToast("Welcome, Guest!");
    router.push("/home");
  }

  function sendOtp() {
    setOtpStep(true);
    setToast("OTP sent (demo: 548271)");
  }

  function verifyOtp() {
    if (otp.replace(/\D/g, "") !== "548271") {
      setToast("Invalid OTP — use 548271");
      return;
    }
    loginRider("Alex Rivera", phone, false);
    setToast("Welcome back, Alex!");
    router.push("/home");
  }

  function doOperatorLogin() {
    const err = loginOperator(username.trim(), password);
    if (err) {
      setToast(err);
      return;
    }
    setToast("Welcome back, Operator!");
    router.push("/operator");
  }

  if (otpStep) {
    return (
      <div className="anim-slide min-h-dvh">
        <div
          className="relative px-5 pb-12 pt-10 text-center text-white"
          style={{
            background:
              "linear-gradient(145deg, var(--primary-dark) 0%, var(--primary) 55%, var(--primary-light) 100%)",
            borderRadius: "0 0 32px 32px",
          }}
        >
          <button
            type="button"
            className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xl"
            onClick={() => setOtpStep(false)}
          >
            ‹
          </button>
          <div className="mb-3 text-5xl">📱</div>
          <h1 className="font-display text-3xl font-semibold">Verify phone</h1>
          <p className="mt-2 text-sm text-white/85">Code sent to {phone}</p>
        </div>
        <div className="mt-8 px-4">
          <input
            className="w-full rounded-xl border-2 px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] outline-none"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
          />
          <button type="button" className="btn-primary" onClick={verifyOtp}>
            Verify &amp; Login
          </button>
          <button type="button" className="btn-text" onClick={() => setToast("OTP resent!")}>
            Resend code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="anim-fade-up min-h-dvh pb-8">
      <div
        className="px-5 pb-14 pt-12 text-center text-white"
        style={{
          background:
            "linear-gradient(145deg, var(--primary-dark) 0%, var(--primary) 50%, #1a8a75 100%)",
          borderRadius: "0 0 32px 32px",
        }}
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl backdrop-blur">
          🚲
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Casan Rent
        </h1>
        <p className="mt-2 text-sm text-white/85">
          Bikes · E-Bikes · E-Mopeds from multiple operators
        </p>
      </div>

      <div
        className="mx-4 -mt-6 flex rounded-2xl p-1 shadow-md"
        style={{ background: "var(--card)" }}
      >
        <button
          type="button"
          className="flex-1 rounded-xl py-3 text-sm font-bold transition"
          style={{
            background: role === "rider" ? "var(--primary)" : "transparent",
            color: role === "rider" ? "white" : "var(--text2)",
          }}
          onClick={() => setRole("rider")}
        >
          I&apos;m a Rider
        </button>
        <button
          type="button"
          className="flex-1 rounded-xl py-3 text-sm font-bold transition"
          style={{
            background: role === "operator" ? "var(--primary)" : "transparent",
            color: role === "operator" ? "white" : "var(--text2)",
          }}
          onClick={() => setRole("operator")}
        >
          I&apos;m an Operator
        </button>
      </div>

      {role === "rider" ? (
        <div className="mt-6">
          <label className="mx-4 mb-1.5 block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text2)" }}>
            Phone number
          </label>
          <input
            className="mx-4 w-[calc(100%-32px)] rounded-xl border-2 px-4 py-3 text-[15px] outline-none"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button type="button" className="btn-primary" onClick={sendOtp}>
            Send OTP
          </button>
          <button type="button" className="btn-text" onClick={continueGuest}>
            Continue as Guest
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <label className="mx-4 mb-1.5 block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text2)" }}>
            Username
          </label>
          <input
            className="mx-4 mb-4 w-[calc(100%-32px)] rounded-xl border-2 px-4 py-3 text-[15px] outline-none"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <label className="mx-4 mb-1.5 block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text2)" }}>
            Password
          </label>
          <input
            type="password"
            className="mx-4 w-[calc(100%-32px)] rounded-xl border-2 px-4 py-3 text-[15px] outline-none"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" className="btn-primary" onClick={doOperatorLogin}>
            Operator Login
          </button>
          <p className="px-6 text-center text-xs" style={{ color: "var(--text2)" }}>
            Demo: balisunset.admin / casan2026
          </p>
        </div>
      )}
    </div>
  );
}
