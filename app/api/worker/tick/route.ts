import { NextResponse } from "next/server";
import { tickOnce } from "../../../../lib/worker/poll";

export async function POST() {
  try {
    const stats = await tickOnce();
    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "tick failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
