import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { seedPresets } from "../../../lib/seed/presets";

export async function GET() {
  await seedPresets();
  const [styles, poses] = await Promise.all([
    prisma.stylePreset.findMany({ orderBy: [{ category: "asc" }, { id: "asc" }] }),
    prisma.posePreset.findMany({ orderBy: { id: "asc" } }),
  ]);
  return NextResponse.json({ styles, poses });
}
