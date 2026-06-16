import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { seedPresets } from "../../../lib/seed/presets";

export async function GET() {
  await seedPresets();
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      colors: { orderBy: { colorCode: "asc" } },
    },
  });
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id: string = body.id || `P${Date.now().toString(36).slice(-5).toUpperCase()}`;
    const product = await prisma.product.create({
      data: {
        id,
        name: body.name || id,
        clientName: body.clientName || null,
        notes: body.notes || null,
      },
      include: { colors: true },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create product failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
