import { NextResponse } from "next/server";
import { operators, vehicles, staff } from "@/lib/seed";
import { isSupabaseEnabled } from "@/lib/supabase";

export async function GET() {
  return NextResponse.json({
    mode: isSupabaseEnabled() ? "supabase" : "demo",
    operators: operators.length,
    vehicles: vehicles.length,
    staff: staff.length,
    message:
      "Fleet seed is available. Client store persists bookings in demo mode.",
  });
}
