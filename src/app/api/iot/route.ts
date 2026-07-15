import { NextResponse } from "next/server";

type Command = "unlock" | "lock" | "motor_on" | "motor_off" | "locate";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const command = (body.command ?? "unlock") as Command;
  const vehicleId = body.vehicleId ?? "unknown";
  const bookingId = body.bookingId ?? null;

  await new Promise((r) => setTimeout(r, 300));

  const responses: Record<Command, string> = {
    unlock: "Immobilizer open — motor ready",
    lock: "Immobilizer engaged — motor disabled",
    motor_on: "Motor ON",
    motor_off: "Motor OFF",
    locate: "Last known position returned (mock GPS)",
  };

  return NextResponse.json({
    ok: true,
    mock: true,
    command,
    vehicleId,
    bookingId,
    latencyMs: 300,
    message: responses[command] ?? "OK",
    position:
      command === "locate"
        ? { lat: -8.7177, lng: 115.1708, accuracyM: 12 }
        : undefined,
  });
}
