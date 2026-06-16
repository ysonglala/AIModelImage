import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await ctx.params;
    const body = await request.json();
    const colorCode: string = body.colorCode || `C${String((Date.now() % 1000)).padStart(2, "0")}`;
    const garmentRefs: string[] = Array.isArray(body.garmentRefs)
      ? body.garmentRefs.filter((u: unknown) => typeof u === "string" && (u as string).length > 0)
      : [];

    if (garmentRefs.length === 0) {
      return NextResponse.json({ error: "garmentRefs is required" }, { status: 400 });
    }

    const color = await prisma.productColor.create({
      data: {
        id: `${productId}-${colorCode}`,
        productId,
        colorCode,
        colorName: body.colorName || colorCode,
        garmentRefs,
      },
    });
    return NextResponse.json(color, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create color failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
