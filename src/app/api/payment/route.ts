import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const method = body.method ?? "qris";
  const amountIdr = Number(body.amountIdr ?? 0);
  const bookingId = body.bookingId ?? null;

  // Mock gateway: always succeeds
  await new Promise((r) => setTimeout(r, 400));

  return NextResponse.json({
    ok: true,
    mock: true,
    paymentId: `pay_${Date.now()}`,
    method,
    amountIdr,
    bookingId,
    status: "paid",
    message: `Mock ${String(method).toUpperCase()} payment succeeded`,
  });
}
